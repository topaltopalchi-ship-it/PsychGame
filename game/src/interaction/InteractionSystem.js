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

    this.buttonAttempts = 0;
    this.buttonFirstSeenTime = null;
    this.buttonPressed = false;
    this.buttonFailed = false;

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
    object.userData.objectId = objectId;

    this.interactables.push(object);
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

    const target = hits[0].object;

    this.currentTarget = target;

    const objectId =
      target.userData.objectId;

    if (!objectId) return;

    if (
      objectId === "RED_BUTTON" &&
      this.buttonFirstSeenTime === null
    ) {
      this.buttonFirstSeenTime =
        performance.now();

      this.tracker.log(
        "RED_BUTTON_FIRST_SEEN",
        {
          objectId
        }
      );
    }
  }

  interact() {
    if (!this.currentTarget) return;

    const objectId =
      this.currentTarget.userData.objectId;

    if (!objectId) return;

    this.tracker.log(
      "OBJECT_INTERACTION",
      {
        objectId,
        action: "INTERACT"
      }
    );

    if (
      objectId === "RED_BUTTON"
    ) {
      this.handleRedButton();
    }
  }

  handleRedButton() {
    this.buttonAttempts++;

    let reactionTime = null;

    if (
      this.buttonFirstSeenTime !== null
    ) {
      reactionTime =
        Math.round(
          performance.now() -
          this.buttonFirstSeenTime
        );
    }

    this.tracker.log(
      "RED_BUTTON_PRESS",
      {
        attempt:
          this.buttonAttempts,

        reactionTimeMs:
          reactionTime
      }
    );

    if (
      !this.buttonPressed
    ) {
      this.buttonPressed = true;
      this.buttonFailed = true;

      this.tracker.log(
        "FAILURE",
        {
          cause:
            "RED_BUTTON",
          attempt:
            this.buttonAttempts
        }
      );

      this.applyButtonConsequence();

      return;
    }

    this.tracker.log(
      "RETRY_AFTER_FAILURE",
      {
        objectId:
          "RED_BUTTON",

        attempt:
          this.buttonAttempts
      }
    );
  }

  applyButtonConsequence() {
    const lights =
      this.camera.parent;

    this.tracker.log(
      "CONSEQUENCE",
      {
        type:
          "BUTTON_PRESSED"
      }
    );

    console.log(
      "RED BUTTON PRESSED — FAILURE"
    );
  }
}
