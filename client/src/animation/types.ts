import type { Quaternion, Vector3 } from 'three';

export const BONE_NAMES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

export interface MappedPose {
  rotations: Partial<Record<BoneName, Quaternion>>;
  hipsPosition: Vector3;
}
