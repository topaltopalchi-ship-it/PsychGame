import * as THREE from "three";
export class Room02 {
  constructor(scene,tracker){this.scene=scene;this.tracker=tracker;this.objects={};this.completed=false;this.selectedPath=null;this.pathLights=[];this.scareFigure=null;this.scareTimer=null;this.originalFogDensity=.024;}
  start(context={}){this.scene.fog=new THREE.FogExp2(0x0b0d12,.024);this.createFloor();this.createWalls();this.createCeiling();this.createPaths();this.createClue();this.createBench();this.createDecisionMarker();this.createAtmosphere();this.createStoryDetails();this.createPathLighting();this.createDreadProps();this.createScareFigure();this.tracker.log("ROOM_ENTER",{roomId:"ROOM_02",roomName:"MULTIPLE_PATHS",previousPath:context.previousPath||"UNKNOWN"});}
  getInteractableObjects(){return Object.values(this.objects);}
  completeRoom(path){this.completed=true;this.selectedPath=path||this.selectedPath;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_02",path:this.selectedPath||"UNKNOWN"});}
  mesh(g,mat,pos,rot=[0,0,0]){const m=new THREE.Mesh(g,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
  mat(color,roughness=.8,metalness=0,emissive=null){const o={color,roughness,metalness};if(emissive){o.emissive=emissive;o.emissiveIntensity=.7;}return new THREE.MeshStandardMaterial(o);}
  createFloor(){this.mesh(new THREE.BoxGeometry(12,.2,12),this.mat(0x24262b,.95),[0,-.1,0]);this.mesh(new THREE.BoxGeometry(8,.04,7),this.mat(0x303238,1),[0,.02,-.2]);for(const x of [-3.1,0,3.1])this.mesh(new THREE.BoxGeometry(.08,.025,7),this.mat(0x54575d,.9),[x,.045,-.2]);}
  createWalls(){const w=this.mat(0x1d2127,.95);this.mesh(new THREE.BoxGeometry(12,4,.22),w,[0,2,-5.9]);this.mesh(new THREE.BoxGeometry(12,4,.22),w,[0,2,5.9]);this.mesh(new THREE.BoxGeometry(.22,4,12),w,[-5.9,2,0]);this.mesh(new THREE.BoxGeometry(.22,4,12),w,[5.9,2,0]);}
  createCeiling(){this.mesh(new THREE.BoxGeometry(12,.16,12),this.mat(0x14171c,1),[0,4.05,0]);}
  createPaths(){for(const p of [{id:"PATH_LEFT",x:-3.1,color:0x8b4a45},{id:"PATH_CENTER",x:0,color:0x4b6885},{id:"PATH_RIGHT",x:3.1,color:0x6b7350}]){const d=this.mesh(new THREE.BoxGeometry(1.7,3.25,.18),this.mat(p.color,.7),[p.x,1.63,-4.02]);d.userData.objectId=p.id;this.objects[p.id]=d;const f=this.mat(0x101216,.55,.2);this.mesh(new THREE.BoxGeometry(2,.16,.25),f,[p.x,3.32,-4.02]);this.mesh(new THREE.BoxGeometry(.16,3.4,.25),f,[p.x-1,1.7,-4.02]);this.mesh(new THREE.BoxGeometry(.16,3.4,.25),f,[p.x+1,1.7,-4.02]);const mark=this.mesh(new THREE.BoxGeometry(.5,.5,.08),this.mat(p.color,.4,.1,p.color),[p.x,2.75,-3.88]);mark.userData.objectId=p.id;this.objects[p.id+"MARKER"]=mark;}}
  createClue(){const b=this.mesh(new THREE.BoxGeometry(2.4,1.5,.12),this.mat(0x4a4032,.8),[-3.45,2.15,-4.0]);b.userData.objectId="PATH_CLUE";this.objects.clue=b;const l=this.mesh(new THREE.BoxGeometry(1.65,.045,.04),this.mat(0xc8b27b,.35,.2),[-3.45,2.48,-3.92]);l.userData.objectId="PATH_CLUE";const a=this.mesh(new THREE.ConeGeometry(.14,.42,4),this.mat(0xc8b27b,.35,.2),[-3.45,1.95,-3.92],[Math.PI/2,0,0]);a.userData.objectId="PATH_CLUE";}

  createDecisionMarker(){const g=new THREE.CylinderGeometry(.32,.42,.06,32);const m=this.mesh(g,this.mat(0x8a6f45,.55,.15,0x3a2815),[0,.09,-1.65]);m.userData.objectId="DECISION_MARKER";this.objects.marker=m;}
  createAtmosphere(){
    const trim=this.mat(0x59606b,.55,.25);
    for(const x of [-4.5,-1.5,1.5,4.5]) this.mesh(new THREE.BoxGeometry(.08,3.25,.08),trim,[x,2,-5.74]);
    const ceiling=this.mesh(new THREE.BoxGeometry(2.4,.08,.65),this.mat(0xb39a70,.3,.65),[0,3.86,-.5]);
    const light=new THREE.PointLight(0xd8e6ff,9,8);light.position.set(0,3.2,-.5);this.scene.add(light);
    for(const x of [-3.1,0,3.1]){const glow=this.mesh(new THREE.BoxGeometry(1.35,.05,.04),this.mat(0x6f829b,.35,.15,0x52657d),[x,3.0,-3.88]);glow.userData.objectId="PATH_CLUE";}
    this.mesh(new THREE.BoxGeometry(8.8,.035,2.2),this.mat(0x171a20,1),[0,.045,-.9]);
  }

  createStoryDetails(){
    const dark=this.mat(0x111419,.9);
    const brass=this.mat(0x92734a,.42,.55);
    const red=this.mat(0x6f2f2f,.55,.1,0x3b1111);

    // Three wall plaques make the choices feel deliberate rather than like empty doors.
    for(const [x,label] of [[-3.1,"L"],[0,"?"],[3.1,"R"]]){
      const plaque=this.mesh(new THREE.BoxGeometry(.62,.48,.05),dark,[x,2.05,-5.74]);
      plaque.userData.objectId="PATH_CLUE";
      const glyph=this.mesh(new THREE.BoxGeometry(.08,.28,.035),brass,[x,2.05,-5.70]);
      glyph.userData.objectId="PATH_CLUE";
      if(label==="L") glyph.rotation.z=.55;
      if(label==="R") glyph.rotation.z=-.55;
    }

    // A thin red trail leads toward the decision point.
    for(let z=1.0;z>-2.9;z-=.65){
      const mark=this.mesh(new THREE.BoxGeometry(.34,.018,.16),red,[0,.08,z]);
      mark.userData.objectId="DECISION_MARKER";
    }

    // Old warning boards add environmental storytelling.
    const board=this.mesh(new THREE.BoxGeometry(2.6,1.05,.08),dark,[3.55,2.25,-1.8]);
    board.userData.objectId="PATH_CLUE";
    this.mesh(new THREE.BoxGeometry(1.9,.05,.03),brass,[3.55,2.38,-1.74]);
    this.mesh(new THREE.BoxGeometry(1.3,.04,.03),brass,[3.55,2.15,-1.74]);
  }

  createPathLighting(){
    const lights=[
      {x:-3.1,color:0xff554d,intensity:3.2},
      {x:0,color:0x9fbfff,intensity:2.4},
      {x:3.1,color:0xb8c47b,intensity:2.8}
    ];
    this.pathLights=[];
    for(const p of lights){
      const lamp=this.mesh(new THREE.CylinderGeometry(.16,.22,.12,16),this.mat(0x16181d,.5,.35),[p.x,3.72,-3.72]);
      lamp.userData.objectId="PATH_CLUE";
      const glow=this.mesh(new THREE.SphereGeometry(.11,12,8),this.mat(p.color,.35,.1,p.color),[p.x,3.58,-3.72]);
      glow.userData.objectId="PATH_CLUE";
      const light=new THREE.PointLight(p.color,p.intensity,5.5);
      light.position.set(p.x,3.48,-3.72);
      this.scene.add(light);
      this.pathLights.push(light);
    }
  }

  triggerPathScare(path){
    if(this.scareTimer) clearTimeout(this.scareTimer);
    const index=path==="PATH_LEFT"?0:2;
    const target=this.pathLights[index];
    const figure=this.scareFigure;
    if(target) target.intensity*=2.8;
    if(figure){
      figure.position.set(path==="PATH_LEFT"?-3.1:3.1,1.55,-2.7);
      figure.visible=true;
      figure.scale.set(1,1,1);
    }
    if(this.scene.fog) this.scene.fog.density=.07;
    this.tracker.log("PATH_SCARE",{roomId:"ROOM_02",path});
    this.scareTimer=setTimeout(()=>{
      if(target) target.intensity/=2.8;
      if(figure) figure.visible=false;
      if(this.scene.fog) this.scene.fog.density=this.originalFogDensity;
    },700);
  }

  createScareFigure(){
    const material=this.mat(0x020203,1,0);
    const group=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.22,.32,1.25,10),material);
    body.position.y=.72;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),material);
    head.position.y=1.55;
    group.add(body,head);
    group.position.set(-3.1,0,-2.7);
    group.visible=false;
    this.scene.add(group);
    this.scareFigure=group;
  }

  createDreadProps(){
    const iron=this.mat(0x191b20,.62,.75);
    const rust=this.mat(0x55352f,.82,.25);
    const bone=this.mat(0x777064,.95);
    for(const x of [-4.7,4.7]){
      for(const z of [-2.8,-.9,1.0]){
        const pipe=this.mesh(new THREE.CylinderGeometry(.035,.05,2.1,8),iron,[x,2,z],[0,0,Math.PI/2]);
        pipe.userData.objectId="AMBIENT_PROP";
      }
    }
    const warning=this.mesh(new THREE.BoxGeometry(1.45,.72,.06),rust,[4.45,1.85,-3.0]);
    warning.userData.objectId="PATH_CLUE";
    for(const x of [4.05,4.45,4.85]){
      const shard=this.mesh(new THREE.ConeGeometry(.045,.34,6),bone,[x,1.42,-2.94],[Math.PI/2,0,0]);
      shard.userData.objectId="AMBIENT_PROP";
    }
    for(let z=-2.6;z<2.2;z+=.9){
      const crack=this.mesh(new THREE.BoxGeometry(.025,.012,.62),this.mat(0x090a0c,1),[-1.7,.075,z],[0,.18,0]);
      crack.userData.objectId="AMBIENT_PROP";
    }
  }

  createBench(){const wood=this.mat(0x493728,.75);const seat=this.mesh(new THREE.BoxGeometry(3,.16,.65),wood,[0,.85,1.1]);seat.userData.objectId="BENCH";this.objects.bench=seat;this.mesh(new THREE.BoxGeometry(2.7,.85,.12),wood,[0,1.25,1.35]);for(const x of [-1.25,1.25])this.mesh(new THREE.BoxGeometry(.12,.75,.12),wood,[x,.42,1.1]);}
}