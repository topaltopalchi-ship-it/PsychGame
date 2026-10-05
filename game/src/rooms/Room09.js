import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";

export class Room09 {
  constructor(scene, tracker, plan) {
    this.scene = scene;
    this.tracker = tracker;
    this.plan = plan;
    this.objects = {};
    this.completed = false;
    this.startedAt = 0;
    this.engine = null;
    this.activeAssignment = null;
    this.waitStarted = false;
    this.waitCompleted = false;
    this.taskMode = "WAIT";
  }

  start(context = {}) {
    this.startedAt = performance.now();
    this.engine = new TrainingEngine(this.plan, {
      roomId: 9,
      onEvent: (event) => this.tracker.log(event.type, event)
    });

    const assignments = this.engine.getAssignments();
    this.activeAssignment = assignments[0] || null;

    this.scene.fog = new THREE.FogExp2(0x0a0d12, 0.018);
    this.createRoom();
    this.tracker.log("ROOM_ENTER", {
      roomId: "ROOM_09",
      roomName: "TRAINING_ROOM_01",
      trainingTarget: this.activeAssignment?.targetId || null,
      trainingLevel: this.activeAssignment?.level || null,
      previousRoom: context.previousRoom || "ROOM_08"
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
    this.mesh(new THREE.PlaneGeometry(18, 16), this.mat(0x12161c, .95), [0, 0, 0]).rotation.x = -Math.PI / 2;

    const wall = this.mat(0x0b0f15, .96);
    this.mesh(new THREE.BoxGeometry(18, 4, .3), wall, [0, 2, -7]);
    this.mesh(new THREE.BoxGeometry(18, 4, .3), wall, [0, 2, 7]);
    this.mesh(new THREE.BoxGeometry(.3, 4, 14), wall, [-9, 2, 0]);
    this.mesh(new THREE.BoxGeometry(.3, 4, 14), wall, [9, 2, 0]);

    const target = this.mesh(
      new THREE.CylinderGeometry(.9, .9, .25, 32),
      this.mat(0x4a5260, .4, .35),
      [0, 1.15, -1.2]
    );
    target.rotation.x = Math.PI / 2;
    this.add("TRAINING_TARGET", target);

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

  beginWait() {
    if (this.waitStarted || !this.activeAssignment) return;
    this.waitStarted = true;

    const config = this.activeAssignment.target?.config || {};
    const targetId = this.activeAssignment.targetId;
    if (targetId === "ATTENTION_SUSTAIN") this.taskMode = "ATTENTION";
    else if (targetId === "RESPONSE_INHIBITION" || targetId === "EMOTIONAL_PAUSE") this.taskMode = "PAUSE";
    else this.taskMode = "WAIT";

    const targetMs = Number(
      config.targetMs ||
      config.requiredPauseMs ||
      config.durationMs ||
      5000
    );

    this.waitTargetMs = Math.max(1000, targetMs);
    this.waitStartTime = performance.now();

    this.tracker.log("TRAINING_TASK_STARTED", {
      roomId: "ROOM_09",
      targetId: this.activeAssignment.targetId,
      level: this.activeAssignment.level,
      targetMs: this.waitTargetMs,
      mode: this.taskMode
    });
  }

  checkWait() {
    if (!this.waitStarted || this.waitCompleted) return false;

    const elapsedMs = performance.now() - this.waitStartTime;
    if (elapsedMs < this.waitTargetMs) return false;

    this.waitCompleted = true;
    this.engine.recordAttempt(this.activeAssignment.targetId, true, {
      elapsedMs: Math.round(elapsedMs),
      targetMs: this.waitTargetMs,
      mode: this.taskMode
    });

    this.tracker.log("TRAINING_TASK_COMPLETED", {
      roomId: "ROOM_09",
      targetId: this.activeAssignment.targetId,
      elapsedMs: Math.round(elapsedMs),
      targetMs: this.waitTargetMs
    });

    this.objects.TRAINING_TARGET?.material?.emissive?.setHex?.(0x17351f);
    return true;
  }

  chooseTarget() {
    if (!this.activeAssignment) return;
    if (!this.waitStarted) this.beginWait();
  }

  chooseExit() {
    if (this.completed) return;
    if (!this.activeAssignment) return;

    if (!this.waitCompleted) {
      this.engine.recordAttempt(this.activeAssignment.targetId, false, {
        reason: "left_before_target"
      });
      this.tracker.log("TRAINING_TASK_INCOMPLETE", {
        roomId: "ROOM_09",
        targetId: this.activeAssignment.targetId
      });
      return;
    }

    this.completed = true;
    this.tracker.log("ROOM_COMPLETED", {
      roomId: "ROOM_09",
      trainingTarget: this.activeAssignment.targetId,
      trainingLevel: this.activeAssignment.level,
      durationMs: Math.round(performance.now() - this.startedAt)
    });

    window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", {
      detail: {
        roomId: "ROOM_09",
        targetId: this.activeAssignment.targetId,
        trainingSession: this.engine.getSession()
      }
    }));
  }

  getInteractableObjects() {
    return Object.values(this.objects).filter((object) => object?.userData?.objectId);
  }

  update() {
    this.checkWait();
  }

  destroy() {
    this.objects = {};
  }
}
