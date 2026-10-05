import * as THREE from "three";

export class Room05 {
  constructor(scene, tracker){
    this.scene=scene; this.tracker=tracker; this.objects={}; this.completed=false;
    this.companion=null; this.context={}; this.observations={}; this.firstMirror=null;
    this.firstLookAt=performance.now(); this.lastMirror=null; this.firstChoiceTime=0; this.glitchCount=0; this.choiceLocked=false; this.glitchTimers=[]; this.ambientPulse=0;
  }
  start(context={}){
    this.context=context||{}; this.companion=this.context.companion||null; this.firstLookAt=performance.now();
    this.scene.fog=new THREE.FogExp2(0x08080d,.028);
    this.createFloor(); this.createWalls(); this.createMirrors(); this.createAtmosphere();
    this.tracker.log("ROOM_ENTER",{roomId:"ROOM_05",roomName:"MIRROR_ROOM",previousRoom:context.previousRoom||"ROOM_04"});
  }
  mat(color,roughness=.35,metalness=.15){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  mesh(g,m,p=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);this.scene.add(o);return o;}
  add(id,o){o.userData.objectId=id;this.objects[id]=o;return o;}
  createFloor(){
    this.mesh(new THREE.PlaneGeometry(18,18),this.mat(0x15151a,.9),[0,0,0]).rotation.x=-Math.PI/2;
    this.mesh(new THREE.BoxGeometry(15,.035,8),this.mat(0x22222a,.75,.08),[0,.02,0]);
    for(const x of [-7,-3.6,0,3.6,7]){
      this.mesh(new THREE.BoxGeometry(.045,.04,10),this.mat(0x596079,.35,.3,0x22283b),[x,.05,0]);
    }
  }
  createWalls(){
    const m=this.mat(0x111116,.95);
    this.mesh(new THREE.BoxGeometry(18,4,0.3),m,[0,2,-6]);
    this.mesh(new THREE.BoxGeometry(18,4,0.3),m,[0,2,6]);
    this.mesh(new THREE.BoxGeometry(.3,4,12),m,[-9,2,0]);
    this.mesh(new THREE.BoxGeometry(.3,4,12),m,[9,2,0]);
  }
  createMirrors(){
    [-3.6,0,3.6].forEach((x,i)=>{
      const frame=this.mesh(new THREE.BoxGeometry(2.55,3.05,.22),this.mat(0x29242c,.45,.6),[x,2.05,-4.7]);
      const glass=this.mesh(new THREE.PlaneGeometry(2.15,2.65),new THREE.MeshStandardMaterial({color:0x243044,roughness:.08,metalness:.8,transparent:true,opacity:.82}),[x,2.05,-4.56]);
      const id=["MIRROR_LEFT","MIRROR_CENTER","MIRROR_RIGHT"][i]; this.add(id,glass);
      glass.userData.mirrorIndex=i; glass.userData.frame=frame;
      if(i===1){
        const shadow=this.mesh(new THREE.CapsuleGeometry(.42,1.45,6,10),new THREE.MeshStandardMaterial({color:0x020204,roughness:1}),[x,1.8,-4.42]);
        shadow.visible=false; this.objects[id+"_SHADOW"]=shadow; glass.userData.shadow=shadow;
      }
    });
    const exit=this.mesh(new THREE.BoxGeometry(2.3,2.8,.35),this.mat(0x32151b,.7,.2),[0,1.8,5.75]);
    this.add("MIRROR_EXIT",exit);
  }
  createAtmosphere(){
    const ceiling=this.mesh(new THREE.BoxGeometry(15,.12,1.2),this.mat(0x252832,.45,.5),[0,3.7,-1.2]);
    for(const x of [-5.4,0,5.4]){
      const lamp=this.mesh(new THREE.SphereGeometry(.14,16,12),new THREE.MeshStandardMaterial({color:0x9ba8d0,emissive:0x55658f,emissiveIntensity:1.8}),[x,3.45,-1.2]);
      const point=new THREE.PointLight(0x7889c4,.9,5); point.position.set(x,3.3,-1.2); this.scene.add(point);
    }
    const l=new THREE.PointLight(0x6875a8,1.2,14);l.position.set(0,3.2,-2);this.scene.add(l);this.objects.MIRROR_LIGHT=l;
    const glow=this.mesh(new THREE.SphereGeometry(.16,12,12),new THREE.MeshBasicMaterial({color:0x8899ff}),[0,3.1,-3]);this.add("MIRROR_GLOW",glow);
    const ceiling=this.mesh(new THREE.BoxGeometry(14,.08,1.8),new THREE.MeshStandardMaterial({color:0x222630,roughness:.55,metalness:.35}),[0,3.75,-.8]); this.add("MIRROR_CEILING",ceiling);
  }
  reactToMirror(id){
    if(this.choiceLocked)return;
    const now=performance.now(); const elapsed=(now-this.firstLookAt)/1000;
    this.observations[id]=(this.observations[id]||0)+1; this.lastMirror=id;
    if(!this.firstMirror){this.firstMirror=id;this.firstChoiceTime=Math.round(elapsed*10)/10;}
    this.tracker.log("ROOM_05_MIRROR_INSPECTED",{mirror:id,count:this.observations[id],firstMirror:this.firstMirror,secondsBeforeChoice:Math.round(elapsed*10)/10,reactionTimeMs:Math.round(now-this.firstLookAt)});
    if(this.observations[id]>=2){this.glitchMirror(id);}
    if(this.observations[id]>=3 && id!=="MIRROR_CENTER"){
      this.companion?.say?.("باز هم برگشتی به همون آینه... دنبال چیزی می‌گردی که بار اول ندیدی؟", 0, "stress");
    }
  }
  glitchMirror(id){
    const glass=this.objects[id], shadow=glass?.userData?.shadow;
    if(!glass)return;
    this.glitchCount++;
    if(shadow){shadow.visible=true; shadow.position.x=glass.position.x+(Math.random()-.5)*.3;}
    glass.material.color.set(this.glitchCount%2?0x3d2430:0x243044);
    const light=this.objects.MIRROR_LIGHT; if(light)light.intensity=2.8;
    this.tracker.log("ROOM_05_REFLECTION_GLITCH",{mirror:id,count:this.glitchCount});
    this.companion?.say?.(id==="MIRROR_CENTER"?"این یکی... چرا شبیه آینه‌های دیگه نیست؟":"دیدیش؟ فقط چند لحظه بود.", 0, "fear");
    const timer=setTimeout(()=>{if(this.completed){this.glitchTimers=this.glitchTimers.filter(t=>t!==timer);return;}if(shadow)shadow.visible=false;if(light)light.intensity=1.2;if(glass.material)glass.material.color.set(0x243044);this.glitchTimers=this.glitchTimers.filter(t=>t!==timer);},700);
    this.glitchTimers.push(timer);
  }
  chooseExit(){
    if(this.choiceLocked)return; this.choiceLocked=true;
    const repeated=Object.values(this.observations).filter(v=>v>1).length;
    this.tracker.log("ROOM_05_CHOICE",{firstMirror:this.firstMirror,lastMirror:this.lastMirror,glitchCount:this.glitchCount,repeatedMirrorChecks:repeated});
    this.companion?.say?.("باشه... فکر کنم وقتشه از اینجا بریم.", 0, "calm");
  }
  getInteractableObjects(){return Object.values(this.objects).filter(o=>o?.userData?.objectId);}
  completeRoom(){if(this.completed)return;this.completed=true;this.tracker.log("ROOM_COMPLETED",{roomId:"ROOM_05",firstMirror:this.firstMirror,glitchCount:this.glitchCount});}
  update(delta){
    if(this.completed)return;
    const now=performance.now();
    if(this.objects.MIRROR_GLOW)this.objects.MIRROR_GLOW.scale.setScalar(1+Math.sin(now*.004)*.08);
    if(this.objects.MIRROR_LIGHT){
      const base=1.2+Math.sin(now*.0017)*.12;
      this.objects.MIRROR_LIGHT.intensity=base+(this.glitchCount>0?Math.sin(now*.006)*.08:0);
    }
  }
  destroy(){this.completed=true;for(const timer of this.glitchTimers)clearTimeout(timer);this.glitchTimers=[];this.objects={};}
}