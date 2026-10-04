import * as THREE from "three";
import { PlayerController } from "./player/PlayerController.js";
import { InteractionSystem } from "./interaction/InteractionSystem.js";
import { SessionManager } from "./session/SessionManager.js";
import { Room01 } from "./rooms/Room01.js";
import { Room02 } from "./rooms/Room02.js";
import { Room03 } from "./rooms/Room03.js";
import { AuthorPanel } from "./ui/AuthorPanel.js";
import { Companion } from "./ui/Companion.js";

const game = document.getElementById("game");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a0d);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 3.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.display = "block";
renderer.domElement.style.touchAction = "none";
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
game.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight(0x9aa6b5, 0x1a1a1a, 1.05);
scene.add(ambientLight);
const mainLight = new THREE.PointLight(0xffd6a0, 28, 13);
mainLight.position.set(0, 3.45, -0.4);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
scene.add(mainLight);
const rimLight = new THREE.PointLight(0x4b6282, 10, 10);
rimLight.position.set(-3.8, 2.6, -3.8);
scene.add(rimLight);

const session = new SessionManager();
const authorPanel = new AuthorPanel(session);
const tracker = session.getTracker();
const companion = new Companion(tracker);
const player = new PlayerController(camera);
const interaction = new InteractionSystem(camera, tracker, scene, mainLight);
const room01 = new Room01(scene, tracker);
let activeRoom = room01;

room01.start();
interaction.setRoom(room01, 1);
interaction.setCompanion(companion);
room01.getInteractableObjects().forEach((object) => interaction.register(object, object.userData.objectId));
tracker.log("GAME_START", { playerCode: session.getPlayerCode() });

const hud = document.createElement("div");
const crosshair = document.createElement("div");
crosshair.id = "pg-crosshair";
crosshair.textContent = "+";
const hint = document.createElement("div");
hint.id = "pg-hint";
hint.textContent = "سمت چپ: حرکت · به شیء نگاه کن · دکمه پایین راست: تعامل";
const title = document.createElement("div");
title.id = "pg-title";
title.textContent = "YOL · اتاق ۰۱ — دکمه قرمز";
const targetPrompt = document.createElement("div");
targetPrompt.id = "pg-target";
targetPrompt.textContent = "برای تعامل، به یک شیء نگاه کنید";
targetPrompt.style.display = "none";
hud.append(crosshair, hint, title, targetPrompt);
Object.assign(hud.style, { position:"fixed", inset:"0", pointerEvents:"none", zIndex:"5000", direction:"rtl", fontFamily:"Tahoma,Arial,sans-serif", color:"#eee" });
document.body.appendChild(hud);

const style = document.createElement("style");
style.textContent = "#pg-crosshair{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:20px;color:rgba(255,255,255,.65);text-shadow:0 1px 5px #000}#pg-hint{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);padding:9px 16px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(5,7,10,.58);backdrop-filter:blur(8px);font-size:13px;color:rgba(255,255,255,.78)}#pg-title{position:absolute;top:18px;right:20px;padding:8px 12px;border-right:2px solid #a74b3c;background:rgba(5,7,10,.42);font-size:14px;color:rgba(255,255,255,.8)}#pg-target{position:absolute;left:50%;top:54%;transform:translateX(-50%);padding:8px 14px;border-radius:18px;background:rgba(5,7,10,.78);border:1px solid rgba(255,255,255,.2);font-size:13px;color:#fff;white-space:nowrap}@media(max-width:700px){#pg-hint{font-size:11px;bottom:10px;max-width:80%;text-align:center}#pg-title{font-size:12px;top:10px;right:10px}#pg-target{top:57%;font-size:12px}}";
document.head.appendChild(style);

let authorTapCount = 0;
let authorTapTimer = null;
const hiddenAuthorZone = document.createElement("div");
Object.assign(hiddenAuthorZone.style, { position:"fixed", top:"0", left:"0", width:"90px", height:"90px", zIndex:"10000", background:"transparent" });
document.body.appendChild(hiddenAuthorZone);

function openAuthor() {
  const code = prompt("کد نویسنده را وارد کنید:");
  if (code) authorPanel.open(code);
}
hiddenAuthorZone.addEventListener("click", () => {
  authorTapCount++;
  clearTimeout(authorTapTimer);
  authorTapTimer = setTimeout(() => { authorTapCount = 0; }, 1500);
  if (authorTapCount >= 5) { authorTapCount = 0; openAuthor(); }
});
window.openAuthorPanel = openAuthor;

const targetLabels = {
  RED_BUTTON: "دکمه قرمز — فشار بده",
  EXIT_DOOR: "در — باز کن",
  HALF_OPEN_DRAWER: "کشوی نیمه‌باز — بررسی کن",
  KEY_FROM_DRAWER: "کلید طلایی — بردار",
  CLOSED_BOX: "جعبه — بررسی",
  OLD_DESK: "میز قدیمی — بررسی",
  BROKEN_CLOCK: "ساعت خراب — بررسی",
  OLD_PAINTING: "تابلو — بررسی",
  PATH_LEFT: "مسیر چپ — انتخاب کن",
  PATH_CENTER: "مسیر وسط — انتخاب کن",
  PATH_RIGHT: "مسیر راست — انتخاب کن",
  PATH_CLUE: "تابلو — بررسی کن"
};
const targetNames = {
  RED_BUTTON: "دکمه قرمز",
  EXIT_DOOR: "در",
  HALF_OPEN_DRAWER: "کشو",
  KEY_FROM_DRAWER: "کلید طلایی",
  CLOSED_BOX: "جعبه",
  OLD_DESK: "میز قدیمی",
  BROKEN_CLOCK: "ساعت خراب",
  OLD_PAINTING: "تابلو",
  PATH_LEFT: "مسیر چپ", PATH_CENTER: "مسیر وسط", PATH_RIGHT: "مسیر راست", PATH_CLUE: "تابلو"
};

window.addEventListener("psychgame-target", (event) => {
  const objectId = event.detail?.objectId;
  const label = targetLabels[objectId];
  targetPrompt.textContent = label || "برای تعامل، به یک شیء نگاه کنید";
  targetPrompt.style.display = label ? "block" : "none";
  const interactButton = document.getElementById("pg-touch-interact");
  if (interactButton) {
    interactButton.textContent = objectId ? ("تعامل: " + (targetNames[objectId] || "شیء")) : "تعامل";
    interactButton.style.opacity = objectId ? "1" : ".55";
  }
});

function clearRoomGeometry() {
  scene.children.slice().forEach((child) => {
    if (child.isMesh || (child.isLight && child !== ambientLight && child !== mainLight && child !== rimLight)) {
      scene.remove(child);
    }
  });
}

function startRoom02(previousPath = "ROOM_01") {
  if (activeRoom !== room01 || !room01.completed) return;
  clearRoomGeometry();
  interaction.clearTargets?.();
  activeRoom = new Room02(scene, tracker);
  activeRoom.start({ previousPath });
  interaction.setRoom(activeRoom, 2);
  camera.position.set(0, 1.7, 3.5);
  camera.rotation.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  mainLight.intensity = 24;
  companion?.say("اتاق دوم؛ سه مسیر پیش روت هست. انتخاب کن و نتیجه‌اش رو ببین.");
  document.getElementById("pg-title").textContent = "YOL · اتاق ۰۲ — چند مسیر";
}
window.addEventListener("psychgame-room-complete", (event) => {
  if (event.detail?.roomId === "ROOM_01") setTimeout(() => startRoom02("ROOM_01"), 900);
});

function startRoom03(previousPath = "ROOM_02") {
  if (activeRoom?.constructor?.name !== "Room02" || !activeRoom.completed) return;
  clearRoomGeometry();
  interaction.clearTargets?.();
  activeRoom = new Room03(scene, tracker);
  activeRoom.start({ previousPath });
  interaction.setRoom(activeRoom, 3);
  camera.position.set(0, 1.7, 3.5);
  player.rotation.set(0, 0, 0);
  camera.rotation.copy(player.rotation);
  mainLight.intensity = 22;
  companion?.say("اتاق سوم؛ اینجا عجله نکردن خودش یک انتخابه.");
  document.getElementById("pg-title").textContent = "YOL · اتاق ۰۳ — اتاق انتظار";
}
window.addEventListener("psychgame-room-complete", (event) => {
  if (event.detail?.roomId === "ROOM_02") setTimeout(() => startRoom03("ROOM_02"), 900);
});

window.psychGame = {
  interact: () => interaction.interact(),
  interactAt: (x, y) => interaction.interactAt(x, y),
  session,
  tracker,
  getPlayerCode: () => session.getPlayerCode(),
  getEvents: () => tracker.getEvents(),
  getAnalysis: () => session.getAnalysis(),
  getReport: () => session.getSessionData(),
  exportSession: () => session.exportSession()
};

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  player.update(delta);
  interaction.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
