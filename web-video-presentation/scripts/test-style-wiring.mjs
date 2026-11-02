// Dependency-free source/cascade-model checks, NOT browser or visual acceptance.
// Run from any directory: node --test /path/to/scripts/test-style-wiring.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Split only outside strings/functions: theme SVG data URIs contain semicolons,
// and var() fallbacks can contain comma-separated gradients and font stacks.
function splitOutside(input, delimiter) {
  const parts = [];
  let start = 0, depth = 0, quote = null;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '\\') { i++; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === delimiter && depth === 0) { parts.push(input.slice(start, i)); start = i + 1; }
  }
  parts.push(input.slice(start));
  return parts;
}

function declarations(body) {
  const result = new Map();
  for (const item of splitOutside(body, ';')) {
    const colon = item.indexOf(':');
    if (colon === -1) continue;
    result.set(item.slice(0, colon).trim(), item.slice(colon + 1).trim());
  }
  return result;
}

function rules(css) {
  const source = stripComments(css);
  const result = [];
  let start = 0, bodyStart = 0, depth = 0, quote = null, selector = '';
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '\\') { i++; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '{') {
      if (depth === 0) { selector = source.slice(start, i).trim(); bodyStart = i + 1; }
      depth++;
    }
    if (c === '}') {
      depth--;
      if (depth === 0) {
        result.push({selector, declarations: declarations(source.slice(bodyStart, i))});
        start = i + 1;
      }
    }
  }
  assert.equal(depth, 0, 'balanced CSS blocks');
  assert.equal(quote, null, 'balanced CSS strings');
  return result;
}

function rule(css, selector) {
  const matches = rules(css).filter(item => item.selector === selector);
  assert.ok(matches.length, `missing selector ${selector}`);
  return new Map(matches.flatMap(item => [...item.declarations]));
}

// Only resolve custom-property substitution; this deliberately does not claim
// to evaluate CSS layout, color functions, browser support, fonts or pixels.
function resolveVars(input, vars, chain = []) {
  let result = input;
  for (let start = result.indexOf('var('); start !== -1; start = result.indexOf('var(')) {
    let depth = 1, end = start + 4;
    for (; end < result.length && depth; end++) {
      if (result[end] === '(') depth++;
      if (result[end] === ')') depth--;
    }
    assert.equal(depth, 0, `unclosed var(): ${input}`);
    const [rawName, ...fallback] = splitOutside(result.slice(start + 4, end - 1), ',');
    const name = rawName.trim();
    assert.ok(!chain.includes(name), `cyclic custom property: ${[...chain, name].join(' -> ')}`);
    const value = vars.get(name) ?? (fallback.length ? fallback.join(',').trim() : undefined);
    assert.notEqual(value, undefined, `unresolved custom property ${name}`);
    result = result.slice(0, start) + resolveVars(value, vars, [...chain, name]) + result.slice(end);
  }
  return result;
}

const remotion = read('templates/src/video/RemotionRoot.tsx');
const imports = [...remotion.matchAll(/import\s+["']([^"']+\.css)["'];/g)].map(match => match[1]);
const base = read('templates/src/styles/base.css');
const defaults = rule(base, ':root');
const render = read('templates/src/video/render.css');
const subtitle = read('templates/src/components/Subtitle.css');
const themeIds = fs.readdirSync(path.join(root, 'themes')).filter(id => fs.existsSync(path.join(root, 'themes', id, 'tokens.css'))).sort();
const personality = ['--r-card', '--rule-w', '--rule-style', '--hero-num-font', '--hero-num-style', '--hero-num-weight', '--hero-num-track', '--stage-pad-x', '--stage-pad-y', '--shadow-stage'];
const primitives = [
  ['body', 'line-height', '--body-leading'],
  ['.display-en', 'font-weight', '--font-display-weight'],
  ['.label-mono', 'letter-spacing', '--label-tracking'],
  ['.card', 'border', '--card-border-w'],
  ['.card', 'border-radius', '--r-card'],
  ['.card', 'box-shadow', '--card-shadow'],
  ['.rule', 'border-top', '--rule-w'],
  ['.rule', 'border-top', '--rule-style'],
  ['.hero-num', 'font-family', '--hero-num-font'],
  ['.hero-num', 'font-style', '--hero-num-style'],
  ['.hero-num', 'font-weight', '--hero-num-weight'],
  ['.hero-num', 'letter-spacing', '--hero-num-track'],
  ['.scene-pad', 'padding', '--stage-pad-y'],
  ['.scene-pad', 'padding', '--stage-pad-x'],
  ['.stage-frame', 'box-shadow', '--shadow-stage'],
  ['.stage-frame::after', 'background-image', '--surface-pattern'],
  ['.stage-frame::after', 'background-size', '--surface-pattern-size'],
  ['.stage-frame::after', 'opacity', '--surface-pattern-opacity'],
  ['.stage-frame::after', 'mix-blend-mode', '--surface-pattern-blend'],
];

function rootCascade(theme) {
  let cascade = new Map();
  for (const file of imports) {
    if (file === '../styles/base.css') cascade = new Map([...cascade, ...defaults]);
    if (file === '../styles/tokens.css') cascade = new Map([...cascade, ...theme]);
  }
  return cascade;
}

test('entrypoint imports theme after defaults and render chrome last', () => {
  for (const file of ['../styles/base.css', '../styles/tokens.css', './render.css']) {
    assert.equal(imports.filter(item => item === file).length, 1, `${file} imported exactly once`);
  }
  assert.ok(imports.indexOf('../styles/base.css') < imports.indexOf('../styles/tokens.css'));
  assert.ok(imports.indexOf('../styles/tokens.css') < imports.indexOf('./render.css'));
  // .stage-frame and .render-stage have equal specificity. Model source order.
  let stage = new Map();
  for (const file of imports) {
    if (file === '../styles/base.css') stage = new Map([...stage, ...rule(base, '.stage-frame')]);
    if (file === './render.css') stage = new Map([...stage, ...rule(render, '.render-stage')]);
  }
  assert.equal(stage.get('position'), 'relative');
  assert.equal(stage.get('box-shadow'), 'none');
  assert.equal(stage.get('border-radius'), '0');
  assert.equal(stage.get('transform'), 'none');
});

test('all 60 preset token files participate in stage/UI token coverage', () => assert.equal(themeIds.length, 60));

let distinctOverrideCount = 0;
for (const id of themeIds) {
  test(`${id}: authored personality wins and primitive variables resolve`, () => {
    const theme = rule(read(`themes/${id}/tokens.css`), ':root');
    const cascade = rootCascade(theme);
    assert.ok(personality.filter(name => theme.has(name)).length >= 8, `${id} authors multiple personality controls`);
    for (const name of personality) assert.ok(cascade.has(name), `${id}: ${name} is authored or has a base fallback`);
    for (const [name, value] of theme) {
      assert.equal(cascade.get(name), value, `${id}: ${name} must not be overwritten by base.css`);
      assert.ok(resolveVars(value, cascade).length > 0, `${id}: ${name} resolves`);
      if (defaults.has(name) && defaults.get(name) !== value) distinctOverrideCount++;
    }
    for (const [selector, property, token] of primitives) {
      const value = rule(base, selector).get(property);
      assert.ok(value?.includes(`var(${token}`), `${selector} ${property} consumes ${token}`);
      assert.ok(resolveVars(value, cascade).length > 0, `${id}: ${selector} ${property} resolves`);
    }
    for (const [name, value] of defaults) {
      if (!theme.has(name)) assert.equal(cascade.get(name), value, `${id}: keeps absent-token default ${name}`);
    }
  });
}

test('optional decorative properties have explicit safe static fallbacks', () => {
  const empty = new Map();
  assert.equal(resolveVars('var(--r-lg)', defaults), '24px', 'large radius step remains available to theme aliases');
  for (const [selector, property, expected] of [
    ['.stage-frame', 'border', 'none'],
    ['.stage-frame', 'border-radius', '0'],
    ['.stage-frame::after', 'background-image', 'none'],
    ['.stage-frame::after', 'background-size', 'auto'],
    ['.stage-frame::after', 'opacity', '1'],
    ['.stage-frame::after', 'mix-blend-mode', 'normal'],
    ['.stage-frame::before', 'background', 'none'],
    ['.card', 'box-shadow', 'none'],
  ]) assert.equal(resolveVars(rule(base, selector).get(property), empty), expected);
  // A non-default author choice must reach the layer, not just exist in tokens.
  const blend = rule(base, '.stage-frame::after').get('mix-blend-mode');
  assert.equal(resolveVars(blend, new Map([['--surface-pattern-blend', 'multiply']])), 'multiply');
});

test('new personality hooks change only the intended primitives and preserve absent-token defaults', () => {
  const fallbackVars = new Map([...defaults, ['--rule', '#123456']]);
  for (const [selector, property, token, authored, fallback, expected] of [
    ['.card', 'border', '--card-border-w', '4px', '1px solid #123456', '4px solid #123456'],
    ['.display-en', 'font-weight', '--font-display-weight', '300', '700', '300'],
    ['body', 'line-height', '--body-leading', '1.5', 'normal', '1.5'],
    ['.label-mono', 'letter-spacing', '--label-tracking', '0.08em', '0.22em', '0.08em'],
  ]) {
    const expression = rule(base, selector).get(property);
    assert.equal(resolveVars(expression, fallbackVars), fallback, `${selector} keeps its previous default`);
    assert.equal(resolveVars(expression, new Map([...fallbackVars, [token, authored]])), expected, `${selector} consumes the authored hook`);
  }
  assert.equal(rule(base, '.hero-num').get('font-weight'), 'var(--hero-num-weight)');
  assert.equal(rule(base, '.serif-cn').get('font-weight'), '700');
  assert.equal(rule(base, '.kicker').get('letter-spacing'), '0.18em');
  assert.equal(rule(base, '.card-glass').get('border'), 'var(--bw-1) solid var(--card-glass-border, rgba(255, 255, 255, 0.12))');
});

test('portrait subtitles preserve 27% inset at current and legacy stage heights', () => {
  const safeArea = rule(subtitle, '.stage-frame[data-format="portrait"] .subtitle-safe-area');
  assert.equal(safeArea.get('bottom'), '27%');
  assert.equal(rule(base, '.scene').get('position'), 'absolute');
  assert.equal(rule(base, '.scene').get('inset'), '0');
  assert.match(remotion, /style=\{\{\s*width:\s*VIDEO_FORMAT\.width,\s*height:\s*VIDEO_FORMAT\.height\s*\}\}/);
  assert.doesNotMatch(stripComments(read('templates/src/components/Subtitle.tsx')), /\bstyle\s*=/, 'inline subtitle styles must not bypass the shared CSS contract');
  const ratio = Number.parseFloat(safeArea.get('bottom')) / 100;
  for (const [height, expectedBottom] of [[1920, 518.4], [3200, 864], [1280, 345.6]]) {
    const inset = height * ratio;
    assert.ok(Math.abs(inset - expectedBottom) < 1e-9);
    const subtitleBottom = (height - inset) / height;
    assert.ok(Math.abs(subtitleBottom - 0.73) < 1e-9);
    assert.ok(subtitleBottom <= 0.75, 'subtitle bottom stays above the 75% redline');
    assert.ok(Math.abs(0.82 - subtitleBottom - 0.09) < 1e-9, '9% gap before the platform UI band');
  }
  // Deliberately preserve the existing landscape offset and all text sizing.
  assert.equal(rule(subtitle, '.subtitle-safe-area').get('bottom'), '76px');
  assert.equal(safeArea.get('padding'), '0 84px');
  assert.equal(rule(subtitle, '.stage-frame[data-format="portrait"] .subtitle-box').get('font-size'), '52px');
});

test('cascade regression is meaningful, not a token-count-only check', t => {
  assert.ok(distinctOverrideCount >= 56, 'authored values must differ from defaults across the preset set');
  t.diagnostic(`${themeIds.length} themes checked; ${distinctOverrideCount} differing authored/default values protected. Source and numeric model only; no browser, font, layout, pixel or aesthetic validation.`);
});
