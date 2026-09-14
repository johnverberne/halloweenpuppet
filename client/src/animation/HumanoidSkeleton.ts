import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BoneName, MappedPose } from './types';

interface Limb {
  group: Group;
  mesh: Mesh;
}

const BONE_LENGTHS: Record<string, number> = {
  spine: 0.28,
  chest: 0.16,
  neck: 0.1,
  head: 0.16,
  leftUpperArm: 0.28,
  leftLowerArm: 0.26,
  leftHand: 0.1,
  rightUpperArm: 0.28,
  rightLowerArm: 0.26,
  rightHand: 0.1,
  leftUpperLeg: 0.4,
  leftLowerLeg: 0.38,
  leftFoot: 0.16,
  rightUpperLeg: 0.4,
  rightLowerLeg: 0.38,
  rightFoot: 0.16,
};

export class HumanoidSkeleton {
  readonly root = new Group();
  private readonly hips = new Group();
  private readonly nodes = new Map<BoneName, Group>();

  constructor() {
    this.root.name = 'humanoid-skeleton';
    this.hips.name = 'hips';
    this.root.add(this.hips);
    this.nodes.set('hips', this.hips);
    this.hips.add(joint('#ffcc66', 0.07));

    const spine = this.addLimb(this.hips, 'spine', BONE_LENGTHS.spine, REST_UP, '#9ad0ff');
    const chest = this.addLimb(spine, 'chest', BONE_LENGTHS.chest, REST_UP, '#7db7ef');
    const neck = this.addLimb(chest, 'neck', BONE_LENGTHS.neck, REST_UP, '#f2c4c4');
    this.addLimb(neck, 'head', BONE_LENGTHS.head, REST_UP, '#ffe08a', true);

    const leftShoulder = this.addOffset(chest, 'leftShoulder', new Vector3(0.16, 0.12, 0));
    const leftUpper = this.addLimb(leftShoulder, 'leftUpperArm', BONE_LENGTHS.leftUpperArm, REST_LEFT, '#7CFFB2');
    const leftLower = this.addLimb(leftUpper, 'leftLowerArm', BONE_LENGTHS.leftLowerArm, REST_LEFT, '#4ad48c');
    this.addLimb(leftLower, 'leftHand', BONE_LENGTHS.leftHand, REST_LEFT, '#e8ff8a', true);

    const rightShoulder = this.addOffset(chest, 'rightShoulder', new Vector3(-0.16, 0.12, 0));
    const rightUpper = this.addLimb(rightShoulder, 'rightUpperArm', BONE_LENGTHS.rightUpperArm, REST_RIGHT, '#7CFFB2');
    const rightLower = this.addLimb(rightUpper, 'rightLowerArm', BONE_LENGTHS.rightLowerArm, REST_RIGHT, '#4ad48c');
    this.addLimb(rightLower, 'rightHand', BONE_LENGTHS.rightHand, REST_RIGHT, '#e8ff8a', true);

    const leftHip = this.addOffset(this.hips, 'leftHipAnchor', new Vector3(0.1, -0.04, 0));
    const leftUpperLeg = this.addLimb(leftHip, 'leftUpperLeg', BONE_LENGTHS.leftUpperLeg, REST_DOWN, '#c9a0ff');
    const leftLowerLeg = this.addLimb(leftUpperLeg, 'leftLowerLeg', BONE_LENGTHS.leftLowerLeg, REST_DOWN, '#a57be0');
    this.addLimb(leftLowerLeg, 'leftFoot', BONE_LENGTHS.leftFoot, REST_FORWARD, '#f8ff6b', true);

    const rightHip = this.addOffset(this.hips, 'rightHipAnchor', new Vector3(-0.1, -0.04, 0));
    const rightUpperLeg = this.addLimb(rightHip, 'rightUpperLeg', BONE_LENGTHS.rightUpperLeg, REST_DOWN, '#c9a0ff');
    const rightLowerLeg = this.addLimb(rightUpperLeg, 'rightLowerLeg', BONE_LENGTHS.rightLowerLeg, REST_DOWN, '#a57be0');
    this.addLimb(rightLowerLeg, 'rightFoot', BONE_LENGTHS.rightFoot, REST_FORWARD, '#f8ff6b', true);

    this.root.position.set(0, 0.95, 0);
  }

  apply(pose: MappedPose): void {
    this.hips.position.copy(pose.hipsPosition);
    this.hips.quaternion.copy(pose.rotations.hips ?? IDENTITY);
    for (const [name, rotation] of Object.entries(pose.rotations) as Array<[BoneName, Quaternion]>) {
      if (name === 'hips') {
        continue;
      }
      const node = this.nodes.get(name);
      if (node && rotation) {
        node.quaternion.copy(rotation);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  private addOffset(parent: Group, name: string, offset: Vector3): Group {
    const group = new Group();
    group.name = name;
    group.position.copy(offset);
    parent.add(group);
    return group;
  }

  private addLimb(
    parent: Group,
    name: BoneName,
    length: number,
    restDir: Vector3,
    color: string,
    isEnd = false,
  ): Group {
    const group = new Group();
    group.name = name;
    parent.add(group);
    this.nodes.set(name, group);

    const limb = createLimb(length, restDir, color, isEnd);
    group.add(limb.group);
    return group;
  }
}

const IDENTITY = new Quaternion();
const REST_UP = new Vector3(0, 1, 0);
const REST_DOWN = new Vector3(0, -1, 0);
const REST_LEFT = new Vector3(1, 0, 0);
const REST_RIGHT = new Vector3(-1, 0, 0);
const REST_FORWARD = new Vector3(0, 0, 1);

function createLimb(length: number, restDir: Vector3, color: string, isEnd: boolean): Limb {
  const group = new Group();
  const material = new MeshStandardMaterial({
    color: new Color(color),
    roughness: 0.45,
    metalness: 0.05,
  });
  const thickness = isEnd ? 0.055 : 0.04;
  const geometry = new BoxGeometry(
    Math.abs(restDir.x) > 0.5 ? length : thickness,
    Math.abs(restDir.y) > 0.5 ? length : thickness,
    Math.abs(restDir.z) > 0.5 ? length : thickness,
  );
  const mesh = new Mesh(geometry, material);
  mesh.position.copy(restDir.clone().multiplyScalar(length / 2));
  group.add(mesh);
  const joint = new Mesh(new SphereGeometry(isEnd ? 0.05 : 0.035, 12, 12), material);
  joint.position.copy(restDir.clone().multiplyScalar(length));
  group.add(joint);
  return { group, mesh };
}

function joint(color: string, radius: number): Mesh {
  return new Mesh(
    new SphereGeometry(radius, 14, 14),
    new MeshStandardMaterial({ color: new Color(color), roughness: 0.4 }),
  );
}
