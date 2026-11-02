export interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
  chunks: string[];
}

const TOKEN_RE = /[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*(?:[-/][A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*)*|[\u4e00-\u9fff]|[\u3040-\u30ff]|\p{Script=Hangul}|[^\s]/gu;
const CLOSING_PUNCT_RE = /^[,.;:!?，。！？；：、)\]\}）】》”’…]+$/u;
const OPENING_PUNCT_RE = /^[([{（【《“‘]+$/u;
const LATIN_TOKEN_RE = /^[A-Za-z0-9]/u;
const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\p{Script=Hangul}]/u;

function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

function tokenWidth(token: string): number {
  if (token === " ") return 0.35;
  if (CJK_RE.test(token)) return [...token].length;
  if (CLOSING_PUNCT_RE.test(token) || OPENING_PUNCT_RE.test(token)) return 0.45;
  return Math.max(0.55, [...token].length * 0.58);
}

function lineWidth(line: string): number {
  return tokenize(line).reduce((sum, token) => sum + tokenWidth(token), 0);
}

function appendToken(base: string, token: string): string {
  if (!base) return token;
  const prev = [...base].at(-1) ?? "";
  if (CLOSING_PUNCT_RE.test(token)) return base + token;
  if (OPENING_PUNCT_RE.test(token)) return base + token;
  if (CLOSING_PUNCT_RE.test(prev) && LATIN_TOKEN_RE.test(token)) return `${base} ${token}`;
  if (LATIN_TOKEN_RE.test(prev) && LATIN_TOKEN_RE.test(token)) return `${base} ${token}`;
  return base + token;
}

function fixLeadingPunctuation(lines: string[]): string[] {
  const fixed: string[] = [];
  for (const rawLine of lines) {
    let line = rawLine.trim();
    const leading = line.match(/^[,.;:!?，。！？；：、)\]\}）】》”’…]+/u)?.[0] ?? "";
    if (leading && fixed.length > 0) {
      fixed[fixed.length - 1] += leading;
      line = line.slice(leading.length).trim();
    }
    if (line) fixed.push(line);
  }
  return fixed;
}

export function subtitleLineWidth(line: string): number {
  return lineWidth(line);
}

export function splitSubtitleLines(text: string, max = 20): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const lines: string[] = [];
  let current = "";
  for (const token of tokenize(clean)) {
    if (CLOSING_PUNCT_RE.test(token) && !current && lines.length > 0) {
      lines[lines.length - 1] += token;
      continue;
    }
    const candidate = appendToken(current, token);
    if (current && lineWidth(candidate) > max) {
      lines.push(current);
      current = token;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return fixLeadingPunctuation(lines);
}

export function splitCueUnits(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const units: string[] = [];
  let current = "";
  for (const token of tokenize(clean)) {
    current = appendToken(current, token);
    if (/^[。！？!?；;]$/u.test(token)) {
      units.push(current.trim());
      current = "";
    } else if (/^[，,、：:]$/u.test(token) && lineWidth(current) >= 10) {
      units.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) units.push(current.trim());
  return fixLeadingPunctuation(units);
}

export function buildSubtitleCues(text: string, durationMs: number, maxChars = 18): SubtitleCue[] {
  const units = splitCueUnits(text);
  if (units.length === 0) return [];

  const cueTexts: string[] = [];
  let current: string[] = [];

  for (const unit of units) {
    for (const line of splitSubtitleLines(unit, maxChars)) {
      current.push(line);
      if (current.length >= 1) {
        cueTexts.push(current.join("\n"));
        current = [];
      }
    }
  }
  if (current.length > 0) cueTexts.push(current.join("\n"));

  const totalMs = Math.max(900, durationMs);
  const weights = cueTexts.map((cue) => Math.max(1, [...cue.replace(/\s+/g, "")].length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;

  return cueTexts.map((cueText, index) => {
    const isLast = index === cueTexts.length - 1;
    const proportionalMs = Math.round((weights[index]! / totalWeight) * totalMs);
    const endMs = isLast ? totalMs : Math.min(totalMs, cursor + Math.max(700, proportionalMs));
    const cue = {
      startMs: cursor,
      endMs,
      text: cueText.replace(/\n/g, " "),
      chunks: cueText.split("\n").filter(Boolean),
    };
    cursor = endMs;
    return cue;
  });
}

export function activeSubtitleCue(cues: SubtitleCue[], elapsedMs = 0): SubtitleCue | null {
  if (cues.length === 0) return null;
  return cues.find((cue) => elapsedMs >= cue.startMs && elapsedMs < cue.endMs) ?? cues[cues.length - 1]!;
}
