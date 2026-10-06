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
    this.roomEntryAt = performance.now();
    this.keyClueCount = 0;
    this.exitBlockCount = 0;
    this.completed = false;
    this.gameFinished = false;
    this.room8CompletionTimer = null;
    this.room8GameCompleteDispatched = false;
    this.room3CompletionTimer = null;
    this.lastLookedObject = null;
    this.lookStartTime = null;
    this.interactionCounts = {};
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyE") this.interact();
    });
    window.addEventListener("psychgame-game-complete", () => {
      // Main.js is the authoritative owner of the final-game state.
      // Do not set this.gameFinished here: when a Training Plan exists,
      // Main.js must be able to receive this event and enter Training.
      this.currentTarget = null;
      this.finishLook();
      window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId: null } }));
    });
  }

  setCompanion(companion) { this.companion = companion; }
  setRoom(room, roomNumber = 1) {
    this.room = room;
    this.roomNumber = roomNumber;
    this.gameFinished = false;
    this.roomEntryAt = performance.now();
    this.keyClueCount = 0;
    this.exitBlockCount = 0;
    this.clearTargets();
    if (room?.getInteractableObjects) room.getInteractableObjects().forEach(o => this.register(o, o.userData.objectId));
    // Hidden room keys are attached to the scene rather than the room's own
    // object registry, so explicitly register them after the room is set.
    const keyChallenge = room?.roomKeyChallenge;
    if (keyChallenge?.key) this.register(keyChallenge.key, keyChallenge.key.userData.objectId);
    if (keyChallenge?.clue) this.register(keyChallenge.clue, keyChallenge.clue.userData.objectId);
  }

  clearTargets() { if (this.room8CompletionTimer) clearTimeout(this.room8CompletionTimer); if (this.room3CompletionTimer) clearTimeout(this.room3CompletionTimer); this.room8CompletionTimer = null; this.room3CompletionTimer = null; this.finishLook(); this.lastLookedObject = null; this.lookStartTime = null; this.interactables = []; this.currentTarget = null; this.exitDoor = null; this.keyFound = false; this.completed = false; this.buttonPressed = false; this.buttonAttempts = 0; this.buttonFirstSeenTime = null; this.room8GameCompleteDispatched = false; this.interactionCounts = {}; this.roomEntryAt = performance.now(); this.keyClueCount = 0; this.exitBlockCount = 0; }

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
    if (this.gameFinished || this.completed || this.room?.completed || this.room?.exitSequenceStarted) {
      this.finishLook();
      this.currentTarget = null;
      window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId: null } }));
      return;
    }
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
    if (this.gameFinished || this.completed || this.room?.completed || this.room?.exitSequenceStarted) return false;
    const x = (clientX / window.innerWidth) * 2 - 1;
    const y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    const target = hits.map(h => this.resolveTarget(h.object)).find(Boolean);

    if (target) {
      const objectId = target.userData.objectId;

      // A tap is an explicit pointer action, not proof that the player had
      // been looking at the target. Preserve an existing center-ray look
      // interval when it is the same target; otherwise interaction timing
      // stays null instead of being fabricated from the tap itself.
      this.currentTarget = target;
      window.dispatchEvent(new CustomEvent("psychgame-target", { detail: { objectId } }));
      this.interact({ source: "POINTER" });
      return true;
    }

    return false;
  }

  interact(options = {}) {
    if (this.completed || this.gameFinished || this.room?.completed || this.room?.exitSequenceStarted) return;
    const target = this.currentTarget;
    if (!target) return;

    const objectId = target.userData.objectId;
    if (!objectId) return;

    this.interactionCounts[objectId] = (this.interactionCounts[objectId] || 0) + 1;
    const reactionTimeMs = this.lastLookedObject === objectId && this.lookStartTime !== null
      ? Math.round(performance.now() - this.lookStartTime)
      : null;
    if (String(objectId).startsWith("ROOM_KEY_")) {
      this.collectRoomKey(objectId);
      return;
    }

    if (String(objectId).startsWith("KEY_CLUE_")) {
      this.keyClueCount++;
      this.tracker.log("KEY_CLUE_INSPECTED", {
        roomId: `ROOM_${String(this.roomNumber).padStart(2, "0")}`,
        objectId,
        clueNumber: this.keyClueCount,
        secondsSinceRoomEntry: Math.round((performance.now() - this.roomEntryAt) / 100) / 10
      });
      this.companion?.say("اینجا یه نشانه‌ی ظریفه... اطرافش رو دقیق‌تر بگرد.");
      return;
    }

    const roomExitIds = {3:"WAIT_EXIT",4:"HALL_EXIT",5:"MIRROR_EXIT",6:"REC_EXIT",7:"COMP_EXIT",8:"TRUTH_EXIT"};
    if (this.roomNumber >= 3 && this.roomNumber <= 8 && roomExitIds[this.roomNumber] === objectId && !this.keyFound) {
      this.exitBlockCount++;
      this.tracker.log("ROOM_EXIT_BLOCKED_BY_KEY", {
        roomId: `ROOM_${String(this.roomNumber).padStart(2, "0")}`,
        exitId: objectId,
        blockNumber: this.exitBlockCount,
        secondsSinceRoomEntry: Math.round((performance.now() - this.roomEntryAt) / 100) / 10
      });
      this.companion?.say("این در هنوز باز نمی‌شه. اول باید کلید همین اتاق رو پیدا کنی.");
      return;
    }

    this.tracker.log("OBJECT_INTERACTION", {
      objectId,
      attempt: this.interactionCounts[objectId],
      reactionTimeMs,
      roomId: `ROOM_${String(this.roomNumber).padStart(2, "0")}`,
      source: options.source || "KEYBOARD_OR_CENTER"
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
    if (this.roomNumber === 14) { this.handleTrainingGeneric(objectId); return; }
    if (this.roomNumber >= 15 && this.roomNumber <= 20) { this.handleTrainingGeneric(objectId); return; }

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

  collectRoomKey(objectId) {
    if (this.keyFound) return;
    this.keyFound = true;
    this.tracker.log("KEY_FOUND", {
      objectId,
      roomId: `ROOM_${String(this.roomNumber).padStart(2, "0")}`,
      source: "HIDDEN_ROOM_KEY"
    });
    const key = this.interactables.find(object => object?.userData?.objectId === objectId);
    if (key) {
      key.visible = false;
      this.interactables = this.interactables.filter(object => object !== key);
      if (this.currentTarget === key) this.currentTarget = null;
    }
    if (this.room?.roomKeyChallenge?.key) this.room.roomKeyChallenge.key.visible = false;
    this.companion?.say("کلید رو پیدا کردی. حالا می‌تونی مسیر خروج رو امتحان کنی.", 0, "calm");
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
    // Hard gate: Room 1's exit is impossible until the drawer key has
    // actually been collected. Do not trust generic locked state here.
    if (this.roomNumber === 1 && (this.keyFound !== true || this.room?.hasKey !== true)) {
      this.tracker.log("DOOR_CHECKED", { status: "LOCKED", result: "NEEDS_KEY" });
      this.companion?.say("در قفله. اول کلید داخل کشو رو بردار.");
      return;
    }

    const locked = this.exitDoor?.userData.locked === true;

    if (locked && this.keyFound) {
      this.exitDoor.userData.locked = false;
      if (this.exitDoor.material) this.exitDoor.material.color = new THREE.Color(0x493326);
      this.tracker.log("DOOR_UNLOCKED", { objectId: "EXIT_DOOR", source: "KEY" });
      this.companion?.say("کلید درست همینه. قفل باز شد.");
    }

    if (!this.completed) {
      this.completed = true;
      this.room?.completeRoom?.();
      this.companion?.say("بازش کردی... فکر کنم آماده‌ای بریم اتاق بعدی.");
      window.dispatchEvent(new CustomEvent("psychgame-room-complete", { detail: { roomId: "ROOM_01", keyCollected: this.keyFound === true && this.room?.hasKey === true } }));
    }
  }

  handleDrawer() {
    this.tracker.log("DRAWER_INSPECTED", { result: "KEY_REVEALED" });
    if (this.room?.objects?.drawerKey) {
      const key = this.room.objects.drawerKey;
      key.visible = true;
      key.scale.setScalar(0.18);
      if (!this.interactables.includes(key)) this.register(key, "KEY_FROM_DRAWER");
    }
    this.companion?.say("داخل کشو چیزی برق زد... کلید کوچیکه. نزدیک‌تر نگاه کن.");
  }

  handleDrawerKey() {
    if (this.keyFound) {
      this.companion?.say("کلید رو قبلاً برداشتی. حالا برو سمت در.");
      return;
    }

    this.keyFound = true;
    if (this.roomNumber === 1 && this.room) {
      this.room.hasKey = true;

      // Room 1 uses the drawer key as the authoritative unlock.
      // Unlock the actual exit object immediately so a previous button
      // press cannot leave the door visually/logically stuck.
      const exitDoor = this.exitDoor || this.room.objects?.exitDoor;
      if (exitDoor) {
        exitDoor.userData.locked = false;
        if (exitDoor.material) {
          exitDoor.material = exitDoor.material.clone();
          exitDoor.material.color = new THREE.Color(0x493326);
        }
        this.tracker.log("DOOR_UNLOCKED", {
          objectId: "EXIT_DOOR",
          source: "ROOM_01_DRAWER_KEY"
        });
      }
    }

    this.tracker.log("KEY_FOUND", {
      source: "KEY_FROM_DRAWER",
      roomKeyConfirmed: this.roomNumber === 1 ? true : undefined
    });

    const key = this.room?.objects?.drawerKey;
    if (key) {
      this.interactables = this.interactables.filter(object => object !== key);
      if (this.currentTarget === key) this.currentTarget = null;
    }
    this.room?.hideDrawerKey?.();
    this.companion?.say("کلید رو برداشتی. قفل در باز شد. حالا به در نگاه کن و دکمه تعامل رو بزن.");
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
    const reactionTimeMs = this.lastLookedObject === objectId && this.lookStartTime !== null
      ? Math.round(performance.now() - this.lookStartTime)
      : null;
    this.tracker.log("PATH_CHOICE", { roomId: "ROOM_02", path: objectId, reactionTimeMs });
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
    if (!this.keyFound) {
      this.tracker.log("ROOM_EXIT_BLOCKED_BY_KEY", { roomId:"ROOM_02", exitId:"PATH_CENTER" });
      this.companion?.say?.("مسیر درست رو پیدا کردی، ولی هنوز کلید این اتاق رو نداری.");
      return;
    }
    const reactionTimeMs = this.lastLookedObject === objectId && this.lookStartTime !== null
      ? Math.round(performance.now() - this.lookStartTime)
      : null;
    this.tracker.log("PATH_CHOICE", { roomId: "ROOM_02", path: objectId, reactionTimeMs });
    this.room?.completeRoom?.("PATH_CENTER");
    this.completed = true;
    this.companion?.say("مسیر درست رو پیدا کردی. حالا می‌ریم مرحله بعد.");
    window.dispatchEvent(new CustomEvent("psychgame-room-complete", { detail: { roomId: "ROOM_02", path: this.room?.selectedPath || "PATH_CENTER", wrongPaths: Object.entries(this.room?.observedPaths || {}).filter(([path,count]) => path !== "PATH_CENTER" && count > 0).map(([path]) => path) } }));
  }
};

InteractionSystem.prototype.handleRoom3 = function(objectId) {
  if (this.completed || this.room?.completed) { this.completed = true; return; }
  if (objectId === "WAIT_CLOCK") {
      this.room?.reactToClock?.();
    this.tracker.log("WAITING_OBJECT_INSPECTED",{roomId:"ROOM_03",reactionTimeMs:this.lastLookedObject==="WAIT_CLOCK"&&this.lookStartTime!==null?Math.round(performance.now()-this.lookStartTime):null});
    this.companion?.say("ساعت جلو نمی‌ره... شاید بهتره کمی صبر کنی.");
    return;
  }
  if (objectId === "WAIT_SEAT") {
    this.tracker.log("WAITING_SEAT_INSPECTED",{roomId:"ROOM_03",reactionTimeMs:this.lastLookedObject==="WAIT_SEAT"&&this.lookStartTime!==null?Math.round(performance.now()-this.lookStartTime):null});
    this.companion?.say("می‌تونی صبر کنی، یا دنبال راه خروج بگردی.");
    return;
  }
  if (objectId === "WAIT_EXIT") {
    if (this.completed || this.room?.exitSequenceStarted) return;
    this.room?.startExitSequence?.();
    this.tracker.log("WAITING_EXIT_CHECKED",{roomId:"ROOM_03"});
    this.companion?.say("انتخابت ثبت شد. اتاق بعدی آماده‌ست.");
    if (this.room3CompletionTimer) clearTimeout(this.room3CompletionTimer);
    const completedRoom = this.room;
    this.room3CompletionTimer = setTimeout(()=>{
      this.room3CompletionTimer = null;
      if (this.room !== completedRoom || this.completed) return;
      completedRoom?.completeRoom?.();
      if (!completedRoom?.completed) return;
      this.completed = true;
      window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_03"}}));
    },3000);
  }};


InteractionSystem.prototype.handleRoom4 = function(objectId) {
  if (this.completed || this.room?.completed) { this.completed = true; return; }
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
  if (this.completed || this.room?.completed) { this.completed = true; return; }
  if (objectId === "MIRROR_LEFT" || objectId === "MIRROR_CENTER" || objectId === "MIRROR_RIGHT") {
    this.room?.reactToMirror?.(objectId);
    if((this.room?.observations?.[objectId]||0)>=2) window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:"whisper"}}));
    return;
  }
  if (objectId === "MIRROR_EXIT") {
    if (this.completed) return;
    if (!this.room?.firstMirror) {
      this.tracker.log("ROOM_05_EXIT_BLOCKED",{roomId:"ROOM_05",reason:"NO_MIRROR_INSPECTION"});
      this.companion?.say?.("هنوز هیچ آینه‌ای رو بررسی نکردی. اول یکی رو نگاه کن.");
      return;
    }
    this.room?.chooseExit?.();
    this.room?.completeRoom?.();
    this.completed=true;
    this.tracker.log("ROOM_05_EXIT_CHECKED",{roomId:"ROOM_05"});
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_05",behavior:{firstMirror:this.room?.firstMirror||null,repeatedMirrorChecks:Object.values(this.room?.observations||{}).filter(v=>v>1).length,glitchCount:this.room?.glitchCount||0,firstChoiceTime:this.room?.firstChoiceTime||0}}}));
  }
};


InteractionSystem.prototype.handleRoom6 = function(objectId) {
  if (this.completed || this.room?.completed) { this.completed = true; return; }
  if (objectId === "REC_FAMILIAR" || objectId === "REC_UNKNOWN" || objectId === "REC_STATIC") {
    this.room?.reactToRecording?.(objectId); window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:objectId==="REC_STATIC"?"warning":"whisper"}})); return;
  }
  if (objectId === "REC_EXIT") {
    if (this.completed) return;
    if (!this.room?.firstChoice) {
      this.tracker.log("ROOM_06_EXIT_BLOCKED",{roomId:"ROOM_06",reason:"NO_RECORDING_CHECK"});
      this.companion?.say?.("هنوز هیچ صدایی رو بررسی نکردی. اول یکی از دستگاه‌ها رو امتحان کن.");
      return;
    }
    this.room?.chooseExit?.(); this.room?.completeRoom?.(); this.completed=true;
    this.tracker.log("ROOM_06_EXIT_CHECKED",{roomId:"ROOM_06"});
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_06",behavior:{firstChoice:this.room?.firstChoice||null,lastChoice:this.room?.lastChoice||null,switchCount:this.room?.switchCount||0,totalChecks:this.room?.playCount||0}}}));
  }
};


InteractionSystem.prototype.handleRoom7 = function(objectId) {
  if (this.completed || this.room?.completed) { this.completed = true; return; }
  if (objectId === "FOLLOW_COMPANION" || objectId === "GO_ALONE") {
    this.room?.choose?.(objectId); window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:"warning"}})); return;
  }
  if (objectId === "COMP_EXIT") {
    if (this.completed) return;
    if (!this.room?.firstChoice) {
      this.tracker.log("ROOM_07_EXIT_BLOCKED",{roomId:"ROOM_07",reason:"NO_TRUST_CHOICE"});
      this.companion?.say?.("هنوز انتخابت رو نکردی. اول تصمیم بگیر با من میای یا خودت می‌ری.");
      return;
    }
    this.room?.chooseExit?.(); this.room?.completeRoom?.(); this.completed=true;
    this.tracker.log("ROOM_07_EXIT_CHECKED",{roomId:"ROOM_07"});
    window.dispatchEvent(new CustomEvent("psychgame-room-complete",{detail:{roomId:"ROOM_07",trustBehavior:{firstChoice:this.room?.firstChoice||null,lastChoice:this.room?.lastChoice||null,followCount:this.room?.followCount||0,ignoreCount:this.room?.ignoreCount||0,choiceSwitches:this.room?.choiceSwitches||0}}}));
  }
};


InteractionSystem.prototype.handleRoom8 = function(objectId) {
  if (this.completed || this.room?.completed) { this.completed = true; return; }
  if (objectId === "TRUTH_CORE") {
    this.room?.triggerCoreResponse?.(); window.dispatchEvent(new CustomEvent("psychgame-audio-pulse",{detail:{type:"whisper"}})); return;
  }
  if (objectId === "TRUTH_EXIT") {
    if (this.completed) return;
    if (!this.room?.coreResponseDone) {
      this.tracker.log("ROOM_08_EXIT_BLOCKED",{roomId:"ROOM_08",reason:"CORE_NOT_INSPECTED"});
      this.companion?.say?.("قبل از رفتن، اول اون هسته رو بررسی کن.");
      return;
    }
    this.completed=true;
    const endingRoom = this.room;
    endingRoom?.startEnding?.();
    this.tracker.log("ROOM_08_EXIT_CHECKED",{roomId:"ROOM_08"});
    if (this.room8CompletionTimer || this.room8GameCompleteDispatched) return;
    this.room8CompletionTimer = setTimeout(()=>{
      this.room8CompletionTimer = null;
      if (this.room !== endingRoom || !this.completed || this.gameFinished || this.room8GameCompleteDispatched) return;
      endingRoom?.completeRoom?.();
      if (!endingRoom?.completed) return;
      this.room8GameCompleteDispatched = true;
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
