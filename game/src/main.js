import * as THREE from "three";
import { PlayerController } from "./player/PlayerController.js";
import { InteractionSystem } from "./interaction/InteractionSystem.js";
import { SessionManager } from "./session/SessionManager.js";
import { Room01 } from "./rooms/Room01.js";
import { Room02 } from "./rooms/Room02.js";
import { Room03 } from "./rooms/Room03.js";
import { Room04 } from "./rooms/Room04.js";
import { Room05 } from "./rooms/Room05.js";
import { Room06 } from "./rooms/Room06.js";
import { Room07 } from "./rooms/Room07.js";
import { Room08 } from "./rooms/Room08.js";
import { AuthorPanel } from "./ui/AuthorPanel.js";
import { Companion } from "./ui/Companion.js";
import { AudioManager } from "./audio/AudioManager.js";
import { Room09 } from "./rooms/Room09.js";
import { Room10 } from "./rooms/Room10.js";
import { Room11 } from "./rooms/Room11.js";

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
const audioManager = new AudioManager();
const player = new PlayerController(camera);
const interaction = new InteractionSystem(camera, tracker, scene, mainLight);
const room01 = new Room01(scene, tracker);
let activeRoom = room01;
const behavioralHistory = { hallBehavior:{}, mirrorBehavior:{}, recordingBehavior:{}, trustBehavior:{} };
let gameFinished = false;
let trainingFinished = false;
const roomTransitionTimers = new Set();

function scheduleRoomTransition(callback, delay = 900) {
  const timer = setTimeout(() => {
    roomTransitionTimers.delete(timer);
    if (gameFinished) return;
    callback();
  }, delay);
  roomTransitionTimers.add(timer);
  return timer;
}

function clearRoomTransitionTimers() {
  roomTransitionTimers.forEach((timer) => clearTimeout(timer));
  roomTransitionTimers.clear();
}

room01.start();
interaction.setRoom(room01, 1);
audioManager.setRoom(1);
interaction.setCompanion(companion);
tracker.log("GAME_START", { playerCode: session.getPlayerCode() });

let audioUnlocked = false;
function unlockGameAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioManager.unlock();
}
window.addEventListener("pointerdown", unlockGameAudio, { once: true, passive: true });
window.addEventListener("touchstart", unlockGameAudio, { once: true, passive: true });

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
style.textContent = "#pg-crosshair{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:20px;color:rgba(255,255,255,.65);text-shadow:0 1px 5px #000}#pg-hint{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);padding:9px 16px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(5,7,10,.58);backdrop-filter:blur(8px);font-size:13px;color:rgba(255,255,255,.78)}#pg-title{position:absolute;top:18px;right:20px;padding:8px 12px;border-right:2px solid #a74b3c;background:rgba(5,7,10,.42);font-size:14px;color:rgba(255,255,255,.8)}#pg-target{position:absolute;left:50%;top:54%;transform:translateX(-50%);padding:8px 14px;border-radius:18px;background:rgba(5,7,10,.78);border:1px solid rgba(255,255,255,.2);font-size:13px;color:#fff;white-space:nowrap}@media(max-width:700px){#pg-hint{font-size:10px;bottom:9px;max-width:76%;text-align:center;opacity:.72;padding:7px 12px}#pg-title{font-size:11px;top:9px;right:9px;padding:6px 9px;opacity:.82}#pg-target{top:55%;font-size:11px;padding:7px 11px;max-width:72vw;overflow:hidden;text-overflow:ellipsis;opacity:.9}#pg-crosshair{font-size:17px;opacity:.7}}";
document.head.appendChild(style);

let authorTapCount = 0;
let authorTapTimer = null;
const hiddenAuthorZone = document.createElement("div");
Object.assign(hiddenAuthorZone.style, { position:"fixed", top:"0", left:"0", width:"48px", height:"48px", zIndex:"10000", background:"transparent", pointerEvents:"auto" });
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
  PATH_CLUE: "تابلو — بررسی کن",
  MIRROR_LEFT: "آینه چپ — بررسی کن", MIRROR_CENTER: "آینه وسط — بررسی کن", MIRROR_RIGHT: "آینه راست — بررسی کن", MIRROR_EXIT: "در خروج — باز کن",
  REC_FAMILIAR: "صدای آشنا — گوش بده", REC_UNKNOWN: "صدای ناشناس — گوش بده", REC_STATIC: "نویز — گوش بده", REC_EXIT: "در خروج — باز کن",
  FOLLOW_COMPANION: "اعتماد به همراه — انتخاب کن", GO_ALONE: "تنهایی — انتخاب کن", COMP_EXIT: "در خروج — باز کن",
  TRUTH_CORE: "هسته — بررسی کن", TRUTH_EXIT: "در خروج — پایان"
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
  PATH_LEFT: "مسیر چپ", PATH_CENTER: "مسیر وسط", PATH_RIGHT: "مسیر راست", PATH_CLUE: "تابلو",
  MIRROR_LEFT: "آینه چپ", MIRROR_CENTER: "آینه وسط", MIRROR_RIGHT: "آینه راست", MIRROR_EXIT: "در خروج",
  REC_FAMILIAR: "صدای آشنا", REC_UNKNOWN: "صدای ناشناس", REC_STATIC: "نویز", REC_EXIT: "در خروج",
  FOLLOW_COMPANION: "اعتماد به همراه", GO_ALONE: "تنهایی", COMP_EXIT: "در خروج",
  TRUTH_CORE: "هسته", TRUTH_EXIT: "در خروج"
};

window.addEventListener("psychgame-target", (event) => {
  if (gameFinished) return;
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
  activeRoom?.destroy?.();
  scene.children.slice().forEach((child) => {
    if (child === ambientLight || child === mainLight || child === rimLight) return;

    child.traverse?.((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material?.dispose?.());
    });

    scene.remove(child);
  });
}

function startRoom02(previousPath = "ROOM_01") {
  if (activeRoom !== room01 || !room01.completed) return;
  clearRoomGeometry();
  interaction.clearTargets?.();
  activeRoom = new Room02(scene, tracker);
  activeRoom.start({ previousPath });
  interaction.setRoom(activeRoom, 2);
  audioManager.setRoom(2);
  camera.position.set(0, 1.7, 3.5);
  camera.rotation.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  mainLight.intensity = 24;
  companion?.say("اتاق دوم؛ سه مسیر پیش روت هست. انتخاب کن و نتیجه‌اش رو ببین.");
  document.getElementById("pg-title").textContent = "YOL · اتاق ۰۲ — چند مسیر";
}
window.addEventListener("psychgame-room-complete", (event) => {
  if (event.detail?.roomId === "ROOM_01") scheduleRoomTransition(() => startRoom02("ROOM_01"));
});

function startRoom03(context = { previousPath: "ROOM_02" }) {
  if (activeRoom?.constructor?.name !== "Room02" || !activeRoom.completed) return;
  clearRoomGeometry();
  interaction.clearTargets?.();
  activeRoom = new Room03(scene, tracker);
  activeRoom.start(context);
  interaction.setRoom(activeRoom, 3);
  audioManager.setRoom(3);
  camera.position.set(0, 1.7, 3.5);
  player.rotation.set(0, 0, 0);
  camera.rotation.copy(player.rotation);
  mainLight.intensity = 22;
  companion?.say("اتاق سوم؛ اینجا عجله نکردن خودش یک انتخابه.");
  document.getElementById("pg-title").textContent = "YOL · اتاق ۰۳ — اتاق انتظار";
}
window.addEventListener("psychgame-room-complete", (event) => {
  if (event.detail?.roomId === "ROOM_02") scheduleRoomTransition(() => startRoom03({ previousPath: event.detail.path || "PATH_CENTER", wrongPaths: event.detail.wrongPaths || [], companion }));
});

function startRoom04(context = { previousRoom: "ROOM_03" }) {
  if (activeRoom?.constructor?.name !== "Room03" || !activeRoom.completed) return;
  clearRoomGeometry();
  interaction.clearTargets?.();
  activeRoom = new Room04(scene, tracker);
  activeRoom.start(context);
  interaction.setRoom(activeRoom, 4);
  audioManager.setRoom(4);
  camera.position.set(0,1.7,3.5);
  player.rotation.set(0,0,0);
  camera.rotation.copy(player.rotation);
  mainLight.intensity=18;
  companion?.say("اتاق چهارم؛ اگر راهرو تکرار شد، به حافظه‌ات اعتماد نکن.");
  document.getElementById("pg-title").textContent="YOL · اتاق ۰۴ — راهروی بی‌انتها";
}
window.addEventListener("psychgame-room-complete", (event) => {
  if (event.detail?.roomId === "ROOM_03") scheduleRoomTransition(() => startRoom04({ previousRoom:"ROOM_03", companion }));
});

window.psychGame = {
  interact: () => interaction.interact(),
  interactAt: (x, y) => interaction.interactAt(x, y),
  getPlayerCode: () => session.getPlayerCode()
};

const clock = new THREE.Clock();
function startRoom05(context={previousRoom:"ROOM_04"}) {
  if (gameFinished) return;
  if (activeRoom?.constructor?.name !== "Room04" || !activeRoom.completed) return;
  clearRoomGeometry();
  interaction.clearTargets?.();
  activeRoom = new Room05(scene, tracker);
  activeRoom.start({...context, companion});
  interaction.setRoom(activeRoom,5);
  audioManager.setRoom(5);
  companion?.say("اتاق پنجم... اینجا به چیزی که می‌بینی زود اعتماد نکن.");
}


function startRoom06(context={previousRoom:"ROOM_05"}) {
  if (gameFinished) return;
  if (activeRoom?.constructor?.name !== "Room05" || !activeRoom.completed) return;
  clearRoomGeometry(); interaction.clearTargets?.();
  activeRoom=new Room06(scene,tracker); activeRoom.start({...context,companion});
  interaction.setRoom(activeRoom,6);
  audioManager.setRoom(6);
  companion?.say("اتاق ششم... بعضی صداها آشنا به نظر می‌رسن، ولی به این حس زود اعتماد نکن.");
}

function startRoom07(context={previousRoom:"ROOM_06"}) {
  if (gameFinished) return;
  if (activeRoom?.constructor?.name !== "Room06" || !activeRoom.completed) return;
  clearRoomGeometry(); interaction.clearTargets?.();
  activeRoom=new Room07(scene,tracker); activeRoom.start({...context,companion});
  interaction.setRoom(activeRoom,7);
  audioManager.setRoom(7);
  companion?.say("اتاق هفتم... اینجا باید تصمیم بگیری به چه کسی اعتماد کنی.");
}

function startRoom08(context={previousRoom:"ROOM_07"}) {
  if (gameFinished) return;
  if (activeRoom?.constructor?.name !== "Room07" || !activeRoom.completed) return;
  clearRoomGeometry(); interaction.clearTargets?.();
  activeRoom=new Room08(scene,tracker); activeRoom.start({...context, ...behavioralHistory, companion});
  interaction.setRoom(activeRoom,8);
  audioManager.setRoom(8);
  companion?.say("اتاق آخر... اینجا فقط انتخاب‌هایی که کردی بهت برمی‌گردن.");
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (!gameFinished) {
    player.update(delta);
    activeRoom?.update?.(delta, player);
  }
  interaction.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function loadTrainingPlan() {
  try {
    const key = `psychgame_training_${session.getPlayerCode()}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function startRoom09(context = { previousRoom: "ROOM_08" }) {
  if (gameFinished || trainingFinished) return;
  const plan = loadTrainingPlan();
  if (!plan?.assignments?.length) {
    finishGameWithoutTraining();
    return;
  }

  clearRoomGeometry();
  interaction.clearTargets?.();
  activeRoom = new Room09(scene, tracker, plan);
  activeRoom.start(context);
  interaction.setRoom(activeRoom, 9);
  audioManager.setRoom(9);
  camera.position.set(0, 1.7, 3.5);
  player.rotation.set(0, 0, 0);
  camera.rotation.copy(player.rotation);
  mainLight.intensity = 20;
  companion?.say("مرحله تمرینی شروع شد.");
  document.getElementById("pg-title").textContent = "YOL · مرحله تمرینی ۰۱";
}

function finishGameWithoutTraining() {
  if (gameFinished) return;
  gameFinished = true;
  session.saveSession({ completed: true });
  session.uploadCompletedSession();
  clearRoomTransitionTimers();
  interaction.currentTarget = null;
  interaction.finishLook();
  const titleEl = document.getElementById("pg-title");
  const hintEl = document.getElementById("pg-hint");
  const targetEl = document.getElementById("pg-target");
  const interactButton = document.getElementById("pg-touch-interact");
  if (titleEl) titleEl.textContent = "YOL · پایان";
  if (hintEl) hintEl.textContent = "سفر تمام شد.";
  if (targetEl) targetEl.style.display = "none";
  if (interactButton) interactButton.style.display = "none";
  audioManager.playPulse("dark");
}

window.addEventListener("psychgame-training-room-complete", (event) => {
  const roomId = event.detail?.roomId;
  if (!roomId || trainingFinished) return;

  tracker.log("TRAINING_PHASE_ROOM_COMPLETED", {
    roomId,
    targetId: event.detail.targetId || null
  });

  if (roomId === "ROOM_10") {
    const plan = loadTrainingPlan();
    const hasAttentionTraining = Boolean(
      plan?.assignments?.some((item) => item.targetId === "ATTENTION_SUSTAIN")
    );

    if (hasAttentionTraining) {
      clearRoomGeometry();
      interaction.clearTargets?.();
      activeRoom = new Room11(scene, tracker, plan, companion);
      activeRoom.start({ previousRoom: "ROOM_10" });
      interaction.setRoom(activeRoom, 11);
      audioManager.setRoom(11);
      camera.position.set(0, 1.7, 3.5);
      player.rotation.set(0, 0, 0);
      camera.rotation.copy(player.rotation);
      mainLight.intensity = 20;
      companion?.say("مرحله بعدی؛ چند لحظه روی هدف اصلی تمرکز کن.");
      document.getElementById("pg-title").textContent = "YOL · مرحله تمرینی ۰۳";
      return;
    }
  }

  if (roomId === "ROOM_09") {
    const plan = loadTrainingPlan();
    const hasDecisionTraining = Boolean(
      plan?.assignments?.some((item) => item.targetId === "DECISION_COMMITMENT")
    );

    if (hasDecisionTraining) {
      clearRoomGeometry();
      interaction.clearTargets?.();
      activeRoom = new Room10(scene, tracker, plan, companion);
      activeRoom.start({ previousRoom: "ROOM_09", companion });
      interaction.setRoom(activeRoom, 10);
      audioManager.setRoom(10);
      camera.position.set(0, 1.7, 3.5);
      player.rotation.set(0, 0, 0);
      camera.rotation.copy(player.rotation);
      mainLight.intensity = 20;
      companion?.say("مرحله بعدی؛ این بار روی ثبات تصمیم تمرکز کن.");
      document.getElementById("pg-title").textContent = "YOL · مرحله تمرینی ۰۲";
      return;
    }
  }

  trainingFinished = true;
  finishGameWithoutTraining();
});

window.addEventListener("psychgame-game-complete",(event)=>{
  if(event.detail?.roomId!=="ROOM_08" || gameFinished)return;
  gameFinished = true;\n  session.saveSession({ completed: true });\n  session.uploadCompletedSession();
  clearRoomTransitionTimers();
  interaction.currentTarget = null;
  interaction.finishLook();
  const trainingPlan = loadTrainingPlan();
  if (trainingPlan?.assignments?.length) {
    gameFinished = false;
    startRoom09({ previousRoom: "ROOM_08" });
    return;
  }
  const titleEl=document.getElementById("pg-title");
  const hintEl=document.getElementById("pg-hint");
  const targetEl=document.getElementById("pg-target");
  const interactButton=document.getElementById("pg-touch-interact");
  if(titleEl)titleEl.textContent="YOL · پایان";
  if(hintEl)hintEl.textContent="سفر تمام شد.";
  if(targetEl)targetEl.style.display="none";
  if(interactButton)interactButton.style.display="none";
  audioManager.playPulse("dark");
});

window.addEventListener("psychgame-audio-pulse",(event)=>{
  audioManager.playPulse(event.detail?.type || "dark");
});

window.addEventListener("psychgame-room-complete",(event)=>{
  if (gameFinished) return;
  audioManager.playPulse("dark");
  const d=event.detail||{};
  if(d.roomId==="ROOM_04"){
    behavioralHistory.hallBehavior=d.behavior||{};
    startRoom05?.({previousRoom:"ROOM_04",companion});
  }
  if(d.roomId==="ROOM_05"){
    behavioralHistory.mirrorBehavior=d.behavior||{};
    startRoom06?.({previousRoom:"ROOM_05",companion});
  }
  if(d.roomId==="ROOM_06"){
    behavioralHistory.recordingBehavior=d.behavior||{};
    startRoom07?.({previousRoom:"ROOM_06",companion});
  }
  if(d.roomId==="ROOM_07"){
    behavioralHistory.trustBehavior=d.trustBehavior||{};
    startRoom08?.({previousRoom:"ROOM_07",companion});
  }
});
