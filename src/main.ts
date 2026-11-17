import './styles/page.css';
import { renderPage } from './ui/render-page';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing app root');
document.documentElement.classList.remove('model-ready', 'model-fallback');
renderPage(app);

const stageElement = document.querySelector<HTMLElement>('#stage-canvas')!;
const status = document.querySelector<HTMLElement>('#render-status')!;
let stopStory: (() => void) | undefined;
let destroyStage: (() => void) | undefined;
let disposed = false;

const showFallback = () => {
  stopStory?.();
  stopStory = undefined;
  destroyStage?.();
  destroyStage = undefined;
  document.documentElement.classList.remove('model-ready');
  document.documentElement.classList.add('model-fallback');
  status.textContent = '3D can unavailable. Showing the poster.';
};

Promise.all([import('./scene/create-scene'), import('./motion/create-scroll-story')])
  .then(async ([{ createCanStage }, { createScrollStory }]) => {
    const stage = await createCanStage(stageElement);
    if (disposed) {
      stage.destroy();
      return;
    }
    destroyStage = stage.destroy;
    // Prepare the actual scroll pose and typography before revealing the canvas.
    // The static fallback has a different projection and must not flash during startup.
    await document.fonts.ready;
    if (disposed) return;
    stopStory = createScrollStory(stage);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (disposed) return;
    stageElement
      .querySelector('canvas')
      ?.addEventListener('webglcontextlost', showFallback, { once: true });
    document.documentElement.classList.add('model-ready');
    status.textContent = '3D can loaded';
  })
  .catch((error: unknown) => {
    if (disposed) return;
    console.error('Can model unavailable:', error);
    showFallback();
  });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposed = true;
    stopStory?.();
    destroyStage?.();
    document.documentElement.classList.remove('model-ready', 'model-fallback');
  });
}
