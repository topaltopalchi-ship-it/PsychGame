import * as THREE from "three";

export class Room08 {
  constructor(scene,tracker){
    this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;this.companion=null;
    this.context={};this.startedAt=0;this.result=null;this.coreResponseDone=false;this.lightTimer=null;this.pulseTimer=null;this.endingTimer=null;this.endLight=null;this.finalTimer=null;this.endingStarted=false;
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
    this.mesh(new THREE.CylinderGeometry(3.4,3.4,.08,64),this.mat(0x202532,.45,.45),[0,.08,0]);
    for(const x of [-5.8,5.8]){
      const pillar=this.mesh(new THREE.CylinderGeometry(.32,.4,3.5,24),this.mat(0x252a35,.55,.35),[x,1.75,-1.8]);
      pillar.userData.objectId="TRUTH_CORE";
      this.mesh(new THREE.SphereGeometry(.16,16,12),new THREE.MeshStandardMaterial({color:0x8a95bc,emissive:0x46527c,emissiveIntensity:1.4}),[x,3.35,-1.8]);
    }
    const core=this.mesh(new THREE.IcosahedronGeometry(.75,1),this.mat(0x343b50,.3,.65),[0,2.2,0]);this.add("TRUTH_CORE",core);
    const exit=this.mesh(new THREE.BoxGeometry(2.6,2.8,.35),this.mat(0x30171d,.7),[0,1.6,6.7]);this.add("TRUTH_EXIT",exit);
    const light=new THREE.PointLight(0x7788bb,1.5,16);light.position.set(0,3.5,0);this.scene.add(light);this.objects.TRUTH_LIGHT=light;
    this.endLight=new THREE.PointLight(0x5b1720,.35,9);this.endLight.position.set(0,2.4,6.1);this.scene.add(this.endLight);
    const ring=this.mesh(new THREE.TorusGeometry(1.35,.035,8,48),new THREE.MeshBasicMaterial({color:0x7180aa,transparent:true,opacity:.32}),[0,.08,0]);ring.rotation.x=Math.PI/2;this.add("TRUTH_RING",ring);
    const ceiling=this.mesh(new THREE.BoxGeometry(10,.1,1.3),this.mat(0x222630,.45,.5),[0,3.72,-1]);
    for(const x of [-3.5,0,3.5]){
      const p=this.mesh(new THREE.SphereGeometry(.13,14,10),new THREE.MeshStandardMaterial({color:0x9aa6d0,emissive:0x56658e,emissiveIntensity:1.8}),[x,3.4,-1]);
      p.userData.objectId="TRUTH_CORE";
    }
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
  triggerCoreResponse(){
    if(this.coreResponseDone)return;this.coreResponseDone=true;
    this.tracker.log("ROOM_08_CORE_RESPONSE",{secondsInRoom:Math.round((performance.now()-this.startedAt)/100)/10});
    const l=this.objects.TRUTH_LIGHT;if(l){l.intensity=3;this.lightTimer=setTimeout(()=>{if(!this.completed||this.endingStarted)l.intensity=1.5;},900);}
    if(this.endLight){this.endLight.intensity=.9;this.pulseTimer=setTimeout(()=>{if((!this.completed||this.endingStarted)&&this.endLight)this.endLight.intensity=.22;},700);}
    const core=this.objects.TRUTH_CORE;if(core){core.scale.setScalar(1.45);this.endingTimer=setTimeout(()=>{if(!this.completed||this.endingStarted)core.scale.setScalar(1);},750);}
    
  }
  startEnding(){
    if(this.endingStarted)return;
    this.endingStarted=true;
    this.triggerCoreResponse();
    this.tracker.log("ROOM_08_FINAL_SEQUENCE",{secondsInRoom:Math.round((performance.now()-this.startedAt)/100)/10});
    const exit=this.objects.TRUTH_EXIT;
    if(exit){exit.scale.z=.15;exit.material=exit.material.clone();exit.material.emissive=new THREE.Color(0x260b12);exit.material.emissiveIntensity=1.8;}
    if(this.objects.TRUTH_LIGHT){this.objects.TRUTH_LIGHT.intensity=.18;}
    if(this.endLight){this.endLight.intensity=1.4;}
    const core=this.objects.TRUTH_CORE;
    if(core){core.scale.setScalar(1.2);}
    this.finalTimer=setTimeout(()=>{
      if(this.completed&&!this.endingStarted)return;
      if(exit){exit.scale.z=1;exit.material.emissiveIntensity=.2;}
      if(this.objects.TRUTH_LIGHT)this.objects.TRUTH_LIGHT.intensity=1.5;
      if(this.endLight)this.endLight.intensity=.12;
      if(core)core.scale.setScalar(1);
    },1600);
  }
  chooseExit(){
    this.triggerCoreResponse();this.tracker.log("ROOM_08_EXIT_CHECKED",{roomId:"ROOM_08"});
    if(this.endLight)this.endLight.intensity=.08;
    this.companion?.say?.("در بازه... ولی فکر نکن اینجا چیزی بهت جواب می‌ده.");
  }
  getInteractableObjects(){return Object.values(this.objects).filter(o=>o?.userData?.objectId);}
  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_08"});}
  update(delta){if(this.objects.TRUTH_CORE){this.objects.TRUTH_CORE.rotation.y+=delta*.35;this.objects.TRUTH_CORE.rotation.x+=delta*.12;}if(this.objects.TRUTH_RING){this.objects.TRUTH_RING.rotation.z+=delta*.12;this.objects.TRUTH_RING.material.opacity=.24+Math.sin(performance.now()*.002)*.08;}}
  destroy(){this.completed=true;if(this.lightTimer)clearTimeout(this.lightTimer);if(this.pulseTimer)clearTimeout(this.pulseTimer);if(this.endingTimer)clearTimeout(this.endingTimer);if(this.finalTimer)clearTimeout(this.finalTimer);if(this.endLight)this.scene.remove(this.endLight);this.objects={};}
}