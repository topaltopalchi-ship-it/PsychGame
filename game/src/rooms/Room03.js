import * as THREE from "three";
export class Room03 {
  constructor(scene, tracker){this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;this.memoryContext={};this.memoryLight=null;}
  start(context={}){
    this.memoryContext=context||{};
    this.scene.fog=new THREE.FogExp2(0x090b10,this.memoryContext.wrongPaths?.length?.08:.025);
    if(this.memoryContext.wrongPaths?.length){
      this.tracker.log("ROOM_03_MEMORY_RESPONSE",{wrongPaths:this.memoryContext.wrongPaths});
    }
    this.createFloor();this.createWalls();this.createClock();this.createSeat();this.createExit();this.createAtmosphere();
    this.tracker.log("ROOM_ENTER",{roomId:"ROOM_03",roomName:"WAITING_ROOM",previousPath:context.previousPath||"ROOM_02"});
  }
  mesh(g,mat,pos){const m=new THREE.Mesh(g,mat);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
  mat(color,rough=.8,metal=0,em=null){const o={color,roughness:rough,metalness:metal};if(em){o.emissive=em;o.emissiveIntensity=.6;}return new THREE.MeshStandardMaterial(o);}
  createFloor(){this.mesh(new THREE.BoxGeometry(12,.2,12),this.mat(0x24262b,.95),[0,-.1,0]);}
  createWalls(){const w=this.mat(0x1d2127,.95);this.mesh(new THREE.BoxGeometry(12,4,.22),w,[0,2,-5.9]);this.mesh(new THREE.BoxGeometry(12,4,.22),w,[0,2,5.9]);this.mesh(new THREE.BoxGeometry(.22,4,12),w,[-5.9,2,0]);this.mesh(new THREE.BoxGeometry(.22,4,12),w,[5.9,2,0]);}
  createClock(){const c=this.mesh(new THREE.CylinderGeometry(.7,.7,.12,32),this.mat(0xddd8c8,.45,.1),[0,2.7,-5.72],[Math.PI/2,0,0]);c.userData.objectId="WAIT_CLOCK";this.objects.clock=c;}
  createSeat(){const s=this.mesh(new THREE.BoxGeometry(3,.35,.75),this.mat(0x493728,.75),[0,.7,1]);s.userData.objectId="WAIT_SEAT";this.objects.seat=s;}
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

  createExit(){const d=this.mesh(new THREE.BoxGeometry(2,3.2,.18),this.mat(0x52606a,.7),[0,1.6,-5.78]);d.userData.objectId="WAIT_EXIT";this.objects.exit=d;}
  update(delta){
    if(this.memoryContext?.wrongPaths?.length && this.memoryLight){
      this.memoryLight.intensity=3+Math.sin(performance.now()*.003)*.8;
    }
  }
  getInteractableObjects(){return Object.values(this.objects);}
  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_03"});}
}