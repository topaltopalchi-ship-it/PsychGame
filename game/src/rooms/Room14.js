import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";

export class Room14 {
  constructor(scene, tracker, plan, companion = null) {
    this.scene=scene; this.tracker=tracker; this.plan=plan; this.companion=companion;
    this.objects={}; this.completed=false; this.startedAt=0; this.engine=null;
    this.activeAssignment=null; this.firstChoice=null; this.actions=0; this.switches=0;
  }
  start(context={}) {
    this.startedAt=performance.now();
    this.engine=new TrainingEngine(this.plan,{roomId:14,onEvent:e=>this.tracker.log(e.type,e)});
    this.activeAssignment=this.engine.getAssignments().find(x=>x.targetId==="EMOTIONAL_PAUSE")||null;
    if(!this.activeAssignment){ this.skip(); return; }
    this.scene.fog=new THREE.FogExp2(0x0a0d12,.018); this.createRoom();
    this.tracker.log("ROOM_ENTER",{roomId:"ROOM_14",roomName:"مکث پیش از واکنش",trainingTarget:"EMOTIONAL_PAUSE",trainingLevel:this.activeAssignment.level,previousRoom:context.previousRoom||null});
  }
  mat(c){return new THREE.MeshStandardMaterial({color:c,roughness:.7,metalness:.08})}
  add(id,o){o.userData.objectId=id;this.objects[id]=o;return o}
  createRoom(){
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,16),this.mat(0x12161c));floor.rotation.x=-Math.PI/2;this.scene.add(floor);
    const wall=this.mat(0x0b0f15);
    this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(18,4,.3),wall).translateY(2).translateZ(-7));
    this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(18,4,.3),wall).translateY(2).translateZ(7));
    for(const [id,x] of [["PAUSE_TRIGGER",-1.7],["PAUSE_ACTION",1.7]]) this.add(id,new THREE.Mesh(new THREE.BoxGeometry(2,2,.2),this.mat(0x3b4350))).position.set(x,1.2,-1);
    this.add("TRAINING_EXIT",new THREE.Mesh(new THREE.BoxGeometry(2.6,2.8,.35),this.mat(0x25151a))).position.set(0,1.6,6.7);
  }
  choose(id){
    if(this.completed||!this.activeAssignment)return;
    this.actions++;
    if(!this.firstChoice)this.firstChoice=id;
    if(this.firstChoice!==id)this.switches++;
    this.tracker.log("TRAINING_ACTION",{roomId:"ROOM_14",targetId:"EMOTIONAL_PAUSE",objectId:id,actions:this.actions,switches:this.switches});
    if(this.actions%3===0)this.tracker.log("TRAINING_CHECKPOINT",{roomId:"ROOM_14",actions:this.actions});
  }
  finish(){
    if(this.completed||!this.activeAssignment)return;
    const cfg=this.activeAssignment.target?.config||{};
    let success=false;
    if("EMOTIONAL_PAUSE"==="REPETITION_REDUCTION") success=this.actions>0 && this.actions<=Number(cfg.maxRepetitions||1);
    else if("EMOTIONAL_PAUSE"==="UNCERTAINTY_TOLERANCE") success=this.actions>=2;
    else success=this.actions>0 && this.switches<=0;
    this.engine.recordAttempt(this.activeAssignment.targetId,success,{actions:this.actions,switches:this.switches});
    this.tracker.log("TRAINING_TASK_COMPLETED",{roomId:"ROOM_14",targetId:"EMOTIONAL_PAUSE",successful:success,actions:this.actions,switches:this.switches});
    if(!success){this.actions=0;this.switches=0;this.firstChoice=null;this.companion?.say?.("دوباره امتحان کن؛ این مرحله هنوز تمام نشده.");return;}
    this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_14",trainingTarget:"EMOTIONAL_PAUSE"});
    window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_14",targetId:"EMOTIONAL_PAUSE",trainingSession:this.engine.getSession()}}));
  }
  skip(){this.completed=true;window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_14",targetId:null}}))}
  getInteractableObjects(){return Object.values(this.objects).filter(o=>o?.userData?.objectId)}
  destroy(){this.objects={}}
}