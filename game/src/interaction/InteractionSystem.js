import * as THREE from "three";

export class InteractionSystem {

  constructor(camera, tracker) {

    this.camera = camera;
    this.tracker = tracker;

    this.raycaster =
      new THREE.Raycaster();

    this.center =
      new THREE.Vector2(0, 0);

    this.interactables = [];

    this.currentTarget = null;

    window.addEventListener(
      "keydown",
      (event) => {

        if (event.code === "KeyE") {
          this.interact();
        }

      }
    );
  }


  register(object, objectId) {

    object.userData.interactable = true;

    object.userData.objectId =
      objectId;

    this.interactables.push(
      object
    );

  }


  update() {

    this.raycaster.setFromCamera(
      this.center,
      this.camera
    );

    const hits =
      this.raycaster.intersectObjects(
        this.interactables,
        true
      );

    if (hits.length === 0) {

      this.currentTarget = null;

      return;

    }


    const target =
      hits[0].object;

    this.currentTarget =
      target;


    const objectId =
      target.userData.objectId;


    if (objectId) {

      this.tracker.log(
        "OBJECT_LOOK",
        {
          objectId
        }
      );

    }

  }


  interact() {

    if (!this.currentTarget) {

      return;

    }


    const objectId =
      this.currentTarget.userData.objectId;


    this.tracker.log(
      "OBJECT_INTERACTION",
      {
        objectId,
        action: "INTERACT"
      }
    );


    console.log(
      "Interacted with:",
      objectId
    );

  }

}
