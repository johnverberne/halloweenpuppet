import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  type MeshStandardMaterialParameters,
} from 'three';
import type { HalloweenFigureId } from '@halloweenpuppet/shared';

export interface HalloweenFaceDrive {
  head: Quaternion;
  jawOpen: number;
  blinkLeft: number;
  blinkRight: number;
  smile: number;
  browUp: number;
  lookX: number;
  lookY: number;
  glassesWear: number;
  visemes?: Partial<Record<'aa' | 'ee' | 'ih' | 'oh' | 'ou', number>>;
}

interface FigureRig {
  root: Group;
  head: Group;
  jaw?: Group;
  mouth?: Group;
  leftEye: Mesh;
  rightEye: Mesh;
  leftPupil?: Mesh;
  rightPupil?: Mesh;
  leftLid?: Mesh;
  rightLid?: Mesh;
  glasses: Group;
}

const MOUTH_GAIN = 1;
const EYE_GAIN = 1;

export class HalloweenFace {
  readonly root = new Group();
  private readonly figures = new Map<HalloweenFigureId, FigureRig>();
  private active: HalloweenFigureId = 'pumpkin';

  constructor() {
    this.root.name = 'halloween-face';
    this.root.position.set(0, 1.38, 0);
    this.figures.set('pumpkin', createPumpkin());
    this.figures.set('skeleton', createSkeleton());
    this.figures.set('zombie', createZombie());
    this.figures.set('frankenstein', createFrankenstein());
    for (const rig of this.figures.values()) {
      this.root.add(rig.root);
    }
    this.setFigure('pumpkin');
  }

  setFigure(id: HalloweenFigureId): void {
    this.active = id;
    for (const [key, rig] of this.figures) {
      rig.root.visible = key === id;
    }
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  apply(drive: HalloweenFaceDrive): void {
    const rig = this.figures.get(this.active);
    if (!rig) {
      return;
    }
    rig.head.quaternion.copy(drive.head);
    const jawOpen = clamp01(drive.jawOpen * MOUTH_GAIN);
    const smile = clamp01(drive.smile);
    const blinkL = clamp01(drive.blinkLeft * EYE_GAIN);
    const blinkR = clamp01(drive.blinkRight * EYE_GAIN);

    const aa = drive.visemes?.aa ?? 0;
    const ee = drive.visemes?.ee ?? 0;
    const ih = drive.visemes?.ih ?? 0;
    const oh = drive.visemes?.oh ?? 0;
    const ou = drive.visemes?.ou ?? 0;
    const shapedOpen = clamp01(jawOpen + aa * 0.35 + oh * 0.2);

    if (rig.jaw) {
      rig.jaw.rotation.x = shapedOpen * 0.7;
    }
    if (rig.mouth) {
      rig.mouth.scale.set(
        1 + smile * 0.25 + ee * 0.4 + ih * 0.18 - ou * 0.12,
        0.18 + shapedOpen * 1.15 + aa * 0.2,
        1,
      );
    }
    rig.leftEye.scale.set(1, 1 - blinkL * 0.9, 1);
    rig.rightEye.scale.set(1, 1 - blinkR * 0.9, 1);
    if (rig.leftLid) {
      rig.leftLid.position.y = 0.05 + drive.browUp * 0.05 - blinkL * 0.03;
    }
    if (rig.rightLid) {
      rig.rightLid.position.y = 0.05 + drive.browUp * 0.05 - blinkR * 0.03;
    }
    if (rig.leftPupil) {
      rig.leftPupil.position.x = -0.015 + drive.lookX * 0.025;
      rig.leftPupil.position.y = drive.lookY * 0.02;
    }
    if (rig.rightPupil) {
      rig.rightPupil.position.x = 0.015 + drive.lookX * 0.025;
      rig.rightPupil.position.y = drive.lookY * 0.02;
    }

    const wear = clamp01(drive.glassesWear);
    rig.glasses.visible = wear > 0.08;
    rig.glasses.scale.setScalar(0.35 + wear * 0.65);
    const baseY = Number(rig.glasses.userData.baseY ?? 0);
    const baseRoll = Number(rig.glasses.userData.baseRoll ?? 0);
    rig.glasses.position.y = baseY + drive.browUp * 0.02 - smile * 0.012;
    rig.glasses.rotation.z = baseRoll + (blinkL - blinkR) * 0.08;
  }

  applyMouth(jawOpen: number, visemes?: HalloweenFaceDrive['visemes']): void {
    const rig = this.figures.get(this.active);
    if (!rig) {
      return;
    }
    const shapedOpen = clamp01(jawOpen * 2.15 + (visemes?.aa ?? 0) * 0.55 + (visemes?.oh ?? 0) * 0.4);
    if (rig.jaw) {
      rig.jaw.rotation.x = shapedOpen * 0.95;
    }
    if (rig.mouth) {
      rig.mouth.scale.set(
        1 + (visemes?.ee ?? 0) * 0.55 + (visemes?.ih ?? 0) * 0.28 - (visemes?.ou ?? 0) * 0.2,
        0.22 + shapedOpen * 1.85,
        1,
      );
    }
  }
}

function createPumpkin(): FigureRig {
  const root = new Group();
  const head = new Group();
  root.add(head);

  const body = mesh(new SphereGeometry(0.42, 28, 22), paint('#e07012', { roughness: 0.62 }));
  body.scale.set(1.05, 0.88, 1);
  head.add(body);

  for (let i = 0; i < 6; i += 1) {
    const ridge = mesh(new BoxGeometry(0.02, 0.72, 0.18), paint('#b4530c', { roughness: 0.8 }));
    const angle = (i / 6) * Math.PI * 2;
    ridge.position.set(Math.sin(angle) * 0.38, 0, Math.cos(angle) * 0.36);
    ridge.rotation.y = angle;
    head.add(ridge);
  }

  const stem = mesh(new CylinderGeometry(0.035, 0.05, 0.14, 8), paint('#3f5a1d'));
  stem.position.set(0.02, 0.42, 0);
  stem.rotation.z = 0.25;
  head.add(stem);
  const leaf = mesh(new ConeGeometry(0.07, 0.04, 5), paint('#4d7a28'));
  leaf.position.set(-0.08, 0.4, 0.02);
  leaf.rotation.set(0.4, 0.2, 1.2);
  head.add(leaf);

  const glow = new PointLight('#ffb347', 1.4, 2.4);
  glow.position.set(0, 0, 0.1);
  head.add(glow);

  const leftEye = triangleEye(-0.13, 0.1, 0.38);
  const rightEye = triangleEye(0.13, 0.1, 0.38);
  head.add(leftEye, rightEye);
  const nose = triangleEye(0, 0.01, 0.4, 0.045);
  head.add(nose);

  const mouth = new Group();
  mouth.position.set(0, -0.14, 0.34);
  const cavity = mesh(new BoxGeometry(0.34, 0.12, 0.08), paint('#1a0c04', { roughness: 1 }));
  mouth.add(cavity);
  for (const x of [-0.12, -0.04, 0.04, 0.12]) {
    const tooth = mesh(new ConeGeometry(0.03, 0.07, 3), paint('#ffe08a'));
    tooth.position.set(x, 0.05, 0.03);
    tooth.rotation.x = Math.PI;
    mouth.add(tooth);
  }
  for (const x of [-0.08, 0, 0.08]) {
    const tooth = mesh(new ConeGeometry(0.028, 0.06, 3), paint('#ffe08a'));
    tooth.position.set(x, -0.05, 0.03);
    mouth.add(tooth);
  }
  head.add(mouth);
  const glasses = createGlasses({
    y: 0.09,
    z: 0.46,
    rim: 0.09,
    thickness: 0.016,
    color: '#3b2410',
    metalness: 0.35,
    lens: '#ffbe3b',
    lensOpacity: 0.18,
  });
  head.add(glasses);

  return { root, head, mouth, leftEye, rightEye, glasses };
}

function createSkeleton(): FigureRig {
  const root = new Group();
  const head = new Group();
  root.add(head);

  const bone = paint('#efe4cf', { roughness: 0.45, metalness: 0.05 });
  const cranium = mesh(new SphereGeometry(0.34, 26, 20), bone);
  cranium.scale.set(0.95, 1.05, 1.05);
  head.add(cranium);
  const cheekL = mesh(new SphereGeometry(0.12, 12, 10), bone);
  cheekL.position.set(-0.2, -0.08, 0.12);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.2;
  head.add(cheekL, cheekR);

  const socketMat = paint('#140f0c', { roughness: 1 });
  const leftSocket = mesh(new SphereGeometry(0.08, 12, 10), socketMat);
  leftSocket.position.set(-0.12, 0.06, 0.28);
  const rightSocket = mesh(new SphereGeometry(0.08, 12, 10), socketMat);
  rightSocket.position.set(0.12, 0.06, 0.28);
  head.add(leftSocket, rightSocket);

  const glow = paint('#7CFFB2', { emissive: '#3d8f5c', emissiveIntensity: 1.6, roughness: 0.3 });
  const leftEye = mesh(new SphereGeometry(0.035, 10, 8), glow);
  leftEye.position.set(-0.12, 0.06, 0.33);
  const rightEye = mesh(new SphereGeometry(0.035, 10, 8), glow);
  rightEye.position.set(0.12, 0.06, 0.33);
  head.add(leftEye, rightEye);
  const leftPupil = mesh(new SphereGeometry(0.014, 8, 8), paint('#05210f', { roughness: 1 }));
  leftEye.add(leftPupil);
  const rightPupil = mesh(new SphereGeometry(0.014, 8, 8), paint('#05210f', { roughness: 1 }));
  rightEye.add(rightPupil);

  const nose = mesh(new ConeGeometry(0.035, 0.08, 3), socketMat);
  nose.position.set(0, -0.02, 0.32);
  nose.rotation.x = Math.PI;
  head.add(nose);

  for (let i = 0; i < 6; i += 1) {
    const tooth = mesh(new BoxGeometry(0.035, 0.06, 0.03), paint('#fff7ea'));
    tooth.position.set(-0.1 + i * 0.04, -0.12, 0.3);
    head.add(tooth);
  }

  const jaw = new Group();
  jaw.position.set(0, -0.16, 0.04);
  const jawBone = mesh(new BoxGeometry(0.32, 0.08, 0.22), bone);
  jawBone.position.set(0, -0.04, 0.16);
  jaw.add(jawBone);
  for (let i = 0; i < 5; i += 1) {
    const tooth = mesh(new BoxGeometry(0.03, 0.05, 0.025), paint('#fff7ea'));
    tooth.position.set(-0.08 + i * 0.04, 0.01, 0.26);
    jaw.add(tooth);
  }
  head.add(jaw);

  const neck = mesh(new CylinderGeometry(0.07, 0.09, 0.18, 8), bone);
  neck.position.set(0, -0.4, 0);
  root.add(neck);
  const collar = mesh(new BoxGeometry(0.42, 0.05, 0.22), bone);
  collar.position.set(0, -0.5, 0);
  root.add(collar);
  const glasses = createGlasses({
    y: 0.06,
    z: 0.4,
    rim: 0.075,
    thickness: 0.008,
    color: '#c5d0d4',
    metalness: 0.85,
    lens: '#7CFFB2',
    lensOpacity: 0.12,
  });
  head.add(glasses);

  return { root, head, jaw, leftEye, rightEye, leftPupil, rightPupil, glasses };
}

function createZombie(): FigureRig {
  const root = new Group();
  const head = new Group();
  root.add(head);

  const skin = paint('#6f8f4a', { roughness: 0.82 });
  const skull = mesh(new SphereGeometry(0.36, 24, 18), skin);
  skull.scale.set(0.98, 1.08, 0.95);
  head.add(skull);

  const patch = mesh(new SphereGeometry(0.12, 10, 8), paint('#4d6a32', { roughness: 0.9 }));
  patch.position.set(0.18, 0.12, 0.22);
  head.add(patch);

  const leftEye = mesh(
    new SphereGeometry(0.055, 12, 10),
    paint('#d6e36a', { emissive: '#7a8a20', emissiveIntensity: 0.6 }),
  );
  leftEye.position.set(-0.12, 0.06, 0.3);
  leftEye.scale.set(1, 0.75, 1);
  const rightEye = mesh(
    new SphereGeometry(0.05, 12, 10),
    paint('#c23b3b', { emissive: '#6a1010', emissiveIntensity: 0.7 }),
  );
  rightEye.position.set(0.13, 0.02, 0.3);
  head.add(leftEye, rightEye);
  const leftPupil = mesh(new SphereGeometry(0.018, 8, 8), paint('#111'));
  leftEye.add(leftPupil);
  const rightPupil = mesh(new SphereGeometry(0.02, 8, 8), paint('#111'));
  rightEye.add(rightPupil);

  const leftLid = mesh(new BoxGeometry(0.12, 0.03, 0.04), paint('#4a6234'));
  leftLid.position.set(-0.12, 0.1, 0.33);
  const rightLid = mesh(new BoxGeometry(0.11, 0.035, 0.04), paint('#4a6234'));
  rightLid.position.set(0.13, 0.06, 0.33);
  head.add(leftLid, rightLid);

  for (let i = 0; i < 5; i += 1) {
    const stitch = mesh(new BoxGeometry(0.035, 0.01, 0.01), paint('#1e1a14'));
    stitch.position.set(-0.1 + i * 0.05, 0.22, 0.28);
    stitch.rotation.z = 0.4;
    head.add(stitch);
  }
  const scar = mesh(new BoxGeometry(0.18, 0.012, 0.01), paint('#3a2418'));
  scar.position.set(0.1, -0.02, 0.32);
  scar.rotation.z = -0.6;
  head.add(scar);

  const ear = mesh(new SphereGeometry(0.07, 10, 8), skin);
  ear.scale.set(0.45, 1, 0.7);
  ear.position.set(-0.34, 0.02, 0);
  head.add(ear);

  const hair = mesh(new ConeGeometry(0.08, 0.16, 5), paint('#24301c'));
  hair.position.set(-0.08, 0.4, -0.05);
  hair.rotation.z = -0.3;
  head.add(hair);

  const jaw = new Group();
  jaw.position.set(0, -0.14, 0.06);
  const jawMesh = mesh(new BoxGeometry(0.28, 0.1, 0.18), paint('#5c783c'));
  jawMesh.position.set(0, -0.06, 0.16);
  jaw.add(jawMesh);
  for (const x of [-0.08, -0.02, 0.05, 0.1]) {
    const tooth = mesh(new BoxGeometry(0.03, 0.06, 0.025), paint('#e8d8b0'));
    tooth.position.set(x, 0.02, 0.24);
    tooth.rotation.z = x * 0.8;
    jaw.add(tooth);
  }
  head.add(jaw);

  const neck = mesh(new CylinderGeometry(0.09, 0.12, 0.2, 8), paint('#5a753c'));
  neck.position.set(0, -0.42, 0);
  root.add(neck);
  const shirt = mesh(new BoxGeometry(0.5, 0.16, 0.28), paint('#2b2433'));
  shirt.position.set(0, -0.56, 0);
  root.add(shirt);
  const glasses = createGlasses({
    y: 0.05,
    z: 0.38,
    rim: 0.08,
    thickness: 0.014,
    color: '#1e1a14',
    metalness: 0.15,
    lens: '#88aa44',
    lensOpacity: 0.16,
    crooked: 0.14,
    cracked: true,
  });
  head.add(glasses);

  return { root, head, jaw, leftEye, rightEye, leftPupil, rightPupil, leftLid, rightLid, glasses };
}

function createFrankenstein(): FigureRig {
  const root = new Group();
  const head = new Group();
  root.add(head);

  const skin = paint('#6d8a4e', { roughness: 0.78 });
  const skinDark = paint('#4f6a38', { roughness: 0.86 });
  const skinShadow = paint('#3c522b', { roughness: 0.9 });
  const hair = paint('#14120f', { roughness: 0.92 });
  const metal = paint('#c9d2d6', { roughness: 0.28, metalness: 0.85 });
  const rust = paint('#6a4a2a', { roughness: 0.55, metalness: 0.4 });
  const stitch = paint('#1a1610', { roughness: 0.7 });

  const cranium = mesh(new SphereGeometry(0.36, 56, 42), skin);
  cranium.scale.set(1.02, 1.08, 0.98);
  head.add(cranium);

  const flatTop = mesh(new CylinderGeometry(0.28, 0.32, 0.08, 40), skin);
  flatTop.position.set(0, 0.36, -0.02);
  head.add(flatTop);
  const scalp = mesh(new CylinderGeometry(0.3, 0.3, 0.04, 40), hair);
  scalp.position.set(0, 0.4, -0.02);
  head.add(scalp);

  for (let i = 0; i < 14; i += 1) {
    const t = i / 13;
    const clump = mesh(new CapsuleGeometry(0.045, 0.16, 6, 10), hair);
    const angle = -0.85 + t * 1.7;
    clump.position.set(Math.sin(angle) * 0.3, 0.28 + Math.cos(angle) * 0.04, -0.08 + Math.cos(angle) * 0.18);
    clump.rotation.set(0.35, angle, 0.15 * Math.sin(angle));
    head.add(clump);
  }
  for (const x of [-0.22, 0.22]) {
    const sideburn = mesh(new CapsuleGeometry(0.035, 0.14, 5, 8), hair);
    sideburn.position.set(x, 0.08, 0.02);
    sideburn.rotation.z = x > 0 ? -0.2 : 0.2;
    head.add(sideburn);
  }

  const brow = mesh(new CapsuleGeometry(0.04, 0.28, 6, 12), skinDark);
  brow.position.set(0, 0.16, 0.3);
  brow.rotation.z = Math.PI / 2;
  brow.scale.set(1, 0.7, 0.85);
  head.add(brow);
  const browL = mesh(new SphereGeometry(0.07, 20, 16), skinDark);
  browL.scale.set(1.15, 0.55, 0.7);
  browL.position.set(-0.13, 0.15, 0.3);
  const browR = browL.clone();
  browR.position.x = 0.13;
  head.add(browL, browR);

  const cheekL = mesh(new SphereGeometry(0.11, 22, 16), skin);
  cheekL.scale.set(0.85, 0.7, 0.65);
  cheekL.position.set(-0.22, -0.04, 0.16);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.22;
  head.add(cheekL, cheekR);

  const earL = mesh(new SphereGeometry(0.075, 20, 16), skin);
  earL.scale.set(0.42, 1.05, 0.7);
  earL.position.set(-0.36, 0.02, 0);
  const earR = earL.clone();
  earR.position.x = 0.36;
  head.add(earL, earR);

  const scarLine = mesh(new BoxGeometry(0.26, 0.012, 0.012), paint('#3a2418', { roughness: 0.8 }));
  scarLine.position.set(-0.02, 0.26, 0.3);
  scarLine.rotation.z = 0.08;
  head.add(scarLine);
  for (let i = 0; i < 9; i += 1) {
    const thread = mesh(new BoxGeometry(0.008, 0.042, 0.008), stitch);
    thread.position.set(-0.12 + i * 0.03, 0.26, 0.305);
    thread.rotation.z = 0.08 + (i % 2 === 0 ? 0.55 : -0.55);
    head.add(thread);
  }

  const socket = paint('#1a140c', { roughness: 1 });
  const leftSocket = mesh(new SphereGeometry(0.075, 22, 16), socket);
  leftSocket.scale.set(1.05, 0.72, 0.55);
  leftSocket.position.set(-0.12, 0.05, 0.3);
  const rightSocket = leftSocket.clone();
  rightSocket.position.x = 0.12;
  head.add(leftSocket, rightSocket);

  const eyeGlow = paint('#c8d46a', { emissive: '#6f7a22', emissiveIntensity: 0.85, roughness: 0.35 });
  const leftEye = mesh(new SphereGeometry(0.042, 24, 18), eyeGlow);
  leftEye.position.set(-0.12, 0.05, 0.335);
  const rightEye = mesh(new SphereGeometry(0.04, 24, 18), eyeGlow);
  rightEye.position.set(0.12, 0.045, 0.335);
  head.add(leftEye, rightEye);
  const leftPupil = mesh(new SphereGeometry(0.016, 16, 12), paint('#0c0a08', { roughness: 0.4 }));
  leftEye.add(leftPupil);
  const rightPupil = mesh(new SphereGeometry(0.015, 16, 12), paint('#0c0a08', { roughness: 0.4 }));
  rightEye.add(rightPupil);

  const leftLid = mesh(new CapsuleGeometry(0.018, 0.09, 5, 10), skinDark);
  leftLid.position.set(-0.12, 0.1, 0.34);
  leftLid.rotation.z = Math.PI / 2;
  const rightLid = mesh(new CapsuleGeometry(0.017, 0.085, 5, 10), skinDark);
  rightLid.position.set(0.12, 0.095, 0.34);
  rightLid.rotation.z = Math.PI / 2;
  head.add(leftLid, rightLid);

  const bagsL = mesh(new CapsuleGeometry(0.012, 0.07, 4, 8), skinShadow);
  bagsL.position.set(-0.12, -0.01, 0.33);
  bagsL.rotation.z = Math.PI / 2;
  const bagsR = bagsL.clone();
  bagsR.position.x = 0.12;
  head.add(bagsL, bagsR);

  const nose = mesh(new CapsuleGeometry(0.028, 0.07, 6, 12), skinDark);
  nose.position.set(0, -0.01, 0.34);
  nose.rotation.x = 0.4;
  head.add(nose);
  const nostrilL = mesh(new SphereGeometry(0.012, 10, 8), skinShadow);
  nostrilL.position.set(-0.018, -0.04, 0.35);
  const nostrilR = nostrilL.clone();
  nostrilR.position.x = 0.018;
  head.add(nostrilL, nostrilR);

  const jaw = new Group();
  jaw.position.set(0, -0.12, 0.04);
  const jawMesh = mesh(new BoxGeometry(0.34, 0.12, 0.22, 4, 2, 3), skinDark);
  jawMesh.position.set(0, -0.08, 0.16);
  jaw.add(jawMesh);
  const chin = mesh(new SphereGeometry(0.09, 22, 16), skinDark);
  chin.scale.set(1.15, 0.55, 0.7);
  chin.position.set(0, -0.13, 0.24);
  jaw.add(chin);
  for (const x of [-0.1, -0.04, 0.04, 0.1]) {
    const tooth = mesh(new BoxGeometry(0.028, 0.045, 0.022), paint('#e6d9b4', { roughness: 0.45 }));
    tooth.position.set(x, -0.01, 0.26);
    jaw.add(tooth);
  }
  head.add(jaw);

  const upperLip = mesh(new BoxGeometry(0.22, 0.02, 0.04), skinShadow);
  upperLip.position.set(0, -0.1, 0.34);
  head.add(upperLip);

  const neck = mesh(new CylinderGeometry(0.11, 0.14, 0.22, 28), skin);
  neck.position.set(0, -0.42, 0);
  root.add(neck);
  addNeckBolt(head, -0.4);
  addNeckBolt(head, 0.4);

  const collar = mesh(new BoxGeometry(0.58, 0.18, 0.32, 2, 2, 2), paint('#1c1822', { roughness: 0.88 }));
  collar.position.set(0, -0.56, 0.02);
  root.add(collar);
  const lapelL = mesh(new BoxGeometry(0.16, 0.2, 0.06), paint('#15121a', { roughness: 0.9 }));
  lapelL.position.set(-0.18, -0.48, 0.16);
  lapelL.rotation.z = 0.35;
  const lapelR = lapelL.clone();
  lapelR.position.x = 0.18;
  lapelR.rotation.z = -0.35;
  root.add(lapelL, lapelR);

  const glow = new PointLight('#8aaa4a', 0.55, 2.2);
  glow.position.set(0, 0.05, 0.2);
  head.add(glow);

  const glasses = createGlasses({
    y: 0.055,
    z: 0.4,
    rim: 0.082,
    thickness: 0.012,
    color: '#2a2218',
    metalness: 0.45,
    lens: '#9aaa55',
    lensOpacity: 0.14,
  });
  head.add(glasses);

  return { root, head, jaw, leftEye, rightEye, leftPupil, rightPupil, leftLid, rightLid, glasses };

  function addNeckBolt(parent: Group, x: number): void {
    const bolt = new Group();
    bolt.position.set(x, -0.08, 0.02);
    const shaft = mesh(new CylinderGeometry(0.028, 0.028, 0.1, 20), metal);
    shaft.rotation.z = Math.PI / 2;
    const washer = mesh(new CylinderGeometry(0.05, 0.05, 0.016, 24), rust);
    washer.rotation.z = Math.PI / 2;
    washer.position.x = x > 0 ? -0.04 : 0.04;
    const nut = mesh(new CylinderGeometry(0.038, 0.038, 0.03, 6), metal);
    nut.rotation.z = Math.PI / 2;
    nut.position.x = x > 0 ? 0.05 : -0.05;
    bolt.add(shaft, washer, nut);
    parent.add(bolt);
  }
}

function createGlasses(options: {
  y: number;
  z: number;
  rim: number;
  thickness: number;
  color: string;
  metalness: number;
  lens: string;
  lensOpacity: number;
  crooked?: number;
  cracked?: boolean;
}): Group {
  const glasses = new Group();
  glasses.position.set(0, options.y, options.z);
  glasses.rotation.z = options.crooked ?? 0;
  glasses.userData.baseY = options.y;
  glasses.userData.baseRoll = options.crooked ?? 0;
  glasses.visible = false;

  const frame = paint(options.color, { roughness: 0.35, metalness: options.metalness });
  const lens = paint(options.lens, {
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: options.lensOpacity,
    emissive: options.lens,
    emissiveIntensity: 0.12,
  });

  const leftRim = mesh(new TorusGeometry(options.rim, options.thickness, 8, 18), frame);
  leftRim.position.set(-0.13, 0, 0);
  const rightRim = mesh(new TorusGeometry(options.rim, options.thickness, 8, 18), frame);
  rightRim.position.set(0.13, 0, 0);
  const leftLens = mesh(new SphereGeometry(options.rim * 0.86, 12, 8), lens);
  leftLens.scale.set(1, 1, 0.18);
  leftLens.position.copy(leftRim.position);
  const rightLens = mesh(new SphereGeometry(options.rim * 0.86, 12, 8), lens);
  rightLens.scale.set(1, 1, 0.18);
  rightLens.position.copy(rightRim.position);
  const bridge = mesh(new BoxGeometry(0.08, options.thickness * 1.4, options.thickness), frame);
  bridge.position.set(0, options.rim * 0.15, 0);
  const leftArm = mesh(new BoxGeometry(0.18, options.thickness, options.thickness), frame);
  leftArm.position.set(-0.24, 0.01, -0.08);
  leftArm.rotation.y = 0.7;
  const rightArm = mesh(new BoxGeometry(0.18, options.thickness, options.thickness), frame);
  rightArm.position.set(0.24, 0.01, -0.08);
  rightArm.rotation.y = -0.7;
  glasses.add(leftRim, rightRim, leftLens, rightLens, bridge, leftArm, rightArm);

  if (options.cracked) {
    const crack = mesh(new BoxGeometry(0.09, 0.008, 0.01), paint('#0d0b08'));
    crack.position.set(0.13, 0.01, 0.02);
    crack.rotation.z = 0.7;
    glasses.add(crack);
  }

  return glasses;
}

function triangleEye(x: number, y: number, z: number, size = 0.07): Mesh {
  const eye = mesh(
    new ConeGeometry(size, size * 1.2, 3),
    paint('#1a0c04', { emissive: '#ffbe3b', emissiveIntensity: 0.85, roughness: 0.4 }),
  );
  eye.position.set(x, y, z);
  eye.rotation.x = Math.PI;
  return eye;
}

function paint(color: string, extras: MeshStandardMaterialParameters = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(color),
    roughness: 0.55,
    metalness: 0.02,
    ...extras,
  });
}

function mesh(
  geometry:
    | BoxGeometry
    | SphereGeometry
    | ConeGeometry
    | CylinderGeometry
    | TorusGeometry
    | CapsuleGeometry,
  material: MeshStandardMaterial,
): Mesh {
  return new Mesh(geometry, material);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
