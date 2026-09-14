import { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { ExaggerationPresetId, HalloweenFigureId, TrackingMode } from '@halloweenpuppet/shared';
import { AvatarController } from './AvatarController';
import { HalloweenFace } from './HalloweenFace';
import { HumanoidSkeleton } from './HumanoidSkeleton';
import { MotionSmoothing } from './MotionSmoothing';
import { SkeletonMapper } from './SkeletonMapper';
export const DEFAULT_VRM_URL =
  'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@v3.4.2/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

export class StageActor {
  readonly root = new Group();
  readonly skeleton = new HumanoidSkeleton();
  readonly halloweenFace = new HalloweenFace();
  readonly smoothing = new MotionSmoothing();
  readonly controller: AvatarController;
  private vrm: VRM | null = null;
  private showSkeleton = true;
  private showVrm = true;
  private trackingMode: TrackingMode = 'body';
  private halloweenVisible = false;

  constructor() {
    this.root.add(this.skeleton.root);
    this.root.add(this.halloweenFace.root);
    this.halloweenFace.setVisible(false);
    this.controller = new AvatarController(
      new SkeletonMapper(),
      this.smoothing,
      null,
      this.skeleton,
      this.halloweenFace,
    );
  }

  setOffset(x: number): void {
    this.root.position.x = x;
  }

  setScale(scale: number): void {
    this.root.scale.setScalar(scale);
  }

  setFigure(id: HalloweenFigureId): void {
    this.halloweenFace.setFigure(id);
  }

  setExaggerationPreset(id: ExaggerationPresetId): void {
    this.controller.setExaggerationPreset(id);
  }

  setTrackingMode(mode: TrackingMode): void {
    this.trackingMode = mode;
    this.applyVisibility();
  }

  setHalloweenVisible(visible: boolean): void {
    this.halloweenVisible = visible;
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
    this.root.add(vrm.scene);
    this.controller.setVrm(vrm);
    this.applyVisibility();
  }

  update(delta: number): void {
    this.vrm?.update(delta);
  }

  dispose(): void {
    this.clearVrm();
  }

  private applyVisibility(): void {
    this.halloweenFace.setVisible(this.halloweenVisible);
    this.skeleton.setVisible(!this.halloweenVisible && this.showSkeleton);
    if (this.vrm) {
      this.vrm.scene.visible = !this.halloweenVisible && this.showVrm;
    }
  }

  private clearVrm(): void {
    if (!this.vrm) {
      return;
    }
    this.root.remove(this.vrm.scene);
    VRMUtils.deepDispose(this.vrm.scene);
    this.vrm = null;
    this.controller.setVrm(null);
  }
}
