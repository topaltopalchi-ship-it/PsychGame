import * as THREE from "three";

export class Room01 {
  constructor(scene, tracker) {
    this.scene = scene;
    this.tracker = tracker;
    this.objects = {};
    this.dynamic = { clueVisible:false, redGlow:null, deskLight:null };
    this.completed = false;
  }

  start() {
    this.scene.fog = new THREE.FogExp2(0x090b10, 0.035);
    this.createFloor(); this.createWalls(); this.createCeiling(); this.createDoor();
    this.createRedButton(); this.createDesk(); this.createDrawer(); this.createBox();
    this.createClock(); this.createPainting(); this.createChair(); this.createLamp();
    this.createSideTable(); this.createWindow();
    this.createHiddenClue();
    this.tracker.log("ROOM_ENTER", { roomId:"ROOM_01", roomName:"THE_RED_BUTTON" });
  }

  getInteractableObjects() { return Object.values(this.objects); }

  createHiddenClue() {
    const clue = this.mesh(
      new THREE.BoxGeometry(.62,.09,.38),
      new THREE.MeshStandardMaterial({color:0xf0c94b,emissive:0x8b5f00,emissiveIntensity:0.8,roughness:.42,metalness:.15}),
      [1.7,1.47,-1.02]
    );
    clue.userData.objectId = "HIDDEN_CLUE";
    clue.visible = false;
    this.objects.hiddenClue = clue;
    this.dynamic.clue = clue;
  }

  showButtonPressed() {
    const button = this.objects.redButton;
    if (!button) return;
    button.position.y = 1.68;
    button.material.emissive = new THREE.Color(0xff1b1b);
    button.material.emissiveIntensity = 4;
    setTimeout(() => {
      if (!button) return;
      button.position.y = 1.8;
      button.material.emissiveIntensity = 2.2;
    }, 180);
  }

  showKeyFound() {
    if (!this.dynamic.clue) return;
    this.dynamic.clue.material.emissive = new THREE.Color(0x806a24);
    this.dynamic.clue.material.emissiveIntensity = 1.8;
  }

  completeRoom() {
    this.completed = true;
    if (this.dynamic.clue) this.dynamic.clue.material.emissiveIntensity = 0;
  }

  revealClue() {
    if (this.dynamic.clueVisible) return;
    this.dynamic.clueVisible = true;
    this.dynamic.clue.visible = true;
    this.dynamic.clue.scale.set(1.35,1.35,1.35);
    this.tracker.log("ADAPTIVE_CLUE_REVEALED", { reason:"POST_FAILURE_EXPLORATION" });
  }

  mesh(geometry, material, position, rotation = [0,0,0]) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position); m.rotation.set(...rotation);
    m.castShadow = true; m.receiveShadow = true; this.scene.add(m); return m;
  }
  mat(color, roughness=0.8, metalness=0) { return new THREE.MeshStandardMaterial({color,roughness,metalness}); }

  createFloor() {
    this.mesh(new THREE.BoxGeometry(10,.2,10), this.mat(0x272321,.95), [0,-.1,0]);
    this.mesh(new THREE.BoxGeometry(5.8,.035,3.8), this.mat(0x46342e,1), [-.1,.025,-.1]);
  }
  createWalls() {
    const wall=this.mat(0x20242a,.94);
    this.mesh(new THREE.BoxGeometry(10,4,.22),wall,[0,2,-4.9]);
    this.mesh(new THREE.BoxGeometry(.22,4,10),wall,[-4.9,2,0]);
    this.mesh(new THREE.BoxGeometry(.22,4,10),wall,[4.9,2,0]);
    const trim=this.mat(0x4a3d36,.78);
    this.mesh(new THREE.BoxGeometry(10,.12,.14),trim,[0,.2,-4.75]);
    this.mesh(new THREE.BoxGeometry(10,.12,.14),trim,[0,3.82,-4.75]);
  }
  createCeiling() { this.mesh(new THREE.BoxGeometry(10,.16,10),this.mat(0x15181d,1),[0,4.05,0]); }

  createDoor() {
    const door=this.mesh(new THREE.BoxGeometry(1.8,3.4,.16),this.mat(0x493326,.68),[3.5,1.7,-4.65]);
    door.userData.objectId="EXIT_DOOR"; this.objects.exitDoor=door;
    const frame=this.mat(0x171311,.55,.15);
    this.mesh(new THREE.BoxGeometry(2.15,.18,.24),frame,[3.5,3.48,-4.53]);
    this.mesh(new THREE.BoxGeometry(.18,3.5,.24),frame,[2.48,1.75,-4.53]);
    this.mesh(new THREE.BoxGeometry(.18,3.5,.24),frame,[4.52,1.75,-4.53]);
    const handle=this.mesh(new THREE.SphereGeometry(.09,20,20),this.mat(0xb08a4a,.22,.75),[4.05,1.65,-4.47]);
    this.objects.doorHandle=handle;
  }

  createRedButton() {
    this.mesh(new THREE.BoxGeometry(1.05,.13,.75),this.mat(0x181a1f,.38,.45),[-3.8,1.55,1.2]);
    const button=this.mesh(new THREE.CylinderGeometry(.3,.3,.2,36),new THREE.MeshStandardMaterial({color:0xc91515,emissive:0x6d0000,emissiveIntensity:2.2,roughness:.24}),[-3.8,1.8,1.2],[0,0,Math.PI/2]);
    button.userData.objectId="RED_BUTTON"; this.objects.redButton=button;
    const glow=new THREE.PointLight(0xff2020,1.8,3.5); glow.position.set(-3.8,1.85,1.05); this.scene.add(glow);
  }

  createDesk() {
    const wood=this.mat(0x5b3a27,.72);
    const top=this.mesh(new THREE.BoxGeometry(2.8,.18,1.15),wood,[.8,1.35,-1.65]);
    top.userData.objectId="OLD_DESK"; this.objects.desk=top;
    for(const [x,z] of [[-.35,-2.05],[1.95,-2.05],[-.35,-1.25],[1.95,-1.25]]) this.mesh(new THREE.BoxGeometry(.16,1.35,.16),wood,[x,.68,z]);
    this.mesh(new THREE.BoxGeometry(2.8,.1,.12),wood,[.8,.35,-1.2]);
  }

  createDrawer() {
    const drawer=this.mesh(new THREE.BoxGeometry(1.25,.46,.78),this.mat(0x4b2f20,.88),[.8,.92,-1.05]);
    drawer.userData.objectId="HALF_OPEN_DRAWER"; this.objects.drawer=drawer;

    const cavity=this.mesh(
      new THREE.BoxGeometry(1.02,.05,.48),
      this.mat(0x17110e,.96),
      [.8,1.17,-.98]
    );
    cavity.userData.objectId="HALF_OPEN_DRAWER";
    this.objects.drawerCavity=cavity;

    const keyGroup=new THREE.Group();
    keyGroup.position.set(.8,1.22,-.93);
    const shaft=new THREE.Mesh(
      new THREE.BoxGeometry(.42,.045,.07),
      new THREE.MeshStandardMaterial({color:0xf2c14e,emissive:0x7a4f00,emissiveIntensity:1.4,metalness:.75,roughness:.22})
    );
    shaft.rotation.y=Math.PI/2;
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(.10,.035,12,24),
      new THREE.MeshStandardMaterial({color:0xf2c14e,emissive:0x7a4f00,emissiveIntensity:1.4,metalness:.75,roughness:.22})
    );
    ring.rotation.x=Math.PI/2;
    ring.position.x=-.24;
    keyGroup.add(shaft,ring);
    keyGroup.userData.objectId="KEY_FROM_DRAWER";
    keyGroup.userData.interactable=true;
    this.scene.add(keyGroup);
    this.objects.drawerKey=keyGroup;

    const handle=this.mesh(new THREE.CylinderGeometry(.045,.045,.25,16),this.mat(0xa27b46,.3,.7),[.8,.92,-.64],[Math.PI/2,0,0]);
    handle.userData.objectId="HALF_OPEN_DRAWER"; this.objects.drawerHandle=handle;
  }

  createBox() {
    const box=this.mesh(new THREE.BoxGeometry(.9,.65,.9),this.mat(0x3e4145,.7,.15),[-.85,.36,-1.58]);
    box.userData.objectId="CLOSED_BOX"; this.objects.box=box;
    const lid=this.mesh(new THREE.BoxGeometry(.96,.08,.96),this.mat(0x55585c,.62),[-.85,.72,-1.58]);
    lid.userData.objectId="CLOSED_BOX"; this.objects.boxLid=lid;
  }

  createClock() {
    const clock=this.mesh(new THREE.CylinderGeometry(.48,.48,.12,40),this.mat(0xc9c8c0,.52),[.8,2.55,-4.72],[Math.PI/2,0,0]);
    clock.userData.objectId="BROKEN_CLOCK"; this.objects.clock=clock;
    const handMat=this.mat(0x222222,.55);
    const h1=this.mesh(new THREE.BoxGeometry(.045,.27,.025),handMat,[.8,2.58,-4.64]);
    const h2=this.mesh(new THREE.BoxGeometry(.04,.18,.025),handMat,[.9,2.48,-4.64],[0,0,-.8]);
    h1.userData.objectId="BROKEN_CLOCK"; h2.userData.objectId="BROKEN_CLOCK";
  }

  createPainting() {
    const frame=this.mesh(new THREE.BoxGeometry(2.05,1.55,.14),this.mat(0x8a653e,.52,.15),[-1.65,2.45,-4.72]);
    frame.userData.objectId="OLD_PAINTING"; this.objects.painting=frame;
    this.mesh(new THREE.BoxGeometry(1.7,1.2,.08),this.mat(0x38444b,.95),[-1.65,2.45,-4.61]);
  }

  createChair() {
    const wood=this.mat(0x4b3022,.78);
    this.mesh(new THREE.BoxGeometry(1.05,.12,1),wood,[.8,.72,-.2]);
    this.mesh(new THREE.BoxGeometry(.9,1.25,.12),wood,[.8,1.32,.28]);
    for(const x of [.38,1.22]) for(const z of [-.55,.2]) this.mesh(new THREE.BoxGeometry(.1,.72,.1),wood,[x,.36,z]);
  }

  createLamp() {
    const metal=this.mat(0x45484c,.32,.7);
    this.mesh(new THREE.CylinderGeometry(.18,.28,.06,24),metal,[.2,1.48,-1.55]);
    this.mesh(new THREE.CylinderGeometry(.025,.025,.8,12),metal,[.2,1.85,-1.55]);
    this.mesh(new THREE.SphereGeometry(.13,18,18),this.mat(0xd7c48b,.35),[.2,2.25,-1.55]);
    const light=new THREE.PointLight(0xffc978,4,4); light.position.set(.2,2.2,-1.55); light.castShadow=true; this.scene.add(light);
  }

  createSideTable() {
    const dark=this.mat(0x35373a,.72,.15);
    this.mesh(new THREE.CylinderGeometry(.48,.55,.12,28),dark,[-2.8,.95,-1.7]);
    this.mesh(new THREE.CylinderGeometry(.07,.09,.95,16),dark,[-2.8,.48,-1.7]);
    this.mesh(new THREE.CylinderGeometry(.55,.55,.05,28),dark,[-2.8,.05,-1.7]);
  }

  createWindow() {
    const frame=this.mat(0x17191c,.5,.35);
    this.mesh(new THREE.BoxGeometry(2.2,1.5,.12),frame,[-3,2.35,-4.72]);
    this.mesh(new THREE.BoxGeometry(1.85,1.15,.05),this.mat(0x182431,.2),[-3,2.35,-4.62]);
    this.mesh(new THREE.BoxGeometry(.05,1.15,.08),frame,[-3,2.35,-4.54]);
    this.mesh(new THREE.BoxGeometry(1.85,.05,.08),frame,[-3,2.35,-4.54]);
  }
}
