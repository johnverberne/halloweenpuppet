import {
  Color,
  DirectionalLight,
  FogExp2,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { HalloweenFigureId, TrackingMode } from '@halloweenpuppet/shared';
import { AvatarController } from './AvatarController';
import { HalloweenFace } from './HalloweenFace';
import { HumanoidSkeleton } from './HumanoidSkeleton';
import { MotionSmoothing } from './MotionSmoothing';
import { SkeletonMapper } from './SkeletonMapper';

export const DEFAULT_VRM_URL =
  'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@v3.4.2/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

export class StageScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly skeleton = new HumanoidSkeleton();
  readonly halloweenFace = new HalloweenFace();
  readonly smoothing = new MotionSmoothing();
  readonly controller: AvatarController;
  private vrm: VRM | null = null;
  private lastTime = performance.now();
  private trackingMode: TrackingMode = 'body';
  private layout: 'stage' | 'music' = 'stage';
  private audioLipSync = false;
  private showSkeleton = true;
  private showVrm = true;
  private readonly moon: Mesh;
  private readonly moonLight: PointLight;
  private readonly grid: GridHelper;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(new Color('#141018'));
    this.scene.background = new Color('#141018');

    this.camera = new PerspectiveCamera(35, 1, 0.1, 50);
    this.camera.position.set(0, 1.35, 3.4);

    const hemi = new HemisphereLight('#c9d4ff', '#2a1d18', 1.1);
    const key = new DirectionalLight('#fff4d6', 1.6);
    key.position.set(1.4, 3.2, 2.2);
    const rim = new DirectionalLight('#7CFFB2', 0.35);
    rim.position.set(-2.2, 1.4, -1.5);
    this.scene.add(hemi, key, rim);

    this.grid = new GridHelper(8, 16, '#3b3344', '#241e2a');
    this.scene.add(this.grid);
    this.scene.add(this.skeleton.root);
    this.scene.add(this.halloweenFace.root);
    this.halloweenFace.setVisible(false);

    this.moon = new Mesh(
      new SphereGeometry(0.35, 16, 16),
      new MeshStandardMaterial({
        color: '#fff4c8',
        emissive: '#ffe7a3',
        emissiveIntensity: 1.2,
        roughness: 1,
      }),
    );
    this.moon.position.set(-2.4, 3.1, -3.2);
    this.moon.visible = false;
    this.moonLight = new PointLight('#ffd9a0', 0.8, 12);
    this.moonLight.position.copy(this.moon.position);
    this.moonLight.visible = false;
    this.scene.add(this.moon, this.moonLight);

    this.controller = new AvatarController(
      new SkeletonMapper(),
      this.smoothing,
      null,
      this.skeleton,
      this.halloweenFace,
    );
    this.resize();
  }

  async loadVrm(url = DEFAULT_VRM_URL): Promise<void> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM | undefined;
    if (!vrm) {
      throw new Error('VRM ontbreekt in geladen bestand');
    }
    this.clearVrm();
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    if (vrm.meta?.metaVersion === '0') {
      VRMUtils.rotateVRM0(vrm);
    }
    vrm.scene.traverse((object) => {
      object.frustumCulled = false;
    });
    this.vrm = vrm;
    this.scene.add(vrm.scene);
    this.controller.setVrm(vrm);
    this.applyVisibility();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setLayout(layout: 'stage' | 'music'): void {
    this.layout = layout;
    this.camera.fov = layout === 'music' ? 32 : 35;
    this.camera.updateProjectionMatrix();
    this.applyVisibility();
  }

  setAudioLipSync(active: boolean): void {
    this.audioLipSync = active;
    this.applyVisibility();
  }

  setFigure(id: HalloweenFigureId): void {
    this.halloweenFace.setFigure(id);
  }

  setTrackingMode(mode: TrackingMode): void {
    this.trackingMode = mode;
    this.applyVisibility();
  }

  setShowSkeleton(visible: boolean): void {
    this.showSkeleton = visible;
    this.applyVisibility();
  }

  setShowAvatar(visible: boolean): void {
    this.showVrm = visible;
    this.applyVisibility();
  }

  resize(width = this.renderer.domElement.clientWidth, height = this.renderer.domElement.clientHeight): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(safeWidth, safeHeight, false);
  }

  render(now = performance.now()): void {
    const delta = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.vrm?.update(delta);
    if (this.trackingMode === 'face' || this.layout === 'music') {
      this.camera.position.set(0, 1.24, this.layout === 'music' ? 1.55 : 1.7);
      this.camera.lookAt(0, 1.2, 0);
    } else {
      this.camera.position.set(0, 1.35, 3.4);
      this.camera.lookAt(0, 1.05, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearVrm();
    this.renderer.dispose();
  }

  private applyVisibility(): void {
    const showHalloween = this.trackingMode === 'face' || this.layout === 'music' || this.audioLipSync;
    this.halloweenFace.setVisible(showHalloween);
    this.skeleton.setVisible(!showHalloween && this.showSkeleton);
    if (this.vrm) {
      this.vrm.scene.visible = !showHalloween && this.showVrm;
    }
    this.grid.visible = !showHalloween;
    this.moon.visible = showHalloween;
    this.moonLight.visible = showHalloween;
    this.scene.background = new Color(showHalloween ? '#09070d' : '#141018');
    this.scene.fog = showHalloween ? new FogExp2('#09070d', 0.12) : null;
    this.renderer.setClearColor(showHalloween ? '#09070d' : '#141018');
  }

  private clearVrm(): void {
    if (!this.vrm) {
      return;
    }
    this.scene.remove(this.vrm.scene);
    VRMUtils.deepDispose(this.vrm.scene);
    this.vrm = null;
    this.controller.setVrm(null);
  }
}
