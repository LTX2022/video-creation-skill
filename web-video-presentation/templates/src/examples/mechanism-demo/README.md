# 令牌桶限流小装置 / original mechanism demo

An **8-second teaching example**, not the user's 28-second reference, not a production
token-bucket implementation, and not a continuous scientific/engineering simulation.
All artwork is original inline SVG. No external images, fonts, voice, network or API keys.

## Composition

For example, inside `src/video/RemotionRoot.tsx`:

```tsx
import { MechanismDemo } from '../examples/mechanism-demo/MechanismDemo';

<Composition id="MechanismDemo" component={MechanismDemo}
  durationInFrames={240} fps={30} width={1280} height={720}
  defaultProps={{ showLabels: true, transparent: false }} />
```

- `showLabels={false}` removes **all** visible text and numbers. Chinese teaching labels
  are an opt-in example convention, not a requirement for user videos.
- `transparent={true}` removes the external background, not the device's solid materials
  or its shadows. Use the project's alpha-capable PNG / ProRes / WebM export path; MP4 does
  not become transparent merely by setting this prop. There is no audio to remove.
- `palette` accepts partial overrides of `MechanismPalette`; no required custom font.
- A fixed SVG `viewBox` with `xMidYMid meet` fits either landscape or portrait without
  cropping. Portrait is a safe fit, not a separately art-directed vertical layout.

## Causal and timing contract

Capacity = 2; initial tokens = 2; one discrete refill at each integer second. Requests
arrive **at the gate** at 0.5, 0.7, 0.9, and 2.4 seconds. Their outcomes are pass, pass,
reject, pass. A same-time refill runs before requests, then requests retain array order.
The first frame whose timestamp reaches an event applies it; non-frame-aligned events
are therefore sampled on the next frame, not rescheduled. Refill never exceeds capacity.

`modelAtFrame(frame, fps)` is the sole source for state, readouts, stored token poses,
token transfers, request positions, routing, gate motion, clock and progress. Refills
and decisions are discrete; the short transit animations only illustrate those decisions.
The exact gate decision frame begins its opening motion; a passed request pauses briefly
before moving through. A rejected request follows the lower tube. Outcome pucks persist at
the exits so the final totals can be visually counted.

```sh
node --test src/examples/mechanism-demo/model.test.mjs
```

Node 24 can execute the pure TypeScript model without dependencies. Tests cover boundary
conditions, all four results, same-time ordering, cross-fps timestamps, negative frames,
out-of-order seeking, repeatability and isolation from returned-object mutation.
