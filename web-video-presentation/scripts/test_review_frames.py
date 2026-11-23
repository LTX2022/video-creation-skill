"""Test the actual offline CLI with small, independently generated clips."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("review_frames.py")


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "requires FFmpeg")
class ReviewCLI(unittest.TestCase):
    def setUp(self):
        td = tempfile.TemporaryDirectory()
        self.addCleanup(td.cleanup)
        self.root = Path(td.name)
        self.before = self.make("original", [16] * 4)
        self.changed = self.make("changed", [16, 235, 16, 16])

    def make(self, name, gray, fps="5", w=40, pts=None, h264=False):
        fn = self.root / (name + (".mp4" if h264 else ".mkv"))
        frames = b"".join(bytes([i]) * (w * 30 * 3) for i in gray)
        subprocess.run([
            "ffmpeg", "-v", "error", "-f", "rawvideo", "-pixel_format", "rgb24",
            "-video_size", f"{w}x30", "-framerate", fps, "-i", "pipe:0",
            *(["-vf", pts, "-fps_mode", "vfr"] if pts else []),
            *(
                ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-bf", "2",
                 "-x264-params", "b-adapt=0"]
                if h264 else ["-c:v", "ffv1"]
            ), str(fn)
        ], input=frames, capture_output=True, check=True)
        return fn

    def run_cli(self, after=None, frames="0,1,3", extra=(), before=None, code=0, output="out"):
        out = self.root / output
        p = subprocess.run([
            sys.executable, "-B", str(SCRIPT), "--before", str(before or self.before),
            "--after", str(after or self.before), "--frames", frames, "--out-dir", str(out),
            *extra
        ], capture_output=True, text=True)
        self.assertEqual(p.returncode, code, (p.stdout, p.stderr))
        if code in (0, 1):
            self.assertTrue((out / "sheet.png").is_file(), str(out))
            self.assertEqual(json.loads((out / "review.json").read_text())["status"],
                             "fail" if code else ("pass" if "--protect" in extra else "visual-only"))
        return out

    def test_boundary_frames_and_touching_roi(self):
        self.run_cli(extra=["--protect", "corner:36,26,4,4:0"])

    def test_single_frame_only_and_failure_report(self):
        self.run_cli(self.changed, frames="0,3", extra=["--protect", "screen:0,0,40,30:0"])
        self.run_cli(self.changed, frames="1", extra=["--protect", "screen:0,0,40,30:1"],
                     code=1, output="failed")

    def test_mismatches_and_corruption(self):
        cases = [self.make("fps", [16]*4, fps="10"), self.make("short", [16]*3),
                 self.make("wider", [16]*4, w=42),
                 self.make("vfr", [16]*4, pts=r"setpts=if(gte(N\,2)\,PTS+1\,PTS)")]
        corrupt = self.root / "corrupt.mp4"
        corrupt.write_bytes(b"not a video")
        cases.append(corrupt)
        for i, c in enumerate(cases):
            with self.subTest(case=c.name):
                self.assertFalse(self.run_cli(c, frames="0", code=2, output=f"reject{i}").exists())

    def test_invalid_frame_and_roi_leave_no_artifacts(self):
        cases = [("4", "ok:0,0,1,1:0"), ("1,1", "ok:0,0,1,1:0"),
                 ("0", "bad:39,29,2,1:0"), ("0", "bad:0,0,1,1:nan")]
        for i, (f, p) in enumerate(cases):
            with self.subTest(f=f,p=p):
                self.assertFalse(self.run_cli(frames=f, extra=["--protect",p],
                                             code=2,output=f"invalid{i}").exists())

    def test_no_overwrite(self):
        out = self.root / "existing"
        out.mkdir()
        (out/"keep.txt").write_text("keep")
        self.run_cli(code=2, output=out.name)
        self.assertEqual([x.name for x in out.iterdir()], ["keep.txt"])

    def test_ntsc_b_frames_exact_pulse(self):
        before=self.make("ntsc-before", [16]*5, fps="30000/1001", h264=True)
        after=self.make("ntsc-after", [16,16,235,16,16], fps="30000/1001", h264=True)
        rule=["--protect","pulse:10,10,20,10:5"]
        self.run_cli(after, frames="0,4", before=before, extra=rule)
        self.run_cli(after, frames="2", before=before, extra=rule, code=1, output="failed")

    def test_visual_only_deterministic(self):
        a=self.run_cli(after=self.changed)
        b=self.run_cli(after=self.changed, output="repeat")
        self.assertEqual((a/"sheet.png").read_bytes(), (b/"sheet.png").read_bytes())
        self.assertEqual((a/"review.json").read_bytes(), (b/"review.json").read_bytes())


if __name__ == "__main__":
    unittest.main()
