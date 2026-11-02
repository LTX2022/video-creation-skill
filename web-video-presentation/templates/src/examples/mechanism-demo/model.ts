/** A deterministic, discrete teaching model; not a production continuous token bucket. */
export const DEMO_SECONDS = 8;
export const CAPACITY = 2;
export const REFILL_SECONDS = 1;
export const REQUEST_TIMES: readonly number[] = Object.freeze([0.5, 0.7, 0.9, 2.4]);

export type Outcome = 'passed' | 'rejected';
export type BucketEvent = {
  kind: 'refill' | 'request';
  at: number;
  id: number;
  before: number;
  after: number;
  outcome: Outcome | null;
  added: boolean;
};
type StoredToken = { id: string; createdAt: number };
export type BucketSnapshot = {
  tokens: number;
  storedTokens: StoredToken[];
  passed: number;
  rejected: number;
  events: BucketEvent[];
};

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const ease = (amount: number) => {
  const p = clamp(amount);
  return p * p * (3 - 2 * p);
};

/** Same-time priority: refill first, then requests in their original array order. */
export function evaluateDiscreteBucket(
  seconds: number,
  requestTimes: readonly number[] = REQUEST_TIMES,
): BucketSnapshot {
  if (!Number.isFinite(seconds)) throw new RangeError('seconds must be finite');
  if (requestTimes.some((at) => !Number.isFinite(at) || at < 0 || at > DEMO_SECONDS)) {
    throw new RangeError('request times must be between 0 and 8 seconds');
  }
  const until = clamp(seconds, 0, DEMO_SECONDS);
  const schedule: { kind: 'refill' | 'request'; at: number; id: number }[] = [];
  for (let at = REFILL_SECONDS; at <= DEMO_SECONDS; at += REFILL_SECONDS) {
    schedule.push({ kind: 'refill', at, id: at / REFILL_SECONDS });
  }
  requestTimes.forEach((at, index) => schedule.push({ kind: 'request', at, id: index + 1 }));
  schedule.sort((a, b) => a.at - b.at ||
    (a.kind === b.kind ? a.id - b.id : a.kind === 'refill' ? -1 : 1));
  const storedTokens: StoredToken[] = [
    { id: 'initial-1', createdAt: -1 },
    { id: 'initial-2', createdAt: -1 },
  ];
  const events: BucketEvent[] = [];
  let passed = 0;
  let rejected = 0;
  for (const item of schedule) {
    if (item.at > until + 1e-9) break;
    const before = storedTokens.length;
    let outcome: Outcome | null = null;
    let added = false;
    if (item.kind === 'refill') {
      if (before < CAPACITY) {
        storedTokens.push({ id: `refill-${item.id}`, createdAt: item.at });
        added = true;
      }
    } else if (before > 0) {
      storedTokens.pop();
      passed += 1;
      outcome = 'passed';
    } else {
      rejected += 1;
      outcome = 'rejected';
    }
    events.push({ ...item, before, after: storedTokens.length, outcome, added });
  }
  return { tokens: storedTokens.length, storedTokens, passed, rejected, events };
}

export type RequestVisual = {
  id: number;
  arrival: number;
  visible: boolean;
  outcome: Outcome | 'pending';
  x: number;
  y: number;
};

/** All state, poses, flow, gate motion, and readouts come from this one frame function. */
export function modelAtFrame(frame: number, fps: number) {
  if (!Number.isFinite(frame)) throw new RangeError('frame must be finite');
  if (!Number.isFinite(fps) || fps <= 0) throw new RangeError('fps must be finite and positive');
  // Canonical nanosecond timestamps avoid equivalent cross-fps samples differing by float noise.
  const timeSeconds = Math.round(clamp(frame / fps, 0, DEMO_SECONDS) * 1e9) / 1e9;
  const bucket = evaluateDiscreteBucket(timeSeconds);
  const requestEvents = bucket.events.filter((event) => event.kind === 'request');
  const latestRequest = requestEvents[requestEvents.length - 1];
  const refillEvents = bucket.events.filter((event) => event.kind === 'refill');
  const latestRefill = refillEvents[refillEvents.length - 1];

  const requests: RequestVisual[] = REQUEST_TIMES.map((arrival, index) => {
    const id = index + 1;
    const event = requestEvents.find((item) => item.id === id);
    const age = timeSeconds - arrival;
    const approach = clamp((age + 0.45) / 0.45);
    let x = mix(144, 680, approach);
    let y = 398;
    if (event?.outcome === 'passed') {
      const acceptedOrdinal = requestEvents.filter((item) =>
        item.outcome === 'passed' && item.at <= event.at).length;
      x = mix(680, 1120 - (acceptedOrdinal - 1) * 80, ease((age - 0.045) / 0.58));
    } else if (event?.outcome === 'rejected') {
      // The closed gate diverts the parcel through the lower curved return tube.
      const p = ease(age / 0.8);
      if (p < 0.5) {
        const q = p / 0.5;
        x = (1 - q) ** 3 * 680 + 3 * (1 - q) ** 2 * q * 734 +
          3 * (1 - q) * q ** 2 * 746 + q ** 3 * 854;
        y = mix(398, 550, ease(q));
      } else {
        x = mix(854, 1120, (p - 0.5) / 0.5);
        y = 550;
      }
    }
    return { id, arrival, visible: age >= -0.45, outcome: event?.outcome ?? 'pending', x, y };
  });

  let gateOpen = 0;
  for (const event of requestEvents) {
    if (event.outcome !== 'passed') continue;
    const age = timeSeconds - event.at;
    const opening = age < 0.035 ? ease(age / 0.035) :
      age < 0.12 ? 1 : 1 - ease((age - 0.12) / 0.06);
    gateOpen = Math.max(gateOpen, opening);
  }
  const tokenTransfers = requestEvents.filter((event) => event.outcome === 'passed')
    .map((event) => {
      const age = timeSeconds - event.at;
      const p = ease(age / 0.14);
      return {
        id: event.id,
        x: mix(624, 680, p),
        y: mix(event.before === 2 ? 216 : 268, 348, p),
        opacity: age <= 0.14 ? 1 : 1 - clamp((age - 0.14) / 0.04),
        scale: mix(1, 0.4, p),
      };
    }).filter((token) => token.opacity > 0);
  const slots = [0, 1].map((index) => {
    const token = bucket.storedTokens[index];
    const targetY = 268 - index * 52;
    const p = token && token.createdAt >= 0 ? ease((timeSeconds - token.createdAt) / 0.18) : 1;
    return { index, occupied: Boolean(token), x: 624, y: mix(144, targetY, p), targetY };
  });
  const status = !latestRequest ? 'ready' : latestRequest.outcome === 'rejected' ? 'empty' :
    latestRequest.id === REQUEST_TIMES.length ? 'recovered' : 'spending';

  return {
    timeSeconds,
    progress: timeSeconds / DEMO_SECONDS,
    capacity: CAPACITY,
    refillEverySeconds: REFILL_SECONDS,
    tokens: bucket.tokens,
    passedCount: bucket.passed,
    rejectedCount: bucket.rejected,
    latestRequest,
    latestRefill,
    events: bucket.events,
    requests,
    slots,
    tokenTransfers,
    gateOpen,
    gateOffsetY: -72 * gateOpen,
    gateTone: latestRequest?.outcome ?? 'idle',
    status,
    clockDegrees: (timeSeconds % REFILL_SECONDS) / REFILL_SECONDS * 360,
    refillPulse: latestRefill ? 1 - clamp((timeSeconds - latestRefill.at) / 0.32) : 0,
  };
}

export type MechanismModel = ReturnType<typeof modelAtFrame>;
