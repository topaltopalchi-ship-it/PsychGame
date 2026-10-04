import * as THREE from "three";

export class Room06 {
  constructor(scene,tracker){this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;this.companion=null;this.observations={};this.firstChoice=null;this.playCount=0;this.startedAt=0;this.sequenceDone=false;this.whisperTimer=null;this.whisperTriggered=false;}
  start(context={}){this.companion=context.companion||null;this.startedAt=performance.now();this.scene.fog=new THREE.FogExp2(0x07090d,.03);this.createRoom();this.whisperTimer=setTimeout(()=>this.triggerWhisper(),7500);this.tracker.log("ROOM_ENTER",{roomId:"ROOM_06",roomName:"RECORDING_ROOM",previousRoom:context.previousRoom||"ROOM_05"});}
  mat(color,r=.5,m=.1){return new THREE.MeshStandardMaterial({color,roughness:r,metalness:m});}
  mesh(g,m,p=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);this.scene.add(o);return o;}
  add(id,o){o.userData.objectId=id;this.objects[id]=o;return o;}
  createRoom(){
    this.mesh(new THREE.PlaneGeometry(16,14),this.mat(0x14171b,.9),[0,0,0]).rotation.x=-Math.PI/2;
    const wall=this.mat(0x0f1115,.95);this.mesh(new THREE.BoxGeometry(16,4,.3),wall,[0,2,-6]);this.mesh(new THREE.BoxGeometry(16,4,.3),wall,[0,2,6]);this.mesh(new THREE.BoxGeometry(.3,4,12),wall,[-8,2,0]);this.mesh(new THREE.BoxGeometry(.3,4,12),wall,[8,2,0]);
    [-3,0,3].forEach((x,i)=>{const box=this.mesh(new THREE.BoxGeometry(2.2,1.5,.8),this.mat(0x24272d,.55,.4),[x,1,-3.8]);this.add(["REC_FAMILIAR","REC_UNKNOWN","REC_STATIC"][i],box);const led=this.mesh(new THREE.SphereGeometry(.1,10,10),new THREE.MeshBasicMaterial({color:0x9b2020}),[x-.8,1.45,-3.35]);led.userData.ledFor=box.userData.objectId;});
    const exit=this.mesh(new THREE.BoxGeometry(2.5,2.8,.3),this.mat(0x2b171c,.7),[0,1.6,5.7]);this.add("REC_EXIT",exit);
    const speaker=this.mesh(new THREE.BoxGeometry(3.4,2.2,.25),this.mat(0x181b20,.8),[0,2.5,-5.7]);this.add("REC_SPEAKER",speaker);
    const light=new THREE.PointLight(0x60709a,1.3,14);light.position.set(0,3.3,0);this.scene.add(light);this.objects.REC_LIGHT=light;
  }
  reactToRecording(id){
    const now=performance.now();this.observations[id]=(this.observations[id]||0)+1;this.playCount++;
    if(!this.firstChoice)this.firstChoice=id;
    this.tracker.log("ROOM_06_RECORDING_CHECKED",{recording:id,count:this.observations[id],firstChoice:this.firstChoice,secondsSinceEntry:Math.round((now-this.startedAt)/100)/10});
    if(id==="REC_STATIC"){this.companion?.say?.("این صدا رو بهتره زیاد گوش ندی... انگار فقط نویز نیست.");this.sequenceDone=true;}
    else if(id==="REC_FAMILIAR"){this.companion?.say?.(this.observations[id]>1?"دوباره صدای آشنا رو انتخاب کردی. چرا؟":"صدای آشناست... ولی مطمئنی خودش بود؟");}
    else {this.companion?.say?.(this.observations[id]>1?"باز هم به صدای ناشناس برگشتی.":"این صدا رو نمی‌شناسی... هنوز می‌خوای گوش بدی؟");}
    this.pulse();
  }
  triggerWhisper(){
    if(this.whisperTriggered||this.completed)return;
    this.whisperTriggered=true;
    this.tracker.log("ROOM_06_WHISPER_EVENT",{firstChoice:this.firstChoice,playCount:this.playCount});
    const l=this.objects.REC_LIGHT;if(l){l.intensity=.25;setTimeout(()=>{if(!this.completed)l.intensity=1.3;},900);}
    this.companion?.say?.("صبر کن... صدایی شنیدی؟ این یکی از دستگاه‌ها نبود.");
  }
  pulse(){const l=this.objects.REC_LIGHT;if(!l)return;l.intensity=2.6;setTimeout(()=>{l.intensity=1.3;},500);}
  chooseExit(){const familiar=this.observations.REC_FAMILIAR||0,unknown=this.observations.REC_UNKNOWN||0,stat=this.observations.REC_STATIC||0;this.tracker.log("ROOM_06_TRUST_PROFILE",{firstChoice:this.firstChoice,familiar,unknown,static:stat,totalChecks:this.playCount});this.companion?.say?.(unknown+stat>familiar?"پس بیشتر به صداهای ناآشنا گوش دادی...":"اول سراغ چیزی رفتی که برات آشناتر بود.");}
  getInteractableObjects(){return Object.values(this.objects).filter(o=>o?.userData?.objectId);}
  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_06",firstChoice:this.firstChoice,totalChecks:this.playCount});}
  update(delta){if(this.objects.REC_SPEAKER)this.objects.REC_SPEAKER.rotation.y=Math.sin(performance.now()*.001)*.015;}
  destroy(){if(this.whisperTimer)clearTimeout(this.whisperTimer);this.objects={};}
}