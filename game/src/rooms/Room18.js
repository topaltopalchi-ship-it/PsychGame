import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";
import { getTrainingTargetLevel } from "../training/TrainingTargets.js";

export class Room18 {
  constructor(scene, tracker, plan, companion = null) {
    this.scene = scene;
    this.tracker = tracker;
    this.plan = plan;
    this.companion = companion;
    this.objects = {};
    this.completed = false;
    this.engine = new TrainingEngine(plan, {\n      roomId: 18,\n      onEvent: (event) => this.tracker.log(event.type, event)\n    });
    this.assignment = this.engine.getAssignments().find(
      item => ["RESPONSE_INHIBITION", "EMOTIONAL_PAUSE", "ATTENTION_SUSTAIN"].includes(item.targetId) &&
        !item.completed && !item.aborted && !item.exhausted
    ) || null;
    this.target = this.assignment ? getTrainingTargetLevel(this.assignment) : null;
    this.startedAt = 0;
    this.focusStartedAt = 0;
    this.focusTargetMs = this.target?.config?.durationMs || 15000;
    this.requiredPauseMs = this.target?.config?.requiredPauseMs || 3000;
    this.triggered = false;
    this.actions = 0;
  }

  start(context = {}) {
    this.create();
    this.tracker.log("ROOM_ENTER", {
      roomId: "ROOM_18",
      previousRoom: context.previousRoom || null,
      trainingTarget: this.assignment?.targetId || null
    });
  }

  create() {
    const f = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 16),
      new THREE.MeshStandardMaterial({ color: 0x141820 })
    );
    f.rotation.x = -Math.PI / 2;
    this.scene.add(f);

    const ids = this.assignment?.targetId === "ATTENTION_SUSTAIN"
      ? ["FOCUS_1", "FOCUS_2", "FOCUS_3"]
      : ["TRIGGER", "ACTION", "STATUS"];

    ids.forEach((id, index) => {
      const o = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.8, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x455a70 })
      );
      o.position.set(-2 + index * 2, 1.2, -1);
      o.userData.objectId = id;
      this.objects[id] = o;
      this.scene.add(o);
    });

    const e = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x25252a })
    );
    e.position.set(0, 1.5, 6.7);
    e.userData.objectId = "TRAINING_EXIT";
    this.objects.TRAINING_EXIT = e;
    this.scene.add(e);
  }

  choose(id) {
    if (!this.assignment || this.completed) return;

    if (this.assignment.targetId === "ATTENTION_SUSTAIN") {
      if (id.startsWith("FOCUS_") && !this.focusStartedAt) {
        this.focusStartedAt = performance.now();
        this.actions++;
        this.tracker.log("TRAINING_FOCUS_START", { roomId: "ROOM_18", targetId: this.assignment.targetId });
      }
      return;
    }

    if (id === "TRIGGER") {
      this.startedAt = performance.now();
      this.triggered = true;
      this.tracker.log("TRAINING_TRIGGER", { roomId: "ROOM_18", targetId: this.assignment.targetId });
      return;
    }

    if (id === "ACTION" && this.triggered) {
      const elapsed = performance.now() - this.startedAt;
      const successful = elapsed >= this.requiredPauseMs;
      this.actions++;
      this.engine.recordAttempt(this.assignment.targetId, successful, {
        requiredPauseMs: this.requiredPauseMs,
        elapsedMs: Math.round(elapsed)
      });
      this.tracker.log("TRAINING_RESPONSE", {
        roomId: "ROOM_18",
        targetId: this.assignment.targetId,
        successful,
        elapsedMs: Math.round(elapsed)
      });
      this.triggered = false;
      this.startedAt = 0;
    }
  }

  finish() {
    if (!this.assignment || this.completed) return;

    if (this.assignment.targetId === "ATTENTION_SUSTAIN") {
      if (!this.focusStartedAt) return;
      const elapsed = performance.now() - this.focusStartedAt;
      const successful = elapsed >= this.focusTargetMs;
      this.engine.recordAttempt(this.assignment.targetId, successful, {
        targetMs: this.focusTargetMs,
        elapsedMs: Math.round(elapsed)
      });
      this.focusStartedAt = 0;
    } else if (this.triggered) {
      return;
    }

    if (this.engine.isCompleted(this.assignment.targetId) || this.engine.isExhausted(this.assignment.targetId)) {
      this.completed = true;
      window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", {
        detail: { roomId: "ROOM_18", targetId: this.assignment.targetId }
      }));
    }
  }

  getInteractableObjects() { return Object.values(this.objects); }
  destroy() {
    this.objects = {};
    this.engine = null;
  }
}
