import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { BlendShapeScore, TrackingFrame } from '@halloweenpuppet/shared';
import type { HalloweenFaceDrive } from './HalloweenFace';
import type { MappedPose } from './types';

export interface MappedFace {
  pose: MappedPose;
  expressions: Record<string, number>;
  drive: HalloweenFaceDrive;
}

const BLEND_TO_VRM: Array<[string, string]> = [
  ['jawOpen', 'aa'],
  ['mouthPucker', 'ou'],
  ['mouthFunnel', 'oh'],
  ['eyeBlinkLeft', 'blinkLeft'],
  ['eyeBlinkRight', 'blinkRight'],
  ['browInnerUp', 'surprised'],
];

function score(scores: Map<string, number>, name: string): number {
  return scores.get(name) ?? 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class FaceMapper {
  private readonly matrix = new Matrix4();
  private readonly euler = new Euler();
  private readonly head = new Quaternion();

  map(frame: TrackingFrame): MappedFace | null {
    if (!frame.face) {
      return null;
    }
    const expressions = this.mapExpressions(frame.blendShapes);
    const head = this.mapHead(frame.face.transformationMatrix);
    const neck = new Quaternion().slerpQuaternions(new Quaternion(), head, 0.4);
    const localHead = neck.clone().invert().multiply(head);
    return {
      pose: {
        rotations: {
          neck,
          head: localHead,
        },
        hipsPosition: new Vector3(),
      },
      expressions,
      drive: {
        head,
        jawOpen: expressions.aa ?? 0,
        blinkLeft: expressions.blinkLeft ?? 0,
        blinkRight: expressions.blinkRight ?? 0,
        smile: expressions.happy ?? 0,
        browUp: expressions.surprised ?? 0,
        lookX: (expressions.lookRight ?? 0) - (expressions.lookLeft ?? 0),
        lookY: (expressions.lookUp ?? 0) - (expressions.lookDown ?? 0),
        glassesWear: frame.glasses?.present ? 1 : 0,
      },
    };
  }

  private mapExpressions(blendShapes: BlendShapeScore[]): Record<string, number> {
    const scores = new Map(blendShapes.map((item) => [item.categoryName, item.score]));
    const expressions: Record<string, number> = {};
    for (const [source, target] of BLEND_TO_VRM) {
      expressions[target as string] = clamp01(score(scores, source));
    }
    expressions.happy = clamp01((score(scores, 'mouthSmileLeft') + score(scores, 'mouthSmileRight')) / 2);
    expressions.angry = clamp01((score(scores, 'browDownLeft') + score(scores, 'browDownRight')) / 2);
    expressions.sad = clamp01((score(scores, 'mouthFrownLeft') + score(scores, 'mouthFrownRight')) / 2);
    expressions.lookLeft = clamp01((score(scores, 'eyeLookOutLeft') + score(scores, 'eyeLookInRight')) / 2);
    expressions.lookRight = clamp01((score(scores, 'eyeLookOutRight') + score(scores, 'eyeLookInLeft')) / 2);
    expressions.lookUp = clamp01((score(scores, 'eyeLookUpLeft') + score(scores, 'eyeLookUpRight')) / 2);
    expressions.lookDown = clamp01((score(scores, 'eyeLookDownLeft') + score(scores, 'eyeLookDownRight')) / 2);
    return expressions;
  }

  private mapHead(values: number[] | undefined): Quaternion {
    if (!values || values.length < 16) {
      return new Quaternion();
    }
    this.matrix.fromArray(values);
    this.euler.setFromRotationMatrix(this.matrix, 'YXZ');
    this.head.setFromEuler(new Euler(-this.euler.x, -this.euler.y, this.euler.z, 'YXZ'));
    return this.head.clone();
  }
}
