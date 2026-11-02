import {existsSync, readFileSync, writeFileSync} from 'node:fs';
/** Recompute and validate every time; avoid only an identical write, never a check. */
export function writeTextIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return false;
  writeFileSync(path, content, 'utf8');
  return true;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
  return value;
}
export function writeGeneratedJsonIfChanged(path: string, value: Record<string, unknown>): boolean {
  let previous: Record<string, unknown> | undefined;
  try {previous = JSON.parse(readFileSync(path, 'utf8'));} catch { /* Missing/corrupt output is rebuilt. */ }
  const {generatedAt: _currentTimestamp, ...semantic} = value;
  const {generatedAt: previousTimestamp, ...previousSemantic} = previous ?? {};
  const unchanged = typeof previousTimestamp === 'string' && JSON.stringify(canonical(semantic)) === JSON.stringify(canonical(previousSemantic));
  if (unchanged) return false;
  return writeTextIfChanged(path, `${JSON.stringify({...value, generatedAt: new Date().toISOString()}, null, 2)}\n`);
}
