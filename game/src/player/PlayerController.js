import * as THREE from "three";

export class PlayerController {
  constructor(camera) {
    this.camera = camera;
    this.speed = 2.1;
    this.lookSpeed = 0.002;
    this.keys = { forward:false, backward:false, left:false, right:false };
    this.touchMove = { x:0, y:0 };
    this.rotation = new THREE.Euler(0,0,0,"YXZ");
    this.direction = new THREE.Vector3();
    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
  }

  setupKeyboard() {
    window.addEventListener("keydown", e => {
      if(e.code==="KeyW"||e.code==="ArrowUp") this.keys.forward=true;
      if(e.code==="KeyS"||e.code==="ArrowDown") this.keys.backward=true;
      if(e.code==="KeyA"||e.code==="ArrowLeft") this.keys.left=true;
      if(e.code==="KeyD"||e.code==="ArrowRight") this.keys.right=true;
    });
    window.addEventListener("keyup", e => {
      if(e.code==="KeyW"||e.code==="ArrowUp") this.keys.forward=false;
      if(e.code==="KeyS"||e.code==="ArrowDown") this.keys.backward=false;
      if(e.code==="KeyA"||e.code==="ArrowLeft") this.keys.left=false;
      if(e.code==="KeyD"||e.code==="ArrowRight") this.keys.right=false;
    });
  }

  setupMouse() {
    window.addEventListener("click", () => {
      if (window.matchMedia("(pointer:fine)").matches) document.body.requestPointerLock?.();
    });
    document.addEventListener("mousemove", e => {
      if(document.pointerLockElement !== document.body) return;
      this.look(e.movementX,e.movementY);
    });
  }

  setupTouch() {
    const pad = document.createElement("div");
    pad.id="pg-joystick";
    pad.innerHTML='<div id="pg-stick"></div>';
    Object.assign(pad.style,{position:"fixed",left:"50%",bottom:"22px",transform:"translateX(-50%)",width:"118px",height:"118px",borderRadius:"50%",background:"rgba(255,255,255,.12)",border:"2px solid rgba(255,255,255,.3)",zIndex:"9000",touchAction:"none",display:"none"});
    const stick=pad.firstElementChild;
    Object.assign(stick.style,{position:"absolute",left:"38px",top:"38px",width:"42px",height:"42px",borderRadius:"50%",background:"rgba(255,255,255,.28)"});
    document.body.appendChild(pad);
    let active=false;
    const move=e=>{
      if(!active)return;
      const r=pad.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
      let dx=e.clientX-cx, dy=e.clientY-cy, len=Math.hypot(dx,dy), max=52;
      if(len>max){dx=dx/len*max;dy=dy/len*max;}
      stick.style.transform=`translate(${dx}px,${dy}px)`;
      this.touchMove.x=(dx/max)*0.72; this.touchMove.y=(dy/max)*0.72;
    };
    const end=()=>{active=false;this.touchMove.x=0;this.touchMove.y=0;stick.style.transform="translate(0,0)";};
    pad.addEventListener("pointerdown",e=>{active=true;pad.setPointerCapture(e.pointerId);move(e);});
    pad.addEventListener("pointermove",move); pad.addEventListener("pointerup",end); pad.addEventListener("pointercancel",end);

    const look=document.createElement("div");
    look.id="pg-touch-look";
    Object.assign(look.style,{position:"fixed",right:"0",top:"0",width:"100%",height:"100%",zIndex:"6500",touchAction:"none",display:"none"});
    document.body.appendChild(look);
    let lastX=0,lastY=0,startX=0,startY=0,lookActive=false,moved=false;
    look.addEventListener("pointerdown",e=>{lookActive=true;moved=false;startX=lastX=e.clientX;startY=lastY=e.clientY;look.setPointerCapture(e.pointerId);e.preventDefault();},{passive:false});
    look.addEventListener("pointermove",e=>{if(!lookActive)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.hypot(e.clientX-startX,e.clientY-startY)>10)moved=true;this.look(dx,dy);lastX=e.clientX;lastY=e.clientY;e.preventDefault();},{passive:false});
    const lookEnd=(e)=>{if(!lookActive)return;lookActive=false;if(!moved && window.psychGame?.interactAt) window.psychGame.interactAt(e.clientX,e.clientY);};
    look.addEventListener("pointerup",lookEnd);look.addEventListener("pointercancel",()=>{lookActive=false;});

    const interact=document.createElement("button");
    interact.id="pg-touch-interact"; interact.textContent="تعامل با شیء";
    Object.assign(interact.style,{position:"fixed",right:"20px",bottom:"30px",width:"92px",height:"62px",borderRadius:"18px",border:"2px solid rgba(255,255,255,.35)",background:"rgba(120,30,25,.96)",color:"#fff",fontSize:"17px",fontWeight:"700",zIndex:"10000",display:"none",boxShadow:"0 6px 22px rgba(0,0,0,.45)",touchAction:"manipulation"});
    interact.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();window.psychGame?.interact?.();},{passive:false});
    interact.addEventListener("touchend",e=>{e.preventDefault();e.stopPropagation();},{passive:false});
    document.body.appendChild(interact);

    const isTouch = window.matchMedia("(pointer:coarse)").matches || navigator.maxTouchPoints > 0;
    if(isTouch){
      pad.style.display="block"; look.style.display="block"; interact.style.display="block";
    }
    window.addEventListener("resize",()=>{
      const touch = window.matchMedia("(pointer:coarse)").matches || navigator.maxTouchPoints > 0;
      pad.style.display=touch?"block":"none";
      look.style.display=touch?"block":"none";
      interact.style.display=touch?"block":"none";
    });
  }

  look(dx,dy){
    this.rotation.y-=dx*this.lookSpeed;
    this.rotation.x-=dy*this.lookSpeed;
    const max=Math.PI/2-.05;
    this.rotation.x=Math.max(-max,Math.min(max,this.rotation.x));
    this.camera.rotation.copy(this.rotation);
  }

  update(delta) {
    this.direction.set(0,0,0);
    if(this.keys.forward) this.direction.z-=1;
    if(this.keys.backward) this.direction.z+=1;
    if(this.keys.left) this.direction.x-=1;
    if(this.keys.right) this.direction.x+=1;
    this.direction.x += this.touchMove.x;
    this.direction.z += this.touchMove.y;
    if(this.direction.lengthSq()===0)return;
    this.direction.normalize();
    const movement=this.direction.clone().applyEuler(new THREE.Euler(0,this.camera.rotation.y,0));
    this.camera.position.add(movement.multiplyScalar(this.speed*delta));
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -4.2, 4.2);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -4.2, 4.2);
    this.camera.position.y = 1.7;
  }
}