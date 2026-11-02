import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('compatibility script retains nine stages with independent fictional examples, not third-party transcript/identity', () => {
  const script = text('templates/script-templates/laoqi-douyin.md');
  assert.equal((script.match(/^### [1-9]\. /gm) || []).length, 9);
  assert.match(script, /douyin-laon/);
  assert.equal((script.match(/独立虚构示例/g) || []).length, 9);
  for (const forbidden of ['Agent Browser', 'Vercel Labs', '我是老七', 'npm install', 'npx install', '5.61']) assert.equal(script.includes(forbidden), false, forbidden);
});
test('visual recipe does not retain the historical account number', () => {
  assert.doesNotMatch(text('references/VISUAL-RECIPES.md'), /\d{11}/);
});
test('practical profile uses independent seven-stage fictional teaching example without fabricated benchmarks', () => {
  const script = text('templates/script-templates/douyin-skill-template.md');
  assert.match(script, /douyin-skill/);
  assert.equal((script.match(/^\| [1-7]\. /gm) || []).length, 7);
  assert.match(script, /独立虚构/);
  for (const forbidden of ['14样本实测', '5.2 字/秒', '3秒学会', '现在 1 秒钟搞定']) assert.equal(script.includes(forbidden), false);
});
