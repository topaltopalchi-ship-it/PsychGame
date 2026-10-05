import * as THREE from "three";

export class Room04 {
  constructor(scene, tracker){
    this.scene=scene; this.tracker=tracker; this.objects={}; this.completed=false;
    this.loopCount=0; this.turnCount=0; this.lastZ=0; this.explored=false; this.lastMarkIndex=-1; this.markObservations=0; this.retreatCount=0; this.maxDepth=0; this.memoryShiftDone=false;
    this.startTime=0; this.eventTimer=null; this.memoryShiftTimer=null; this.glitchTimer=null; this.loopPulseTimer=null; this.glitchDone=false;
  }

  start(context={}){
    this.startTime=performance.now(); this.companion=context.companion||null; this.lastZ=0; this.memoryShiftDone=false; this.maxDepth=0; this.retreatCount=0; this.markObservations=0;
    this.scene.fog=new THREE.FogExp2(0x07090d,.032);
    this.objects.hallMarks=[];
    this.createRoom();
    this.tracker.log("ROOM_ENTER",{roomId:"ROOM_04",roomName:"ENDLESS_HALL",previousRoom:context.previousRoom||"ROOM_03"});
  }

  mat(color,rough=.9,metal=0){
    return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  }
  mesh(g,m,p){
    const x=new THREE.Mesh(g,m); x.position.set(...p); x.castShadow=true; x.receiveShadow=true; this.scene.add(x); return x;
  }

  createRoom(){
    const wall=this.mat(0x171b21), floor=this.mat(0x24262b), trim=this.mat(0x3a3030);
    this.mesh(new THREE.BoxGeometry(4,.2,38),floor,[0,-.1,-10]);
    this.mesh(new THREE.BoxGeometry(.9,.035,34),this.mat(0x30272b,.85),[0,.02,-10]);
    for(const z of [6,0,-6,-12,-18,-24]){
      this.mesh(new THREE.BoxGeometry(.08,.035,1.8),this.mat(0x8d6670,.45,.25,0x3d1f27),[-1.05,.04,z]);
      this.mesh(new THREE.BoxGeometry(.08,.035,1.8),this.mat(0x8d6670,.45,.25,0x3d1f27),[1.05,.04,z]);
    }
    this.mesh(new THREE.BoxGeometry(.18,4,38),wall,[-2,2,-10]);
    this.mesh(new THREE.BoxGeometry(.18,4,38),wall,[2,2,-10]);
    for(const z of [7,0,-7,-14,-21,-28]){
      const frame=this.mesh(new THREE.BoxGeometry(3.7,.12,.18),trim,[0,3.45,z]);
      frame.userData.objectId="HALL_MARK"; this.objects.hallMarks.push(frame);
    }
    for(const z of [5,-2,-9,-16,-23]){
      const panel=this.mesh(new THREE.BoxGeometry(3.55,2.8,.08),this.mat(0x20242c,.82,.08),[0,1.7,z]);
      panel.userData.objectId="HALL_MARK"; this.objects.hallMarks.push(panel);
      this.mesh(new THREE.BoxGeometry(3.1,.06,.06),this.mat(0x6b4c50,.5,.3),[0,3.05,z+.03]);
      const lamp=this.mesh(new THREE.BoxGeometry(.55,.08,.18),this.mat(0x9ca9bd,.3,.45,0x687a9a),[0,3.35,z]);
      lamp.userData.objectId="HALL_MARK"; this.objects.hallMarks.push(lamp);
      const point=new THREE.PointLight(0x9aa8c4,1.6,4); point.position.set(0,3.1,z); this.scene.add(point);
    }
    const exit=this.mesh(new THREE.BoxGeometry(1.7,3.1,.16),this.mat(0x4b535b,.65),[0,1.55,-27.7]);
    exit.userData.objectId="HALL_EXIT"; this.objects.exit=exit;
    const lamp=new THREE.PointLight(0xc5d4ff,4,7); lamp.position.set(0,3.1,-3); this.scene.add(lamp); this.objects.lamp=lamp;
    const endLight=new THREE.PointLight(0x6b2028,2.2,5); endLight.position.set(0,2.8,-25); this.scene.add(endLight); this.objects.endLight=endLight;
    for(const z of [5,-2,-9,-16,-23]){
      const l=new THREE.PointLight(0x9da8b8,1.8,5); l.position.set(0,3,z); this.scene.add(l);
    }
  }

  registerMovement(position){
    if(this.lastZ!==0){
      if(Math.abs(position.z-this.lastZ)>1.2){
        this.turnCount++;
        this.tracker.log("ROOM_04_MOVEMENT",{turnCount:this.turnCount,forwardDistance:Math.round(Math.abs(position.z-this.lastZ)*100)/100});
      }
    }
    const previousZ=this.lastZ;
    this.lastZ=position.z;
    if(previousZ!==0 && position.z>previousZ+.08) this.retreatCount++;
    if(Math.abs(position.z)>6) this.explored=true;
    this.maxDepth=Math.max(this.maxDepth,Math.abs(position.z));
    
  }

  reactToMark(){
    this.markObservations++;
    this.tracker.log("ROOM_04_MARK_INSPECTED",{turnCount:this.turnCount,explored:this.explored,observations:this.markObservations,maxDepth:Math.round(this.maxDepth*10)/10,reactionTimeMs:Math.round(performance.now()-this.startTime)});
    if(this.markObservations===2){
      this.companion?.say?.("دوباره همین علامت... یا فقط داری چیزی رو به یاد میاری که وجود نداره؟", 0, "tense");
    }
  }

  setCompanion(companion){this.companion=companion;}

  triggerMemoryShift(){
    if(this.memoryShiftDone)return;
    this.memoryShiftDone=true;
    this.tracker.log("ROOM_04_MEMORY_SHIFT",{turnCount:this.turnCount,maxDepth:Math.round(this.maxDepth*10)/10,retreatCount:this.retreatCount});
    const marks=this.objects.hallMarks||[];
    if(marks.length){
      marks.forEach((m,i)=>{m.position.z += i%2===0 ? .22 : -.22;});
      this.memoryShiftTimer=setTimeout(()=>{if(this.completed)return;marks.forEach((m,i)=>{m.position.z += i%2===0 ? -.22 : .22;});},700);
    }
    this.companion?.say?.("نه... این علامت‌ها جای قبلی‌شون نیستن. یا شاید حافظه‌ی تو عوض شده.", 0, "fear");
  }

  triggerGlitch(){
    if(this.glitchDone)return;
    this.glitchDone=true;
    this.tracker.log("ROOM_04_LOOP_GLITCH",{turnCount:this.turnCount,explored:this.explored});
    if(this.objects.lamp){
      this.objects.lamp.intensity=9;
      if(this.objects.endLight)this.objects.endLight.intensity=0.4;
      this.glitchTimer=setTimeout(()=>{if(this.completed)return;if(this.objects.lamp)this.objects.lamp.intensity=1.5;if(this.objects.endLight)this.objects.endLight.intensity=2.2;},180);
    }
    this.companion?.say?.("صبر کن... این نور قبلاً این‌طوری نبود.", 0, "fear");
  }

  update(delta, player){
    if(player?.camera?.position) this.registerMovement(player.camera.position);
    if(this.startTime && !this.completed && !this.memoryShiftDone && performance.now()-this.startTime>6500 && this.maxDepth>4) this.triggerMemoryShift();
    if(this.startTime && !this.completed && !this.glitchDone && performance.now()-this.startTime>9000) this.triggerGlitch();
    if(this.startTime && !this.completed && performance.now()-this.startTime>11500 && this.objects.endLight){
      const t=performance.now()*.003; this.objects.endLight.intensity=1.8+Math.sin(t)*1.1;
    }
  }

  getInteractableObjects(){ return Object.values(this.objects).flatMap(o=>Array.isArray(o)?o:o?[o]:[]).filter(o=>o?.userData?.objectId); }

  completeRoom(){
    if(this.completed)return;
    this.completed=true;
    if(this.objects.endLight) this.objects.endLight.intensity=2.2;
    this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_04",turnCount:this.turnCount,explored:this.explored});
  }

  destroy(){ this.completed=true; if(this.eventTimer)clearTimeout(this.eventTimer); if(this.memoryShiftTimer)clearTimeout(this.memoryShiftTimer); if(this.glitchTimer)clearTimeout(this.glitchTimer); if(this.loopPulseTimer)clearTimeout(this.loopPulseTimer); this.objects={}; }
}