# Architecture

The site uses Vite, TypeScript, Three.js and GSAP. It is a static page with one WebGL canvas and one can model. HTML sections provide the native scroll range; there is no virtual scroll or wheel interception.

## Startup and fallback

`main.ts` renders the HTML immediately, then loads the scene and motion modules. Before revealing the canvas it waits for the font and applies the current scroll pose. A single CSS opacity transition reveals the finished frame.

The fallback poster has a different projection from the live model. It is shown only when loading or WebGL fails; crossfading it into the model would cause a visible change of size. On failure, motion stops, the canvas is disposed and the page returns to normal document flow.

`prefers-reduced-motion` uses a static first-screen can and leaves all sections readable. Module cleanup removes observers, listeners, timelines and GPU resources.

## Scroll and composition

`content/story.ts` defines seven sections. `motion/poses.ts` supplies one pose for each section in the same order. The timeline holds each pose briefly, then interpolates to the next with a quintic easing function.

ScrollTrigger supplies a target progress between 0 and 1. `SmoothProgress` approaches that target using a critically damped response. One GSAP ticker drives the can, camera, lighting, background and text from the same value. The scene renders only when that value or the viewport changes.

Resize updates the camera before recomposing the scene. Refresh changes the target progress without resetting the current motion. Small mobile browser-toolbar resizes are ignored by ScrollTrigger; the stage uses `svh` to keep its composition stable.

Pose units:

- `yaw`, `pitch`, `roll`: radians. Yaw stays continuous across the full rotation.
- `height`, `distance`: metres in model space.
- `x`: horizontal offset as a fraction of the visible width.
- `focus`, `sheen`, `glow`, `settle`: effect weights.
- `center`, `sweep`: label texture coordinates.
- `beam`: background light position in percent; `angle`: degrees.

Mobile composition adjusts camera distance and vertical position separately. It is not a scaled-down desktop layout.

## Model and material

`create-scene.ts` loads `ultra-black-mobile.glb` with MeshoptDecoder. The model is about 489 KB, with a 2K WebP texture and roughly 19,000 triangles. Pixel ratio is capped at 1.5 on narrow screens and 2 elsewhere. The environment is generated locally with RoomEnvironment.

`label-focus.ts` extends the existing PBR material with `onBeforeCompile`. The rectangular mask follows the body's UVs. It dims both surface lighting and reflections outside the highlighted block. The source model and textures are not modified at runtime.

The mask centres are U=0.75, V=0.30 for nutrition and V=0.68 for ingredients. If the texture changes, check these coordinates against the new label.

## Editing

- Change copy in `src/content/`, markup in `src/ui/render-page.ts`, and layout in `src/styles/page.css`.
- Change the choreography in `src/motion/poses.ts`. Keep pose order aligned with section order.
- Keep the HTML label readout: tiny text on a rotating model cannot be the only source of information.
- Avoid adding another render loop or animating the same state from a second tween.
- Keep the exact portfolio disclaimer and the concept-artwork label on unverified values.

## Verification

Run `npm run check` and `npm run test:browser`. The browser suite preserves the WebGL framebuffer only for pixel comparisons; the production renderer does not. The suite checks that startup changes opacity without moving the object or heading, resize does not bypass smoothing, and reverse scroll returns to the same image.

Viewport checks are not physical-device performance measurements. The owner tested and approved the experience on an iPhone. No device-wide FPS guarantee is implied.
