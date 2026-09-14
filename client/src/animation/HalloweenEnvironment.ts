import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  type Material,
} from 'three';

export class HalloweenEnvironment {
  readonly root = new Group();
  private readonly moon: Mesh;
  private readonly moonLight: PointLight;
  private readonly lanterns: PointLight[] = [];
  private readonly mist: Mesh[] = [];
  private readonly glow: Mesh[] = [];
  private time = 0;
  private lite = false;

  constructor() {
    this.root.name = 'halloween-environment';

    const ground = mesh(new PlaneGeometry(20, 16), paint('#140e0c', { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.root.add(ground);

    this.moon = mesh(
      new SphereGeometry(0.48, 20, 20),
      paint('#fff4c8', { emissive: '#ffe7a3', emissiveIntensity: 1.35, roughness: 1 }),
    );
    this.moon.position.set(-2.55, 3.25, -4.2);
    this.moonLight = new PointLight('#ffd9a0', 1.05, 16);
    this.moonLight.position.copy(this.moon.position);
    this.root.add(this.moon, this.moonLight);

    this.addPumpkin(-2.15, -1.35, 0.42, '#e07012');
    this.addPumpkin(2.35, -1.7, 0.34, '#d45a0c');
    this.addPumpkin(-1.55, 1.15, 0.28, '#c24d08');
    this.addPumpkin(1.75, 0.95, 0.38, '#e67a16');
    this.addPumpkin(0.15, -2.45, 0.5, '#f08a1d');

    this.addGrave(-3.15, -0.35, 0.42);
    this.addGrave(3.2, -0.85, 0.36);

    for (let i = 0; i < 5; i += 1) {
      const puff = mesh(
        new SphereGeometry(0.85, 12, 10),
        paint('#c9b8a0', { transparent: true, opacity: 0.07, roughness: 1, metalness: 0 }),
      );
      puff.position.set(-2.4 + i * 1.15, 0.35 + (i % 2) * 0.15, -0.6 + (i % 3) * 0.4);
      puff.scale.set(1.6, 0.35, 1.1);
      this.mist.push(puff);
      this.root.add(puff);
    }
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  setLite(lite: boolean): void {
    this.lite = lite;
    for (const child of this.root.children) {
      if (child === this.moon || child === this.moonLight) {
        continue;
      }
      child.visible = !lite;
    }
    this.moonLight.intensity = lite ? 0.7 : 1.05;
  }

  update(delta: number): void {
    if (!this.root.visible) {
      return;
    }
    this.time += delta;
    this.moonLight.intensity = (this.lite ? 0.62 : 0.92) + Math.sin(this.time * 0.7) * 0.12;
    for (const [index, puff] of this.mist.entries()) {
      puff.position.x += Math.sin(this.time * 0.18 + index) * 0.002;
      puff.position.z += Math.cos(this.time * 0.14 + index * 0.7) * 0.0015;
    }
    for (const [index, lantern] of this.lanterns.entries()) {
      lantern.intensity = 0.45 + Math.sin(this.time * 2.4 + index) * 0.18;
    }
    for (const [index, face] of this.glow.entries()) {
      const material = face.material as MeshStandardMaterial;
      material.emissiveIntensity = 0.7 + Math.sin(this.time * 2.1 + index) * 0.25;
    }
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          (material as Material).dispose();
        }
      }
    });
  }

  private addPumpkin(x: number, z: number, scale: number, color: string): void {
    const pumpkin = new Group();
    const body = mesh(new SphereGeometry(0.22, 16, 12), paint(color, { roughness: 0.62 }));
    body.scale.set(1.08, 0.86, 1);
    const stem = mesh(new CylinderGeometry(0.018, 0.028, 0.08, 6), paint('#3f5a1d'));
    stem.position.y = 0.2;
    const glow = mesh(
      new SphereGeometry(0.07, 10, 8),
      paint('#ffb347', { emissive: '#ff8a1a', emissiveIntensity: 0.85, roughness: 0.4 }),
    );
    glow.position.set(0, 0.02, 0.18);
    pumpkin.add(body, stem, glow);
    pumpkin.position.set(x, 0.18 * scale, z);
    pumpkin.scale.setScalar(scale);
    pumpkin.rotation.y = x * 0.35;
    const lantern = new PointLight('#ff8a2a', 0.55, 2.4);
    lantern.position.set(x, 0.28, z + 0.12);
    this.lanterns.push(lantern);
    this.glow.push(glow);
    this.root.add(pumpkin, lantern);
  }

  private addGrave(x: number, z: number, scale: number): void {
    const stone = mesh(new BoxGeometry(0.28, 0.46, 0.08), paint('#3a3a42', { roughness: 0.92 }));
    stone.position.set(x, 0.23 * scale, z);
    stone.scale.setScalar(scale);
    const cap = mesh(new BoxGeometry(0.32, 0.08, 0.1), paint('#2c2c34', { roughness: 1 }));
    cap.position.set(x, 0.48 * scale, z);
    cap.scale.setScalar(scale);
    this.root.add(stone, cap);
  }
}

function paint(
  color: string,
  extras: ConstructorParameters<typeof MeshStandardMaterial>[0] = {},
): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(color), ...extras });
}

function mesh(geometry: ConstructorParameters<typeof Mesh>[0], material: MeshStandardMaterial): Mesh {
  return new Mesh(geometry, material);
}
