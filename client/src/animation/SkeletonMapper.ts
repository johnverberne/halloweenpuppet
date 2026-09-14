import { Matrix4, Quaternion, Vector3 } from 'three';
import { PoseLandmark, type Landmark, type TrackingFrame } from '@halloweenpuppet/shared';
import type { BoneName, MappedPose } from './types';

const REST = {
  up: new Vector3(0, 1, 0),
  // VRM / facing-camera: character left is +X, character right is -X.
  leftArm: new Vector3(1, 0, 0),
  rightArm: new Vector3(-1, 0, 0),
  down: new Vector3(0, -1, 0),
};

function mpToThree(landmark: Landmark, out = new Vector3()): Vector3 {
  // Flip X so the performer's right side drives the right side of the stage.
  return out.set(-landmark.x, -landmark.y, -landmark.z);
}

function mid(a: Vector3, b: Vector3, out = new Vector3()): Vector3 {
  return out.copy(a).add(b).multiplyScalar(0.5);
}

function dir(from: Vector3, to: Vector3, out = new Vector3()): Vector3 {
  return out.copy(to).sub(from).normalize();
}

function fromTo(rest: Vector3, current: Vector3): Quaternion {
  const quaternion = new Quaternion();
  if (current.lengthSq() < 1e-8) {
    return quaternion.identity();
  }
  return quaternion.setFromUnitVectors(rest, current);
}

function toLocal(world: Quaternion, parentWorld?: Quaternion): Quaternion {
  if (!parentWorld) {
    return world.clone();
  }
  return parentWorld.clone().invert().multiply(world);
}

function visible(landmarks: Landmark[], index: number, min = 0.25): boolean {
  const landmark = landmarks[index];
  if (!landmark) {
    return false;
  }
  return (landmark.visibility ?? 1) >= min;
}

function lookRotation(xAxis: Vector3, yAxis: Vector3): Quaternion {
  const x = xAxis.clone().normalize();
  const y = yAxis.clone().normalize();
  const z = new Vector3().crossVectors(x, y);
  if (z.lengthSq() < 1e-8) {
    return new Quaternion();
  }
  z.normalize();
  x.crossVectors(y, z).normalize();
  const matrix = new Matrix4().makeBasis(x, y, z);
  return new Quaternion().setFromRotationMatrix(matrix);
}

export class SkeletonMapper {
  private readonly leftHip = new Vector3();
  private readonly rightHip = new Vector3();
  private readonly leftShoulder = new Vector3();
  private readonly rightShoulder = new Vector3();
  private readonly leftElbow = new Vector3();
  private readonly rightElbow = new Vector3();
  private readonly leftWrist = new Vector3();
  private readonly rightWrist = new Vector3();
  private readonly leftKnee = new Vector3();
  private readonly rightKnee = new Vector3();
  private readonly leftAnkle = new Vector3();
  private readonly rightAnkle = new Vector3();
  private readonly nose = new Vector3();
  private readonly hipMid = new Vector3();
  private readonly shoulderMid = new Vector3();

  map(frame: TrackingFrame): MappedPose | null {
    const world = frame.pose?.worldLandmarks;
    const image = frame.pose?.landmarks;
    const source = world && world.length > 0 ? world : image;
    if (!source || source.length < 33) {
      return null;
    }

    // After the X-flip, swap MediaPipe L/R so bone names stay on the visual side.
    mpToThree(source[PoseLandmark.rightHip], this.leftHip);
    mpToThree(source[PoseLandmark.leftHip], this.rightHip);
    mpToThree(source[PoseLandmark.rightShoulder], this.leftShoulder);
    mpToThree(source[PoseLandmark.leftShoulder], this.rightShoulder);
    mpToThree(source[PoseLandmark.rightElbow], this.leftElbow);
    mpToThree(source[PoseLandmark.leftElbow], this.rightElbow);
    mpToThree(source[PoseLandmark.rightWrist], this.leftWrist);
    mpToThree(source[PoseLandmark.leftWrist], this.rightWrist);
    mpToThree(source[PoseLandmark.rightKnee], this.leftKnee);
    mpToThree(source[PoseLandmark.leftKnee], this.rightKnee);
    mpToThree(source[PoseLandmark.rightAnkle], this.leftAnkle);
    mpToThree(source[PoseLandmark.leftAnkle], this.rightAnkle);
    mpToThree(source[PoseLandmark.nose], this.nose);

    mid(this.leftHip, this.rightHip, this.hipMid);
    mid(this.leftShoulder, this.rightShoulder, this.shoulderMid);

    const spineDir = dir(this.hipMid, this.shoulderMid);
    // Face the camera (+Z). Using left→right here yaws the hips 180° and swaps the legs.
    const hipsWorld = lookRotation(dir(this.rightHip, this.leftHip), spineDir);
    const spineWorld = fromTo(REST.up, spineDir);
    const neckWorld = fromTo(REST.up, dir(this.shoulderMid, this.nose));

    const rotations: MappedPose['rotations'] = {
      hips: hipsWorld,
      spine: toLocal(spineWorld, hipsWorld),
      chest: new Quaternion(),
      neck: toLocal(neckWorld, spineWorld),
      head: new Quaternion(),
    };

    this.mapArm(
      rotations,
      'left',
      spineWorld,
      this.leftShoulder,
      this.leftElbow,
      this.leftWrist,
      REST.leftArm,
      image,
      PoseLandmark.rightShoulder,
    );
    this.mapArm(
      rotations,
      'right',
      spineWorld,
      this.rightShoulder,
      this.rightElbow,
      this.rightWrist,
      REST.rightArm,
      image,
      PoseLandmark.leftShoulder,
    );
    this.mapLeg(
      rotations,
      'left',
      hipsWorld,
      this.leftHip,
      this.leftKnee,
      this.leftAnkle,
      image,
      PoseLandmark.rightHip,
    );
    this.mapLeg(
      rotations,
      'right',
      hipsWorld,
      this.rightHip,
      this.rightKnee,
      this.rightAnkle,
      image,
      PoseLandmark.leftHip,
    );

    return {
      rotations,
      hipsPosition: new Vector3(this.hipMid.x * 0.35, 0, this.hipMid.z * 0.35),
    };
  }

  private mapArm(
    rotations: MappedPose['rotations'],
    side: 'left' | 'right',
    hipsWorld: Quaternion,
    shoulder: Vector3,
    elbow: Vector3,
    wrist: Vector3,
    rest: Vector3,
    image: Landmark[] | undefined,
    shoulderIndex: number,
  ): void {
    if (image && !visible(image, shoulderIndex)) {
      return;
    }
    const upperWorld = fromTo(rest, dir(shoulder, elbow));
    const lowerWorld = fromTo(rest, dir(elbow, wrist));
    rotations[`${side}UpperArm` as BoneName] = toLocal(upperWorld, hipsWorld);
    rotations[`${side}LowerArm` as BoneName] = toLocal(lowerWorld, upperWorld);
    rotations[`${side}Hand` as BoneName] = new Quaternion();
  }

  private mapLeg(
    rotations: MappedPose['rotations'],
    side: 'left' | 'right',
    hipsWorld: Quaternion,
    hip: Vector3,
    knee: Vector3,
    ankle: Vector3,
    image: Landmark[] | undefined,
    hipIndex: number,
  ): void {
    if (image && !visible(image, hipIndex)) {
      return;
    }
    const upperWorld = fromTo(REST.down, dir(hip, knee));
    const lowerWorld = fromTo(REST.down, dir(knee, ankle));
    rotations[`${side}UpperLeg` as BoneName] = toLocal(upperWorld, hipsWorld);
    rotations[`${side}LowerLeg` as BoneName] = toLocal(lowerWorld, upperWorld);
    rotations[`${side}Foot` as BoneName] = new Quaternion();
  }
}
