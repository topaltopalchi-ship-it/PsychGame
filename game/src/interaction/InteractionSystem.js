import * as THREE from "three";

export class InteractionSystem {
  constructor(camera, tracker, scene = null, mainLight = null) {
    this.camera = camera;
    this.tracker = tracker;
    this.scene = scene;
    this.mainLight = mainLight;
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.interactables = [];
    this.currentTarget = null;
    this.buttonAttempts = 0;
    this.buttonFirstSeenTime = null;
    this.buttonPressed = false;
    this.exitDoor = null;
    this.companion = null;
    this.room = null;
    this.roomNumber = 1;
    this.keyFound = false;
    this.completed = false;
    this.lastLookedObject = null;
    this.lookStartTime = null;
    this.interactionCounts = {};
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyE") this.interact();
    });
  }

  setCompanion(companion) { this.companion = companion; }
  setRoom(room, roomNumber = 1) { this.room = room; this.roomNumber = roomNumber; this.clearTargets(); if (room?.getInteractableObjects) room.getInteractableObjects().forEach(o => this.register(o, o.userData.objectId)); }

  clearTargets() { this.interactables = []; this.currentTarget = null; this.exitDoor = null; this.keyFound = false; this.completed = false; this.buttonPressed = false; this.buttonAttempts = 0; this.buttonFirstSeenTime = null; this.interactionCounts = {}; }

  register(object, objectId) {
    object.userData.interactable = true;
    object.userData.objectId = objectId;
    this.interactables.push(object);
    if (objectId === "EXIT_DOOR") this.exitDoor = object;
  }

  resolveTarget(object) {
    let node = object;
    while (node) {
      if (node.userData?.objectId) return node;
      node = node.parent;
    }
    return null;
  }

  update() {
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    const resolved = hits.map(h => this.resolveTarget(h.object)).find(Boolean);

    if (!resolved) {
      this.finishLook();
      this.currentTarget = null;
      window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId: null } }));
      return;
    }

    const objectId = resolved.userData.objectId;

    if (this.lastLookedObject !== objectId) {
      this.finishLook();
      this.lastLookedObject = objectId;
      this.lookStartTime = performance.now();
      this.tracker.log("OBJECT_LOOK_START", { objectId });
    }

    this.currentTarget = resolved;
    if (this.roomNumber === 2 && (objectId === "PATH_LEFT" || objectId === "PATH_CENTER" || objectId === "PATH_RIGHT")) {
      this.room?.reactToObservation?.(objectId);
    }
    window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId } }));

    if (objectId === "RED_BUTTON" && this.buttonFirstSeenTime === null) {
      this.buttonFirstSeenTime = performance.now();
      this.tracker.log("RED_BUTTON_FIRST_SEEN", { objectId });
    }
  }

  finishLook() {
    if (this.lastLookedObject === null || this.lookStartTime === null) return;
    this.tracker.log("OBJECT_LOOK_END", {
      objectId: this.lastLookedObject,
      durationMs: Math.round(performance.now() - this.lookStartTime)
    });
    this.lastLookedObject = null;
    this.lookStartTime = null;
  }

  interactAt(clientX, clientY) {
    const x = (clientX / window.innerWidth) * 2 - 1;
    const y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    const target = hits.map(h => this.resolveTarget(h.object)).find(Boolean);

    if (target) {
      this.currentTarget = target;
      window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId: target.userData.objectId } }));
      this.interact();
      return true;
    }

    return false;
  }

  interact() {
    const target = this.currentTarget;
    if (!target) return;

    const objectId = target.userData.objectId;
    if (!objectId) return;

    this.interactionCounts[objectId] = (this.interactionCounts[objectId] || 0) + 1;
    this.tracker.log("OBJECT_INTERACTION", {
      objectId,
      attempt: this.interactionCounts[objectId]
    });

    if (this.roomNumber === 2) { this.handleRoom2(objectId); return; }
    if (this.roomNumber === 3) { this.handleRoom3(objectId); return; }

    switch (objectId) {
      case "RED_BUTTON": this.handleRedButton(); break;
      case "EXIT_DOOR": this.handleDoor(); break;
      case "HALF_OPEN_DRAWER": this.handleDrawer(); break;
      case "KEY_FROM_DRAWER": this.handleDrawerKey(); break;
      case "CLOSED_BOX": this.handleBox(); break;
      case "OLD_DESK": this.handleDesk(); break;
      case "BROKEN_CLOCK": this.handleClock(); break;
      case "OLD_PAINTING": this.handlePainting(); break;
    }
  }

  handleRedButton() {
    this.buttonAttempts++;
    const reactionTime = this.buttonFirstSeenTime === null ? null :
      Math.round(performance.now() - this.buttonFirstSeenTime);

    this.tracker.log("RED_BUTTON_PRESS", {
      attempt: this.buttonAttempts,
      reactionTimeMs: reactionTime
    });

    if (!this.buttonPressed) {
      this.buttonPressed = true;
      this.tracker.log("FAILURE", { cause: "RED_BUTTON" });
      this.room?.showButtonPressed?.();
      this.companion?.say("دکمه رو زدی... نور اتاق کم شد و در قفل شد.");
      this.applyButtonConsequence();
      return;
    }

    this.tracker.log("RETRY_AFTER_FAILURE", {
      objectId: "RED_BUTTON",
      attempt: this.buttonAttempts
    });
    this.companion?.say("این همون دکمه‌ست. این بار بهتره دنبال سرنخ بگردی.");
  }

  applyButtonConsequence() {
    this.tracker.log("CONSEQUENCE", { type: "LIGHTS_DIMMED_AND_DOOR_LOCKED" });
    if (this.mainLight) this.mainLight.intensity = 11;
    this.room?.setRoomLightLevel?.(0.58);

    if (this.exitDoor) {
      this.exitDoor.userData.locked = true;
      this.exitDoor.material = this.exitDoor.material.clone();
      this.exitDoor.material.color = new THREE.Color(0x241714);
    }
  }

  handleDoor() {
    const locked = this.exitDoor?.userData.locked === true;

    // If the player never pressed the red button, the door remains unlocked.
    if (!locked && !this.keyFound) {
      this.tracker.log("DOOR_CHECKED", { status: "UNLOCKED", result: "SAFE_EXIT" });
      this.tracker.log("ROOM_COMPLETED", { roomId: "ROOM_01", path: "NO_BUTTON" });
      if (!this.completed) {
        this.completed = true;
        this.room?.completeRoom?.();
        this.companion?.say("در بازه. بدون دردسر می‌تونی از اتاق خارج بشی.");
        window.dispatchEvent(new CustomEvent("psychgame-room-complete", { detail: { roomId: "ROOM_01" } }));
      }
      return;
    }

    // After the red button is pressed, the door is locked and the golden key is required.
    if (locked && !this.keyFound) {
      this.tracker.log("DOOR_CHECKED", { status: "LOCKED", result: "NEEDS_KEY" });
      this.companion?.say("در قفله. اول کلید طلایی داخل کشو رو بردار.");
      return;
    }

    if (locked && this.keyFound) {
      this.exitDoor.userData.locked = false;
      if (this.exitDoor.material) this.exitDoor.material.color = new THREE.Color(0x493326);
      this.tracker.log("DOOR_UNLOCKED", { objectId: "EXIT_DOOR", source: "KEY" });
      this.companion?.say("کلید درست همینه. قفل باز شد.");
    }

    if (!this.completed) {
      this.completed = true;
      this.tracker.log("ROOM_COMPLETED", { roomId: "ROOM_01" });
      this.room?.completeRoom?.();
      this.companion?.say("بازش کردی... فکر کنم آماده‌ای بریم اتاق بعدی.");
      window.dispatchEvent(new CustomEvent("psychgame-room-complete", { detail: { roomId: "ROOM_01" } }));
    }
  }

  handleDrawer() {
    this.tracker.log("DRAWER_INSPECTED", { result: "KEY_REVEALED" });
    if (this.room?.objects?.drawerKey) { this.room.objects.drawerKey.visible = true; this.room.objects.drawerKey.scale.setScalar(0.18); }
    this.companion?.say("داخل کشو چیزی برق زد... کلید کوچیکه. نزدیک‌تر نگاه کن.");
  }

  handleDrawerKey() {
    if (this.keyFound) {
      this.companion?.say("کلید رو قبلاً برداشتی. حالا برو سمت در.");
      return;
    }
    this.keyFound = true;
    this.tracker.log("KEY_FOUND", { source: "KEY_FROM_DRAWER" });
    this.room?.hideDrawerKey?.();
    this.companion?.say("کلید رو برداشتی. حالا به در نگاه کن و دکمه تعامل رو بزن.");
  }

  handleBox() {
    this.tracker.log("BOX_INSPECTED", { result: "NOTHING_FOUND" });
    this.companion?.say("جعبه خالیه.");
  }

  handleDesk() {
    this.tracker.log("DESK_INSPECTED", { result: "ORDINARY_OBJECT" });
  }

  handleClock() {
    this.tracker.log("CLOCK_INSPECTED", { result: "BROKEN" });
  }

  handlePainting() {
    this.tracker.log("PAINTING_INSPECTED", { result: "NO_DIRECT_CLUE" });
  }
}


// Room 2: choices are intentionally recoverable after a wrong path.
InteractionSystem.prototype.handleRoom2 = function(objectId) {
  if (objectId === "PATH_CLUE") {
    this.tracker.log("CLUE_INSPECTED", { roomId: "ROOM_02" });
    this.companion?.say("سه مسیر داری. انتخابت مهمه؛ اگر اشتباه کنی، می‌تونی دوباره تصمیم بگیری.");
    return;
  }
  if (objectId === "PATH_LEFT" || objectId === "PATH_RIGHT") {
    this.tracker.log("PATH_CHOICE", { roomId: "ROOM_02", path: objectId });
    this.tracker.log("FAILURE", { roomId: "ROOM_02", cause: objectId });
    this.tracker.log("PATH_RETURN", { roomId: "ROOM_02", path: objectId });
    this.room?.triggerPathScare?.(objectId);
    this.companion?.say(objectId === "PATH_LEFT" ? "این مسیر به بن‌بست رسید. برگرد و دوباره انتخاب کن." : "این مسیر بسته است. برگرد و مسیر دیگری را امتحان کن.");
    return;
  }
  if (objectId === "DECISION_MARKER") {
    this.tracker.log("DECISION_POINT_INSPECTED", { roomId: "ROOM_02" });
    this.companion?.say("اینجا نقطه تصمیمه. عجله نکن؛ سه مسیر رو بررسی کن.");
    return;
  }
  if (objectId === "PATH_CENTER") {
    this.tracker.log("PATH_CHOICE", { roomId: "ROOM_02", path: objectId });
    this.room?.completeRoom?.("PATH_CENTER");
    this.completed = true;
    this.tracker.log("ROOM_COMPLETED", { roomId: "ROOM_02", path: "PATH_CENTER" });
    this.companion?.say("مسیر درست رو پیدا کردی. حالا می‌ریم مرحله بعد.");
    window.dispatchEvent(new CustomEvent("psychgame-room-complete", { detail: { roomId: "ROOM_02", path: this.room?.selectedPath || "PATH_CENTER", wrongPaths: Object.entries(this.room?.observedPaths || {}).filter(([path,count]) => path !== "PATH_CENTER" && count > 0).map(([path]) => path) } }));
  }
};

InteractionSystem.prototype.handleRoom3 = function(objectId) {
  if (objectId === "WAIT_CLOCK") {
      this.room?.reactToClock?.();
    this.tracker.log("WAITING_OBJECT_INSPECTED",{roomId:"ROOM_03"});
    this.companion?.say("ساعت جلو نمی‌ره... شاید بهتره کمی صبر کنی.");
    return;
  }
  if (objectId === "WAIT_SEAT") {
    this.tracker.log("WAITING_SEAT_INSPECTED",{roomId:"ROOM_03"});
    this.companion?.say("می‌تونی صبر کنی، یا دنبال راه خروج بگردی.");
    return;
  }
  if (objectId === "WAIT_EXIT") {
      this.room?.triggerFinalBeat?.();
      this.room?.reactToExit?.();
    this.tracker.log("WAITING_EXIT_CHECKED",{roomId:"ROOM_03"});
    this.room?.completeRoom?.();
    this.completed=true;
    this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_03"});
    this.companion?.say("انتخابت ثبت شد. اتاق بعدی آماده‌ست.");
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_03"}}));
  }
};
