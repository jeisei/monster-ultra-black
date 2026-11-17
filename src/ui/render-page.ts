import { scenes, disclaimer, type StoryScene } from '../content/story';
import { nutrition, labelSections } from '../content/label';

function renderNutrition() {
  return `
    <dl class="nutrition-readout">
      ${nutrition
        .map(
          ({ label, value, unit }) => `
        <div>
          <dt>${label}</dt>
          <dd>${value}${unit ? `<span>${unit}</span>` : ''}</dd>
        </div>
      `,
        )
        .join('')}
    </dl>
    <p class="source-note">Per can, as shown in the concept artwork. Regional label not verified.</p>
  `;
}

function renderTranscript() {
  return `
    <details class="label-transcript">
      <summary>Read the label</summary>
      <div class="label-transcript__body" data-scroll-region tabindex="0" role="region" aria-label="Concept label transcript">
        <p>Transcribed from the supplied concept artwork. Figures and ingredient wording have not been verified against a regional product label.</p>
        ${labelSections
          .map(
            ({ title, paragraphs }) => `
          <h3>${title}</h3>
          ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}
        `,
          )
          .join('')}
      </div>
    </details>
  `;
}

function renderScene(scene: StoryScene) {
  const heading = scene.id === 'intro' ? 'h1' : 'h2';
  const title = scene.title.split('\n').join('<br />');

  return `
    <section class="story-scene story-scene--${scene.id}" id="${scene.id}" aria-labelledby="title-${scene.id}">
      <div class="scene-copy">
        <${heading} id="title-${scene.id}">${title}</${heading}>
        ${scene.description ? `<p class="scene-description">${scene.description}</p>` : ''}
        ${scene.id === 'label' ? renderNutrition() : ''}
        ${scene.id === 'return' ? renderTranscript() : ''}
      </div>
      ${
        scene.id === 'intro'
          ? `
        <a class="scroll-cue" href="#flavor">Scroll to explore <span aria-hidden="true">↓</span></a>
        <a class="label-jump" href="#label">Read the label</a>
      `
          : ''
      }
      ${
        scene.id === 'finale'
          ? `
        <div class="site-footer">
          <p>${disclaimer}</p>
          <a href="#intro">Replay the story <span aria-hidden="true">↑</span></a>
        </div>
      `
          : ''
      }
    </section>
  `;
}

export function renderPage(app: HTMLElement) {
  app.innerHTML = `
    <a class="skip-link" href="#story">Skip to story</a>
    <div class="story-progress" aria-hidden="true"></div>
    <div class="ambient" aria-hidden="true">
      <div class="light-ribbon"></div>
      <div class="floor-light"></div>
    </div>
    <header class="site-header">
      <a class="wordmark" href="#intro" aria-label="Monster Ultra Black, back to top">
        Monster <span>Ultra Black</span>
      </a>
      <span class="concept-mark">Independent concept</span>
    </header>
    <div class="stage" id="stage" aria-hidden="true">
      <div class="final-title">ULTRA<br />BLACK</div>
      <div class="ground-shadow"></div>
      <img class="stage-poster" src="/images/can-poster.png" alt="" />
      <div class="stage-canvas" id="stage-canvas"></div>
    </div>
    <main id="story" class="story">
      ${scenes.map(renderScene).join('')}
    </main>
    <p class="render-status" id="render-status" role="status" aria-live="polite">Loading 3D can…</p>
  `;
}
