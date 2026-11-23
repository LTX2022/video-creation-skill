#!/usr/bin/env python3
"""Review aligned, local SDR video frames without rerendering or changing input."""
import argparse
from contextlib import ExitStack
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from fractions import Fraction
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from tempfile import TemporaryFile, TemporaryDirectory

try:
    from PIL import Image, ImageChops, ImageDraw
except ImportError:
    Image = ImageChops = ImageDraw = None


LOCAL_INPUT = ("-protocol_whitelist", "file,pipe", "-format_whitelist",
               "mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,mpegts")
MAX_PIXELS = 3840 * 2160
MAX_FRAMES = 180000
SDR_8BIT = {
    "yuv420p", "yuv422p", "yuv444p", "yuvj420p", "yuvj422p", "yuvj444p",
    "yuv410p", "yuv411p", "nv12", "nv21", "yuyv422", "uyvy422", "rgb24",
    "bgr24", "gbrp", "gray", "0rgb", "rgb0", "0bgr", "bgr0",
}


@dataclass(frozen=True)
class Clip:
    path: Path
    digest: str
    width: int
    height: int
    fps: Fraction
    tick: Fraction
    count: int
    origin: Fraction
    pts: dict
    pixel_format: str


@dataclass(frozen=True)
class Region:
    name: str
    box: tuple
    limit: Decimal


def frames_arg(value):
    text = value.split(",")
    if not 1 <= len(text) <= 16 or any(not re.fullmatch(r"[0-9]{1,6}", x.strip()) for x in text):
        raise argparse.ArgumentTypeError("supply 1–16 comma-separated, zero-based frame numbers")
    frames = [int(x) for x in text]
    if len(set(frames)) != len(frames):
        raise argparse.ArgumentTypeError("frame numbers must be unique")
    return sorted(frames)


def region_arg(value):
    try:
        name, geometry, limit = value.split(":")
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", name):
            raise ValueError
        fields = geometry.split(",")
        if len(fields) != 4 or any(not re.fullmatch(r"[0-9]{1,5}", v) for v in fields):
            raise ValueError
        x, y, w, h = map(int, fields)
        if not re.fullmatch(r"(?:[0-9]{1,3}(?:\.[0-9]{1,6})?|\.[0-9]{1,6})", limit):
            raise ValueError
        threshold = Decimal(limit)
        if w == 0 or h == 0 or not threshold.is_finite() or not 0 <= threshold <= 255:
            raise ValueError
        return Region(name, (x, y, x + w, y + h), threshold)
    except (ValueError, InvalidOperation) as error:
        raise argparse.ArgumentTypeError("protection must be NAME:x,y,w,h:MAE_LIMIT (0–255)") from error


def file_digest(path):
    digest = sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def diagnostics(stream):
    stream.seek(0)
    return stream.read(4096).decode("utf-8", "replace").strip()


def probe(ffprobe, raw_path, samples):
    path = raw_path.resolve(strict=True)
    if not path.is_file():
        raise ValueError(f"not a local regular file: {raw_path}")
    digest = file_digest(path)
    common = [ffprobe, "-v", "error", *LOCAL_INPUT, "-select_streams", "v:0"]
    meta = subprocess.run([
        *common, "-show_entries",
        "stream=width,height,r_frame_rate,time_base,sample_aspect_ratio,pix_fmt,color_transfer:"
        "stream_disposition=attached_pic:stream_side_data=rotation", "-of", "json", str(path),
    ], capture_output=True, check=False)
    if meta.returncode or meta.stderr:
        raise ValueError(f"{path.name}: ffprobe metadata failed: {meta.stderr.decode('utf-8', 'replace')[:4096]}")
    streams = json.loads(meta.stdout).get("streams", [])
    if len(streams) != 1:
        raise ValueError(f"{path.name}: no selected video stream")
    info = streams[0]
    width, height = int(info["width"]), int(info["height"])
    fps, tick = Fraction(info["r_frame_rate"]), Fraction(info["time_base"])
    pix_fmt = info.get("pix_fmt")
    if not (0 < width <= 4096 and 0 < height <= 4096 and width * height <= MAX_PIXELS):
        raise ValueError(f"{path.name}: unsupported frame size (maximum {MAX_PIXELS} pixels)")
    if not 0 < fps <= 240 or tick <= 0 or tick > 1 / fps:
        raise ValueError(f"{path.name}: invalid or insufficiently precise nominal video clock")
    if (info.get("sample_aspect_ratio") not in (None, "N/A", "0:1", "1:1")
            or any(float(x.get("rotation", 0)) % 360 for x in info.get("side_data_list", []))
            or info.get("disposition", {}).get("attached_pic")
            or pix_fmt not in SDR_8BIT
            or info.get("color_transfer") in ("smpte2084", "arib-std-b67")):
        raise ValueError(f"{path.name}: expected unrotated square-pixel opaque 8-bit SDR video")

    selected = {}
    count, first, last = 0, None, None
    with TemporaryFile() as errors:
        with subprocess.Popen([
            *common, "-show_frames", "-show_entries",
            "frame=best_effort_timestamp,width,height,pix_fmt", "-of", "compact=p=1:nk=0", str(path),
        ], stdout=subprocess.PIPE, stderr=errors) as process:
            try:
                for line in process.stdout:
                    if not line.startswith(b"frame|"):
                        continue
                    fields = dict(part.split(b"=", 1) for part in line.strip().split(b"|")[1:]
                                  if b"=" in part)
                    if not re.fullmatch(rb"-?[0-9]+", fields.get(b"best_effort_timestamp", b"")):
                        raise ValueError(f"{path.name}: missing presentation timestamp at frame {count}")
                    pts = int(fields[b"best_effort_timestamp"])
                    if (int(fields[b"width"]), int(fields[b"height"]), fields.get(b"pix_fmt")) != (
                            width, height, pix_fmt.encode("ascii")):
                        raise ValueError(f"{path.name}: geometry or pixel format changes within clip")
                    if first is None:
                        first = pts
                    if ((last is not None and pts <= last)
                            or abs((pts - first) * tick - count / fps) > tick / 2):
                        raise ValueError(f"{path.name}: non-constant presentation timing at frame {count}")
                    if count in samples:
                        selected[count] = pts
                    count += 1
                    last = pts
                    if count > MAX_FRAMES:
                        raise ValueError(f"{path.name}: clip exceeds {MAX_FRAMES} frames")
            finally:
                process.stdout.close()
        error = diagnostics(errors)
        if process.returncode or error:
            raise ValueError(f"{path.name}: ffprobe presentation decode failed: {error}")
    if first is None or len(selected) != len(samples):
        raise ValueError(f"{path.name}: requested frame outside 0..{count - 1}")
    return Clip(path, digest, width, height, fps, tick, count, first * tick, selected, pix_fmt)


def check_compatibility(baseline, clip):
    if (baseline.width, baseline.height, baseline.fps, baseline.count) != (
            clip.width, clip.height, clip.fps, clip.count):
        raise ValueError(f"{clip.path.name}: geometry, cadence or frame count differs from before")
    tolerance = min((baseline.tick + clip.tick) / 2, 1 / (4 * baseline.fps))
    if (abs(baseline.origin - clip.origin) > tolerance
            or any(abs(pts * baseline.tick - clip.pts[n] * clip.tick) > tolerance
                   for n, pts in baseline.pts.items())):
        raise ValueError(f"{clip.path.name}: presentation timestamps do not align with before")


def start_decode(stack, ffmpeg, clip, samples):
    stderr = stack.enter_context(TemporaryFile())
    selection = "+".join(f"eq(n\\,{sample})" for sample in samples)
    proc = stack.enter_context(subprocess.Popen([
        ffmpeg, "-nostdin", "-v", "error", "-xerror", "-threads", "1", "-filter_threads", "1",
        "-noautorotate", *LOCAL_INPUT, "-i", str(clip.path), "-map", "0:v:0",
        "-vf", f"select={selection}", "-frames:v", str(len(samples)),
        "-fps_mode", "passthrough", "-pix_fmt", "rgb24", "-c:v", "rawvideo",
        "-threads", "1", "-f", "rawvideo", "pipe:1",
    ], stdout=subprocess.PIPE, stderr=stderr))
    stack.callback(proc.stdout.close)
    return proc, stderr


def protected_metric(a, b, roi):
    histogram = ImageChops.difference(a.crop(roi.box), b.crop(roi.box)).histogram()
    numerator = sum((i % 256) * n for i, n in enumerate(histogram))
    denominator = sum(histogram)
    # Compare the rational channel mean without rounding away a failure.
    return {"mae": numerator / denominator,
            "pass": Fraction(numerator, denominator) <= Fraction(roi.limit)}


def draw_review(ffmpeg, clips, samples, regions):
    base = clips["before"]
    preview_width = min(base.width, 480)
    preview_height = max(1, round(base.height * preview_width / base.width))
    if preview_height > 270:
        preview_width = max(1, round(preview_width * 270 / preview_height))
        preview_height = 270
    col_width = max(preview_width, 165) + 8
    row_height = preview_height + 27
    sheet = Image.new("RGB", (col_width * len(clips), row_height * len(samples)), "#141920")
    draw = ImageDraw.Draw(sheet)
    sample_metrics = []
    with ExitStack() as stack:
        decoders = {k: start_decode(stack, ffmpeg, v, samples) for k, v in clips.items()}
        for row, number in enumerate(samples):
            frames = {}
            timestamps = {}
            for col, (role, clip) in enumerate(clips.items()):
                proc, stderr = decoders[role]
                size = clip.width * clip.height * 3
                raw = proc.stdout.read(size)
                if len(raw) != size:
                    raise ValueError(f"{clip.path.name}: FFmpeg incomplete at F{number}: {diagnostics(stderr)}")
                frame = Image.frombytes("RGB", (clip.width, clip.height), raw)
                frames[role] = frame
                pts = clip.pts[number]
                seconds = pts * clip.tick
                timestamps[role] = {"pts": pts, "seconds": str(seconds)}
                draw.text((col * col_width + 5, row * row_height + 4),
                          f"{role.upper()}  F{number}  {float(seconds):.3f} s", fill="#ffffff")
                sheet.paste(frame.resize((preview_width, preview_height), Image.Resampling.LANCZOS),
                            (col * col_width + 4, row * row_height + 22))
            sample_metrics.append({
                "frame": number, "timestamps": timestamps,
                "protected": {region.name: protected_metric(frames["before"], frames["after"], region)
                              for region in regions},
            })
        for role, (proc, stderr) in decoders.items():
            if proc.stdout.read(1) or proc.wait() or diagnostics(stderr):
                raise ValueError(f"{role}: FFmpeg output did not match selected frames: {diagnostics(stderr)}")
    return sheet, sample_metrics


def write_report(out, sheet, report):
    if out.exists() or out.is_symlink():
        raise ValueError(f"output directory already exists: {out}")
    if not out.parent.is_dir():
        raise ValueError(f"output parent directory must already exist: {out.parent}")
    with TemporaryDirectory(prefix=".frame-review-", dir=out.parent) as temp:
        temp = Path(temp)
        sheet.save(temp / "sheet.png")
        report["sheet_sha256"] = file_digest(temp / "sheet.png")
        (temp / "review.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        # mkdir, unlike rename on POSIX, fails even if an existing destination is empty.
        out.mkdir()
        written = []
        try:
            for filename in ("sheet.png", "review.json"):
                path = out / filename
                with (temp / filename).open("rb") as source, path.open("xb") as target:
                    written.append(path)
                    shutil.copyfileobj(source, target)
        except OSError:
            try:
                for path in reversed(written):
                    path.unlink(missing_ok=True)
                out.rmdir()
            except OSError:
                pass
            raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before", required=True, type=Path)
    parser.add_argument("--after", required=True, type=Path)
    parser.add_argument("--reference", type=Path)
    parser.add_argument("--frames", required=True, type=frames_arg, metavar="N[,N...]")
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--protect", action="append", default=[], type=region_arg,
                        metavar="NAME:x,y,w,h:MAE_LIMIT")
    args = parser.parse_args(argv)
    try:
        if Image is None:
            raise ValueError("optional review tool needs locally installed Pillow")
        ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
        if not ffmpeg or not ffprobe:
            raise ValueError("ffmpeg and ffprobe must already be installed on PATH")
        if args.out_dir.exists() or args.out_dir.is_symlink() or not args.out_dir.parent.is_dir():
            raise ValueError("out-dir must be new, with an existing parent directory")
        if len(args.protect) > 16 or len({r.name for r in args.protect}) != len(args.protect):
            raise ValueError("supply at most 16 uniquely named protected areas")
        paths = {"before": args.before, "after": args.after}
        if args.reference:
            paths["reference"] = args.reference
        clips = {k: probe(ffprobe, v, args.frames) for k, v in paths.items()}
        before = clips["before"]
        for clip in list(clips.values())[1:]:
            check_compatibility(before, clip)
        for roi in args.protect:
            if roi.box[2] > before.width or roi.box[3] > before.height:
                raise ValueError(f"protected area outside decoded frame: {roi.name}")
        sheet, metrics = draw_review(ffmpeg, clips, args.frames, args.protect)
        for clip in clips.values():
            if file_digest(clip.path) != clip.digest:
                raise ValueError(f"input changed during review: {clip.path.name}")
        status = ("visual-only" if not args.protect else
                  "pass" if all(r["pass"] for m in metrics for r in m["protected"].values()) else "fail")
        report = {
            "schema_version": 1, "status": status, "frame_count": before.count,
            "width": before.width, "height": before.height, "fps": str(before.fps),
            "nominal_duration_seconds": str(before.count / before.fps),
            "inputs": {k: {"file": v.path.name, "sha256": v.digest, "time_base": str(v.tick),
                           "first_pts_seconds": str(v.origin), "pixel_format": v.pixel_format}
                       for k, v in clips.items()},
            "frames": args.frames, "samples": metrics,
            "protected_areas": {r.name: {"box_xyxy_exclusive": r.box, "mae_limit": str(r.limit)}
                                for r in args.protect},
            "scope": "Sampled decoded RGB only. Protected areas compare before to after. "
                     "Reference is visual only. Does not assess unsampled pixels, audio, motion quality or aesthetics.",
        }
        write_report(args.out_dir, sheet, report)
    except (KeyError, ValueError, OSError, ArithmeticError, AttributeError) as error:
        print(f"review_frames: {error}", file=sys.stderr)
        return 2
    print(f"{status}: {args.out_dir / 'review.json'}")
    return int(status == "fail")


if __name__ == "__main__":
    sys.exit(main())
