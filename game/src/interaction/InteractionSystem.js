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
    this.gameFinished = false;
    this.room8CompletionTimer = null;
    this.room3CompletionTimer = null;
    this.lastLookedObject = null;
    this.lookStartTime = null;
    this.interactionCounts = {};
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyE") this.interact();
    });
    window.addEventListener("psychgame-game-complete", () => {
      this.gameFinished = true;
      this.currentTarget = null;
      this.finishLook();
      window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId: null } }));
    });
  }

  setCompanion(companion) { this.companion = companion; }
  setRoom(room, roomNumber = 1) { this.room = room; this.roomNumber = roomNumber; this.clearTargets(); if (room?.getInteractableObjects) room.getInteractableObjects().forEach(o => this.register(o, o.userData.objectId)); }

  clearTargets() { if (this.room8CompletionTimer) clearTimeout(this.room8CompletionTimer); if (this.room3CompletionTimer) clearTimeout(this.room3CompletionTimer); this.room8CompletionTimer = null; this.room3CompletionTimer = null; this.finishLook(); this.lastLookedObject = null; this.lookStartTime = null; this.interactables = []; this.currentTarget = null; this.exitDoor = null; this.keyFound = false; this.completed = false; this.buttonPressed = false; this.buttonAttempts = 0; this.buttonFirstSeenTime = null; this.interactionCounts = {}; }

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
    if (this.gameFinished) return;
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

    const isNewTarget = this.lastLookedObject !== objectId;
    if (isNewTarget) {
      this.finishLook();
      this.lastLookedObject = objectId;
      this.lookStartTime = performance.now();
      this.tracker.log("OBJECT_LOOK_START", { objectId, roomId: `ROOM_${String(this.roomNumber).padStart(2, "0")}` });
    }

    this.currentTarget = resolved;
    if (isNewTarget && this.roomNumber === 2 && (objectId === "PATH_LEFT" || objectId === "PATH_CENTER" || objectId === "PATH_RIGHT")) {
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
    if (this.completed || this.gameFinished) return;
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
    if (this.roomNumber === 4) { this.handleRoom4(objectId); return; }
    if (this.roomNumber === 5) { this.handleRoom5(objectId); return; }
    if (this.roomNumber === 6) { this.handleRoom6(objectId); return; }
    if (this.roomNumber === 7) { this.handleRoom7(objectId); return; }
    if (this.roomNumber === 8) { this.handleRoom8(objectId); return; }
    if (this.roomNumber === 9) { this.handleRoom9(objectId); return; }
    if (this.roomNumber === 10) { this.handleRoom10(objectId); return; }
    if (this.roomNumber === 11) { this.handleRoom11(objectId); return; }
    if (this.roomNumber === 12) { this.handleTrainingGeneric(objectId); return; }
    if (this.roomNumber === 13) { this.handleTrainingGeneric(objectId); return; }
    if (this.roomNumber === 14) { this.handleTrainingGeneric(objectId); return; }\n    if (this.roomNumber >= 15 && this.roomNumber <= 20) { this.handleTrainingGeneric(objectId); return; }

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
      if (!this.completed) {
        this.completed = true;
        this.tracker.log("ROOM_COMPLETED", { roomId: "ROOM_01", path: "NO_BUTTON" });
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
  if (this.completed) return;
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
    window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:"impact"}}));
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
    if (this.completed) return;
    this.completed=true;
    this.room?.startExitSequence?.();
    this.tracker.log("WAITING_EXIT_CHECKED",{roomId:"ROOM_03"});
    this.room?.completeRoom?.();
    this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_03"});
    this.companion?.say("انتخابت ثبت شد. اتاق بعدی آماده‌ست.");
    if (this.room3CompletionTimer) clearTimeout(this.room3CompletionTimer);
    const completedRoom = this.room;
    this.room3CompletionTimer = setTimeout(()=>{
      this.room3CompletionTimer = null;
      if (this.room !== completedRoom || !this.completed) return;
      window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_03"}}));
    },3000);
  }};


InteractionSystem.prototype.handleRoom4 = function(objectId) {
  if (this.completed) return;
  if (objectId === "HALL_MARK") {
    this.room?.reactToMark?.();
    this.companion?.say("این علامت رو قبلاً دیدی؟ یا فقط فکر می‌کنی دیدیش؟");
    return;
  }
  if (objectId === "HALL_EXIT") {
    this.tracker.log("ROOM_04_EXIT_CHECKED",{turnCount:this.room?.turnCount||0,explored:!!this.room?.explored});
    this.room?.completeRoom?.();
    this.completed=true;
    this.companion?.say("راهرو تموم شد... ولی مطمئنی از همون راهی اومدی که فکر می‌کنی؟");
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_04",turnCount:this.room?.turnCount||0,explored:!!this.room?.explored,behavior:{turnCount:this.room?.turnCount||0,explored:!!this.room?.explored,retreatCount:this.room?.retreatCount||0,maxDepth:this.room?.maxDepth||0}}}));
  }
};


InteractionSystem.prototype.handleRoom5 = function(objectId) {
  if (objectId === "MIRROR_LEFT" || objectId === "MIRROR_CENTER" || objectId === "MIRROR_RIGHT") {
    this.room?.reactToMirror?.(objectId);
    if((this.room?.observations?.[objectId]||0)>=2) window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:"whisper"}}));
    return;
  }
  if (objectId === "MIRROR_EXIT") {
    if (this.completed) return;
    this.room?.chooseExit?.();
    this.room?.completeRoom?.();
    this.completed=true;
    this.tracker.log("ROOM_05_EXIT_CHECKED",{roomId:"ROOM_05"});
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_05",behavior:{firstMirror:this.room?.firstMirror||null,repeatedMirrorChecks:Object.values(this.room?.observations||{}).filter(v=>v>1).length,glitchCount:this.room?.glitchCount||0,firstChoiceTime:this.room?.firstChoiceTime||0}}}));
  }
};


InteractionSystem.prototype.handleRoom6 = function(objectId) {
  if (objectId === "REC_FAMILIAR" || objectId === "REC_UNKNOWN" || objectId === "REC_STATIC") {
    this.room?.reactToRecording?.(objectId); window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:objectId==="REC_STATIC"?"warning":"whisper"}})); return;
  }
  if (objectId === "REC_EXIT") {
    if (this.completed) return;
    this.room?.chooseExit?.(); this.room?.completeRoom?.(); this.completed=true;
    this.tracker.log("ROOM_06_EXIT_CHECKED",{roomId:"ROOM_06"});
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_06",behavior:{firstChoice:this.room?.firstChoice||null,lastChoice:this.room?.lastChoice||null,switchCount:this.room?.switchCount||0,totalChecks:this.room?.playCount||0}}}));
  }
};


InteractionSystem.prototype.handleRoom7 = function(objectId) {
  if (objectId === "FOLLOW_COMPANION" || objectId === "GO_ALONE") {
    this.room?.choose?.(objectId); window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:"warning"}})); return;
  }
  if (objectId === "COMP_EXIT") {
    if (this.completed) return;
    this.room?.chooseExit?.(); this.room?.completeRoom?.(); this.completed=true;
    this.tracker.log("ROOM_07_EXIT_CHECKED",{roomId:"ROOM_07"});
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_07",trustBehavior:{firstChoice:this.room?.firstChoice||null,lastChoice:this.room?.lastChoice||null,followCount:this.room?.followCount||0,ignoreCount:this.room?.ignoreCount||0,choiceSwitches:this.room?.choiceSwitches||0}}}));
  }
};


InteractionSystem.prototype.handleRoom8 = function(objectId) {
  if (this.completed) return;
  if (objectId === "TRUTH_CORE") {
    this.room?.triggerCoreResponse?.(); window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:"whisper"}})); return;
  }
  if (objectId === "TRUTH_EXIT") {
    if (this.completed) return;
    this.completed=true;
    const endingRoom = this.room;
    endingRoom?.startEnding?.();
    this.tracker.log("ROOM_08_EXIT_CHECKED",{roomId:"ROOM_08"});
    this.room8CompletionTimer = setTimeout(()=>{
      this.room8CompletionTimer = null;
      if (this.room !== endingRoom || !this.completed || this.gameFinished) return;
      endingRoom?.completeRoom?.();
      window.dispatchEvent(new CustomEvent("psychgame-game-complete",{detail:{roomId:"ROOM_08"}}));
    },1800);
  }
};

InteractionSystem.prototype.handleRoom9 = function(objectId) {
  if (this.completed) return;

  if (objectId === "TRAINING_TARGET") {
    this.room?.chooseTarget?.();
    this.companion?.say?.("وقتی آماده‌ای، شروع کن و تا پایان زمان تعیین‌شده صبر کن.");
    return;
  }

  if (objectId === "TRAINING_EXIT") {
    this.room?.chooseExit?.();
    if (this.room?.completed) {
      this.completed = true;
    }
  }
};

InteractionSystem.prototype.handleRoom10 = function(objectId) {
  if (this.completed) return;

  if (objectId === "DECISION_A" || objectId === "DECISION_B" || objectId === "DECISION_C") {
    this.room?.choose?.(objectId);
    return;
  }

  if (objectId === "TRAINING_EXIT") {
    this.room?.finish?.();
    if (this.room?.completed) this.completed = true;
  }
};

InteractionSystem.prototype.handleRoom11 = function(objectId) {
  if (this.completed) return;

  if (objectId === "ATTENTION_FOCUS") {
    this.room?.choose?.(objectId);
    return;
  }

  if (objectId === "TRAINING_EXIT") {
    this.room?.choose?.(objectId);
    if (this.room?.completed) this.completed = true;
  }
};

InteractionSystem.prototype.handleTrainingGeneric = function(objectId) {
  if (this.roomNumber >= 15 && this.roomNumber <= 20) {
    if (objectId === "TRAINING_EXIT") { this.room?.finish?.(); if (this.room?.completed) this.completed = true; return; }
    if (this.room?.choose) { this.room.choose(objectId); return; }
  }

  if (this.completed) return;
  if (objectId === "AMBIGUOUS_A" || objectId === "AMBIGUOUS_B" ||
      objectId === "REPEAT_A" || objectId === "REPEAT_B" ||
      objectId === "PAUSE_TRIGGER" || objectId === "PAUSE_ACTION") {
    this.room?.choose?.(objectId);
    return;
  }
  if (objectId === "TRAINING_EXIT") {
    this.room?.finish?.();
    if (this.room?.completed) this.completed = true;
  }
};
