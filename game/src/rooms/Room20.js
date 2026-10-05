import * as THREE from "three";
import { TrainingEngine } from "../training/TrainingEngine.js";
export class Room20{
 constructor(scene,tracker,plan,companion=null){this.scene=scene;this.tracker=tracker;this.plan=plan;this.companion=companion;this.objects={};this.completed=false;this.actions=0;this.engine=null;}
 start(context={}){this.engine=new TrainingEngine(this.plan,{roomId:20,onEvent:e=>this.tracker.log(e.type,e)});this.create();this.tracker.log("ROOM_ENTER",{roomId:"ROOM_20",previousRoom:context.previousRoom||null});}
 create(){const f=new THREE.Mesh(new THREE.PlaneGeometry(18,16),new THREE.MeshStandardMaterial({color:0x0e1319}));f.rotation.x=-Math.PI/2;this.scene.add(f);for(let i=1;i<=3;i++){const o=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.9,.25),new THREE.MeshStandardMaterial({color:0x687684}));o.position.set(-2+i*2,1.2,-1);o.userData.objectId="FINAL_"+i;this.objects[o.userData.objectId]=o;this.scene.add(o);}const e=new THREE.Mesh(new THREE.BoxGeometry(2.8,3,.35),new THREE.MeshStandardMaterial({color:0x33252a}));e.position.set(0,1.6,6.7);e.userData.objectId="TRAINING_EXIT";this.objects.TRAINING_EXIT=e;this.scene.add(e);}
 choose(id){if(this.completed)return;if(id.startsWith("FINAL_")){this.actions++;this.tracker.log("TRAINING_FINAL_ACTION",{roomId:"ROOM_20",action:this.actions,objectId:id});}}
 finish(){
  if(this.completed||!this.engine||!this.actions)return;
  const summary=this.engine.getSummary();
  const assignments=summary.assignments;
  if(!assignments.length)return;
  const completed=assignments.filter(x=>x.completed);
  const exhausted=assignments.filter(x=>x.exhausted&&!x.completed);
  const aborted=assignments.filter(x=>x.aborted&&!x.completed&&!x.exhausted);
  const terminal=assignments.filter(x=>x.completed||x.exhausted||x.aborted);
  if(terminal.length!==assignments.length)return;
  const status=completed.length===assignments.length?"completed":(aborted.length===assignments.length?"aborted":"exhausted");
  const result={version:1,trainingSessionId:summary.sessionId||null,playerCode:this.plan?.playerCode||null,completedAt:new Date().toISOString(),status,finalActions:this.actions,assignments,rooms:[15,16,17,18,19,20],summary:{completed:completed.length,exhausted:exhausted.length,aborted:aborted.length,total:assignments.length}};
  try{if(this.plan?.playerCode)localStorage.setItem("psychgame_training_results_"+this.plan.playerCode,JSON.stringify(result));}catch(_){}
  this.completed=true;
  this.tracker.log("TRAINING_PHASE_COMPLETED",{roomId:"ROOM_20",finalActions:this.actions,status:result.status,assignments:summary.assignments});
  window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_20",final:true,trainingResult:result}}));
 }
 getInteractableObjects(){return Object.values(this.objects)} destroy(){this.objects={}}
}