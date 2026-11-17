import { test, expect } from '@playwright/test';

async function waitForModel(page) {
  await expect(page.locator('html')).toHaveClass(/model-ready/);
}

async function preserveCanvas(page) {
  // Only the tests retain the framebuffer so they can compare rendered pixels.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return getContext.call(
        this,
        type,
        type === 'webgl2' ? { ...options, preserveDrawingBuffer: true } : options,
      );
    };
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`startup keeps the can and heading still at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await preserveCanvas(page);
    let releaseModel;
    const modelRequest = new Promise((resolve) => {
      releaseModel = resolve;
    });
    await page.route('**/*.glb', async (route) => {
      await modelRequest;
      await route.continue();
    });

    try {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const headingBefore = await page.locator('h1').boundingBox();
      await expect(page.locator('.stage-poster')).toHaveCSS('opacity', '0');
      await expect(page.locator('.stage-canvas')).toHaveCSS('opacity', '0');
      releaseModel();
      await waitForModel(page);
      const headingAfter = await page.locator('h1').boundingBox();
      expect(headingAfter.y).toBeCloseTo(headingBefore.y, 0);
      expect(headingAfter.width).toBeCloseTo(headingBefore.width, 0);

      const frames = await page.evaluate(async () => {
        const canvas = document.querySelector('.stage-canvas canvas');
        const sample = document.createElement('canvas');
        sample.width = 180;
        sample.height = 120;
        const context = sample.getContext('2d', { willReadFrequently: true });
        const frames = [];

        for (let frame = 0; frame < 16; frame++) {
          context.clearRect(0, 0, 180, 120);
          context.drawImage(canvas, 0, 0, 180, 120);
          const pixels = context.getImageData(0, 0, 180, 120).data;
          let hash = 2166136261;
          let visiblePixels = 0;
          for (let index = 0; index < pixels.length; index++) {
            hash = Math.imul(hash ^ pixels[index], 16777619);
            if (index % 4 === 3 && pixels[index] > 20) visiblePixels++;
          }
          frames.push({
            hash,
            visiblePixels,
            opacity: +getComputedStyle(canvas.parentElement).opacity,
          });
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        return frames;
      });

      expect(new Set(frames.map((frame) => frame.hash)).size).toBe(1);
      expect(frames.every((frame) => frame.visiblePixels > 100)).toBe(true);
      expect(
        frames.every((frame, index) => !index || frame.opacity >= frames[index - 1].opacity),
      ).toBe(true);
      await expect(page.locator('.stage-canvas')).toHaveCSS('opacity', '1');
    } finally {
      releaseModel();
      await page.unroute('**/*.glb');
    }
  });
}

test('resize preserves momentum and reverse scroll restores the first frame', async ({ page }) => {
  await preserveCanvas(page);
  await page.goto('/');
  await waitForModel(page);
  const firstFrame = await page.locator('canvas').evaluate((canvas) => canvas.toDataURL());
  const resize = await page.evaluate(async () => {
    window.scrollTo({ top: 2500, behavior: 'instant' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const before = getComputedStyle(document.documentElement).getPropertyValue('--story-time');
    window.dispatchEvent(new Event('resize'));
    const after = getComputedStyle(document.documentElement).getPropertyValue('--story-time');
    return { before, after };
  });
  expect(resize.after).toBe(resize.before);
  for (const top of [3000, 800, 4500, 1200, 99999, 0]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), top);
    await page.waitForTimeout(100);
  }
  await expect
    .poll(() => page.locator('canvas').evaluate((canvas) => canvas.toDataURL()))
    .toBe(firstFrame);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 700, height: 820 },
]) {
  test(`the label deep link is readable at ${viewport.width} × ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#label');
    await waitForModel(page);
    const copy = page.locator('#label .scene-copy');
    await expect(copy).toHaveCSS('opacity', '1');
    const bounds = await copy.boundingBox();
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('canvas')).toHaveCount(1);
  });
}

test('the transcript can be opened and scrolled with a keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#return');
  await waitForModel(page);
  await expect(page.locator('#return .scene-copy')).toHaveCSS('opacity', '1');
  await page.locator('summary').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const transcript = page.getByRole('region', { name: 'Concept label transcript' });
  await expect(transcript).toBeFocused();
  await page.keyboard.press('End');
  await expect.poll(() => transcript.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('reduced motion leaves every scene readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForModel(page);
  await expect(page.locator('html')).not.toHaveClass(/motion-enabled/);
  for (const copy of await page.locator('.scene-copy').all())
    await expect(copy).toHaveCSS('opacity', '1');
});

test('failed model loading keeps the poster and reading flow', async ({ page }) => {
  await page.route('**/*.glb', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/model-fallback/);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.stage-poster')).toHaveCSS('opacity', '1');
  for (const copy of await page.locator('.scene-copy').all())
    await expect(copy).toHaveCSS('opacity', '1');
});

test('a lost WebGL context falls back without an uncaught error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await waitForModel(page);
  await page.locator('canvas').evaluate((canvas) => {
    canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
  });
  await expect(page.locator('html')).toHaveClass(/model-fallback/);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});
