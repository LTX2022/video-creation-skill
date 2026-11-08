// Pure Node import only. Does not instantiate WebGLRenderer or access a browser.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createParticleScene} from './scene.mjs';
assert.equal(THREE.REVISION, '180');
assert.equal(typeof THREE.Points, 'function');
assert.equal(typeof THREE.ShaderMaterial, 'function');
assert.equal(typeof createParticleScene, 'function');
console.log('PASS: three revision 180 and scene module import; no WebGL initialization');
