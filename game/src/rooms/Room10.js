import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";

export class Room10 {
  constructor(scene, tracker, plan, companion = null) {
    this.scene = scene;
    this.tracker = tracker;
    this.plan = plan;
    this.companion = companion;
    this.objects = {};
    this.completed = false;
    this.startedAt = 0;
    this.engine = null;
    this.activeAssignment = null;
    this.choice = null;
    this.switches = 0;
  }

  start(context = {}) {
    this.startedAt = performance.now();
    this.engine = new TrainingEngine(this.plan, {
      roomId: 10,
      onEvent: (event) => this.tracker.log(event.type, event)
    });

    this.activeAssignment =
      this.engine.getAssignments().find(
        (item) => item.targetId === "DECISION_COMMITMENT"
      ) ||
      this.engine.getAssignments()[0] ||
      null;

    this.scene.fog = new THREE.FogExp2(0x0a0d12, 0.02);
    this.createRoom();

    this.tracker.log("ROOM_ENTER", {
      roomId: "ROOM_10",
      roomName: "DECISION_STABILITY_TRAINING",
      trainingTarget: this.activeAssignment?.targetId || null,
      trainingLevel: this.activeAssignment?.level || null,
      previousRoom: context.previousRoom || "ROOM_09"
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

    for (const [id, x] of [
      ["DECISION_A", -2.2],
      ["DECISION_B", 0],
      ["DECISION_C", 2.2]
    ]) {
      const card = this.mesh(
        new THREE.BoxGeometry(1.6, 2.1, .18),
        this.mat(0x3b4350, .65, .15),
        [x, 1.2, -1.2]
      );
      this.add(id, card);
    }

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

  choose(id) {
    if (this.completed || !this.activeAssignment) return;

    if (!this.choice) {
      this.choice = id;
      this.tracker.log("TRAINING_DECISION_CHOICE", {
        roomId: "ROOM_10",
        choice: id,
        switchCount: this.switches
      });
      return;
    }

    if (this.choice !== id) {
      this.switches += 1;
      this.choice = id;
      this.tracker.log("TRAINING_DECISION_SWITCH", {
        roomId: "ROOM_10",
        choice: id,
        switchCount: this.switches
      });
    }
  }

  finish() {
    if (this.completed || !this.activeAssignment || !this.choice) return;

    const maxSwitches = Number(
      this.activeAssignment.target?.config?.maxSwitches ?? 0
    );
    const successful = this.switches <= maxSwitches;

    this.engine.recordAttempt(this.activeAssignment.targetId, successful, {
      switchCount: this.switches,
      maxSwitches
    });

    this.tracker.log("TRAINING_TASK_COMPLETED", {
      roomId: "ROOM_10",
      targetId: this.activeAssignment.targetId,
      successful,
      switchCount: this.switches,
      maxSwitches
    });

    if (!successful) {
      this.companion?.say?.("این بار انتخابت خیلی تغییر کرد. دوباره با آرامش تصمیم بگیر.");
      this.choice = null;
      this.switches = 0;
      return;
    }

    this.completed = true;
    this.tracker.log("ROOM_COMPLETED", {
      roomId: "ROOM_10",
      trainingTarget: this.activeAssignment.targetId,
      trainingLevel: this.activeAssignment.level
    });

    window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", {
      detail: {
        roomId: "ROOM_10",
        targetId: this.activeAssignment.targetId,
        trainingSession: this.engine.getSession()
      }
    }));
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
