import { Quaternion, Vector3 } from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { LoopAnimationId, TrackingFrame, TrackingMode } from '@halloweenpuppet/shared';
import type { LipSyncFrame } from '../audio/LipSyncProvider';
import { FaceMapper } from './FaceMapper';
import type { HalloweenFace } from './HalloweenFace';
import type { HumanoidSkeleton } from './HumanoidSkeleton';
import type { LoopSample } from './LoopAnimationPlayer';
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

  applyLoop(id: LoopAnimationId, sample: LoopSample, lipSync?: LipSyncFrame | null): MappedPose {
    if (this.lastLoopId !== id || this.lastMode !== sample.mode) {
      this.smoothing.reset();
      this.resetToRest();
      this.lastLoopId = id;
      this.lastMode = sample.mode;
    }
    const smoothed = this.smoothing.apply(sample.pose);
    this.skeleton.apply(smoothed);
    this.applyBonesToVrm(smoothed);
    this.halloweenFace.apply({
      ...sample.drive,
      head: this.smoothing.smoothQuaternion('halloween-head', sample.drive.head),
      jawOpen: this.smoothing.smoothScalar('hallo-jaw', sample.drive.jawOpen),
      blinkLeft: this.smoothing.smoothScalar('hallo-blink-l', sample.drive.blinkLeft),
      blinkRight: this.smoothing.smoothScalar('hallo-blink-r', sample.drive.blinkRight),
      smile: this.smoothing.smoothScalar('hallo-smile', sample.drive.smile),
      browUp: this.smoothing.smoothScalar('hallo-brow', sample.drive.browUp),
      lookX: this.smoothing.smoothScalar('hallo-look-x', sample.drive.lookX),
      lookY: this.smoothing.smoothScalar('hallo-look-y', sample.drive.lookY),
    });
    if (lipSync && sample.mode !== 'face') {
      this.applyAudioMouth(lipSync);
    } else if (sample.drive.visemes) {
      this.halloweenFace.applyMouth(sample.drive.jawOpen, sample.drive.visemes);
    }
    return smoothed;
  }

  apply(frame: TrackingFrame | null, lipSync?: LipSyncFrame | null): MappedPose | null {
    this.lastLoopId = null;
    if (!frame) {
      if (lipSync) {
        this.applyAudioMouth(lipSync);
      }
      return null;
    }
    const mode = frame.mode ?? (frame.face && !frame.pose ? 'face' : 'body');
    if (this.lastMode !== mode) {
      this.smoothing.reset();
      this.resetToRest();
      this.lastMode = mode;
    }

    const mapped = mode === 'face' ? this.applyFace(frame) : this.applyBody(frame);
    if (lipSync) {
      this.applyAudioMouth(lipSync);
    }
    return mapped;
  }

  private applyBody(frame: TrackingFrame): MappedPose | null {
    const mapped = this.mapper.map(frame);
    if (!mapped) {
      return null;
    }
    const smoothed = this.smoothing.apply(mapped);
    this.skeleton.apply(smoothed);
    this.applyBonesToVrm(smoothed);
    return smoothed;
  }

  private applyFace(frame: TrackingFrame): MappedPose | null {
    const mapped = this.faceMapper.map(frame);
    if (!mapped) {
      return null;
    }
    const smoothed = this.smoothing.apply(mapped.pose);
    this.skeleton.apply(smoothed);
    this.applyBonesToVrm(smoothed);
    this.applyExpressions(mapped.expressions);
    this.halloweenFace.apply({
      head: this.smoothing.smoothQuaternion('halloween-head', mapped.drive.head),
      jawOpen: this.smoothing.smoothScalar('hallo-jaw', mapped.drive.jawOpen),
      blinkLeft: this.smoothing.smoothScalar('hallo-blink-l', mapped.drive.blinkLeft),
      blinkRight: this.smoothing.smoothScalar('hallo-blink-r', mapped.drive.blinkRight),
      smile: this.smoothing.smoothScalar('hallo-smile', mapped.drive.smile),
      browUp: this.smoothing.smoothScalar('hallo-brow', mapped.drive.browUp),
      lookX: this.smoothing.smoothScalar('hallo-look-x', mapped.drive.lookX),
      lookY: this.smoothing.smoothScalar('hallo-look-y', mapped.drive.lookY),
      glassesWear: this.smoothing.smoothScalar('hallo-glasses', mapped.drive.glassesWear),
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

  private applyAudioMouth(lipSync: LipSyncFrame): void {
    const visemes = lipSync.visemes ?? {};
    this.halloweenFace.applyMouth(lipSync.mouthOpen, visemes);
    const manager = this.vrm?.expressionManager;
    if (!manager) {
      return;
    }
    const weights: Record<string, number> = {
      aa: visemes.aa ?? (lipSync.viseme === 'aa' ? lipSync.mouthOpen : 0),
      ee: visemes.ee ?? (lipSync.viseme === 'ee' ? lipSync.mouthOpen : 0),
      ih: visemes.ih ?? (lipSync.viseme === 'ih' ? lipSync.mouthOpen : 0),
      oh: visemes.oh ?? (lipSync.viseme === 'oh' ? lipSync.mouthOpen : 0),
      ou: visemes.ou ?? (lipSync.viseme === 'ou' ? lipSync.mouthOpen : 0),
    };
    for (const [name, value] of Object.entries(weights)) {
      if (!manager.getExpression(name)) {
        continue;
      }
      manager.setValue(name, this.smoothing.smoothScalar(`audio-${name}`, value));
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
