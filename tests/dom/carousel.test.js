// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const page = readFileSync(resolve('public/index.html'), 'utf8');
let carousel;
let rail;

function mockRailGeometry() {
  Object.defineProperty(rail, 'scrollWidth', { configurable: true, value: 1_712 });
  Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 1_064 });
  rail.style.columnGap = '16px';
  rail.firstElementChild.getBoundingClientRect = () => ({ width: 200 });
  rail.scrollTo = vi.fn(({ left }) => { rail.scrollLeft = left; });
}

function clickControl(label) {
  carousel.querySelector(`button[aria-label="${label}"]`).click();
}

function prepareCarouselDocument() {
  document.body.innerHTML = page;
  carousel = document.querySelector('#supporting');
  rail = carousel.querySelector('.supporting-grid');
  mockRailGeometry();
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  prepareCarouselDocument();
  await import('../../public/js/carousel.js');
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

it('loads the carousel as a deferred page script', () => {
  expect(document.querySelector('script[src="js/carousel.js"][defer]')).not.toBeNull();
});

it('moves forward by one card and its gap', () => {
  clickControl('Next');
  expect(rail.scrollTo).toHaveBeenLastCalledWith({ left: 216, behavior: 'smooth' });
});

it('moves backward by one card and its gap', () => {
  rail.scrollLeft = 432;
  clickControl('Previous');
  expect(rail.scrollLeft).toBe(216);
});

it('wraps from the end to the beginning', () => {
  rail.scrollLeft = 648;
  clickControl('Next');
  expect(rail.scrollLeft).toBe(0);
});

it('wraps from the beginning to the end', () => {
  clickControl('Previous');
  expect(rail.scrollLeft).toBe(648);
});

it.each([1, 2])('auto-advances after %i five-second intervals', (count) => {
  vi.advanceTimersByTime(count * 5_000 - 1);
  expect(rail.scrollLeft).toBe((count - 1) * 216);
  vi.advanceTimersByTime(1);
  expect(rail.scrollLeft).toBe(count * 216);
});

it('pauses while hovering over the carousel', () => {
  carousel.dispatchEvent(new MouseEvent('mouseenter'));
  vi.advanceTimersByTime(15_000);
  expect(rail.scrollTo).not.toHaveBeenCalled();
});

it('resumes auto-advance after leaving the carousel', () => {
  carousel.dispatchEvent(new MouseEvent('mouseenter'));
  vi.advanceTimersByTime(5_000);
  carousel.dispatchEvent(new MouseEvent('mouseleave'));
  vi.advanceTimersByTime(5_000);
  expect(rail.scrollLeft).toBe(216);
});

it('clamps movement to the end when a full step will not fit', () => {
  rail.scrollLeft = 600;
  clickControl('Next');
  expect(rail.scrollLeft).toBe(648);
});

it('keeps a rail without overflow at the beginning', () => {
  Object.defineProperty(rail, 'scrollWidth', { value: rail.clientWidth });
  clickControl('Next');
  clickControl('Previous');
  expect(rail.scrollLeft).toBe(0);
});
