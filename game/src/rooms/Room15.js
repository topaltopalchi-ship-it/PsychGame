import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";

export class Room15 {
  constructor(scene, tracker, plan, companion = null) {
    this.scene = scene; this.tracker = tracker; this.plan = plan; this.companion = companion;
    this.objects = {}; this.completed = false; this.assignment = null; this.engine = null; this.lastActionAt = 0;
  }
  start(context = {}) {
    this.engine = new TrainingEngine(this.plan, { roomId: 15, onEvent: e => this.tracker.log(e.type, e) });
    this.assignment = this.engine.getAssignments().find(x => x.targetId === "RESPONSE_INHIBITION") || null;
    if (!this.assignment) return this.skip();
    this.createRoom();
    this.tracker.log("ROOM_ENTER", { roomId: "ROOM_15", trainingTarget: "RESPONSE_INHIBITION", trainingLevel: this.assignment.level, previousRoom: context.previousRoom || null });
  }
  mat(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: .72 }); }
  add(id, o) { o.userData.objectId = id; this.objects[id] = o; this.scene.add(o); return o; }
  createRoom() {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), this.mat(0x141a21)); f.rotation.x = -Math.PI / 2; this.scene.add(f);
    this.add("INHIBITION_TRIGGER", new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, .25), this.mat(0x8d3030))).position.set(-1.7, 1.3, -1);
    this.add("INHIBITION_ACTION", new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, .25), this.mat(0x315c8a))).position.set(1.7, 1.3, -1);
    this.add("TRAINING_EXIT", new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, .35), this.mat(0x25252a))).position.set(0, 1.5, 6.7);
  }
  choose(id) {
    if (this.completed || !this.assignment) return;
    const now = performance.now(); const pause = this.lastActionAt ? now - this.lastActionAt : 0;
    this.tracker.log("TRAINING_INHIBITION_ACTION", { roomId: "ROOM_15", objectId: id, requiredPauseMs: this.assignment.target?.config?.requiredPauseMs || 0 });
    if (id === "INHIBITION_TRIGGER") { this.lastActionAt = now; this.companion?.say?.("مکث کن. هنوز لازم نیست واکنش نشان بدهی."); }
  }
  finish() {
    if (this.completed || !this.assignment) return;
    const required = Number(this.assignment.target?.config?.requiredPauseMs || 2000);
    const elapsed = this.lastActionAt ? performance.now() - this.lastActionAt : 0;
    const success = elapsed >= required;
    this.engine.recordAttempt(this.assignment.targetId, success, { requiredPauseMs: required, elapsedMs: Math.round(elapsed) });
    if (!success) return this.companion?.say?.("این بار مکث کافی نبود؛ دوباره امتحان کن.");
    this.completed = true;
    window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", { detail: { roomId: "ROOM_15", targetId: "RESPONSE_INHIBITION", trainingSession: this.engine.getSession() } }));
  }
  skip() { this.completed = true; window.dispatchEvent(new CustomEvent("psychgame-training-room-complete", { detail: { roomId: "ROOM_15", targetId: null } })); }
  getInteractableObjects() { return Object.values(this.objects); }
  destroy() { this.objects = {}; }
}