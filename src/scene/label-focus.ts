import { MeshStandardMaterial } from 'three';

export type LabelFocus = { strength: number; center: number; sweep: number; sheen: number };

/** Mask lives in the can's UVs; lighting and reflections are dimmed together. */
export function addLabelFocus(material: MeshStandardMaterial, body: boolean, focus: LabelFocus) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSweep = {
      get value() {
        return focus.sweep;
      },
    };
    shader.uniforms.uSheen = {
      get value() {
        return focus.sheen;
      },
    };
    shader.uniforms.uFocus = {
      get value() {
        return focus.strength;
      },
    };
    shader.uniforms.uFocusCenter = {
      get value() {
        return focus.center;
      },
    };
    shader.vertexShader = 'varying vec2 vFocusUv;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\nvFocusUv = uv;',
    );
    shader.fragmentShader =
      'varying vec2 vFocusUv;\nuniform float uSweep;\nuniform float uSheen;\nuniform float uFocus;\nuniform float uFocusCenter;\n' +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      float focusMask = 0.0;
      float ribbon = exp(-pow((vFocusUv.x - uSweep) / 0.045, 2.0));
      outgoingLight *= mix(1.0, 0.66 + ribbon * 0.85, uSheen * (1.0-uFocus));
      ${
        body
          ? `float du = abs(vFocusUv.x - 0.75);
      du = min(du, 1.0 - du);
      // A cylindrical rectangular panel: straight sides and a narrow soft feather.
      float horizontal = 1.0 - smoothstep(0.128, 0.143, du);
      float vertical = 1.0 - smoothstep(0.092, 0.108, abs(vFocusUv.y - uFocusCenter));
      focusMask = horizontal * vertical;`
          : ''
      }
      outgoingLight *= mix(1.0, mix(0.055, 1.18, focusMask), uFocus);
      outgoingLight += vec3(0.21, 0.008, 0.025) * focusMask * uFocus;
      #include <opaque_fragment>
    `,
    );
  };
  material.customProgramCacheKey = () => `label-focus-rectangle-v3-${body}`;
  material.needsUpdate = true;
}
