import * as THREE from "three";

export class Room07 {
  constructor(scene, tracker){
    this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;
    this.companion=null;this.context={};this.startedAt=0;this.followCount=0;this.ignoreCount=0;
    this.firstChoice=null;this.lastChoice=null;this.choiceSwitches=0;this.choiceVisualScale=1;this.promptActive=false;this.promptTimer=null;this.lightTimer=null;this.beaconPulseTimer=null;this.choiceCount=0;
  }
  start(context={}){
    this.context=context||{};this.companion=context.companion||null;this.startedAt=performance.now();
    this.scene.fog=new THREE.FogExp2(0x08090d,.026);
    this.createRoom();this.tracker.log("ROOM_ENTER",{roomId:"ROOM_07",roomName:"COMPANION_ROOM",previousRoom:context.previousRoom||"ROOM_06"});
    this.promptTimer=setTimeout(()=>{if(this.completed)return;this.promptCompanion();},5000);
  }
  mat(color,r=.5,m=.1){return new THREE.MeshStandardMaterial({color,roughness:r,metalness:m});}
  mesh(g,m,p=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);this.scene.add(o);return o;}
  add(id,o){o.userData.objectId=id;this.objects[id]=o;return o;}
  createRoom(){
    this.mesh(new THREE.PlaneGeometry(16,14),this.mat(0x15171b,.9),[0,0,0]).rotation.x=-Math.PI/2;
    const w=this.mat(0x101217,.95);this.mesh(new THREE.BoxGeometry(16,4,.3),w,[0,2,-6]);
    this.mesh(new THREE.BoxGeometry(10,.035,8),this.mat(0x1d2028,.82,.08),[0,.02,0]);
    for(const x of [-6,-3,0,3,6]) this.mesh(new THREE.BoxGeometry(.04,.04,8),this.mat(0x4f5666,.45,.25),[x,.05,0]);
    for(const x of [-5,0,5]) this.mesh(new THREE.BoxGeometry(2.2,.05,.08),this.mat(0x687896,.35,.3),[x,3.45,-5.78]);
    this.mesh(new THREE.BoxGeometry(16,4,.3),w,[0,2,6]);this.mesh(new THREE.BoxGeometry(.3,4,12),w,[-8,2,0]);this.mesh(new THREE.BoxGeometry(.3,4,12),w,[8,2,0]);
    const beacon=this.mesh(new THREE.CylinderGeometry(.22,.22,2.2,12),this.mat(0x4a2028,.5,.3),[0,1.1,0]);this.objects.COMP_BEACON=beacon;
    const glow=this.mesh(new THREE.SphereGeometry(.32,12,12),new THREE.MeshBasicMaterial({color:0x9b3038,transparent:true,opacity:.35}),[0,2.25,0]);this.objects.COMP_BEACON_GLOW=glow;
    const trust=this.mesh(new THREE.BoxGeometry(2.6,1.2,.4),this.mat(0x1d2830,.6,.2),[-3,1,-3.8]);this.add("FOLLOW_COMPANION",trust);
    const alone=this.mesh(new THREE.BoxGeometry(2.6,1.2,.4),this.mat(0x302024,.6,.2),[3,1,-3.8]);this.add("GO_ALONE",alone);
    const exit=this.mesh(new THREE.BoxGeometry(2.5,2.8,.3),this.mat(0x29171c,.7),[0,1.6,5.7]);this.add("COMP_EXIT",exit);
    const light=new THREE.PointLight(0x69769d,1.25,14);light.position.set(0,3,0);this.scene.add(light);this.objects.COMP_LIGHT=light;
    for(const x of [-5,5]) this.mesh(new THREE.CylinderGeometry(.16,.2,3.2,18),this.mat(0x252a34,.6,.3),[x,1.6,-2.2]);
  }
  promptCompanion(){
    if(this.completed||this.promptActive)return;this.promptActive=true;
    this.tracker.log("ROOM_07_COMPANION_PROMPT",{secondsSinceEntry:Math.round((performance.now()-this.startedAt)/100)/10});
    this.companion?.say?.("اینجا دو راه داری... می‌خوای به من اعتماد کنی، یا خودت انتخاب کنی؟", 0, "tense");
  }
  choose(id){
    if(this.completed)return;
    const now=performance.now();
    if(!this.firstChoice){this.firstChoice=id;}
    if(this.lastChoice&&this.lastChoice!==id)this.choiceSwitches++;
    this.lastChoice=id;
    if(id==="FOLLOW_COMPANION")this.followCount++;else this.ignoreCount++;
    this.choiceCount++;
    this.tracker.log("ROOM_07_TRUST_CHOICE",{choice:id,firstChoice:this.firstChoice,choiceSwitches:this.choiceSwitches,followCount:this.followCount,ignoreCount:this.ignoreCount,firstChoiceDelayMs:this.choiceCount===1?Math.round(now-this.startedAt):null});
    if(id==="FOLLOW_COMPANION")this.companion?.say?.("پس این بار به من اعتماد کردی... فقط یادت باشه، من همیشه درست نمی‌گم.", 0, "calm");
    else this.companion?.say?.("باشه... این یکی رو خودت انتخاب کردی. من فقط دنبالت میام.", 0, "calm");
    const l=this.objects.COMP_LIGHT;if(l){l.intensity=id==="FOLLOW_COMPANION"?3.1:1.9;if(this.lightTimer)clearTimeout(this.lightTimer);this.lightTimer=setTimeout(()=>{if(!this.completed)l.intensity=1.25;},600);}
    const glow=this.objects.COMP_BEACON_GLOW;if(glow){this.choiceVisualScale=id==="FOLLOW_COMPANION"?1.35:.8;glow.scale.setScalar(this.choiceVisualScale);if(this.beaconPulseTimer)clearTimeout(this.beaconPulseTimer);this.beaconPulseTimer=setTimeout(()=>{if(!this.completed)glow.scale.setScalar(1);},600);}
  }
  chooseExit(){
    if(this.completed)return;
    this.tracker.log("ROOM_07_TRUST_PROFILE",{firstChoice:this.firstChoice,lastChoice:this.lastChoice,followCount:this.followCount,ignoreCount:this.ignoreCount,choiceSwitches:this.choiceSwitches});
    this.companion?.say?.("باشه... انتخابت رو دیدم. حالا بریم.", 0, "calm");
  }
  getInteractableObjects(){return Object.values(this.objects).filter(o=>o?.userData?.objectId);}
  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_07",firstChoice:this.firstChoice,followCount:this.followCount,ignoreCount:this.ignoreCount});}
  update(delta){if(this.completed)return;const glow=this.objects.COMP_BEACON_GLOW;if(glow){const pulse=this.choiceVisualScale*(1+Math.sin(performance.now()*.004)*.08);glow.scale.setScalar(pulse);}}
  destroy(){this.completed=true;if(this.promptTimer)clearTimeout(this.promptTimer);if(this.lightTimer)clearTimeout(this.lightTimer);if(this.beaconPulseTimer)clearTimeout(this.beaconPulseTimer);this.objects={};}
}