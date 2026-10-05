import * as THREE from "three";

export class Room06 {
  constructor(scene,tracker){this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;this.companion=null;this.observations={};this.firstChoice=null;this.playCount=0;this.lastChoice=null;this.switchCount=0;this.startedAt=0;this.sequenceDone=false;this.whisperTimer=null;this.pulseTimer=null;this.signalTimer=null;this.signalRestoreTimer=null;this.whisperTriggered=false;this.signalTriggered=false;}
  start(context={}){this.companion=context.companion||null;this.startedAt=performance.now();this.scene.fog=new THREE.FogExp2(0x07090d,.03);this.createRoom();this.whisperTimer=setTimeout(()=>{if(this.completed)return;this.triggerWhisper();},7500);this.signalTimer=setTimeout(()=>{if(this.completed)return;this.triggerSignalDistortion();},10500);this.tracker.log("ROOM_ENTER",{roomId:"ROOM_06",roomName:"RECORDING_ROOM",previousRoom:context.previousRoom||"ROOM_05"});}
  mat(color,r=.5,m=.1){return new THREE.MeshStandardMaterial({color,roughness:r,metalness:m});}
  mesh(g,m,p=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);this.scene.add(o);return o;}
  add(id,o){o.userData.objectId=id;this.objects[id]=o;return o;}
  createRoom(){
    this.mesh(new THREE.PlaneGeometry(16,14),this.mat(0x14171b,.9),[0,0,0]).rotation.x=-Math.PI/2;
    const wall=this.mat(0x0f1115,.95);this.mesh(new THREE.BoxGeometry(16,4,.3),wall,[0,2,-6]);this.mesh(new THREE.BoxGeometry(16,4,.3),wall,[0,2,6]);this.mesh(new THREE.BoxGeometry(.3,4,12),wall,[-8,2,0]);this.mesh(new THREE.BoxGeometry(.3,4,12),wall,[8,2,0]);
    [-3,0,3].forEach((x,i)=>{const box=this.mesh(new THREE.BoxGeometry(2.2,1.5,.8),this.mat(0x24272d,.55,.4),[x,1,-3.8]);this.add(["REC_FAMILIAR","REC_UNKNOWN","REC_STATIC"][i],box);const led=this.mesh(new THREE.SphereGeometry(.1,10,10),new THREE.MeshBasicMaterial({color:0x9b2020}),[x-.8,1.45,-3.35]);led.userData.ledFor=box.userData.objectId;});
    const exit=this.mesh(new THREE.BoxGeometry(2.5,2.8,.3),this.mat(0x2b171c,.7),[0,1.6,5.7]);this.add("REC_EXIT",exit);
    const speaker=this.mesh(new THREE.BoxGeometry(3.4,2.2,.25),this.mat(0x181b20,.8),[0,2.5,-5.7]);this.add("REC_SPEAKER",speaker);
    for(const x of [-5.4,-3.6,3.6,5.4]){
      const panel=this.mesh(new THREE.BoxGeometry(1.2,2.2,.12),this.mat(0x1c2027,.78,.12),[x,2.1,-5.78]);
      panel.userData.objectId="REC_SPEAKER";
      for(let y=1.35;y<3.1;y+=.45)this.mesh(new THREE.BoxGeometry(.75,.035,.04),this.mat(0x5e6878,.5,.2),[x,y,-5.69]);
    }
    for(const x of [-5.5,-2.75,0,2.75,5.5]){
      const lamp=this.mesh(new THREE.BoxGeometry(1.4,.05,.12),this.mat(0x707c94,.4,.3,0x3c4b68),[x,3.55,-1.2]);
      lamp.userData.objectId="REC_SPEAKER";
      const p=new THREE.PointLight(0x6577a1,.55,4);p.position.set(x,3.25,-1.2);this.scene.add(p);
    }
    this.mesh(new THREE.BoxGeometry(7,.12,1.6),this.mat(0x20242a,.6,.35),[0,1.25,-2.2]);
    for(const x of [-2.4,0,2.4]){
      const knob=this.mesh(new THREE.CylinderGeometry(.12,.12,.06,20),this.mat(0x8b6d4c,.3,.6),[x,1.35,-2.2],[Math.PI/2,0,0]);
      knob.userData.objectId="REC_SPEAKER";
    }
    const signal=this.mesh(new THREE.BoxGeometry(5.5,.06,.06),new THREE.MeshBasicMaterial({color:0x6d7890}),[0,2.0,-5.52]);this.add("REC_SIGNAL",signal);
    const light=new THREE.PointLight(0x60709a,1.3,14);light.position.set(0,3.3,0);this.scene.add(light);this.objects.REC_LIGHT=light;
  }
  reactToRecording(id){
    const now=performance.now();this.observations[id]=(this.observations[id]||0)+1;this.playCount++;
    if(this.lastChoice&&this.lastChoice!==id)this.switchCount++;
    if(!this.firstChoice)this.firstChoice=id;
    this.lastChoice=id;
    this.tracker.log("ROOM_06_RECORDING_CHECKED",{recording:id,count:this.observations[id],firstChoice:this.firstChoice,switchCount:this.switchCount,secondsSinceEntry:Math.round((now-this.startedAt)/100)/10});
    if(id==="REC_STATIC"){this.companion?.say?.("این صدا رو بهتره زیاد گوش ندی... انگار فقط نویز نیست.");this.sequenceDone=true;}
    else if(id==="REC_FAMILIAR"){this.companion?.say?.(this.observations[id]>1?"دوباره صدای آشنا رو انتخاب کردی. چرا؟":"صدای آشناست... ولی مطمئنی خودش بود؟");}
    else {this.companion?.say?.(this.observations[id]>1?"باز هم به صدای ناشناس برگشتی.":"این صدا رو نمی‌شناسی... هنوز می‌خوای گوش بدی؟");}
    this.pulse();
  }
  triggerSignalDistortion(){
    if(this.signalTriggered||this.completed)return;
    this.signalTriggered=true;
    this.tracker.log("ROOM_06_SIGNAL_DISTORTION",{firstChoice:this.firstChoice,playCount:this.playCount,switchCount:this.switchCount});
    const signal=this.objects.REC_SIGNAL;
    const light=this.objects.REC_LIGHT;
    if(signal){
      signal.scale.x=0.35;
      signal.rotation.z=.08;
      this.signalRestoreTimer=setTimeout(()=>{if(!this.completed){signal.scale.x=1;signal.rotation.z=0;}},650);
    }
    if(light){light.intensity=.45;if(this.pulseTimer)clearTimeout(this.pulseTimer); this.pulseTimer=setTimeout(()=>{if(!this.completed)light.intensity=1.3;},650);}
    this.companion?.say?.("اون خط صدا... چرا قطع و وصل شد؟ چیزی داشت از داخلش رد می‌شد.");
  }
  triggerWhisper(){
    if(this.whisperTriggered||this.completed)return;
    this.whisperTriggered=true;
    this.tracker.log("ROOM_06_WHISPER_EVENT",{firstChoice:this.firstChoice,playCount:this.playCount});
    const l=this.objects.REC_LIGHT;if(l){l.intensity=.25;if(this.pulseTimer)clearTimeout(this.pulseTimer); this.pulseTimer=setTimeout(()=>{if(!this.completed)l.intensity=1.3;},900);}
    this.companion?.say?.("صبر کن... صدایی شنیدی؟ این یکی از دستگاه‌ها نبود.");
  }
  pulse(){const l=this.objects.REC_LIGHT;if(!l)return;l.intensity=2.6;if(this.pulseTimer)clearTimeout(this.pulseTimer);this.pulseTimer=setTimeout(()=>{if(!this.completed)l.intensity=1.3;},500);}
  chooseExit(){const familiar=this.observations.REC_FAMILIAR||0,unknown=this.observations.REC_UNKNOWN||0,stat=this.observations.REC_STATIC||0;this.tracker.log("ROOM_06_TRUST_PROFILE",{firstChoice:this.firstChoice,lastChoice:this.lastChoice,familiar,unknown,static:stat,totalChecks:this.playCount,switchCount:this.switchCount});this.companion?.say?.("فکر کنم دیگه وقتشه از این اتاق بریم.");}
  getInteractableObjects(){return Object.values(this.objects).filter(o=>o?.userData?.objectId);}
  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_06",firstChoice:this.firstChoice,totalChecks:this.playCount});}
  update(delta){if(this.completed)return;if(this.objects.REC_SPEAKER)this.objects.REC_SPEAKER.rotation.y=Math.sin(performance.now()*.001)*.015;}
  destroy(){this.completed=true;if(this.whisperTimer)clearTimeout(this.whisperTimer);if(this.pulseTimer)clearTimeout(this.pulseTimer);if(this.signalTimer)clearTimeout(this.signalTimer);if(this.signalRestoreTimer)clearTimeout(this.signalRestoreTimer);this.objects={};}
}