import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addLabelFocus, type LabelFocus } from './label-focus';

export type CanStage = {
  root: THREE.Group;
  camera: THREE.PerspectiveCamera;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  focus: LabelFocus;
  viewport: { width: number; height: number };
  resize: () => void;
  onResize: (callback: () => void) => () => void;
  render: () => void;
  destroy: () => void;
};

export async function createCanStage(host: HTMLElement): Promise<CanStage> {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.001, 10);
  camera.position.set(0, 0, 0.35);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.1;
  room.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-0.2, 0.2, 0.3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc3224b, 2.8);
  rim.position.set(0.2, 0.06, -0.2);
  scene.add(rim);
  const root = new THREE.Group();
  const focus: LabelFocus = { strength: 0, center: 0.3, sweep: 0.18, sheen: 0 };
  scene.add(root);

  const resizeListeners = new Set<() => void>();
  const viewport = { width: 0, height: 0 };
  let lastWidth = 0,
    lastHeight = 0,
    lastPixelRatio = 0;
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2);
    if (width === lastWidth && height === lastHeight && pixelRatio === lastPixelRatio) return;
    lastWidth = width;
    lastHeight = height;
    lastPixelRatio = pixelRatio;
    viewport.width = width;
    viewport.height = height;
    camera.aspect = width / height;
    camera.fov = window.matchMedia('(max-width: 699px)').matches ? 40 : 32;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    // Recompose the can with the new camera before drawing any resized frame.
    resizeListeners.forEach((callback) => callback());
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  try {
    const gltf = await loader.loadAsync('/models/ultra-black-mobile.glb');
    root.add(gltf.scene);
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial)
            addLabelFocus(material, object.name.startsWith('Can_Body'), focus);
          if (material instanceof THREE.MeshStandardMaterial && material.map) {
            material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          }
        }
      }
    });
  } catch (error) {
    observer.disconnect();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }

  const render = () => {
    if (!document.hidden) renderer.render(scene, camera);
  };
  return {
    root,
    camera,
    key,
    rim,
    focus,
    viewport,
    resize,
    render,
    onResize: (callback) => {
      resizeListeners.add(callback);
      return () => {
        resizeListeners.delete(callback);
      };
    },
    destroy: () => {
      observer.disconnect();
      resizeListeners.clear();
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
          material.dispose();
        }
      });
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
