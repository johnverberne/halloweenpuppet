import { Euler, Quaternion, Vector3 } from 'three';
import { LOOP_ANIMATIONS, type LoopAnimationId, type TrackingMode } from '@halloweenpuppet/shared';
import type { HalloweenFaceDrive } from './HalloweenFace';
import { BONE_NAMES, type MappedPose } from './types';

export interface LoopSample {
  mode: TrackingMode;
  pose: MappedPose;
  drive: HalloweenFaceDrive;
}

export function loopAnimationMeta(id: LoopAnimationId | null) {
  return LOOP_ANIMATIONS.find((item) => item.id === id) ?? null;
}

export class LoopAnimationPlayer {
  sample(id: LoopAnimationId, nowMs: number): LoopSample {
    const t = nowMs / 1000;
    const meta = loopAnimationMeta(id);
    const mode = meta?.mode ?? 'face';
    const blink = blinkPulse(t);
    const pose = restPose();
    const drive = restDrive();

    switch (id) {
      case 'idle':
        applyIdle(pose, drive, t, blink);
        break;
      case 'talk':
        applyTalk(pose, drive, t, blink);
        break;
      case 'laugh':
        applyLaugh(pose, drive, t, blink);
        break;
      case 'nod':
        applyNod(pose, drive, t, blink);
        break;
      case 'wave':
        applyWave(pose, drive, t, blink);
        break;
    }

    return { mode, pose, drive };
  }
}

function applyIdle(pose: MappedPose, drive: HalloweenFaceDrive, t: number, blink: number): void {
  const breath = Math.sin(t * 1.6);
  drive.jawOpen = 0.04 + breath * 0.03;
  drive.blinkLeft = blink;
  drive.blinkRight = blink;
  drive.lookX = Math.sin(t * 0.35) * 0.22;
  drive.lookY = Math.sin(t * 0.22) * 0.12;
  drive.head = quat(breath * 0.04, Math.sin(t * 0.3) * 0.08, 0);
  pose.rotations.spine = quat(breath * 0.03, 0, 0);
  pose.rotations.neck = quat(breath * 0.05, Math.sin(t * 0.3) * 0.06, 0);
  pose.rotations.head = quat(0, Math.sin(t * 0.3) * 0.04, 0);
}

function applyTalk(pose: MappedPose, drive: HalloweenFaceDrive, t: number, blink: number): void {
  const chatter = Math.abs(Math.sin(t * 7.2));
  const phrase = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3));
  drive.jawOpen = 0.18 + chatter * 0.7 * phrase;
  drive.smile = 0.18 + Math.sin(t * 2.1) * 0.1;
  drive.blinkLeft = blink;
  drive.blinkRight = blink;
  drive.lookX = Math.sin(t * 0.55) * 0.18;
  drive.lookY = Math.sin(t * 0.4) * 0.08;
  drive.head = quat(Math.sin(t * 2.4) * 0.06, Math.sin(t * 1.1) * 0.12, 0);
  drive.visemes = {
    aa: chatter * phrase,
    ee: Math.max(0, Math.sin(t * 5.1)) * 0.35,
    oh: Math.max(0, Math.sin(t * 3.4 + 1)) * 0.4,
  };
  pose.rotations.neck = quat(Math.sin(t * 2.4) * 0.05, Math.sin(t * 1.1) * 0.1, 0);
  pose.rotations.head = quat(Math.sin(t * 2.4) * 0.04, Math.sin(t * 1.1) * 0.08, 0);
}

function applyLaugh(pose: MappedPose, drive: HalloweenFaceDrive, t: number, blink: number): void {
  const bounce = Math.abs(Math.sin(t * 9));
  drive.smile = 0.85;
  drive.jawOpen = 0.35 + bounce * 0.4;
  drive.browUp = 0.45;
  drive.blinkLeft = Math.max(blink, bounce * 0.25);
  drive.blinkRight = Math.max(blink, bounce * 0.25);
  drive.head = quat(bounce * 0.12, Math.sin(t * 3) * 0.08, Math.sin(t * 6) * 0.06);
  pose.rotations.spine = quat(bounce * 0.08, 0, 0);
  pose.rotations.chest = quat(bounce * 0.05, 0, 0);
  pose.rotations.neck = quat(bounce * 0.1, Math.sin(t * 3) * 0.06, 0);
  pose.rotations.leftShoulder = quat(0, 0, 0.15 + bounce * 0.12);
  pose.rotations.rightShoulder = quat(0, 0, -0.15 - bounce * 0.12);
}

function applyNod(pose: MappedPose, drive: HalloweenFaceDrive, t: number, blink: number): void {
  const nod = (Math.sin(t * 3.2) + 1) * 0.5;
  drive.jawOpen = 0.05;
  drive.blinkLeft = blink;
  drive.blinkRight = blink;
  drive.smile = 0.12;
  drive.head = quat(0.08 + nod * 0.28, 0, 0);
  pose.rotations.neck = quat(0.06 + nod * 0.18, 0, 0);
  pose.rotations.head = quat(nod * 0.16, 0, 0);
}

function applyWave(pose: MappedPose, drive: HalloweenFaceDrive, t: number, blink: number): void {
  const flap = Math.sin(t * 8);
  drive.smile = 0.35;
  drive.blinkLeft = blink;
  drive.blinkRight = blink;
  drive.lookX = 0.15;
  drive.head = quat(0.05, 0.18, 0.04);
  pose.rotations.spine = quat(0, -0.08, 0);
  pose.rotations.neck = quat(0.04, 0.16, 0);
  pose.rotations.head = quat(0.03, 0.12, 0);
  pose.rotations.leftShoulder = quat(0.1, 0.25, 0.4);
  pose.rotations.leftUpperArm = quat(-0.2 + flap * 0.15, 0.55, 1.15 + flap * 0.55);
  pose.rotations.leftLowerArm = quat(0, 0.15, 0.35 + flap * 0.45);
  pose.rotations.rightUpperArm = quat(0.15, -0.12, -0.2);
}

function restPose(): MappedPose {
  return {
    rotations: Object.fromEntries(BONE_NAMES.map((name) => [name, new Quaternion()])),
    hipsPosition: new Vector3(),
  };
}

function restDrive(): HalloweenFaceDrive {
  return {
    head: new Quaternion(),
    jawOpen: 0,
    blinkLeft: 0,
    blinkRight: 0,
    smile: 0,
    browUp: 0,
    lookX: 0,
    lookY: 0,
    glassesWear: 0,
  };
}

function blinkPulse(t: number): number {
  const cycle = t % 3.4;
  return cycle > 3.15 ? 1 : 0;
}

function quat(x: number, y: number, z: number): Quaternion {
  return new Quaternion().setFromEuler(new Euler(x, y, z, 'YXZ'));
}
