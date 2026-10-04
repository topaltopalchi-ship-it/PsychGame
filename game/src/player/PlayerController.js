import * as THREE from "three";

export class PlayerController {
  constructor(camera) {
    this.camera = camera;
    this.speed = 3;
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
    Object.assign(pad.style,{position:"fixed",left:"18px",bottom:"18px",width:"118px",height:"118px",borderRadius:"50%",background:"rgba(255,255,255,.09)",border:"1px solid rgba(255,255,255,.18)",zIndex:"7000",touchAction:"none",display:"none"});
    const stick=pad.firstElementChild;
    Object.assign(stick.style,{position:"absolute",left:"38px",top:"38px",width:"42px",height:"42px",borderRadius:"50%",background:"rgba(255,255,255,.28)"});
    document.body.appendChild(pad);
    let active=false;
    const move=e=>{
      if(!active)return;
      const r=pad.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
      let dx=e.clientX-cx, dy=e.clientY-cy, len=Math.hypot(dx,dy), max=42;
      if(len>max){dx=dx/len*max;dy=dy/len*max;}
      stick.style.transform=`translate(${dx}px,${dy}px)`;
      this.touchMove.x=dx/max; this.touchMove.y=dy/max;
    };
    const end=()=>{active=false;this.touchMove.x=0;this.touchMove.y=0;stick.style.transform="translate(0,0)";};
    pad.addEventListener("pointerdown",e=>{active=true;pad.setPointerCapture(e.pointerId);move(e);});
    pad.addEventListener("pointermove",move); pad.addEventListener("pointerup",end); pad.addEventListener("pointercancel",end);

    const look=document.createElement("div");
    look.id="pg-touch-look";
    Object.assign(look.style,{position:"fixed",right:"0",top:"0",width:"58%",height:"100%",zIndex:"6500",touchAction:"none",display:"none"});
    document.body.appendChild(look);
    let lastX=0,lastY=0,lookActive=false;
    look.addEventListener("pointerdown",e=>{lookActive=true;lastX=e.clientX;lastY=e.clientY;look.setPointerCapture(e.pointerId);});
    look.addEventListener("pointermove",e=>{if(!lookActive)return;this.look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;});
    const lookEnd=()=>lookActive=false;
    look.addEventListener("pointerup",lookEnd);look.addEventListener("pointercancel",lookEnd);

    const interact=document.createElement("button");
    interact.id="pg-touch-interact"; interact.textContent="E";
    Object.assign(interact.style,{position:"fixed",right:"22px",bottom:"24px",width:"58px",height:"58px",borderRadius:"50%",border:"1px solid rgba(255,255,255,.25)",background:"rgba(120,30,25,.78)",color:"#fff",fontSize:"20px",zIndex:"8000",display:"none"});
    interact.addEventListener("click",()=>window.psychGame?.interact?.());
    document.body.appendChild(interact);

    if(window.matchMedia("(pointer:coarse)").matches){
      pad.style.display="block"; look.style.display="block"; interact.style.display="block";
    }
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
  }
}