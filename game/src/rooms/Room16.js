import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";
import { getTrainingTargetLevel } from "../training/TrainingTargets.js";

export class Room16 {
  constructor(scene, tracker, plan, companion=null) {
    this.scene=scene; this.tracker=tracker; this.plan=plan; this.companion=companion;
    this.objects={}; this.completed=false; this.steps=0; this.engine=null; this.target=null;
  }
  start(context={}) {
    const a=(this.plan?.assignments||[]).find(x=>x.targetId==="GRADUAL_APPROACH");
    this.engine=new TrainingEngine(this.plan,{roomId:16,onEvent:e=>this.tracker.log(e.type,e)});
    this.target=getTrainingTargetLevel(a);
    this.requiredSteps=Number(this.target?.config?.exposureSteps||1);
    this.create();
    this.tracker.log("ROOM_ENTER",{roomId:"ROOM_16",trainingTarget:"GRADUAL_APPROACH",previousRoom:context.previousRoom||null,level:this.target?.level||1});
  }
  create(){
    const f=new THREE.Mesh(new THREE.PlaneGeometry(18,16),new THREE.MeshStandardMaterial({color:0x151a20})); f.rotation.x=-Math.PI/2; this.scene.add(f);
    for(let i=1;i<=4;i++){const o=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.8,.25),new THREE.MeshStandardMaterial({color:0x40566c}));o.position.set(-3+i*2,1.1,-1);o.userData.objectId="APPROACH_"+i;this.objects[o.userData.objectId]=o;this.scene.add(o);}
    const e=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.8,.3),new THREE.MeshStandardMaterial({color:0x25252a}));e.position.set(0,1.5,6.7);e.userData.objectId="TRAINING_EXIT";this.objects.TRAINING_EXIT=e;this.scene.add(e);
  }
  choose(id){
    if(!id.startsWith("APPROACH_")) return;
    const step=Number(id.split("_")[1]);
    if(step===this.steps+1){this.steps=step;this.tracker.log("GRADUAL_APPROACH_STEP",{roomId:"ROOM_16",step,requiredSteps:this.requiredSteps});}
  }
  finish(){
    if(this.completed||!this.engine||!this.engine.canAttempt("GRADUAL_APPROACH")) return;
    if(this.steps<this.requiredSteps){this.engine.recordAttempt("GRADUAL_APPROACH",false,{steps:this.steps,requiredSteps:this.requiredSteps});return;}
    this.engine.recordAttempt("GRADUAL_APPROACH",true,{steps:this.steps,requiredSteps:this.requiredSteps});
    if(this.engine.isCompleted("GRADUAL_APPROACH")) this.complete();
    else { this.steps=0; this.tracker.log("TRAINING_RETRY",{roomId:"ROOM_16",targetId:"GRADUAL_APPROACH"}); }
  }
  complete(){this.completed=true;window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_16",targetId:"GRADUAL_APPROACH"}}));}
  getInteractableObjects(){return Object.values(this.objects)}
  destroy(){this.objects={}}
}