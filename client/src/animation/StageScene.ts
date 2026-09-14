import {
  Color,
  DirectionalLight,
  FogExp2,
  GridHelper,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import type { DanceCast, ExaggerationPresetId, HalloweenFigureId, TrackingMode } from '@halloweenpuppet/shared';
import { HalloweenEnvironment } from './HalloweenEnvironment';
import { StageActor } from './StageActor';

export { DEFAULT_VRM_URL } from './StageActor';

export type StageLayout = 'stage' | 'music' | 'dance' | 'halloween';

export class StageScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private actors: StageActor[] = [];
  private lastTime = performance.now();
  private trackingMode: TrackingMode = 'body';
  private layout: StageLayout = 'stage';
  private showSkeleton = true;
  private showVrm = true;
  private cast: DanceCast = 'solo';
  private figureA: HalloweenFigureId = 'pumpkin';
  private figureB: HalloweenFigureId = 'skeleton';
  private exaggerationPreset: ExaggerationPresetId = 'halloween';
  private readonly environment = new HalloweenEnvironment();
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
    this.environment.setVisible(false);
    this.scene.add(this.environment.root);

    this.rebuildActors(1);
    this.resize();
  }

  get controller() {
    return this.primary.controller;
  }

  get smoothing() {
    return this.primary.smoothing;
  }

  get halloweenFace() {
    return this.primary.halloweenFace;
  }

  get skeleton() {
    return this.primary.skeleton;
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  actor(index: number): StageActor | undefined {
    return this.actors[index];
  }

  actorCount(): number {
    return this.actors.length;
  }

  setCast(cast: DanceCast): void {
    this.cast = cast;
    this.rebuildActors(cast === 'duo' ? 2 : 1);
    this.applyVisibility();
  }

  setSmoothing(weight: number): void {
    for (const actor of this.actors) {
      actor.smoothing.setNewWeight(weight);
    }
  }

  async loadVrm(): Promise<void> {
    await Promise.all(this.actors.map((actor) => actor.loadVrm()));
  }

  setExaggerationPreset(id: ExaggerationPresetId): void {
    this.exaggerationPreset = id;
    for (const actor of this.actors) {
      actor.setExaggerationPreset(id);
    }
  }

  setLayout(layout: StageLayout): void {
    this.layout = layout;
    this.camera.fov = layout === 'stage' ? 35 : 32;
    this.camera.updateProjectionMatrix();
    this.layoutActors();
    this.applyVisibility();
  }

  setFigure(id: HalloweenFigureId): void {
    this.figureA = id;
    this.actors[0]?.setFigure(id);
  }

  setFigureB(id: HalloweenFigureId): void {
    this.figureB = id;
    this.actors[1]?.setFigure(id);
  }

  setTrackingMode(mode: TrackingMode): void {
    this.trackingMode = mode;
    for (const actor of this.actors) {
      actor.setTrackingMode(mode);
    }
    this.applyVisibility();
  }

  setShowSkeleton(visible: boolean): void {
    this.showSkeleton = visible;
    for (const actor of this.actors) {
      actor.setShowSkeleton(visible);
    }
  }

  setShowAvatar(visible: boolean): void {
    this.showVrm = visible;
    for (const actor of this.actors) {
      actor.setShowAvatar(visible);
    }
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
    for (const actor of this.actors) {
      actor.update(delta);
    }
    this.environment.update(delta);
    const dance = this.layout === 'dance';
    const close = this.halloweenOn();
    if (dance && !close) {
      this.camera.position.set(0, 1.45, 4.1);
      this.camera.lookAt(0, 1.35, 0);
    } else if (close) {
      const distance =
        this.layout === 'halloween' ? 2.05 : dance ? 2.35 : this.layout === 'music' ? 1.55 : 1.7;
      this.camera.position.set(0, 1.42, distance);
      this.camera.lookAt(0, 1.38, 0);
    } else {
      this.camera.position.set(0, 1.55, 3.2);
      this.camera.lookAt(0, 1.42, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const actor of this.actors) {
      this.scene.remove(actor.root);
      actor.dispose();
    }
    this.actors = [];
    this.environment.dispose();
    this.renderer.dispose();
  }

  private get primary(): StageActor {
    if (!this.actors[0]) {
      this.rebuildActors(1);
    }
    return this.actors[0];
  }

  private rebuildActors(count: number): void {
    for (const actor of this.actors) {
      this.scene.remove(actor.root);
      actor.dispose();
    }
    this.actors = Array.from({ length: count }, () => new StageActor());
    this.actors[0]?.setFigure(this.figureA);
    this.actors[1]?.setFigure(this.figureB);
    for (const actor of this.actors) {
      actor.setShowSkeleton(this.showSkeleton);
      actor.setShowAvatar(this.showVrm);
      actor.setTrackingMode(this.trackingMode);
      actor.setExaggerationPreset(this.exaggerationPreset);
      this.scene.add(actor.root);
    }
    this.layoutActors();
    void this.loadVrm().catch(() => undefined);
  }

  private layoutActors(): void {
    const duo = this.actors.length > 1;
    const close = this.halloweenOn();
    const gap = close ? 0.55 : 0.9;
    const scale = duo ? 0.92 : 1;
    this.actors.forEach((actor, index) => {
      actor.setScale(scale);
      actor.setOffset(duo ? (index === 0 ? -gap : gap) : 0);
    });
  }

  private halloweenOn(): boolean {
    return this.trackingMode === 'face' || this.layout === 'music' || this.layout === 'halloween';
  }

  private applyVisibility(): void {
    const showHalloween = this.halloweenOn();
    for (const actor of this.actors) {
      actor.setHalloweenVisible(showHalloween);
    }
    const dance = this.layout === 'dance';
    const themed = showHalloween || dance;
    this.grid.visible = !themed;
    this.environment.setVisible(themed);
    this.environment.setLite(dance && !showHalloween);
    const backdrop = themed ? '#09070d' : '#141018';
    this.scene.background = new Color(backdrop);
    this.scene.fog = themed ? new FogExp2('#09070d', 0.11) : null;
    this.renderer.setClearColor(backdrop);
    this.layoutActors();
  }
}
