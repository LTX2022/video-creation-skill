#!/usr/bin/env node
// Node >= 22.15 / 23.5 built-in TypeScript loader. No install, no network, no writes.
import './register-ts-runtime.mjs';
await import('../templates/src/video/continuity-clock.test.ts');
await import('../templates/src/video/object-track.test.ts');
// Tests are structural/model evidence, not render or approval records.

await import('../templates/src/video/render-schedule.test.ts');
