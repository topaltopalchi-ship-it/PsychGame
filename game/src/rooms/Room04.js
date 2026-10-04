import * as THREE from "three";

export class Room04 {
  constructor(scene, tracker){
    this.scene=scene; this.tracker=tracker; this.objects={}; this.completed=false;
    this.loopCount=0; this.turnCount=0; this.lastZ=0; this.explored=false; this.lastMarkIndex=-1; this.markObservations=0; this.retreatCount=0; this.maxDepth=0;
    this.startTime=0; this.eventTimer=null; this.glitchDone=false;
  }

  start(context={}){
    this.startTime=performance.now(); this.companion=context.companion||null; this.lastZ=0; this.maxDepth=0; this.retreatCount=0; this.markObservations=0;
    this.scene.fog=new THREE.FogExp2(0x07090d,.032);
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
    this.mesh(new THREE.BoxGeometry(.18,4,38),wall,[-2,2,-10]);
    this.mesh(new THREE.BoxGeometry(.18,4,38),wall,[2,2,-10]);
    for(const z of [7,0,-7,-14,-21,-28]){
      const frame=this.mesh(new THREE.BoxGeometry(3.7,.12,.18),trim,[0,3.45,z]);
      frame.userData.objectId="HALL_MARK";
    }
    const exit=this.mesh(new THREE.BoxGeometry(1.7,3.1,.16),this.mat(0x4b535b,.65),[0,1.55,-27.7]);
    exit.userData.objectId="HALL_EXIT"; this.objects.exit=exit;
    const lamp=new THREE.PointLight(0xc5d4ff,4,7); lamp.position.set(0,3.1,-3); this.scene.add(lamp); this.objects.lamp=lamp;
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
    this.tracker.log("ROOM_04_MARK_INSPECTED",{turnCount:this.turnCount,explored:this.explored,observations:this.markObservations,maxDepth:Math.round(this.maxDepth*10)/10});
    if(this.markObservations===2){
      this.companion?.say?.("دوباره همین علامت... یا فقط داری چیزی رو به یاد میاری که وجود نداره؟");
    }
  }

  setCompanion(companion){this.companion=companion;}

  triggerGlitch(){
    if(this.glitchDone)return;
    this.glitchDone=true;
    this.tracker.log("ROOM_04_LOOP_GLITCH",{turnCount:this.turnCount,explored:this.explored});
    if(this.objects.lamp){
      this.objects.lamp.intensity=9;
      setTimeout(()=>{if(this.objects.lamp)this.objects.lamp.intensity=1.5;},180);
    }
  }

  update(delta, player){
    if(player?.camera?.position) this.registerMovement(player.camera.position);
    if(this.startTime && !this.glitchDone && performance.now()-this.startTime>9000) this.triggerGlitch();
  }

  getInteractableObjects(){ return Object.values(this.objects).filter(o=>o?.userData?.objectId); }

  completeRoom(){
    if(this.completed)return;
    this.completed=true;
    this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_04",turnCount:this.turnCount,explored:this.explored});
  }

  destroy(){ if(this.eventTimer)clearTimeout(this.eventTimer); }
}