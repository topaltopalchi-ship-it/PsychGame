import * as THREE from "three";
export class Room03 {
  constructor(scene, tracker){this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;this.memoryContext={};this.memoryLight=null;this.memoryResponseTimer=null;this.memoryResponseDone=false;this.seatBaseZ=1;this.clockWasInspected=false;this.clockTickTimer=null;this.exitGlitchDone=false;this.waitTime=0;this.exitWatched=false;this.finalBeatDone=false;this.endingTriggered=false;this.exitConfirmed=false;this.exitSequenceStarted=false;this.finalBeatTimer=null;this.endingTimer=null;this.confirmTimer=null;this.exitGlitchTimer=null;this.clockPulseTimer=null;this.memoryPulseTimer=null;this.finalRestoreTimer=null;this.confirmRestoreTimer=null;this.endingRestoreTimer=null;this.companion=null;}
  start(context={}){
    this.memoryContext=context||{};this.companion=this.memoryContext.companion||null;this.memoryResponseDone=false;this.seatBaseZ=1;
    this.scene.fog=new THREE.FogExp2(0x090b10,this.memoryContext.wrongPaths?.length ? .08 : .025);
    if(this.memoryContext.wrongPaths?.length){
      this.tracker.log("ROOM_03_MEMORY_RESPONSE",{wrongPaths:this.memoryContext.wrongPaths});
    }
    this.createFloor();this.createWalls();this.createClock();this.createMemoryMark();this.createSeat();this.createExit();this.createAtmosphere();if(this.memoryContext.wrongPaths?.length){this.memoryResponseTimer=setTimeout(()=>{if(this.completed)return;this.triggerMemoryResponse();},2600);}
    this.tracker.log("ROOM_ENTER",{roomId:"ROOM_03",roomName:"WAITING_ROOM",previousPath:context.previousPath||"ROOM_02"});
  }
  mesh(g,mat,pos,rot=[0,0,0]){const m=new THREE.Mesh(g,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
  mat(color,rough=.8,metal=0,em=null){const o={color,roughness:rough,metalness:metal};if(em){o.emissive=em;o.emissiveIntensity=.6;}return new THREE.MeshStandardMaterial(o);}
  createFloor(){this.mesh(new THREE.BoxGeometry(12,.2,12),this.mat(0x24262b,.95),[0,-.1,0]);}
  createWalls(){const w=this.mat(0x1d2127,.95);this.mesh(new THREE.BoxGeometry(12,4,.22),w,[0,2,-5.9]);this.mesh(new THREE.BoxGeometry(12,4,.22),w,[0,2,5.9]);this.mesh(new THREE.BoxGeometry(.22,4,12),w,[-5.9,2,0]);this.mesh(new THREE.BoxGeometry(.22,4,12),w,[5.9,2,0]);}
  createClock(){
    const c=this.mesh(new THREE.CylinderGeometry(.7,.7,.12,32),this.mat(0xddd8c8,.45,.1),[0,2.7,-5.72],[Math.PI/2,0,0]);c.userData.objectId="WAIT_CLOCK";this.objects.clock=c;
    const handMat=this.mat(0x25262a,.5,.15);
    const h1=this.mesh(new THREE.BoxGeometry(.045,.38,.035),handMat,[0,2.86,-5.64]);
    const h2=this.mesh(new THREE.BoxGeometry(.04,.25,.035),handMat,[.11,2.55,-5.64],[0,0,-.65]);
    h1.userData.objectId="WAIT_CLOCK";h2.userData.objectId="WAIT_CLOCK";
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const tick=this.mesh(new THREE.BoxGeometry(.035,.13,.03),this.mat(0x68635b,.5),[Math.sin(angle)*.53,2.7+Math.cos(angle)*.53,-5.63],[0,0,-angle]);
      tick.userData.objectId="WAIT_CLOCK";
    }
  }
  createSeat(){
    const s=this.mesh(new THREE.BoxGeometry(3,.35,.75),this.mat(0x493728,.75),[0,.7,1]);s.userData.objectId="WAIT_SEAT";this.objects.seat=s;
    for(const x of [-1.15,0,1.15]) this.mesh(new THREE.BoxGeometry(.05,.55,.68),this.mat(0x6a4b39,.72),[x,1.0,1.0]);
    this.mesh(new THREE.BoxGeometry(3.2,.08,.9),this.mat(0x332a29,.6,.08),[0,1.0,1.0]);
  }
  createAtmosphere(){
    const wood=this.mat(0x5b4436,.7,.08);
    const brass=this.mat(0xb09562,.3,.7);
    this.mesh(new THREE.BoxGeometry(8.8,.04,3.2),this.mat(0x171a20,1),[0,.04,.5]);
    for(const x of [-4.3,-2.15,2.15,4.3]){
      this.mesh(new THREE.BoxGeometry(.06,3.25,.08),wood,[x,2,-5.74]);
    }
    const fixture=this.mesh(new THREE.BoxGeometry(1.5,.08,.42),brass,[0,3.86,-.4]);
    fixture.userData.objectId="WAIT_CLOCK";
    const light=new THREE.PointLight(0xffd9a3,8,8);light.position.set(0,3.2,-.4);this.scene.add(light);
    const wallLight=new THREE.PointLight(this.memoryContext?.wrongPaths?.length?0x8b2b38:0x7187b2,3,6);wallLight.position.set(-4,2,-3.5);this.scene.add(wallLight);this.memoryLight=wallLight;
    const rug=this.mesh(new THREE.BoxGeometry(5.4,.03,2.8),this.mat(0x40332d,.98),[0,.06,.8]);
    rug.userData.objectId="WAIT_SEAT";
  }

  createMemoryMark(){
    const mark=this.mesh(new THREE.BoxGeometry(1.8,.02,.5),this.mat(this.memoryContext?.wrongPaths?.length?0x5a2026:0x292d34,.9),[0,.075,-2.1]);
    mark.userData.objectId="MEMORY_MARK";this.objects.memoryMark=mark;
  }

  reactToClock(){
    if(this.clockWasInspected)return;
    this.clockWasInspected=true;
    if(this.memoryContext?.wrongPaths?.length){
      this.tracker.log("ROOM_03_MEMORY_CONFIRM",{wrongPaths:this.memoryContext.wrongPaths});
      this.companion?.say?.("حتی این ساعت هم انگار فهمیده کجا اشتباه کردی...", 0, "tense");
      if(this.memoryLight)this.memoryLight.intensity=7;
      this.clockPulseTimer=setTimeout(()=>{if(this.completed)return;if(this.memoryLight)this.memoryLight.intensity=3;},700);
    }else{
      this.tracker.log("ROOM_03_CLOCK_INSPECTED",{memoryClean:true});
    }
  }

  reactToExit(){
    if(this.exitWatched)return;
    this.exitWatched=true;
    this.tracker.log("ROOM_03_EXIT_WATCHED",{remembered:!!this.memoryContext?.wrongPaths?.length});
    if(this.memoryContext?.wrongPaths?.length){
      this.companion?.say?.("صبر کن... این در همون دری نیست که اول دیدیم.", 0, "fear");
      if(this.objects.exit){
        const oldY=this.objects.exit.position.y;
        this.objects.exit.position.y=oldY+.06;
        this.memoryPulseTimer=setTimeout(()=>{if(this.completed)return;if(this.objects.exit)this.objects.exit.position.y=oldY;},300);
      }
    }else{
      this.companion?.say?.("در رو دیدی... فقط مطمئن شو آماده‌ای.", 0, "calm");
    }
  }

  createExit(){const d=this.mesh(new THREE.BoxGeometry(2,3.2,.18),this.mat(0x52606a,.7),[0,1.6,-5.78]);d.userData.objectId="WAIT_EXIT";this.objects.exit=d;}
  triggerMemoryResponse(){
    if(this.memoryResponseDone)return;
    this.memoryResponseDone=true;
    this.tracker.log("ROOM_03_MEMORY_REACTION",{wrongPaths:this.memoryContext.wrongPaths});
    if(this.objects.seat){
      this.objects.seat.position.z=this.seatBaseZ+.22;
      this.memoryPulseTimer=setTimeout(()=>{if(this.completed)return;if(this.objects.seat)this.objects.seat.position.z=this.seatBaseZ;},650);
    }
    if(this.memoryLight)this.memoryLight.intensity=6;
    this.clockPulseTimer=setTimeout(()=>{if(this.completed)return;if(this.memoryLight)this.memoryLight.intensity=3;},500);
    this.memoryContext.companion?.say?.("یادت هست کدوم مسیر رو اشتباه رفتی؟ انگار اینجا هم یادش مونده...", 0, "fear");
  }

  triggerExitGlitch(){
    if(this.exitGlitchDone)return;
    this.exitGlitchDone=true;
    this.tracker.log("ROOM_03_EXIT_GLITCH",{remembered:!!this.memoryContext?.wrongPaths?.length});
    if(this.objects.exit){
      const oldX=this.objects.exit.position.x;
      this.objects.exit.position.x=oldX+(this.memoryContext?.wrongPaths?.length ? .28 : .12);
      this.exitGlitchTimer=setTimeout(()=>{if(this.completed)return;if(this.objects.exit)this.objects.exit.position.x=oldX;},380);
    }
    if(this.memoryLight)this.memoryLight.intensity=8;
    this.clockPulseTimer=setTimeout(()=>{if(this.completed)return;if(this.memoryLight)this.memoryLight.intensity=3;},450);
    this.companion?.say?.(this.memoryContext?.wrongPaths?.length ? "در خروج... چرا تکون خورد؟" : "فکر کردم در خروج رو دیدم... یا نه؟", 0, "fear");
  }

  update(delta){
    if(this.completed)return;this.waitTime+=delta;
    if(this.waitTime>10 && this.memoryContext?.wrongPaths?.length){this.triggerExitGlitch();}
    if(this.memoryContext?.wrongPaths?.length && this.memoryLight){
      this.memoryLight.intensity=3+Math.sin(performance.now()*.003)*.8;
    }
  }
  getInteractableObjects(){return Object.values(this.objects);}
  destroy(){this.completed=true;for(const t of ["memoryResponseTimer","clockPulseTimer","memoryPulseTimer","exitGlitchTimer","finalBeatTimer","endingTimer","confirmTimer","finalRestoreTimer","confirmRestoreTimer","endingRestoreTimer"]){if(this[t])clearTimeout(this[t]);}this.objects={};}
  triggerFinalBeat(){
    if(this.completed||this.finalBeatDone)return;
    this.finalBeatDone=true;
    this.tracker.log("ROOM_03_FINAL_BEAT",{remembered:!!this.memoryContext?.wrongPaths?.length});
    this.scene.fog.density=this.memoryContext?.wrongPaths?.length ? .055 : .035;
    if(this.memoryLight)this.memoryLight.intensity=1.2;
    this.finalRestoreTimer=setTimeout(()=>{
      if(this.completed)return;
      if(this.memoryLight)this.memoryLight.intensity=3;
      this.scene.fog.density=this.memoryContext?.wrongPaths?.length ? .08 : .025;
    },900);
    this.companion?.say?.(this.memoryContext?.wrongPaths?.length ? "این بار... مطمئن شو چیزی پشت سرت نیست." : "خب... فکر کنم وقتشه بریم.", 0, this.memoryContext?.wrongPaths?.length ? "fear" : "calm");
  }

  startExitSequence(){
    if(this.completed||this.exitSequenceStarted)return;
    this.exitSequenceStarted=true;
    this.reactToExit();
    this.finalBeatTimer=setTimeout(()=>this.triggerFinalBeat(),900);
    this.endingTimer=setTimeout(()=>this.triggerEnding(),1800);
    this.confirmTimer=setTimeout(()=>this.confirmExit(),2200);
  }

  confirmExit(){
    if(this.completed||this.exitConfirmed)return;
    this.exitConfirmed=true;
    this.tracker.log("ROOM_03_EXIT_CONFIRMED",{remembered:!!this.memoryContext?.wrongPaths?.length});
    this.scene.fog.density=.09;
    if(this.memoryLight)this.memoryLight.intensity=.4;
    this.companion?.say?.(this.memoryContext?.wrongPaths?.length ? "باشه... این بار خودت انتخاب کردی. برو." : "خوبه. اینجا تمومش می‌کنیم.", 0, this.memoryContext?.wrongPaths?.length ? "tense" : "calm");
    this.confirmRestoreTimer=setTimeout(()=>{
      if(this.completed)return;
      this.scene.fog.density=this.memoryContext?.wrongPaths?.length ? .08 : .025;
      if(this.memoryLight)this.memoryLight.intensity=3;
    },1200);
  }

  triggerEnding(){
    if(this.completed||this.endingTriggered)return;
    this.endingTriggered=true;
    this.tracker.log("ROOM_03_ENDING_TRIGGERED",{remembered:!!this.memoryContext?.wrongPaths?.length});
    if(this.objects.exit){
      this.objects.exit.scale.z=.7;
      this.endingTimer=setTimeout(()=>{if(this.completed)return;if(this.objects.exit)this.objects.exit.scale.z=1;},650);
    }
    this.scene.fog.density=.06;
    this.endingRestoreTimer=setTimeout(()=>{if(this.completed)return;this.scene.fog.density=this.memoryContext?.wrongPaths?.length ? .08 : .025;},1100);
    this.companion?.say?.(this.memoryContext?.wrongPaths?.length ? "اگه بری داخل... شاید این بار خودت رو جا گذاشته باشی." : "در بازه. برو.", 0, this.memoryContext?.wrongPaths?.length ? "fear" : "calm");
  }

  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_03"});}
}