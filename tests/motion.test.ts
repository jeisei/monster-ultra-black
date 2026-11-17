import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SmoothProgress, smoothStep } from '../src/motion/smooth-progress.ts';

function response(fps: number, seconds: number) {
  const motion = new SmoothProgress();
  motion.target = 1;
  for (let frame = 0; frame < fps * seconds; frame++) motion.step(1 / fps);
  return motion.value;
}

test('smoothing has the same response at 60 and 120 Hz', () => {
  assert.ok(Math.abs(response(60, 0.3) - response(120, 0.3)) < 1e-9);
  assert.ok(response(60, 0.6) > 0.997);
});

test('a scroll jump settles without oscillating in either direction', () => {
  const motion = new SmoothProgress();
  motion.target = 1;
  let previous = motion.step(1 / 60);
  assert.ok(previous > 0 && previous < 0.03);

  for (let frame = 0; frame < 100; frame++) {
    const value = motion.step(1 / 60);
    assert.ok(value >= previous && value <= 1);
    previous = value;
  }

  motion.target = 0;
  for (let frame = 0; frame < 100; frame++) {
    const value = motion.step(1 / 60);
    assert.ok(value <= previous && value >= 0);
    previous = value;
  }
  assert.equal(motion.value, 0);
});

test('pose transitions leave reading holds with negligible velocity', () => {
  assert.equal(smoothStep(0), 0);
  assert.equal(smoothStep(1), 1);
  assert.ok(smoothStep(0.001) < 1e-7);
});
