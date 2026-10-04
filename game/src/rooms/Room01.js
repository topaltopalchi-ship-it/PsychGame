import * as THREE from "three";

export class Room01 {
  constructor(scene, tracker) {
    this.scene = scene;
    this.tracker = tracker;
    this.objects = {};
  }

  start() {
    this.createFloor();
    this.createWalls();
    this.createDoor();
    this.createRedButton();
    this.createDesk();
    this.createDrawer();
    this.createBox();
    this.createClock();
    this.createPainting();

    this.tracker.log(
      "ROOM_ENTER",
      {
        roomId: "ROOM_01",
        roomName: "THE_RED_BUTTON"
      }
    );
  }

  getInteractableObjects() {
    return Object.values(
      this.objects
    );
  }

  createFloor() {
    const geometry =
      new THREE.BoxGeometry(
        10,
        0.2,
        10
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x302a26,
        roughness: 0.8
      });

    const floor =
      new THREE.Mesh(
        geometry,
        material
      );

    floor.position.y = -0.1;
    floor.receiveShadow = true;

    this.scene.add(floor);
  }

  createWalls() {
    const material =
      new THREE.MeshStandardMaterial({
        color: 0x252a30
      });

    const back =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          10,
          4,
          0.2
        ),
        material
      );

    back.position.set(
      0,
      2,
      -4.8
    );

    this.scene.add(back);

    const left =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.2,
          4,
          10
        ),
        material
      );

    left.position.set(
      -5,
      2,
      0
    );

    this.scene.add(left);

    const right =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.2,
          4,
          10
        ),
        material
      );

    right.position.set(
      5,
      2,
      0
    );

    this.scene.add(right);
  }

  createDoor() {
    const geometry =
      new THREE.BoxGeometry(
        1.8,
        3.4,
        0.15
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x493326
      });

    const door =
      new THREE.Mesh(
        geometry,
        material
      );

    door.position.set(
      3.5,
      1.7,
      -4.65
    );

    door.userData.objectId =
      "EXIT_DOOR";

    this.objects.exitDoor =
      door;

    this.scene.add(door);
  }

  createRedButton() {
    const geometry =
      new THREE.CylinderGeometry(
        0.28,
        0.28,
        0.18,
        32
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0xc91515,
        emissive: 0x440000,
        emissiveIntensity: 1
      });

    const button =
      new THREE.Mesh(
        geometry,
        material
      );

    button.rotation.z =
      Math.PI / 2;

    button.position.set(
      -3.8,
      1.8,
      1.2
    );

    button.userData.objectId =
      "RED_BUTTON";

    this.objects.redButton =
      button;

    this.scene.add(button);
  }

  createDesk() {
    const geometry =
      new THREE.BoxGeometry(
        2.5,
        0.2,
        1
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x68452e,
        roughness: 0.8
      });

    const desk =
      new THREE.Mesh(
        geometry,
        material
      );

    desk.position.set(
      0.8,
      1,
      -1.7
    );

    desk.userData.objectId =
      "OLD_DESK";

    this.objects.desk =
      desk;

    this.scene.add(desk);
  }

  createDrawer() {
    const geometry =
      new THREE.BoxGeometry(
        1.2,
        0.45,
        0.8
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x513522,
        roughness: 0.9
      });

    const drawer =
      new THREE.Mesh(
        geometry,
        material
      );

    drawer.position.set(
      0.8,
      0.65,
      -1.15
    );

    drawer.userData.objectId =
      "HALF_OPEN_DRAWER";

    this.objects.drawer =
      drawer;

    this.scene.add(drawer);
  }

  createBox() {
    const geometry =
      new THREE.BoxGeometry(
        0.9,
        0.7,
        0.9
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        roughness: 0.7
      });

    const box =
      new THREE.Mesh(
        geometry,
        material
      );

    box.position.set(
      -0.8,
      0.4,
      -1.6
    );

    box.userData.objectId =
      "CLOSED_BOX";

    this.objects.box =
      box;

    this.scene.add(box);
  }

  createClock() {
    const geometry =
      new THREE.CylinderGeometry(
        0.45,
        0.45,
        0.12,
        32
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0xd8d8d2
      });

    const clock =
      new THREE.Mesh(
        geometry,
        material
      );

    clock.rotation.x =
      Math.PI / 2;

    clock.position.set(
      0.8,
      2.5,
      -2.25
    );

    clock.userData.objectId =
      "BROKEN_CLOCK";

    this.objects.clock =
      clock;

    this.scene.add(clock);
  }

  createPainting() {
    const geometry =
      new THREE.BoxGeometry(
        1.8,
        1.3,
        0.1
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x735d45
      });

    const painting =
      new THREE.Mesh(
        geometry,
        material
      );

    painting.position.set(
      -1.5,
      2.3,
      -4.65
    );

    painting.userData.objectId =
      "OLD_PAINTING";

    this.objects.painting =
      painting;

    this.scene.add(painting);
  }
}
