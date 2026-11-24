# Local decoded replay guard (optional)

Run this before submitting a Fix Agent lesson for human review when the requested correction is specific: preserve an onset, delay two downstream cues by the same exact number of whole frames, and keep an already-working RGB region from changing. This is a retrospective replay template, not a blind evaluation, rendering agent, or general recursive self-improvement. It needs no Remotion, model API, install workflow, or Git access.

1. Freeze a copy of `manifest.example.json` with exactly two distinct cases. Choose the intended shift, cue regions and thresholds, and a known-good protected region independently of the candidate outcomes. The origin case should reproduce the user-corrected failure; pick a distinct second clip to test repetition. The manifest does not prove independence or that it was frozen before results. Record that provenance separately.
2. Set each baseline/candidate to a relative MP4 filename and its lowercase SHA-256. Supply the local evidence folder explicitly.
3. Run the guard, then add its report, the frozen manifest, and your independent quality review to the existing Fix Agent lesson evidence. Keep existing owner approval, explicit scope, and revocation steps in charge. This command never writes lesson state, edits rules/sources, or approves a change.

```sh
python3 replay_guard.py --manifest comparison.json --media-root ./comparison-media
python3 -B -m unittest -v
```

**Inputs:** POSIX, Python 3 standard library, FFmpeg and FFprobe; tests additionally need FFmpeg's libx264 encoder. Tested evidence format is streamable (fast-start) H.264 MP4 with a single video stream, zero-based constant integer-rate timestamps and no rotation, maximum 16 MiB encoded per file, up to 512×512 and 180 frames within a 32 MiB RGB decode budget. The guard rejects symlinks, non-regular files, paths outside the declared directory, hash mismatches and unrecognized or inconsistent media. Inputs go via pipe into the forced MP4 demuxer with external references disabled; no shell or network protocols are used. Use files you control and trusted local FFmpeg executables; this is not a general sandbox for hostile media.

**Checks:** A cue is the first three consecutive decoded frames where the signed mean shift of a chosen RGB channel reaches its declared threshold relative to frame zero. Declare disjoint rectangles `[left, top, width, height]` in onset/near/far order. The protected ROI is compared to baseline at every decoded frame via worst-frame mean absolute RGB error (0–255 scale). A near-black baseline patch or a patch without spatial variation within any one channel is insufficient evidence. ROI checks do not judge the rest of the frame, artistic similarity, audio, or how the videos were produced.

| Exit | Result | Meaning |
| --- | --- | --- |
| 0 | `review-candidate` | Both cases have the exact requested shift, ordered cues and no observed protection regression. Review only. |
| 1 | `hold-no-qualifying-gain` or `reject-regression` | Tie/partial correction or a guard regression. Do not advance. |
| 2 | `inconclusive` | Bad/missing media, malformed spec, unsupported stream, or evaluator failure. Do not advance. |

Tests encode original fixtures in a temporary directory and compare their decoded frames. They cover a two-case win, a tie, correctly delayed cues with a protected plate replaced by black, a uniform saturated baseline patch, and missing/altered/unrecognized/path-escape inputs. No binaries are part of the example.
