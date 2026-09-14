import { Quaternion, Vector3 } from 'three';
import type { ExaggerationPresetId } from '@halloweenpuppet/shared';
import { EXAGGERATION_PRESETS } from '@halloweenpuppet/shared';
import type { HalloweenFaceDrive } from './HalloweenFace';
import type { BoneName, MappedPose } from './types';

export interface ExaggerationGains {
  mouth: number;
  eye: number;
  brow: number;
  head: number;
  arm: number;
}

export const EXAGGERATION_GAINS: Record<ExaggerationPresetId, ExaggerationGains> = {
  normal: { mouth: 1, eye: 1, brow: 1, head: 1, arm: 1 },
  cartoon: { mouth: 1.35, eye: 1.2, brow: 1.25, head: 1.15, arm: 1.2 },
  halloween: { mouth: 1.5, eye: 1.25, brow: 1.3, head: 1.2, arm: 1.15 },
  extreme: { mouth: 1.85, eye: 1.45, brow: 1.5, head: 1.35, arm: 1.4 },
};

const ARM_BONES: BoneName[] = [
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
];

const HEAD_BONES: BoneName[] = ['head', 'neck'];
const ARM_MAX_RAD = 2.55;
const HEAD_MAX_RAD = 1.15;
const NECK_MAX_RAD = 0.9;

const AXIS = new Vector3();

export function exaggerationLabel(id: ExaggerationPresetId): string {
  return EXAGGERATION_PRESETS.find((preset) => preset.id === id)?.label ?? id;
}

export class MotionExaggeration {
  private preset: ExaggerationPresetId = 'halloween';
  private gains: ExaggerationGains = EXAGGERATION_GAINS.halloween;

  setPreset(id: ExaggerationPresetId): void {
    this.preset = id;
    this.gains = EXAGGERATION_GAINS[id];
  }

  getPreset(): ExaggerationPresetId {
    return this.preset;
  }

  applyToPose(pose: MappedPose): MappedPose {
    const rotations: MappedPose['rotations'] = { ...pose.rotations };
    for (const name of ARM_BONES) {
      const source = rotations[name];
      if (source) {
        rotations[name] = scaleQuaternion(source, this.gains.arm, ARM_MAX_RAD);
      }
    }
    for (const name of HEAD_BONES) {
      const source = rotations[name];
      if (source) {
        const max = name === 'neck' ? NECK_MAX_RAD : HEAD_MAX_RAD;
        rotations[name] = scaleQuaternion(source, this.gains.head, max);
      }
    }
    return {
      rotations,
      hipsPosition: pose.hipsPosition.clone(),
    };
  }

  applyToDrive(drive: HalloweenFaceDrive): HalloweenFaceDrive {
    return {
      ...drive,
      head: scaleQuaternion(drive.head, this.gains.head, HEAD_MAX_RAD),
      jawOpen: clamp01(drive.jawOpen * this.gains.mouth),
      blinkLeft: clamp01(drive.blinkLeft * this.gains.eye),
      blinkRight: clamp01(drive.blinkRight * this.gains.eye),
      smile: clamp01(drive.smile * this.gains.mouth),
      browUp: clamp01(drive.browUp * this.gains.brow),
      lookX: clamp(drive.lookX * this.gains.eye, -1, 1),
      lookY: clamp(drive.lookY * this.gains.eye, -1, 1),
      visemes: drive.visemes
        ? {
            aa: clamp01((drive.visemes.aa ?? 0) * this.gains.mouth),
            ee: clamp01((drive.visemes.ee ?? 0) * this.gains.mouth),
            ih: clamp01((drive.visemes.ih ?? 0) * this.gains.mouth),
            oh: clamp01((drive.visemes.oh ?? 0) * this.gains.mouth),
            ou: clamp01((drive.visemes.ou ?? 0) * this.gains.mouth),
          }
        : drive.visemes,
    };
  }

  applyToExpressions(expressions: Record<string, number>): Record<string, number> {
    const next: Record<string, number> = {};
    for (const [name, value] of Object.entries(expressions)) {
      next[name] = clamp01(value * gainForExpression(name, this.gains));
    }
    return next;
  }
}

function gainForExpression(name: string, gains: ExaggerationGains): number {
  if (name === 'aa' || name === 'oh' || name === 'ou' || name === 'happy' || name === 'sad') {
    return gains.mouth;
  }
  if (name === 'blinkLeft' || name === 'blinkRight') {
    return gains.eye;
  }
  if (name === 'surprised' || name === 'angry') {
    return gains.brow;
  }
  return 1;
}

function scaleQuaternion(source: Quaternion, gain: number, maxRad: number): Quaternion {
  const result = source.clone().normalize();
  if (Math.abs(gain - 1) < 1e-4) {
    return result;
  }
  const w = clamp(result.w, -1, 1);
  const angle = 2 * Math.acos(Math.abs(w));
  if (angle < 1e-5) {
    return result;
  }
  const sinHalf = Math.sqrt(1 - w * w);
  if (sinHalf < 1e-5) {
    return result;
  }
  AXIS.set(result.x / sinHalf, result.y / sinHalf, result.z / sinHalf).normalize();
  const scaled = clamp(angle * gain, 0, maxRad) * Math.sign(w || 1);
  return result.setFromAxisAngle(AXIS, scaled);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
