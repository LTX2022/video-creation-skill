# Organic Signal: original source-only Three.js rebuild

This is **newly authored source**, not recovery of the lost earlier ZIP or a byte-identical replacement. This source-only checkpoint adds it as an optional example in the video Skill, with one navigation entry. The production video pipeline, existing examples and installed skills are unchanged. It is not a finished visual deliverable.

The reference observation was a 25.034-second video by 夏夏的AI灵感, https://xhslink.cn/o/5D5ft3cCZVe. Only high-level visual mechanisms informed this independent 16-second exercise. No author source code or open redistribution license was observed. No reference prompts, assets, logo or sun/mountain symbol are included. The final target here is an original asymmetric organic leaf outline.

## Files and scope

- `core.mjs`: pure deterministic trajectories, fixed stable IDs, graph topology, three spherical wave events, tilted two-arm field, target replacement and bounded temporal history.
- `scene.mjs`: authored Three.js Points/ShaderMaterial adapter, sparse branch lines and finite signal/particle history samples. GPU resource creation is explicit.
- `index.html`, `browser.mjs`: seek-only **future preview harness**, not a rendered deliverable.
- `core.test.mjs`: freshly executed pure Node tests. `test-results.txt` contains the final run.
- `dependency-check.mjs`: Node-only Three/scene module import without renderer creation.
- `package-lock.json`: exact Three.js 0.180.0 pin and registry integrity.
- `status.json`: explicit verification/publication limits.

## Sequence

| Time | Mechanism |
| --- | --- |
| 0–4 s | Sparse cyan 3D graph with dim branches; gold signal follows an inclusive route and briefly brightens nearby nodes. |
| 4–8 s | Three independent radial wavefronts, starting at 4, 5 and 6 seconds: gold, cyan, cyan. Brightness decays behind each front. |
| 8–12 s | Curved incoming signal enters a tilted two-arm spiral, warm core and blue-gray outer dust. |
| 12–15 s | Spiral contracts while each stable ID blends toward its own organic outline target. |
| 15–16 s | Exact stationary final target; short history settles within 1/6 second. |

This is a technical composition, not a claim of reference matching, aesthetic equivalence or visual acceptance. Transition timing, density, shader compilation, tone/color, depth, point sizing, performance and export remain to be reviewed in a separately permitted rendering environment.

## Pure API

```js
import {createStudy} from './core.mjs';
const study = createStudy({count: 2400, seed: 53117});
const state = study.sampleAt(9.5);
const sameTime = study.sampleFrame(570, 60);
const finiteHistory = study.sampleHistory(9.5, {samples: 6, spacing: 1 / 30});
```

`sampleAt` has no mutable time accumulator. Frame time is `frame / fps`, not frame-count normalization. Calling frames out of order is supported. Seeded geometry is constructed once. RGB values are linear working-space values; the fragment shader includes Three.js output-color conversion. State buffers are new for every sample and can be modified without changing future samples. Time after 16 seconds clamps to the endpoint; negative/nonfinite time fails.

`count`: integer 64–50000. `seed`: uint32. `frame`: nonnegative safe integer. `fps`: finite 1–240 (fractional fps supported; frame is still an integer). Width/height: integers 1–8192; pixel ratio 0.25–4; at most 32M physical pixels. Invalid values throw. Very large counts or extreme viewport ratios may be impractical despite being mathematically supported; no GPU performance claims are made.

`targetAt(id, count)` replaces the final geometry. It is invoked once per ID at construction, must return three finite coordinates within ±100, and is copied defensively. The caller should supply a deterministic callback for reproducible construction. The final Float32 positions equal each callback target rounded to Float32, including exact interpolation endpoints. The origin-centered bounds include custom target coordinates; the camera adapter derives distance and near/far planes from these bounds and viewport aspect ratio. This is source-level handling, not visual verification.

`sampleHistory` permits 1–16 samples and spacing 1/240–0.1 seconds. It samples trajectories at explicit earlier times, rather than accumulating trails or depending on framebuffer history.

## Checks and their scope

Checkpoint verification on 2026-11-08 under Node v24.22.1: 19/19 pure tests and `npm run check` passed again. The existing cinematic-primitives kernel also passed 12/12 tests from files verified identical to the current remote baseline. The earlier 2026-11-07 reconstruction passed `npm run check:three` without renderer creation. That import was not rerun for this checkpoint: Three.js is absent locally and the bounded offline install found no cached package (`ENOTCACHED`). The earlier import result is historical evidence, not a fresh pass. No dependencies, caches or node_modules are included.

Initial test execution caught exact-endpoint floating-point interpolation differences; endpoint handling was corrected and the complete suite rerun. No older test results are reused here.

## Future permitted preview only

This section is documentation, not an action performed during the rebuild. In an environment where browser/GPU use is authorized, install from the lockfile with `npm ci --ignore-scripts`, serve this folder over local HTTP and open `index.html`. The import map resolves the local pinned dependency, not a CDN. A future renderer can call `window.renderAtFrame(frame, fps)` or the scene object's method. There is no automatic playback, capture, encoder or video export implementation.

**No browser, Chromium, WebGL, shader compile, screenshots, video render or visual validation was run. This is a source-only repository checkpoint, not a skill installation, version release or deployment.** The earlier browser restriction was respected; no alternate execution route, environment switch or security change was attempted.

## License and provenance

Original source follows the repository code-only LICENSE and LICENSE-SCOPE.md. Three.js 0.180.0 has its exact MIT notice retained in THREE-LICENSE.txt; its package-lock.json registry integrity is preserved. Dependency binaries/source and browser binaries are not bundled. Reference video, screenshots, full prompts and logos are absent. This source package does not grant broader rights to third-party references or any future generated media.
