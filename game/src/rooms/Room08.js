import * as THREE from "three";

export class Room08 {
  constructor(scene,tracker){
    this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;this.companion=null;
    this.context={};this.startedAt=0;this.result=null;this.revealDone=false;this.lightTimer=null;this.pulseTimer=null;this.endingTimer=null;this.endLight=null;
  }
  start(context={}){
    this.context=context||{};this.companion=context.companion||null;this.startedAt=performance.now();
    this.scene.fog=new THREE.FogExp2(0x09090e,.024);
    this.createRoom();this.calculateProfile();
    this.tracker.log("ROOM_ENTER",{roomId:"ROOM_08",roomName:"TRUTH_ROOM",previousRoom:context.previousRoom||"ROOM_07"});
  }
  mat(color,r=.5,m=.1){return new THREE.MeshStandardMaterial({color,roughness:r,metalness:m});}
  mesh(g,m,p=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);this.scene.add(o);return o;}
  add(id,o){o.userData.objectId=id;this.objects[id]=o;return o;}
  createRoom(){
    this.mesh(new THREE.PlaneGeometry(18,16),this.mat(0x14151a,.92),[0,0,0]).rotation.x=-Math.PI/2;
    const w=this.mat(0x0d0f13,.96);this.mesh(new THREE.BoxGeometry(18,4,.3),w,[0,2,-7]);this.mesh(new THREE.BoxGeometry(18,4,.3),w,[0,2,7]);this.mesh(new THREE.BoxGeometry(.3,4,14),w,[-9,2,0]);this.mesh(new THREE.BoxGeometry(.3,4,14),w,[9,2,0]);
    const core=this.mesh(new THREE.IcosahedronGeometry(.75,1),this.mat(0x343b50,.3,.65),[0,2.2,0]);this.add("TRUTH_CORE",core);
    const exit=this.mesh(new THREE.BoxGeometry(2.6,2.8,.35),this.mat(0x30171d,.7),[0,1.6,6.7]);this.add("TRUTH_EXIT",exit);
    const light=new THREE.PointLight(0x7788bb,1.5,16);light.position.set(0,3.5,0);this.scene.add(light);this.objects.TRUTH_LIGHT=light;
    this.endLight=new THREE.PointLight(0x5b1720,.35,9);this.endLight.position.set(0,2.4,6.1);this.scene.add(this.endLight);
    const ring=this.mesh(new THREE.TorusGeometry(1.35,.035,8,48),new THREE.MeshBasicMaterial({color:0x7180aa,transparent:true,opacity:.32}),[0,.08,0]);ring.rotation.x=Math.PI/2;this.add("TRUTH_RING",ring);
  }
  calculateProfile(){
    const hall=this.context.hallBehavior||{};
    const mirror=this.context.mirrorBehavior||{};
    const recording=this.context.recordingBehavior||{};
    const trust=this.context.trustBehavior||{};
    const cautious=(hall.retreatCount||0)+(mirror.repeatedMirrorChecks||0);
    const exploratory=(hall.maxDepth||0)+(hall.explored?2:0);
    const switching=(recording.switchCount||0)+(trust.choiceSwitches||0);
    const trustScore=(trust.followCount||0)-(trust.ignoreCount||0);
    let title="متعادل";
    if(cautious>exploratory+1)title="محتاط";
    else if(exploratory>cautious+2)title="کاوشگر";
    if(switching>=3)title+=" / مردد";
    else if(switching===0)title+=" / ثابت‌قدم";
    this.result={title,cautious,exploratory,switching,trustScore};
    this.tracker.log("ROOM_08_BEHAVIORAL_PROFILE",{...this.result});
  }
  reveal(){
    if(this.revealDone)return;this.revealDone=true;
    const r=this.result||{title:"متعادل"};
    this.tracker.log("ROOM_08_PROFILE_REVEALED",{profile:r.title,secondsInRoom:Math.round((performance.now()-this.startedAt)/100)/10});
    const l=this.objects.TRUTH_LIGHT;if(l){l.intensity=3;this.lightTimer=setTimeout(()=>{if(!this.completed)l.intensity=1.5;},900);}
    if(this.endLight){this.endLight.intensity=.9;this.pulseTimer=setTimeout(()=>{if(!this.completed&&this.endLight)this.endLight.intensity=.22;},700);}
    const core=this.objects.TRUTH_CORE;if(core){core.scale.setScalar(1.45);this.endingTimer=setTimeout(()=>{if(!this.completed)core.scale.setScalar(1);},750);}
    
  }
  chooseExit(){
    this.reveal();this.tracker.log("ROOM_08_EXIT_CHECKED",{profile:this.result?.title||"متعادل"});
    if(this.endLight)this.endLight.intensity=.08;
    this.companion?.say?.("در بازه... ولی فکر نکن اینجا چیزی بهت جواب می‌ده.");
  }
  getInteractableObjects(){return Object.values(this.objects).filter(o=>o?.userData?.objectId);}
  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_08",profile:this.result?.title||"متعادل"});}
  update(delta){if(this.objects.TRUTH_CORE){this.objects.TRUTH_CORE.rotation.y+=delta*.35;this.objects.TRUTH_CORE.rotation.x+=delta*.12;}if(this.objects.TRUTH_RING){this.objects.TRUTH_RING.rotation.z+=delta*.12;this.objects.TRUTH_RING.material.opacity=.24+Math.sin(performance.now()*.002)*.08;}}
  destroy(){if(this.lightTimer)clearTimeout(this.lightTimer);if(this.pulseTimer)clearTimeout(this.pulseTimer);if(this.endingTimer)clearTimeout(this.endingTimer);if(this.endLight)this.scene.remove(this.endLight);this.objects={};}
}