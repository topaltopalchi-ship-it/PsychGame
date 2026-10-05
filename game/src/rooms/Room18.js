import * as THREE from "three";
export class Room18{
 constructor(scene,tracker,plan,companion=null){this.scene=scene;this.tracker=tracker;this.plan=plan;this.companion=companion;this.objects={};this.completed=false;this.actions=0;}
 start(context={}){this.create();this.tracker.log("ROOM_ENTER",{roomId:"ROOM_18",previousRoom:context.previousRoom||null});}
 create(){const f=new THREE.Mesh(new THREE.PlaneGeometry(18,16),new THREE.MeshStandardMaterial({color:0x141820}));f.rotation.x=-Math.PI/2;this.scene.add(f);for(let i=1;i<=3;i++){const o=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.8,.25),new THREE.MeshStandardMaterial({color:0x455a70}));o.position.set(-2+i*2,1.2,-1);o.userData.objectId="REVIEW_"+i;this.objects[o.userData.objectId]=o;this.scene.add(o);}const e=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.8,.3),new THREE.MeshStandardMaterial({color:0x25252a}));e.position.set(0,1.5,6.7);e.userData.objectId="TRAINING_EXIT";this.objects.TRAINING_EXIT=e;this.scene.add(e);}
 choose(id){if(id.startsWith("REVIEW_"))this.actions++;}
 finish(){if(!this.actions)return;this.completed=true;window.dispatchEvent(new CustomEvent("psychgame-training-room-complete",{detail:{roomId:"ROOM_18"}}));}
 getInteractableObjects(){return Object.values(this.objects)} destroy(){this.objects={}}
}