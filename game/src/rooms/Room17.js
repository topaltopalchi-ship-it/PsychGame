import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";
import { getTrainingTargetLevel } from "../training/TrainingTargets.js";

export class Room17 {
  constructor(scene,tracker,plan,companion=null){this.scene=scene;this.tracker=tracker;this.plan=plan;this.companion=companion;this.objects={};this.completed=false;this.started=0;this.engine=null;this.target=null;this.lastWaitedMs=0;}
  start(context={}){const a=(this.plan?.assignments||[]).find(x=>x.targetId==="WAIT_TOLERANCE");this.engine=new TrainingEngine(this.plan,{roomId:17,onEvent:e=>this.tracker.log(e.type,e)});if(!a){this.skip();return;}this.target=getTrainingTargetLevel(a);this.targetMs=Number(this.target?.config?.targetMs||5000);this.create();this.tracker.log("ROOM_ENTER",{roomId:"ROOM_17",trainingTarget:"WAIT_TOLERANCE",previousRoom:context.previousRoom||null,level:this.target?.level||1,targetMs:this.targetMs});}
  create(){const f=new THREE.Mesh(new THREE.PlaneGeometry(18,16),new THREE.MeshStandardMaterial({color:0x121820}));f.rotation.x=-Math.PI/2;this.scene.add(f);const r=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.5,.3),new THREE.MeshStandardMaterial({color:0x7a5a28}));r.position.set(0,1.3,-1);r.userData.objectId="WAIT_REWARD";this.objects.WAIT_REWARD=r;this.scene.add(r);const e=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.8,.3),new THREE.MeshStandardMaterial({color:0x25252a}));e.position.set(0,1.5,6.7);e.userData.objectId="TRAINING_EXIT";this.objects.TRAINING_EXIT=e;this.scene.add(e);}
  choose(id){if(id==="WAIT_REWARD"&&!this.started)this.started=performance.now();}
  finish(){if(this.completed||!this.engine||!this.engine.canAttempt("WAIT_TOLERANCE"))return;const waited=this.started?performance.now()-this.started:0;this.lastWaitedMs=Math.round(waited);const success=waited>=this.targetMs;this.engine.recordAttempt("WAIT_TOLERANCE",success,{waitedMs:this.lastWaitedMs,targetMs:this.targetMs});if((success&&this.engine.isCompleted("WAIT_TOLERANCE"))||this.engine.isExhausted("WAIT_TOLERANCE"))this.complete();else this.started=0;}
  complete(){this.completed=true;this.tracker.log("WAIT_SUCCESS",{roomId:"ROOM_17",waitedMs:this.lastWaitedMs,targetMs:this.targetMs});window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_17",targetId:"WAIT_TOLERANCE"}}));}
  skip(){this.completed=true;window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_17",targetId:null,skipped:true}}));}
  getInteractableObjects(){return Object.values(this.objects)} destroy(){this.objects={}}
}