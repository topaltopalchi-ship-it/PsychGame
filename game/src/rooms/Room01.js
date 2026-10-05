import * as THREE from "three";

export class Room01 {
  constructor(scene, tracker) {
    this.scene = scene;
    this.tracker = tracker;
    this.objects = {};
    this.dynamic = { clueVisible: false, redGlow: null, deskLight: null, roomLights: [], baseLightIntensity: new Map() };
    this.completed = false; this.buttonPulseTimer = null;
  }

  start() {
    this.scene.fog = new THREE.FogExp2(0x090b10, 0.028);
    this.createFloor(); this.createWalls(); this.createCeiling(); this.createDoor();
    this.createRedButton(); this.createDesk(); this.createDrawer(); this.createBox();
    this.createClock(); this.createPainting(); this.createChair(); this.createLamp();
    this.createSideTable(); this.createWindow(); this.createAtmosphere();
    this.tracker.log("ROOM_ENTER", { roomId: "ROOM_01", roomName: "THE_RED_BUTTON" });
  }

  getInteractableObjects() { return Object.values(this.objects); }

  showButtonPressed() {
    const button = this.objects.redButton;
    if (!button) return;
    button.position.y = 1.68;
    button.material.emissive = new THREE.Color(0xff1b1b);
    button.material.emissiveIntensity = 4;
    if (this.dynamic.redGlow) this.dynamic.redGlow.intensity = 5.5;
    this.buttonPulseTimer = setTimeout(() => { if (this.completed) return;
      button.position.y = 1.8;
      button.material.emissiveIntensity = 2.2;
      if (this.dynamic.redGlow) this.dynamic.redGlow.intensity = 2.0;
    }, 180);
  }

  hideDrawerKey() {
    if (this.objects.drawerKey) this.objects.drawerKey.visible = false;
  }

  completeRoom() {
    if (this.completed) return;
    this.completed = true;
  }

  mesh(geometry, material, position, rotation = [0, 0, 0]) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position);
    m.rotation.set(...rotation);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  mat(color, roughness = 0.8, metalness = 0, emissive = null) {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    if (emissive !== null) {
      material.emissive = new THREE.Color(emissive);
      material.emissiveIntensity = 0.35;
    }
    return material;
  }

  registerRoomLight(light) {
    this.dynamic.roomLights.push(light);
    this.dynamic.baseLightIntensity.set(light, light.intensity);
    return light;
  }

  setRoomLightLevel(multiplier = 1) {
    this.dynamic.roomLights.forEach((light) => {
      const base = this.dynamic.baseLightIntensity.get(light) ?? light.intensity;
      light.intensity = base * multiplier;
    });
  }

  createFloor() {
    this.mesh(new THREE.BoxGeometry(10, .2, 10), this.mat(0x272321, .95), [0, -.1, 0]);
    this.mesh(new THREE.BoxGeometry(5.8, .035, 3.8), this.mat(0x46342e, 1), [-.1, .025, -.1]);
  }

  createWalls() {
    const wall = this.mat(0x20242a, .94);
    this.mesh(new THREE.BoxGeometry(10, 4, .22), wall, [0, 2, -4.9]);
    this.mesh(new THREE.BoxGeometry(.22, 4, 10), wall, [-4.9, 2, 0]);
    this.mesh(new THREE.BoxGeometry(.22, 4, 10), wall, [4.9, 2, 0]);
    const trim = this.mat(0x4a3d36, .78);
    this.mesh(new THREE.BoxGeometry(10, .12, .14), trim, [0, .2, -4.75]);
    this.mesh(new THREE.BoxGeometry(10, .12, .14), trim, [0, 3.82, -4.75]);
  }

  createCeiling() {
    this.mesh(new THREE.BoxGeometry(10, .16, 10), this.mat(0x15181d, 1), [0, 4.05, 0]);
  }

  createDoor() {
    const door = this.mesh(new THREE.BoxGeometry(1.8, 3.4, .16), this.mat(0x493326, .68), [4.65, 1.7, -0.9], [0, Math.PI / 2, 0]);
    door.userData.objectId = "EXIT_DOOR";
    this.objects.exitDoor = door;

    const frame = this.mat(0x171311, .55, .15);
    this.mesh(new THREE.BoxGeometry(2.15, .18, .24), frame, [4.53, 3.48, -.9], [0, Math.PI / 2, 0]);
    this.mesh(new THREE.BoxGeometry(.18, 3.5, .24), frame, [4.53, 1.75, -1.92], [0, Math.PI / 2, 0]);
    this.mesh(new THREE.BoxGeometry(.18, 3.5, .24), frame, [4.53, 1.75, .12], [0, Math.PI / 2, 0]);

    const handle = this.mesh(new THREE.SphereGeometry(.12, 24, 24), this.mat(0xb08a4a, .22, .75), [4.47, 1.65, -.45]);
    handle.userData.objectId = "EXIT_DOOR";
    this.objects.doorHandle = handle;
  }

  createRedButton() {
    const panel = this.mesh(new THREE.BoxGeometry(1.05, .13, .75), this.mat(0x181a1f, .38, .45), [-3.8, 1.55, 1.2]);
    panel.userData.objectId = "RED_BUTTON";
    this.objects.buttonPanel = panel;

    const button = this.mesh(new THREE.CylinderGeometry(.34, .34, .24, 36), new THREE.MeshStandardMaterial({
      color: 0xc91515, emissive: 0x6d0000, emissiveIntensity: 0.85, roughness: .24
    }), [-3.8, 1.8, 1.2], [0, 0, Math.PI / 2]);
    button.userData.objectId = "RED_BUTTON";
    this.objects.redButton = button;

    const glow = this.registerRoomLight(new THREE.PointLight(0xff2020, 2.4, 4));
    glow.position.set(-3.8, 1.85, 1.05);
    this.dynamic.redGlow = glow;
    this.scene.add(glow);
  }

  createDesk() {
    const wood = this.mat(0x5b3a27, .72);
    const top = this.mesh(new THREE.BoxGeometry(2.8, .18, 1.15), wood, [.8, 1.35, -1.65]);
    top.userData.objectId = "OLD_DESK";
    this.objects.desk = top;
    for (const [x, z] of [[-.35, -2.05], [1.95, -2.05], [-.35, -1.25], [1.95, -1.25]]) this.mesh(new THREE.BoxGeometry(.16, 1.35, .16), wood, [x, .68, z]);
    this.mesh(new THREE.BoxGeometry(2.8, .1, .12), wood, [.8, .35, -1.2]);
  }

  createDrawer() {
    const drawer = this.mesh(new THREE.BoxGeometry(1.25, .46, .78), this.mat(0x4b2f20, .88), [.8, .92, -1.05]);
    drawer.userData.objectId = "HALF_OPEN_DRAWER";
    this.objects.drawer = drawer;
    const cavity = this.mesh(new THREE.BoxGeometry(1.02, .05, .48), this.mat(0x17110e, .96), [.8, 1.17, -.98]);
    cavity.userData.objectId = "HALF_OPEN_DRAWER";
    this.objects.drawerCavity = cavity;

    const keyGroup = new THREE.Group();
    keyGroup.position.set(.8, 1.24, -1.0);
    keyGroup.scale.setScalar(0.27);
    const keyMaterial = new THREE.MeshStandardMaterial({ color: 0xffd34f, emissive: 0x8f5b00, emissiveIntensity: 2.2, metalness: .8, roughness: .18 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(.56, .075, .09), keyMaterial);
    shaft.rotation.y = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.13, .042, 16, 28), keyMaterial);
    ring.rotation.x = Math.PI / 2; ring.position.x = -.31;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(.13, .08, .11), keyMaterial);
    tooth.position.set(.30, -.02, 0);
    keyGroup.add(shaft, ring, tooth);
    keyGroup.userData.objectId = "KEY_FROM_DRAWER";
    keyGroup.userData.interactable = true;
    keyGroup.visible = false;
    this.scene.add(keyGroup);
    this.objects.drawerKey = keyGroup;

    const handle = this.mesh(new THREE.CylinderGeometry(.055, .055, .28, 18), this.mat(0xa27b46, .3, .7), [.8, .92, -.64], [Math.PI / 2, 0, 0]);
    handle.userData.objectId = "HALF_OPEN_DRAWER";
    this.objects.drawerHandle = handle;
  }

  createBox() {
    const box = this.mesh(new THREE.BoxGeometry(.9, .65, .9), this.mat(0x3e4145, .7, .15), [-.85, .36, -1.58]);
    box.userData.objectId = "CLOSED_BOX"; this.objects.box = box;
    const lid = this.mesh(new THREE.BoxGeometry(.96, .08, .96), this.mat(0x55585c, .62), [-.85, .72, -1.58]);
    lid.userData.objectId = "CLOSED_BOX"; this.objects.boxLid = lid;
  }

  createClock() {
    const clock = this.mesh(new THREE.CylinderGeometry(.48, .48, .12, 40), this.mat(0xc9c8c0, .52), [.8, 2.55, -4.72], [Math.PI / 2, 0, 0]);
    clock.userData.objectId = "BROKEN_CLOCK"; this.objects.clock = clock;
    const handMat = this.mat(0x222222, .55);
    const h1 = this.mesh(new THREE.BoxGeometry(.045, .27, .025), handMat, [.8, 2.58, -4.64]);
    const h2 = this.mesh(new THREE.BoxGeometry(.04, .18, .025), handMat, [.9, 2.48, -4.64], [0, 0, -.8]);
    h1.userData.objectId = "BROKEN_CLOCK"; h2.userData.objectId = "BROKEN_CLOCK";
  }

  createPainting() {
    const frame = this.mesh(new THREE.BoxGeometry(2.05, 1.55, .14), this.mat(0x8a653e, .52, .15), [-1.65, 2.45, -4.72]);
    frame.userData.objectId = "OLD_PAINTING"; this.objects.painting = frame;
    this.mesh(new THREE.BoxGeometry(1.7, 1.2, .08), this.mat(0x38444b, .95), [-1.65, 2.45, -4.61]);
  }

  createChair() {
    const wood = this.mat(0x4b3022, .78);
    this.mesh(new THREE.BoxGeometry(1.05, .12, 1), wood, [.8, .72, -.2]);
    this.mesh(new THREE.BoxGeometry(.9, 1.25, .12), wood, [.8, 1.32, .28]);
    for (const x of [.38, 1.22]) for (const z of [-.55, .2]) this.mesh(new THREE.BoxGeometry(.1, .72, .1), wood, [x, .36, z]);
  }

  createLamp() {
    const metal = this.mat(0x45484c, .32, .7);
    this.mesh(new THREE.CylinderGeometry(.18, .28, .06, 24), metal, [.2, 1.48, -1.55]);
    this.mesh(new THREE.CylinderGeometry(.025, .025, .8, 12), metal, [.2, 1.85, -1.55]);
    this.mesh(new THREE.SphereGeometry(.13, 18, 18), this.mat(0xd7c48b, .35), [.2, 2.25, -1.55]);
    const light = this.registerRoomLight(new THREE.PointLight(0xffc978, 4, 4));
    light.position.set(.2, 2.2, -1.55);
    light.castShadow = true;
    this.dynamic.deskLight = light;
    this.scene.add(light);
  }

  createSideTable() {
    const dark = this.mat(0x35373a, .72, .15);
    this.mesh(new THREE.CylinderGeometry(.48, .55, .12, 28), dark, [-2.8, .95, -1.7]);
    this.mesh(new THREE.CylinderGeometry(.07, .09, .95, 16), dark, [-2.8, .48, -1.7]);
    this.mesh(new THREE.CylinderGeometry(.55, .55, .05, 28), dark, [-2.8, .05, -1.7]);
  }

  createAtmosphere() {
    const warm = this.mat(0x8b6b52, .72, .05);
    const dark = this.mat(0x171a20, .72, .2);
    const brass = this.mat(0xb28a52, .3, .8);
    for (const x of [-3.65, -1.25, 1.25, 3.65]) {
      this.mesh(new THREE.BoxGeometry(.055, 3.05, .08), warm, [x, 2.05, -4.76]);
      this.mesh(new THREE.BoxGeometry(2.15, .055, .08), warm, [x, .55, -4.76]);
      this.mesh(new THREE.BoxGeometry(2.15, .055, .08), warm, [x, 3.52, -4.76]);
    }
    this.mesh(new THREE.BoxGeometry(4.8, .035, 3.15), dark, [.35, .045, -.15]);
    this.mesh(new THREE.BoxGeometry(4.35, .025, 2.7), this.mat(0x4b3630, 1), [.35, .065, -.15]);
    const fixture = this.mesh(new THREE.BoxGeometry(1.25, .08, .42), brass, [0, 3.86, -.2]);
    fixture.userData.objectId = "CEILING_FIXTURE";
    const ceilingLight = this.registerRoomLight(new THREE.PointLight(0xffc98a, 7, 7));
    ceilingLight.position.set(0, 3.45, -.2);
    ceilingLight.castShadow = true;
    this.scene.add(ceilingLight);
    const moon = this.registerRoomLight(new THREE.PointLight(0x7894c8, 4, 6));
    moon.position.set(-3.2, 2.5, -3.8);
    this.scene.add(moon);
    const book = this.mesh(new THREE.BoxGeometry(.55, .12, .8), this.mat(0x6f3030, .62), [.15, 1.52, -1.72]);
    book.userData.objectId = "OLD_DESK";
    const cup = this.mesh(new THREE.CylinderGeometry(.11, .09, .22, 18), this.mat(0xb8b1a2, .38), [1.35, 1.55, -1.65]);
    cup.userData.objectId = "OLD_DESK";
    const note = this.mesh(new THREE.BoxGeometry(.5, .012, .32), this.mat(0xd4c7a5, .9), [1.15, 1.49, -1.95]);
    note.userData.objectId = "OLD_DESK";
    const strip = this.mesh(new THREE.BoxGeometry(7.8, .035, .035), this.mat(0x8a5c4d, .4, .2, 0x8a3f32), [0, .18, -4.72]);
    strip.userData.objectId = "OLD_PAINTING";
  }

  createWindow() {
    const frame = this.mat(0x17191c, .5, .35);
    this.mesh(new THREE.BoxGeometry(2.2, 1.5, .12), frame, [-3, 2.35, -4.72]);
    this.mesh(new THREE.BoxGeometry(1.85, 1.15, .05), this.mat(0x182431, .2), [-3, 2.35, -4.62]);
    this.mesh(new THREE.BoxGeometry(.05, 1.15, .08), frame, [-3, 2.35, -4.54]);
    this.mesh(new THREE.BoxGeometry(1.85, .05, .08), frame, [-3, 2.35, -4.54]);
  }
}
