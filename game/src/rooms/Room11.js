import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";

export class Room11 {
  constructor(scene, tracker, plan, companion = null) {
    this.scene = scene;
    this.tracker = tracker;
    this.plan = plan;
    this.companion = companion;
    this.objects = {};
    this.engine = null;
    this.activeAssignment = null;
    this.completed = false;
    this.startedAt = 0;
    this.focusStartedAt = 0;
    this.interruptions = 0;
    this.lastPulse = 0;
  }

  start(context = {}) {
    this.startedAt = performance.now();
    this.engine = new TrainingEngine(this.plan, {
      roomId: 11,
      onEvent: (event) => this.tracker.log(event.type, event)
    });

    this.activeAssignment =
      this.engine.getAssignments().find(
        (item) => item.targetId === "ATTENTION_SUSTAIN"
      ) || null;

    if (!this.activeAssignment) {
      this.tracker.log("TRAINING_ROOM_SKIPPED", {
        roomId: "ROOM_11",
        reason: "NO_ATTENTION_ASSIGNMENT"
      });
      this.completed = true;
      window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", {
        detail: { roomId: "ROOM_11", targetId: null }
      }));
      return;
    }

    this.scene.fog = new THREE.FogExp2(0x0a0d12, 0.018);
    this.createRoom();

    this.tracker.log("ROOM_ENTER", {
      roomId: "ROOM_11",
      roomName: "SUSTAINED_ATTENTION_TRAINING",
      trainingTarget: this.activeAssignment.targetId,
      trainingLevel: this.activeAssignment.level,
      previousRoom: context.previousRoom || "ROOM_10"
    });
  }

  mat(color, roughness = .7, metalness = .05) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  mesh(geometry, material, position = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    this.scene.add(object);
    return object;
  }

  add(id, object) {
    object.userData.objectId = id;
    this.objects[id] = object;
    return object;
  }

  createRoom() {
    this.mesh(
      new THREE.PlaneGeometry(18, 16),
      this.mat(0x12161c, .95),
      [0, 0, 0]
    ).rotation.x = -Math.PI / 2;

    const wall = this.mat(0x0b0f15, .96);
    this.mesh(new THREE.BoxGeometry(18, 4, .3), wall, [0, 2, -7]);
    this.mesh(new THREE.BoxGeometry(18, 4, .3), wall, [0, 2, 7]);
    this.mesh(new THREE.BoxGeometry(.3, 4, 14), wall, [-9, 2, 0]);
    this.mesh(new THREE.BoxGeometry(.3, 4, 14), wall, [9, 2, 0]);

    const focus = this.mesh(
      new THREE.CylinderGeometry(.85, .85, .22, 32),
      this.mat(0x495463, .45, .25),
      [0, 1.15, -1.5]
    );
    focus.rotation.x = Math.PI / 2;
    this.add("ATTENTION_FOCUS", focus);

    const exit = this.mesh(
      new THREE.BoxGeometry(2.6, 2.8, .35),
      this.mat(0x25151a, .75),
      [0, 1.6, 6.7]
    );
    this.add("TRAINING_EXIT", exit);

    const light = new THREE.PointLight(0x8da1c2, 1.8, 14);
    light.position.set(0, 3.4, 0);
    this.scene.add(light);
    this.objects.TRAINING_LIGHT = light;
  }

  begin() {
    if (this.focusStartedAt || !this.activeAssignment) return;

    const durationMs = Number(
      this.activeAssignment.target?.config?.durationMs || 15000
    );

    this.focusStartedAt = performance.now();
    this.lastPulse = 0;

    this.tracker.log("TRAINING_ATTENTION_STARTED", {
      roomId: "ROOM_11",
      targetId: this.activeAssignment.targetId,
      level: this.activeAssignment.level,
      durationMs
    });
  }

  interrupt(reason = "player_left_focus") {
    if (!this.focusStartedAt || this.completed) return;

    this.interruptions += 1;
    this.tracker.log("TRAINING_ATTENTION_INTERRUPTED", {
      roomId: "ROOM_11",
      reason,
      interruptions: this.interruptions
    });

    this.engine.recordAttempt(this.activeAssignment.targetId, false, {
      interruptions: this.interruptions
    });

    this.focusStartedAt = 0;
  }

  finish() {
    if (this.completed || !this.activeAssignment || !this.focusStartedAt) return;

    const durationMs = Number(
      this.activeAssignment.target?.config?.durationMs || 15000
    );
    const elapsedMs = performance.now() - this.focusStartedAt;

    if (elapsedMs < durationMs) return;

    this.engine.recordAttempt(this.activeAssignment.targetId, true, {
      elapsedMs: Math.round(elapsedMs),
      durationMs,
      interruptions: this.interruptions
    });

    this.tracker.log("TRAINING_TASK_COMPLETED", {
      roomId: "ROOM_11",
      targetId: this.activeAssignment.targetId,
      successful: true,
      elapsedMs: Math.round(elapsedMs),
      durationMs,
      interruptions: this.interruptions
    });

    this.completed = true;
    window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", {
      detail: {
        roomId: "ROOM_11",
        targetId: this.activeAssignment.targetId,
        trainingSession: this.engine.getSession()
      }
    }));
  }

  choose(objectId) {
    if (objectId === "ATTENTION_FOCUS") {
      if (!this.focusStartedAt) this.begin();
      return;
    }

    if (objectId === "TRAINING_EXIT") {
      this.finish();
    }
  }

  update() {
    if (!this.focusStartedAt || this.completed) return;

    const elapsed = performance.now() - this.focusStartedAt;
    const durationMs = Number(
      this.activeAssignment?.target?.config?.durationMs || 15000
    );

    if (elapsed - this.lastPulse >= 5000) {
      this.lastPulse = elapsed;
      this.tracker.log("TRAINING_ATTENTION_CHECK", {
        roomId: "ROOM_11",
        elapsedMs: Math.round(elapsed),
        targetMs: durationMs
      });
    }

    if (elapsed >= durationMs) {
      this.finish();
    }
  }

  getInteractableObjects() {
    return Object.values(this.objects).filter(
      (object) => object?.userData?.objectId
    );
  }

  destroy() {
    this.objects = {};
  }
}
