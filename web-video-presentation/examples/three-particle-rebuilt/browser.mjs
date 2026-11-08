import {createParticleScene} from './scene.mjs';
const canvas = document.querySelector('canvas');
const status = document.querySelector('#status');
try {
  const scene = createParticleScene({canvas, width: 1280, height: 720, pixelRatio: 1});
  // Explicit seek-only harness: no wall clock, requestAnimationFrame or automatic playback.
  window.particleStudy = scene;
  window.renderAtFrame = (frame, fps = 30) => {
    const result = scene.renderAtFrame(frame, fps);
    status.textContent = `Source preview • ${result.stage} • ${result.time.toFixed(3)} s`;
    return result;
  };
  document.querySelector('#seek').addEventListener('input', event => window.renderAtFrame(Number(event.target.value), 30));
  window.renderAtFrame(0, 30);
} catch (error) {
  status.textContent = `Preview initialization failed: ${error.message}`;
  throw error;
}
