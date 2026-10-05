import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";
import { getTrainingTargetLevel } from "../training/TrainingTargets.js";

export class Room19 {
  constructor(scene, tracker, plan, companion = null) {
    this.scene = scene;
    this.tracker = tracker;
    this.plan = plan;
    this.companion = companion;
    this.objects = {};
    this.completed = false;
    this.engine = new TrainingEngine(plan, { roomId: 19 });
    this.assignment = this.engine.getAssignments().find(
      item => ["DECISION_COMMITMENT", "REPETITION_REDUCTION", "UNCERTAINTY_TOLERANCE"].includes(item.targetId) &&
        !item.completed && !item.aborted && !item.exhausted
    ) || null;
    this.target = this.assignment ? getTrainingTargetLevel(this.assignment) : null;
    this.actions = 0;
    this.switches = 0;
    this.lastChoice = null;
    this.choiceRepeats = 0;
    this.startTime = 0;
  }

  start(context = {}) {
    this.create();
    this.tracker.log("ROOM_ENTER", {
      roomId: "ROOM_19",
      previousRoom: context.previousRoom || null,
      trainingTarget: this.assignment?.targetId || null
    });
  }

  create() {
    const f = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 16),
      new THREE.MeshStandardMaterial({ color: 0x11171d })
    );
    f.rotation.x = -Math.PI / 2;
    this.scene.add(f);

    for (let i = 1; i <= 4; i++) {
      const o = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.6, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x53616e })
      );
      o.position.set(-3 + i * 2, 1.1, -1);
      o.userData.objectId = "CHECK_" + i;
      this.objects[o.userData.objectId] = o;
      this.scene.add(o);
    }

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
    if (!this.assignment || this.completed || !id.startsWith("CHECK_")) return;

    if (!this.startTime) this.startTime = performance.now();

    const choice = id;
    if (this.lastChoice && this.lastChoice !== choice) this.switches++;
    if (this.lastChoice === choice) this.choiceRepeats++;
    this.lastChoice = choice;
    this.actions++;

    this.tracker.log("TRAINING_CHOICE", {
      roomId: "ROOM_19",
      targetId: this.assignment.targetId,
      choice,
      switches: this.switches,
      repeats: this.choiceRepeats
    });
  }

  finish() {
    if (!this.assignment || this.completed || this.actions === 0) return;

    const targetId = this.assignment.targetId;
    const config = this.target?.config || {};
    let successful = false;

    if (targetId === "DECISION_COMMITMENT") {
      successful = this.switches <= Number(config.maxSwitches ?? 0);
    } else if (targetId === "REPETITION_REDUCTION") {
      successful = this.choiceRepeats <= Number(config.maxRepetitions ?? 1);
    } else if (targetId === "UNCERTAINTY_TOLERANCE") {
      const ambiguity = Number(config.ambiguity ?? 0.25);
      const minimumChoices = Math.max(1, Math.ceil(ambiguity * 4));
      successful = this.actions >= minimumChoices;
    }

    this.engine.recordAttempt(targetId, successful, {
      actions: this.actions,
      switches: this.switches,
      repeats: this.choiceRepeats,
      ambiguity: config.ambiguity ?? null,
      elapsedMs: Math.round(performance.now() - this.startTime)
    });

    if (this.engine.isCompleted(targetId) || this.engine.isExhausted(targetId)) {
      this.completed = true;
      window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", {
        detail: { roomId: "ROOM_19", targetId }
      }));
      return;
    }

    this.actions = 0;
    this.switches = 0;
    this.lastChoice = null;
    this.choiceRepeats = 0;
    this.startTime = 0;
  }

  getInteractableObjects() { return Object.values(this.objects); }
  destroy() {
    this.objects = {};
    this.engine = null;
  }
}
