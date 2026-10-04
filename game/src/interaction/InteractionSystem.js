import * as THREE from "three";

export class InteractionSystem {
  constructor(
    camera,
    tracker,
    scene = null,
    mainLight = null
  ) {
    this.camera = camera;
    this.tracker = tracker;
    this.scene = scene;
    this.mainLight = mainLight;

    this.raycaster =
      new THREE.Raycaster();

    this.center =
      new THREE.Vector2(0, 0);

    this.interactables = [];
    this.currentTarget = null;

    this.buttonAttempts = 0;
    this.buttonFirstSeenTime = null;
    this.buttonPressed = false;

    this.exitDoor = null;\n    this.companion = null;\n    this.room = null;
    this.keyFound = false;
    this.completed = false;

    this.lastLookedObject = null;
    this.lookStartTime = null;

    this.interactionCounts = {};

    window.addEventListener(
      "keydown",
      (event) => {
        if (event.code === "KeyE") {
          this.interact();
        }
      }
    );
  }

  setCompanion(companion) { this.companion = companion; }
  setRoom(room) { this.room = room; }

  register(object, objectId) {
    object.userData.interactable = true;
    object.userData.objectId = objectId;

    this.interactables.push(object);

    if (
      objectId === "EXIT_DOOR"
    ) {
      this.exitDoor = object;
    }
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
      this.finishLook();
      this.currentTarget = null;
      window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId: null } }));
      return;
    }

    const target =
      hits[0].object;

    const objectId =
      target.userData.objectId;

    if (!objectId) return;

    if (
      this.lastLookedObject !==
      objectId
    ) {
      this.finishLook();

      this.lastLookedObject =
        objectId;

      this.lookStartTime =
        performance.now();

      this.tracker.log(
        "OBJECT_LOOK_START",
        {
          objectId
        }
      );
    }

    this.currentTarget =
      target;
    window.dispatchEvent(new CustomEvent("psychgame-target", {
      detail: { objectId }
    }));

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

  finishLook() {
    if (
      this.lastLookedObject === null ||
      this.lookStartTime === null
    ) {
      return;
    }

    const duration =
      Math.round(
        performance.now() -
        this.lookStartTime
      );

    this.tracker.log(
      "OBJECT_LOOK_END",
      {
        objectId:
          this.lastLookedObject,

        durationMs:
          duration
      }
    );

    this.lastLookedObject =
      null;

    this.lookStartTime =
      null;
  }

  interactAt(clientX, clientY) {
    const x = (clientX / window.innerWidth) * 2 - 1;
    const y = -(clientY / window.innerHeight) * 2 + 1;
    const point = new THREE.Vector2(x, y);
    this.raycaster.setFromCamera(point, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    if (!hits.length) return false;
    const hit = hits.find(h => h.object.userData?.objectId);
    if (!hit) return false;
    this.currentTarget = hit.object;
    const objectId = hit.object.userData.objectId;
    window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId } }));
    this.interact();
    return true;
  }

  interact() {
    if (!this.currentTarget) {
      return;
    }

    const objectId =
      this.currentTarget.userData.objectId;

    if (!objectId) {
      return;
    }

    this.interactionCounts[
      objectId
    ] =
      (this.interactionCounts[
        objectId
      ] || 0) + 1;

    this.tracker.log(
      "OBJECT_INTERACTION",
      {
        objectId,

        attempt:
          this.interactionCounts[
            objectId
          ]
      }
    );

    switch (objectId) {
      case "RED_BUTTON":
        this.handleRedButton();
        break;

      case "EXIT_DOOR":
        this.handleDoor();
        break;

      case "HALF_OPEN_DRAWER":
        this.handleDrawer();
        break;

      case "CLOSED_BOX":
        this.handleBox();
        break;

      case "OLD_DESK":
        this.handleDesk();
        break;

      case "BROKEN_CLOCK":
        this.handleClock();
        break;

      case "OLD_PAINTING":
        this.handlePainting();
        break;

      case "HIDDEN_CLUE":
        this.handleHiddenClue();
        break;
    }
  }

  handleRedButton() {
    this.buttonAttempts++;

    const reactionTime =
      this.buttonFirstSeenTime === null
        ? null
        : Math.round(
            performance.now() -
            this.buttonFirstSeenTime
          );

    this.tracker.log(
      "RED_BUTTON_PRESS",
      {
        attempt:
          this.buttonAttempts,

        reactionTimeMs:
          reactionTime
      }
    );

    if (!this.buttonPressed) {
      this.buttonPressed = true;

      this.tracker.log(
        "FAILURE",
        {
          cause:
            "RED_BUTTON"
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
    this.tracker.log(
      "CONSEQUENCE",
      {
        type:
          "LIGHTS_OUT_AND_DOOR_LOCKED"
      }
    );

    if (this.mainLight) {
      this.mainLight.intensity = 0;
    }

    if (this.room && this.room.revealClue) {
      this.room.revealClue();
    }

    if (this.exitDoor) {
      this.exitDoor.userData.locked =
        true;

      this.exitDoor.material =
        this.exitDoor.material.clone();

      this.exitDoor.material.color =
        new THREE.Color(
          0x241714
        );
    }
  }

  handleHiddenClue() {
    this.keyFound = true;
    this.tracker.log("KEY_FOUND", { source:"HIDDEN_CLUE" });
    if (this.room?.showKeyFound) this.room.showKeyFound();
    if (this.companion) this.companion.say("این کلید احتمالاً برای همون دره.");
  }

  handleDoor() {
    if (
      this.exitDoor &&
      this.exitDoor.userData.locked
    ) {
      this.tracker.log(
        "DOOR_BLOCKED",
        {
          objectId:
            "EXIT_DOOR"
        }
      );

      return;
    }

    if (!this.keyFound) {
      this.tracker.log("DOOR_CHECKED", { status:"AVAILABLE", result:"NEEDS_KEY" });
      if (this.companion) this.companion.say("در بازه، ولی انگار کلید می‌خواد.");
      return;
    }
    if (!this.completed) {
      this.completed = true;
      this.tracker.log("ROOM_COMPLETED", { roomId:"ROOM_01" });
      if (this.room?.completeRoom) this.room.completeRoom();
      if (this.companion) this.companion.say("بازش کردی... فکر کنم آماده‌ای بریم اتاق بعدی.");
    }
  }

  handleDrawer() {
    this.tracker.log(
      "DRAWER_INSPECTED",
      {
        result:
          "USEFUL_CLUE"
      }
    );

    console.log(
      "The drawer contains a small key."
    );
  }

  handleBox() {
    this.tracker.log(
      "BOX_INSPECTED",
      {
        result:
          "NOTHING_FOUND"
      }
    );

    console.log(
      "The box is empty."
    );
  }

  handleDesk() {
    this.tracker.log(
      "DESK_INSPECTED",
      {
        result:
          "ORDINARY_OBJECT"
      }
    );
  }

  handleClock() {
    this.tracker.log(
      "CLOCK_INSPECTED",
      {
        result:
          "BROKEN"
      }
    );
  }

  handlePainting() {
    this.tracker.log(
      "PAINTING_INSPECTED",
      {
        result:
          "NO_DIRECT_CLUE"
      }
    );
  }
}
