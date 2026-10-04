import * as THREE from "three";

export class PlayerController {
  constructor(camera) {
    this.camera = camera;

    this.speed = 3;

    this.lookSpeed = 0.002;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    this.direction =
      new THREE.Vector3();

    this.rotation =
      new THREE.Euler(
        0,
        0,
        0,
        "YXZ"
      );

    this.setupKeyboard();
    this.setupMouse();
  }

  setupKeyboard() {
    window.addEventListener(
      "keydown",
      (event) => {
        switch (event.code) {
          case "KeyW":
          case "ArrowUp":
            this.keys.forward = true;
            break;

          case "KeyS":
          case "ArrowDown":
            this.keys.backward = true;
            break;

          case "KeyA":
          case "ArrowLeft":
            this.keys.left = true;
            break;

          case "KeyD":
          case "ArrowRight":
            this.keys.right = true;
            break;
        }
      }
    );

    window.addEventListener(
      "keyup",
      (event) => {
        switch (event.code) {
          case "KeyW":
          case "ArrowUp":
            this.keys.forward = false;
            break;

          case "KeyS":
          case "ArrowDown":
            this.keys.backward = false;
            break;

          case "KeyA":
          case "ArrowLeft":
            this.keys.left = false;
            break;

          case "KeyD":
          case "ArrowRight":
            this.keys.right = false;
            break;
        }
      }
    );
  }

  setupMouse() {
    window.addEventListener(
      "click",
      () => {
        document.body.requestPointerLock();
      }
    );

    document.addEventListener(
      "mousemove",
      (event) => {
        if (
          document.pointerLockElement !==
          document.body
        ) {
          return;
        }

        this.rotation.y -=
          event.movementX *
          this.lookSpeed;

        this.rotation.x -=
          event.movementY *
          this.lookSpeed;

        const maxPitch =
          Math.PI / 2 - 0.05;

        this.rotation.x =
          Math.max(
            -maxPitch,
            Math.min(
              maxPitch,
              this.rotation.x
            )
          );

        this.camera.rotation.copy(
          this.rotation
        );
      }
    );
  }

  update(delta) {
    this.direction.set(
      0,
      0,
      0
    );

    if (this.keys.forward) {
      this.direction.z -= 1;
    }

    if (this.keys.backward) {
      this.direction.z += 1;
    }

    if (this.keys.left) {
      this.direction.x -= 1;
    }

    if (this.keys.right) {
      this.direction.x += 1;
    }

    if (
      this.direction.lengthSq() === 0
    ) {
      return;
    }

    this.direction.normalize();

    const movement =
      this.direction.clone();

    movement.applyEuler(
      new THREE.Euler(
        0,
        this.camera.rotation.y,
        0
      )
    );

    this.camera.position.add(
      movement.multiplyScalar(
        this.speed * delta
      )
    );
  }
}
