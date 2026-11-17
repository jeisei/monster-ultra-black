import gsap from 'gsap';
import { poses } from './poses';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SmoothProgress, smoothStep } from './smooth-progress';
import type { CanStage } from '../scene/create-scene';
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export function createScrollStory(stage: CanStage): () => void {
  const media = gsap.matchMedia();
  const lastScene = poses.length - 1;
  let initialized = false;
  media.add(
    {
      desktop: '(min-width: 700px)',
      mobile: '(max-width: 699px)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const mobile = !!context.conditions?.mobile;
      const reduced = !!context.conditions?.reduce;
      const state = { ...poses[0] };
      const driver = new SmoothProgress(mobile ? 18 : 14);
      const copies = [...document.querySelectorAll<HTMLElement>('.scene-copy')];
      const controls = copies.map((copy) => [
        ...copy.querySelectorAll<HTMLElement>('a, summary, button, [data-scroll-region]'),
      ]);
      const root = document.documentElement;
      const style = root.style;
      let timeline: gsap.core.Timeline | undefined;
      let trigger: ScrollTrigger | undefined;
      if (!reduced) root.classList.add('motion-enabled');
      if (!initialized) {
        // The browser may resolve a hash against the pre-WebGL reading layout.
        // Reapply it once after the cinematic layout is in place, before rendering.
        const anchor = [...document.querySelectorAll<HTMLElement>('.story-scene')].find(
          (section) => `#${section.id}` === window.location.hash,
        );
        if (anchor) window.scrollTo({ top: anchor.offsetTop, behavior: 'instant' });
        initialized = true;
      }

      const apply = () => {
        // svh stays stable when mobile browser chrome opens or closes.
        const mobileDistance = 0.51 + 0.12 * smoothStep((740 - stage.viewport.height) / 73);
        const mobileOffset = 0.205 + 0.075 * smoothStep((667 - stage.viewport.height) / 99);
        const compact = Math.max(0, Math.min(1, (600 - stage.viewport.height) / 220));
        const distance = mobile
          ? mobileDistance + (state.distance - 0.38) * 0.25 + state.settle * 0.08
          : state.distance + compact * 0.12;
        stage.camera.position.z = distance;
        const viewHeight = 2 * distance * Math.tan((stage.camera.fov * Math.PI) / 360);
        const viewWidth = viewHeight * stage.camera.aspect;
        stage.root.position.set(
          mobile ? viewWidth * state.x * 0.09 : viewWidth * state.x,
          mobile
            ? -viewHeight * (mobileOffset * (1 - state.settle) + 0.04 * state.settle)
            : state.height * (1 - compact * 0.7),
          0,
        );
        stage.root.rotation.set(state.pitch, state.yaw, state.roll);
        Object.assign(stage.focus, {
          strength: state.focus,
          center: state.center,
          sweep: state.sweep,
          sheen: state.sheen,
        });
        stage.key.intensity = 1.65 + state.focus * 0.45;
        stage.rim.intensity = 3.4 - state.focus * 2.4;
        style.setProperty('--label-focus', String(state.focus));
        style.setProperty('--glow', String(state.glow));
        style.setProperty('--beam-x', `${state.beam}%`);
        style.setProperty('--beam-angle', `${state.angle}deg`);
        style.setProperty('--settle', String(state.settle));
        style.setProperty('--story-time', String(driver.value * lastScene));
        style.setProperty('--story-progress', String(driver.value));
        if (!reduced)
          copies.forEach((copy, index) => {
            const time = driver.value * lastScene;
            const enter = index === 0 ? 1 : smoothStep((time - index + 0.32) / 0.24);
            const leave = index === lastScene ? 1 : 1 - smoothStep((time - index - 0.38) / 0.24);
            const alpha = enter * leave;
            copy.style.opacity = String(alpha);
            copy.style.transform = `translate3d(0, ${(1 - alpha) * 10}px, 0)`;
            copy.style.pointerEvents = alpha > 0.5 ? 'auto' : 'none';
            // Opacity preserves the entire reading order for assistive technology.
            controls[index].forEach((control) => {
              control.tabIndex = alpha > 0.5 ? 0 : -1;
            });
          });
        stage.render();
      };
      const synchronize = () => {
        if (trigger) driver.target = trigger.progress;
        apply();
      };
      const tick = (_time: number, delta: number) => {
        if (document.hidden || reduced) return;
        const previous = driver.value;
        driver.step(delta / 1000);
        if (previous !== driver.value) {
          timeline?.progress(driver.value);
          apply();
        }
      };
      if (!reduced) {
        timeline = gsap.timeline({ paused: true });
        poses.slice(1).forEach((pose, i) => {
          const hold = i === 3 ? 0.26 : i === 0 ? 0.16 : 0.08;
          timeline!.to(state, { ...pose, duration: 1 - hold, ease: smoothStep }, i + hold);
        });
        trigger = ScrollTrigger.create({
          trigger: '#story',
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            driver.target = self.progress;
          },
          // Refresh can fire while a phone's toolbar moves. Preserve momentum.
          onRefresh: (self) => {
            driver.target = self.progress;
          },
        });
        driver.reset(trigger.progress);
        timeline.progress(driver.value);
        gsap.ticker.add(tick);
      }
      apply();
      const resume = () => {
        if (!document.hidden) synchronize();
      };
      const stopResize = stage.onResize(synchronize);
      document.addEventListener('visibilitychange', resume);
      return () => {
        gsap.ticker.remove(tick);
        trigger?.kill();
        timeline?.kill();
        stopResize();
        document.removeEventListener('visibilitychange', resume);
        root.classList.remove('motion-enabled');
        copies.forEach((copy) => {
          ['opacity', 'visibility', 'transform', 'pointer-events'].forEach((name) =>
            copy.style.removeProperty(name),
          );
          copy
            .querySelectorAll<HTMLElement>('a, summary, button')
            .forEach((el) => el.removeAttribute('tabindex'));
          copy
            .querySelectorAll<HTMLElement>('[data-scroll-region]')
            .forEach((el) => (el.tabIndex = 0));
        });
        [
          '--label-focus',
          '--glow',
          '--beam-x',
          '--beam-angle',
          '--settle',
          '--story-time',
          '--story-progress',
        ].forEach((name) => style.removeProperty(name));
      };
    },
  );
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  return () => media.revert();
}
