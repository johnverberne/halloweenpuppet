import { Quaternion, Vector3 } from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { ExaggerationPresetId, LoopAnimationId, TrackingFrame, TrackingMode } from '@halloweenpuppet/shared';
import { FaceMapper } from './FaceMapper';
import type { HalloweenFace } from './HalloweenFace';
import type { HumanoidSkeleton } from './HumanoidSkeleton';
import type { LoopSample } from './LoopAnimationPlayer';
import { MotionExaggeration } from './MotionExaggeration';
import type { MotionSmoothing } from './MotionSmoothing';
import type { SkeletonMapper } from './SkeletonMapper';
import { BONE_NAMES, type BoneName, type MappedPose } from './types';

const VRM_BONES: Record<BoneName, VRMHumanBoneName> = {
  hips: 'hips',
  spine: 'spine',
  chest: 'chest',
  neck: 'neck',
  head: 'head',
  leftShoulder: 'leftShoulder',
  leftUpperArm: 'leftUpperArm',
  leftLowerArm: 'leftLowerArm',
  leftHand: 'leftHand',
  rightShoulder: 'rightShoulder',
  rightUpperArm: 'rightUpperArm',
  rightLowerArm: 'rightLowerArm',
  rightHand: 'rightHand',
  leftUpperLeg: 'leftUpperLeg',
  leftLowerLeg: 'leftLowerLeg',
  leftFoot: 'leftFoot',
  rightUpperLeg: 'rightUpperLeg',
  rightLowerLeg: 'rightLowerLeg',
  rightFoot: 'rightFoot',
};

export class AvatarController {
  private readonly faceMapper = new FaceMapper();
  private readonly exaggeration = new MotionExaggeration();
  private lastMode: TrackingMode | null = null;
  private lastLoopId: LoopAnimationId | null = null;

  constructor(
    private readonly mapper: SkeletonMapper,
    private readonly smoothing: MotionSmoothing,
    private vrm: VRM | null,
    private readonly skeleton: HumanoidSkeleton,
    private readonly halloweenFace: HalloweenFace,
  ) {}

  setVrm(vrm: VRM | null): void {
    this.vrm = vrm;
  }

  setExaggerationPreset(id: ExaggerationPresetId): void {
    this.exaggeration.setPreset(id);
  }

  applyLoop(id: LoopAnimationId, sample: LoopSample): MappedPose {
    if (this.lastLoopId !== id || this.lastMode !== sample.mode) {
      this.smoothing.reset();
      this.resetToRest();
      this.lastLoopId = id;
      this.lastMode = sample.mode;
    }
    const pose = this.exaggeration.applyToPose(sample.pose);
    const drive = this.exaggeration.applyToDrive(sample.drive);
    const smoothed = this.smoothing.apply(pose);
    this.skeleton.apply(smoothed);
    this.applyBonesToVrm(smoothed);
    this.halloweenFace.apply({
      ...drive,
      head: this.smoothing.smoothQuaternion('halloween-head', drive.head),
      jawOpen: this.smoothing.smoothScalar('hallo-jaw', drive.jawOpen),
      blinkLeft: this.smoothing.smoothScalar('hallo-blink-l', drive.blinkLeft),
      blinkRight: this.smoothing.smoothScalar('hallo-blink-r', drive.blinkRight),
      smile: this.smoothing.smoothScalar('hallo-smile', drive.smile),
      browUp: this.smoothing.smoothScalar('hallo-brow', drive.browUp),
      lookX: this.smoothing.smoothScalar('hallo-look-x', drive.lookX),
      lookY: this.smoothing.smoothScalar('hallo-look-y', drive.lookY),
    });
    if (drive.visemes) {
      this.halloweenFace.applyMouth(drive.jawOpen, drive.visemes);
    }
    return smoothed;
  }

  apply(frame: TrackingFrame | null): MappedPose | null {
    this.lastLoopId = null;
    if (!frame) {
      return null;
    }
    const mode = frame.mode ?? (frame.face && !frame.pose ? 'face' : 'body');
    if (this.lastMode !== mode) {
      this.smoothing.reset();
      this.resetToRest();
      this.lastMode = mode;
    }

    return mode === 'face' ? this.applyFace(frame) : this.applyBody(frame);
  }

  private applyBody(frame: TrackingFrame): MappedPose | null {
    const mapped = this.mapper.map(frame);
    if (!mapped) {
      return null;
    }
    const smoothed = this.smoothing.apply(this.exaggeration.applyToPose(mapped));
    this.skeleton.apply(smoothed);
    this.applyBonesToVrm(smoothed);
    return smoothed;
  }

  private applyFace(frame: TrackingFrame): MappedPose | null {
    const mapped = this.faceMapper.map(frame);
    if (!mapped) {
      return null;
    }
    const drive = this.exaggeration.applyToDrive(mapped.drive);
    const smoothed = this.smoothing.apply(this.exaggeration.applyToPose(mapped.pose));
    this.skeleton.apply(smoothed);
    this.applyBonesToVrm(smoothed);
    this.applyExpressions(this.exaggeration.applyToExpressions(mapped.expressions));
    this.halloweenFace.apply({
      head: this.smoothing.smoothQuaternion('halloween-head', drive.head),
      jawOpen: this.smoothing.smoothScalar('hallo-jaw', drive.jawOpen),
      blinkLeft: this.smoothing.smoothScalar('hallo-blink-l', drive.blinkLeft),
      blinkRight: this.smoothing.smoothScalar('hallo-blink-r', drive.blinkRight),
      smile: this.smoothing.smoothScalar('hallo-smile', drive.smile),
      browUp: this.smoothing.smoothScalar('hallo-brow', drive.browUp),
      lookX: this.smoothing.smoothScalar('hallo-look-x', drive.lookX),
      lookY: this.smoothing.smoothScalar('hallo-look-y', drive.lookY),
      glassesWear: this.smoothing.smoothScalar('hallo-glasses', drive.glassesWear),
    });
    return smoothed;
  }

  private applyBonesToVrm(pose: MappedPose): void {
    if (!this.vrm) {
      return;
    }
    for (const [name, rotation] of Object.entries(pose.rotations) as Array<
      [BoneName, (typeof pose.rotations)[BoneName]]
    >) {
      if (!rotation) {
        continue;
      }
      const node = this.vrm.humanoid.getNormalizedBoneNode(VRM_BONES[name]);
      if (node) {
        node.quaternion.copy(rotation);
      }
    }
    const hips = this.vrm.humanoid.getNormalizedBoneNode('hips');
    if (hips) {
      hips.position.x = pose.hipsPosition.x;
      hips.position.z = pose.hipsPosition.z;
    }
  }

  private applyExpressions(expressions: Record<string, number>): void {
    const manager = this.vrm?.expressionManager;
    if (!manager) {
      return;
    }
    for (const [name, value] of Object.entries(expressions)) {
      if (!manager.getExpression(name)) {
        continue;
      }
      manager.setValue(name, this.smoothing.smoothScalar(name, value));
    }
  }

  reset(): void {
    this.lastLoopId = null;
    this.lastMode = null;
    this.smoothing.reset();
    this.resetToRest();
  }

  private resetToRest(): void {
    const rest: MappedPose = {
      rotations: Object.fromEntries(BONE_NAMES.map((name) => [name, new Quaternion()])),
      hipsPosition: new Vector3(),
    };
    this.skeleton.apply(rest);
    this.applyBonesToVrm(rest);
    this.vrm?.expressionManager?.resetValues();
  }
}
