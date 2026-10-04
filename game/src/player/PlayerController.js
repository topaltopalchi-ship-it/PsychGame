import * as THREE from "three";

export class PlayerController {

  constructor(camera) {

    this.camera = camera;

    this.speed = 3;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    this.direction = new THREE.Vector3();

    this.setupKeyboard();
  }


  setupKeyboard() {

    window.addEventListener("keydown", (event) => {

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

    });


    window.addEventListener("keyup", (event) => {

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

    });

  }


  update(delta) {

    this.direction.set(0, 0, 0);


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


    if (this.direction.lengthSq() === 0) {
      return;
    }


    this.direction.normalize();


    this.camera.translateX(
      this.direction.x *
      this.speed *
      delta
    );

    this.camera.translateZ(
      this.direction.z *
      this.speed *
      delta
    );

  }

}
