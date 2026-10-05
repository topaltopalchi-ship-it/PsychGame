import * as THREE from "three";
export class Room20{
 constructor(scene,tracker,plan,companion=null){this.scene=scene;this.tracker=tracker;this.plan=plan;this.companion=companion;this.objects={};this.completed=false;this.actions=0;}
 start(context={}){this.create();this.tracker.log("ROOM_ENTER",{roomId:"ROOM_20",previousRoom:context.previousRoom||null});}
 create(){const f=new THREE.Mesh(new THREE.PlaneGeometry(18,16),new THREE.MeshStandardMaterial({color:0x0e1319}));f.rotation.x=-Math.PI/2;this.scene.add(f);for(let i=1;i<=3;i++){const o=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.9,.25),new THREE.MeshStandardMaterial({color:0x687684}));o.position.set(-2+i*2,1.2,-1);o.userData.objectId="FINAL_"+i;this.objects[o.userData.objectId]=o;this.scene.add(o);}const e=new THREE.Mesh(new THREE.BoxGeometry(2.8,3,.35),new THREE.MeshStandardMaterial({color:0x33252a}));e.position.set(0,1.6,6.7);e.userData.objectId="TRAINING_EXIT";this.objects.TRAINING_EXIT=e;this.scene.add(e);}
 choose(id){if(id.startsWith("FINAL_"))this.actions++;}
 finish(){if(!this.actions)return;this.completed=true;this.tracker.log("TRAINING_PHASE_COMPLETED",{roomId:"ROOM_20",actions:this.actions});window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_20",final:true}}));}
 getInteractableObjects(){return Object.values(this.objects)} destroy(){this.objects={}}
}