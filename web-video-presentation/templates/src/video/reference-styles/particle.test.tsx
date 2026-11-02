import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ParticleField} from './ParticleField';
import type {ReferenceStyleProps} from './common';

const content = {eyebrow: '', title: '让复杂的信息变成清楚而可执行的下一步', conclusion: '从变化中，看见关系与方向。', labels: []};
const defaults: ReferenceStyleProps = {frame: 180, fps: 30, durationInFrames: 360, width: 1920, height: 1080, content};
const styles = [{id: 'particle-depth-film', Component: ParticleField}];
const render = (Component: typeof ParticleField, props: Partial<ReferenceStyleProps> = {}) => renderToStaticMarkup(createElement(Component, {...defaults, ...props}));
const particleIds = (svg: string) => [...svg.matchAll(/data-particle-id="(\d+)"/g)].map(m => Number(m[1])).sort((a, b) => a - b);

for (const {id, Component} of styles) {
  test(`${id}: deterministic out-of-order frames, portrait, landscape and subtitle layouts`, () => {
    for (const [width, height] of [[1920, 1080], [1080, 1920], [1280, 720], [720, 1280]]) {
      for (const subtitleVisible of [false, true]) {
        const baseline = render(Component, {width, height, subtitleVisible, frame: 200});
        render(Component, {width, height, frame: 9});
        assert.equal(render(Component, {width, height, subtitleVisible, frame: 200}), baseline);
        assert.match(baseline, new RegExp(`data-preset-id="${id}"`));
        assert.match(baseline, /data-preset-family="reference"/);
        assert.match(baseline, /data-role="primary-subject"/);
        assert.ok(Number(baseline.match(/data-safe-bottom="([\d.]+)"/)?.[1]) <= height * (subtitleVisible ? (height > width ? .58 : .73) : .94) + .001);
        assert.doesNotMatch(baseline, /NaN|Infinity|undefined|<foreignObject|<image\b/);
        assert.ok([...baseline.matchAll(/<[a-zA-Z][\w:-]*(?:\s|>)/g)].length < 1800);
        assert.ok(baseline.includes('下一步'), 'Fitted title preserves final characters');
      }
    }
  });
  test(`${id}: alpha omits stage, retains the actual subject and localized text backings`, () => {
    const full = render(Component); const alpha = render(Component, {isOverlay: true, frame: 300});
    assert.match(full, /data-scene-background="true"/);
    assert.doesNotMatch(alpha, /data-scene-background/);
    assert.match(alpha, /data-role="primary-subject"/);
    assert.match(alpha, /data-role="localized-readability"/);
    const visibleRects = [...alpha.matchAll(/<rect\b[^>]*data-role="localized-readability"[^>]*>/g)];
    assert.equal(visibleRects.length, 2);
    for (const [rect] of visibleRects) {
      assert.ok(Number(rect.match(/height="([\d.]+)"/)?.[1]) < defaults.height * .35);
    }
  });
  test(`${id}: setup, action, hold differ; endpoints clamp and unusable text fails loudly`, () => {
    const a = render(Component, {frame: 0}); const b = render(Component, {frame: 180}); const c = render(Component, {frame: 359});
    assert.notEqual(a, b); assert.notEqual(b, c);
    assert.match(a, /data-phase="opening"/); assert.match(b, /data-phase="action"/); assert.match(c, /data-phase="hold"/);
    assert.equal(render(Component, {frame: -20}), a); assert.equal(render(Component, {frame: 999}), c);
    assert.doesNotThrow(() => render(Component, {frame: 0, durationInFrames: 1}));
    assert.throws(() => render(Component, {content: {...content, title: '长'.repeat(100)}}), RangeError);
  });
}
test('particle-depth-film: 1,248 stable surface IDs survive convergence and camera motion', () => {
  const a = particleIds(render(ParticleField, {frame: 10}));
  const b = particleIds(render(ParticleField, {frame: 200}));
  const c = particleIds(render(ParticleField, {frame: 359, isOverlay: true}));
  assert.equal(a.length, 1248); assert.equal(new Set(a).size, 1248);
  assert.deepEqual(a, b); assert.deepEqual(a, c);
});
