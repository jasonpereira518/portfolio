import { describe, expect, test } from 'vitest';
import { createInk, inkWidth } from '../../src/lib/ink';

const FRAME = 1000 / 60;

/** Total points across every stroke the sim returns. */
const count = (strokes: readonly (readonly unknown[])[]) => strokes.reduce((total, stroke) => total + stroke.length, 0);

describe('inkWidth', () => {
  test('is full width at the head and thins to nothing at the tail', () => {
    expect(inkWidth(0)).toBe(1);
    expect(inkWidth(1)).toBe(0);
    expect(inkWidth(1.5)).toBe(0);
  });

  test('tapers steadily: older ink is never wider than newer ink', () => {
    let previous = inkWidth(0);
    for (let t = 0.05; t <= 1; t += 0.05) {
      const width = inkWidth(t);
      expect(width).toBeLessThan(previous);
      previous = width;
    }
  });

  test('is zero for an age that has not happened yet', () => {
    expect(inkWidth(-0.2)).toBe(0);
  });
});

describe('createInk', () => {
  test('starts a stroke with one point at the pointer on the first step', () => {
    const sim = createInk();
    sim.pointerTo(100, 120);
    const strokes = sim.step(0);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toEqual([{ x: 100, y: 120, born: 0 }]);
  });

  test('the line lags behind the pointer and then catches up', () => {
    const sim = createInk();
    sim.pointerTo(0, 50);
    sim.step(0);
    sim.pointerTo(200, 50);
    let strokes = sim.step(FRAME);
    const head = strokes[0][strokes[0].length - 1];
    expect(head.x).toBeGreaterThan(0);
    expect(head.x).toBeLessThan(200);
    for (let now = FRAME * 2; now < FRAME * 60; now += FRAME) strokes = sim.step(now);
    const caught = strokes[0][strokes[0].length - 1];
    // A point is only laid after minStep (2 px) of travel, so the head can rest up to that far short of the pointer.
    expect(200 - caught.x).toBeLessThan(2);
    expect(caught.y).toBeCloseTo(50, 5);
  });

  test('adds no points while the pointer is still', () => {
    const sim = createInk({ life: 10_000 });
    sim.pointerTo(40, 40);
    sim.step(0);
    for (let now = FRAME; now < 1000; now += FRAME) sim.step(now);
    expect(count(sim.step(1000))).toBe(1);
  });

  test('points expire after their life, and the sim goes idle once released', () => {
    const sim = createInk({ life: 800 });
    sim.pointerTo(10, 10);
    sim.step(0);
    sim.release();
    expect(sim.active).toBe(true); // the point is still fading
    expect(count(sim.step(799))).toBe(1);
    expect(count(sim.step(800))).toBe(0);
    expect(sim.active).toBe(false);
  });

  test('a pointer that stays put while its trail fades leaves nothing behind, and moving again draws a fresh line', () => {
    const sim = createInk({ life: 500 });
    sim.pointerTo(10, 10);
    sim.step(0);
    for (let now = FRAME; now <= 600; now += FRAME) sim.step(now);
    expect(count(sim.step(700))).toBe(0);
    expect(sim.active).toBe(true); // the pointer is still down, ready to draw
    sim.pointerTo(300, 10);
    const strokes = sim.step(716);
    expect(strokes).toHaveLength(1);
    expect(strokes[0].length).toBeGreaterThan(0);
  });

  test('releasing stops new ink, and the next stroke does not join the old one', () => {
    const sim = createInk({ life: 800 });
    sim.pointerTo(0, 0);
    sim.step(0);
    sim.release();
    expect(count(sim.step(100))).toBe(1);

    sim.pointerTo(500, 500);
    const strokes = sim.step(200);
    expect(strokes).toHaveLength(2);
    expect(strokes[0]).toHaveLength(1);
    expect(strokes[1]).toEqual([{ x: 500, y: 500, born: 200 }]);
  });

  test('never holds more than maxPoints, dropping the oldest first', () => {
    const sim = createInk({ life: 10_000, maxPoints: 5, ease: 1, minStep: 1 });
    sim.pointerTo(0, 0);
    sim.step(0);
    let strokes = sim.step(FRAME);
    for (let x = 10; x <= 200; x += 10) {
      sim.pointerTo(x, 0);
      strokes = sim.step(FRAME * (x / 10 + 1));
    }
    expect(count(strokes)).toBe(5);
    expect(strokes[0][strokes[0].length - 1].x).toBe(200);
  });

  test('ignores moves smaller than minStep so a jittering hand does not clutter the line', () => {
    const sim = createInk({ life: 10_000, ease: 1, minStep: 5 });
    sim.pointerTo(0, 0);
    sim.step(0);
    sim.pointerTo(2, 0);
    sim.step(FRAME);
    sim.pointerTo(4, 0);
    expect(count(sim.step(FRAME * 2))).toBe(1);
    sim.pointerTo(6, 0);
    expect(count(sim.step(FRAME * 3))).toBe(2);
  });
});
