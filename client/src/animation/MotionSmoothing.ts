import { Quaternion, Vector3 } from 'three';
import { BONE_NAMES, type MappedPose } from './types';

const DEFAULT_NEW_WEIGHT = 0.35;

export class MotionSmoothing {
  private newWeight = DEFAULT_NEW_WEIGHT;
  private readonly rotations = new Map<string, Quaternion>();
  private readonly scalars = new Map<string, number>();
  private readonly hipsPosition = new Vector3();
  private hasHips = false;

  setNewWeight(weight: number): void {
    this.newWeight = Math.min(1, Math.max(0.05, weight));
  }

  apply(pose: MappedPose): MappedPose {
    const rotations: MappedPose['rotations'] = {};
    for (const name of BONE_NAMES) {
      const incoming = pose.rotations[name];
      if (!incoming) {
        continue;
      }
      const previous = this.rotations.get(name);
      if (!previous) {
        const stored = incoming.clone();
        this.rotations.set(name, stored);
        rotations[name] = stored.clone();
        continue;
      }
      previous.slerp(incoming, this.newWeight);
      rotations[name] = previous.clone();
    }

    if (!this.hasHips) {
      this.hipsPosition.copy(pose.hipsPosition);
      this.hasHips = true;
    } else {
      this.hipsPosition.lerp(pose.hipsPosition, this.newWeight);
    }

    return {
      rotations,
      hipsPosition: this.hipsPosition.clone(),
    };
  }

  smoothQuaternion(key: string, incoming: Quaternion): Quaternion {
    const previous = this.rotations.get(key);
    if (!previous) {
      const stored = incoming.clone();
      this.rotations.set(key, stored);
      return stored.clone();
    }
    previous.slerp(incoming, this.newWeight);
    return previous.clone();
  }

  smoothScalar(key: string, incoming: number): number {
    const previous = this.scalars.get(key);
    if (previous === undefined) {
      this.scalars.set(key, incoming);
      return incoming;
    }
    const next = previous * (1 - this.newWeight) + incoming * this.newWeight;
    this.scalars.set(key, next);
    return next;
  }

  reset(): void {
    this.rotations.clear();
    this.scalars.clear();
    this.hipsPosition.set(0, 0, 0);
    this.hasHips = false;
  }
}
