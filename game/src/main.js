import * as THREE from "three";
import { PlayerController } from "./player/PlayerController.js";
import { InteractionSystem } from "./interaction/InteractionSystem.js";
import { SessionManager } from "./session/SessionManager.js";
import { SessionUploader } from "./session/SessionUploader.js";
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
import { PsychGameConfig } from "./config/PsychGameConfig.js";
import { Room09 } from "./rooms/Room09.js";
import { Room10 } from "./rooms/Room10.js";
import { Room11 } from "./rooms/Room11.js";
import { Room12 } from "./rooms/Room12.js";
import { Room13 } from "./rooms/Room13.js";
import { Room14 } from "./rooms/Room14.js";
import { Room15 } from "./rooms/Room15.js";
import { Room16 } from "./rooms/Room16.js";
import { Room17 } from "./rooms/Room17.js";
import { Room18 } from "./rooms/Room18.js";
import { Room19 } from "./rooms/Room19.js";
import { Room20 } from "./rooms/Room20.js";
import { getTrainingRoomForTarget } from "./training/TrainingTargets.js";

const browserSmoke = new URLSearchParams(window.location.search).has("browserSmoke");
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
renderer.setPixelRatio(browserSmoke ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = !browserSmoke;
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
let roomTransitionPending = false;

const roomTransitionOverlay = document.createElement("div");
roomTransitionOverlay.id = "pg-room-transition";
Object.assign(roomTransitionOverlay.style, {
  position: "fixed", inset: "0", zIndex: "15000", display: "grid", placeItems: "center",
  pointerEvents: "none", opacity: "0", background: "rgba(3,5,8,.96)",
  transition: "opacity 260ms ease", direction: "rtl", fontFamily: "Tahoma,Arial,sans-serif",
  color: "#fff"
});
roomTransitionOverlay.innerHTML = '<div id="pg-room-transition-label" style="padding:12px 18px;border-right:2px solid #a74b3c;font-size:15px;letter-spacing:.2px">در حال ورود به بخش بعدی…</div>';
document.body.appendChild(roomTransitionOverlay);
const roomTransitionLabel = roomTransitionOverlay.querySelector("#pg-room-transition-label");

function scheduleRoomTransition(callback, delay = 900) {
  if (roomTransitionPending) return null;
  roomTransitionPending = true;
  roomTransitionLabel.textContent = "در حال ورود به بخش بعدی…";
  roomTransitionOverlay.style.opacity = "1";
  const timer = setTimeout(() => {
    roomTransitionTimers.delete(timer);
    roomTransitionPending = false;
    if (gameFinished) {
      roomTransitionOverlay.style.opacity = "0";
      return;
    }
    try {
      callback();
      requestAnimationFrame(() => { roomTransitionOverlay.style.opacity = "0"; });
    } catch (error) {
      roomTransitionOverlay.style.opacity = "0";
      console.error("[PsychGame] room transition failed", error);
    }
  }, delay);
  roomTransitionTimers.add(timer);
  return timer;
}

function clearRoomTransitionTimers() {
  roomTransitionTimers.forEach((timer) => clearTimeout(timer));
  roomTransitionTimers.clear();
  roomTransitionPending = false;
  roomTransitionOverlay.style.opacity = "0";
}

room01.start();
setRoomMovementBounds(1);
interaction.setRoom(room01, 1);
audioManager.setRoom(1);
interaction.setCompanion(companion);

session.setConsent(false);
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

function showConsentGate() {
  if (!PsychGameConfig.dataCollectionEnabled) return;
  const overlay = document.createElement("div");
  overlay.id = "pg-consent";
  Object.assign(overlay.style, {
    position:"fixed", inset:"0", zIndex:"20000", display:"grid", placeItems:"center",
    padding:"20px", background:"rgba(3,5,8,.88)", backdropFilter:"blur(10px)",
    direction:"rtl", fontFamily:"Tahoma,Arial,sans-serif", color:"#fff"
  });
  overlay.innerHTML = `
    <div style="width:min(520px,92vw);padding:24px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(12,15,20,.96);box-shadow:0 20px 60px rgba(0,0,0,.45)">
      <div style="font-size:19px;font-weight:700;margin-bottom:12px">قبل از شروع</div>
      <div style="font-size:13px;line-height:1.9;color:rgba(255,255,255,.78)">
        این بازی برخی رویدادهای مربوط به نحوه بازی و انتخاب‌های شما را برای بررسی تخصصی ثبت می‌کند.
        این داده‌ها نتیجه روان‌شناختی یا تشخیص خودکار نیستند. با انتخاب «موافقم»، ثبت این داده‌ها را می‌پذیرید.
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-start;flex-wrap:wrap;margin-top:20px">
        <button id="pg-consent-accept" type="button" style="padding:11px 18px;border:0;border-radius:10px;background:#a74b3c;color:#fff;font:inherit;cursor:pointer">موافقم و شروع بازی</button>
        <button id="pg-consent-decline" type="button" style="padding:11px 18px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font:inherit;cursor:pointer">ادامه بدون ثبت رفتار</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = (accepted) => {
    session.setConsent(accepted);
    overlay.remove();
    if (accepted) tracker.log("CONSENT_GRANTED");
  };
  overlay.querySelector("#pg-consent-accept")?.addEventListener("click", () => close(true));
  overlay.querySelector("#pg-consent-decline")?.addEventListener("click", () => close(false));
}
showConsentGate();

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
  WAIT_CLOCK: "ساعت — صبر کن", WAIT_SEAT: "صندلی — بررسی کن", WAIT_EXIT: "در خروج — انتخاب کن",
  HALL_MARK: "علامت راهرو — بررسی کن", HALL_EXIT: "در انتهای راهرو — خروج",
  MIRROR_LEFT: "آینه چپ — بررسی کن", MIRROR_CENTER: "آینه وسط — بررسی کن", MIRROR_RIGHT: "آینه راست — بررسی کن", MIRROR_EXIT: "در خروج — باز کن",
  REC_FAMILIAR: "صدای آشنا — گوش بده", REC_UNKNOWN: "صدای ناشناس — گوش بده", REC_STATIC: "نویز — گوش بده", REC_EXIT: "در خروج — باز کن",
  FOLLOW_COMPANION: "اعتماد به همراه — انتخاب کن", GO_ALONE: "تنهایی — انتخاب کن", COMP_EXIT: "در خروج — باز کن",
  TRUTH_CORE: "هسته — بررسی کن", TRUTH_EXIT: "در خروج — پایان"
};
const targetNames = {
  RED_BUTTON: "دکمه قرمز", EXIT_DOOR: "در", HALF_OPEN_DRAWER: "کشو", KEY_FROM_DRAWER: "کلید طلایی", CLOSED_BOX: "جعبه", OLD_DESK: "میز قدیمی", BROKEN_CLOCK: "ساعت خراب", OLD_PAINTING: "تابلو",
  PATH_LEFT: "مسیر چپ", PATH_CENTER: "مسیر وسط", PATH_RIGHT: "مسیر راست", PATH_CLUE: "تابلو", WAIT_CLOCK: "ساعت", WAIT_SEAT: "صندلی", WAIT_EXIT: "در خروج", HALL_MARK: "علامت راهرو", HALL_EXIT: "در انتهای راهرو", MIRROR_LEFT: "آینه چپ", MIRROR_CENTER: "آینه وسط", MIRROR_RIGHT: "آینه راست", MIRROR_EXIT: "در خروج",
  REC_FAMILIAR: "صدای آشنا", REC_UNKNOWN: "صدای ناشناس", REC_STATIC: "نویز", REC_EXIT: "در خروج", FOLLOW_COMPANION: "اعتماد به همراه", GO_ALONE: "تنهایی", COMP_EXIT: "در خروج", TRUTH_CORE: "هسته", TRUTH_EXIT: "در خروج"
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

function setRoomMovementBounds(roomNumber) {
  const bounds = {
    1:{minX:-4.2,maxX:4.2,minZ:-4.2,maxZ:4.2}, 2:{minX:-5.0,maxX:5.0,minZ:-4.8,maxZ:4.8}, 3:{minX:-4.2,maxX:4.2,minZ:-4.2,maxZ:4.2},
    4:{minX:-1.45,maxX:1.45,minZ:-27.0,maxZ:6.5}, 5:{minX:-4.2,maxX:4.2,minZ:-4.2,maxZ:4.2}, 6:{minX:-4.2,maxX:4.2,minZ:-4.2,maxZ:4.2}, 7:{minX:-4.2,maxX:4.2,minZ:-4.2,maxZ:4.2}, 8:{minX:-4.2,maxX:4.2,minZ:-4.2,maxZ:4.2}
  };
  player.setBounds?.(bounds[roomNumber] || bounds[1]);
}

function startRoom02(previousPath = "ROOM_01") {
  if (activeRoom !== room01 || !room01.completed) return;
  clearRoomGeometry(); interaction.clearTargets?.(); activeRoom = new Room02(scene, tracker); activeRoom.start({ previousPath }); interaction.setRoom(activeRoom, 2); audioManager.setRoom(2); camera.position.set(0, 1.7, 3.5); camera.rotation.set(0, 0, 0); player.rotation.set(0, 0, 0); setRoomMovementBounds(2); mainLight.intensity = 24; companion?.say("اتاق دومه... سه تا مسیر جلوت داری. انتخاب کن ببین چی می‌شه.", 0, "tense"); document.getElementById("pg-title").textContent = "YOL · اتاق ۰۲ — چند مسیر";
}
window.addEventListener("psychgame-room-complete", (event) => { if (event.detail?.roomId !== "ROOM_01" || activeRoom !== room01 || !room01.completed) return; scheduleRoomTransition(() => startRoom02("ROOM_01")); });

function startRoom03(context = { previousPath: "ROOM_02" }) { if (interaction.roomNumber !== 2 || interaction.room !== activeRoom || !activeRoom.completed) return; clearRoomGeometry(); interaction.clearTargets?.(); activeRoom = new Room03(scene, tracker); activeRoom.start(context); interaction.setRoom(activeRoom, 3); audioManager.setRoom(3); camera.position.set(0, 1.7, 3.5); player.rotation.set(0, 0, 0); camera.rotation.copy(player.rotation); setRoomMovementBounds(3); mainLight.intensity = 22; companion?.say("اتاق سومه... اینجا عجله نکردن خودش یه انتخابه.", 0, "calm"); document.getElementById("pg-title").textContent = "YOL · اتاق ۰۳ — اتاق انتظار"; }
window.addEventListener("psychgame-room-complete", (event) => { if (event.detail?.roomId !== "ROOM_02" || interaction.roomNumber !== 2 || interaction.room !== activeRoom || !activeRoom.completed) return; scheduleRoomTransition(() => startRoom03({ previousPath: event.detail.path || "PATH_CENTER", wrongPaths: event.detail.wrongPaths || [], companion })); });

function startRoom04(context = { previousRoom: "ROOM_03" }) { if (interaction.roomNumber !== 3 || interaction.room !== activeRoom || !activeRoom.completed) return; clearRoomGeometry(); interaction.clearTargets?.(); activeRoom = new Room04(scene, tracker); activeRoom.start(context); interaction.setRoom(activeRoom, 4); audioManager.setRoom(4); camera.position.set(0,1.7,3.5); player.rotation.set(0,0,0); camera.rotation.copy(player.rotation); setRoomMovementBounds(4); mainLight.intensity=18; companion?.say("اتاق چهارمه... اگه راهرو دوباره تکرار شد، به چیزی که یادت میاد زود اعتماد نکن.", 0, "tense"); document.getElementById("pg-title").textContent="YOL · اتاق ۰۴ — راهروی بی‌انتها"; }
window.addEventListener("psychgame-room-complete", (event) => { if (event.detail?.roomId !== "ROOM_03" || interaction.roomNumber !== 3 || interaction.room !== activeRoom || !activeRoom.completed) return; scheduleRoomTransition(() => startRoom04({ previousRoom:"ROOM_03", companion })); });

window.psychGame = {
  interact: () => interaction.interact(),
  interactAt: (x, y) => interaction.interactAt(x, y),
  getPlayerCode: () => session.getPlayerCode(),
  ...(browserSmoke ? {
    interactObject: (objectId) => {
      const target = interaction.interactables.find((object) => object?.userData?.objectId === objectId);
      if (!target) return false;
      interaction.currentTarget = target;
      interaction.interact({ source: "BROWSER_SMOKE" });
      return true;
    }
  } : {})
};
if (browserSmoke) {
  window.psychGame.createSessionUploader = (options) => new SessionUploader(options);
}

const clock = new THREE.Clock();
function startRoom05(context={previousRoom:"ROOM_04"}) { if (gameFinished || interaction.roomNumber !== 4 || interaction.room !== activeRoom || !activeRoom.completed) return; clearRoomGeometry(); interaction.clearTargets?.(); activeRoom = new Room05(scene, tracker); activeRoom.start({...context, companion}); interaction.setRoom(activeRoom,5); audioManager.setRoom(5); setRoomMovementBounds(5); document.getElementById("pg-title").textContent="YOL · اتاق ۰۵ — اتاق آینه‌ها"; companion?.say("اتاق پنجمه... اینجا به چیزی که می‌بینی زود اعتماد نکن.", 0, "tense"); }
function startRoom06(context={previousRoom:"ROOM_05"}) { if (gameFinished || interaction.roomNumber !== 5 || interaction.room !== activeRoom || !activeRoom.completed) return; clearRoomGeometry(); interaction.clearTargets?.(); activeRoom=new Room06(scene,tracker); activeRoom.start({...context,companion}); interaction.setRoom(activeRoom,6); audioManager.setRoom(6); setRoomMovementBounds(6); document.getElementById("pg-title").textContent="YOL · اتاق ۰۶ — صداهای آشنا"; companion?.say("اتاق ششمه... بعضی صداها آشنا به نظر می‌رسن؛ ولی زود به این حس اعتماد نکن.", 0, "tense"); }
function startRoom07(context={previousRoom:"ROOM_06"}) { if (gameFinished || interaction.roomNumber !== 6 || interaction.room !== activeRoom || !activeRoom.completed) return; clearRoomGeometry(); interaction.clearTargets?.(); activeRoom=new Room07(scene,tracker); activeRoom.start({...context,companion}); interaction.setRoom(activeRoom,7); audioManager.setRoom(7); setRoomMovementBounds(7); document.getElementById("pg-title").textContent="YOL · اتاق ۰۷ — اعتماد"; companion?.say("اتاق هفتمه... اینجا باید تصمیم بگیری به کی اعتماد کنی.", 0, "tense"); }
function startRoom08(context={previousRoom:"ROOM_07"}) { if (gameFinished || interaction.roomNumber !== 7 || interaction.room !== activeRoom || !activeRoom.completed) return; clearRoomGeometry(); interaction.clearTargets?.(); activeRoom=new Room08(scene,tracker); activeRoom.start({...context, ...behavioralHistory, companion}); interaction.setRoom(activeRoom,8); audioManager.setRoom(8); setRoomMovementBounds(8); document.getElementById("pg-title").textContent="YOL · اتاق ۰۸ — حقیقت"; companion?.say("اتاق آخره... اینجا انتخاب‌هات دوباره برمی‌گردن سراغت.", 0, "tense"); }

function animate() { requestAnimationFrame(animate); const delta = clock.getDelta(); if (!gameFinished) { player.update(delta); activeRoom?.update?.(delta, player); } interaction.update(); renderer.render(scene, camera); }
animate();
window.addEventListener("resize", () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

function loadTrainingPlan() { try { const key = `psychgame_training_${session.getPlayerCode()}`; const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }

function getTrainingRouteTarget(plan) {
  const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];
  const runtime = loadTrainingRuntime();
  const compatibleRuntime = !runtime || !plan?.planId || runtime.planId === plan.planId;
  const runtimeAssignments = compatibleRuntime && Array.isArray(runtime?.assignments) ? runtime.assignments : [];
  const states = new Map(runtimeAssignments.filter(item => item?.targetId).map(item => [item.targetId, item]));
  return assignments.find(item => {
    const state = states.get(item.targetId);
    return !state || (!state.completed && !state.aborted && !state.exhausted);
  }) || null;
}

function startTrainingRoom(roomNumber, plan, previousRoom = null, targetId = null) {
  clearRoomGeometry(); interaction.clearTargets?.();
  const constructors = { 15: Room15, 16: Room16, 17: Room17, 18: Room18, 19: Room19, 20: Room20 };
  const safeRoomNumber = Number(roomNumber);
  const RoomClass = constructors[safeRoomNumber];
  if (!RoomClass || safeRoomNumber < 15 || safeRoomNumber > 20) return false;
  activeRoom = new RoomClass(scene, tracker, plan, companion);
  const selectedTargetId = targetId || getTrainingRouteTarget(plan)?.targetId || null; activeRoom.start({ previousRoom, targetId: selectedTargetId }); interaction.setRoom(activeRoom, safeRoomNumber); audioManager.setRoom(safeRoomNumber); camera.position.set(0, 1.7, 3.5); player.rotation.set(0, 0, 0); camera.rotation.copy(player.rotation); mainLight.intensity = 20;
  document.getElementById("pg-title").textContent = `YOL · مرحله تمرینی ${String(safeRoomNumber - 14).padStart(2, "0")}`;
  return true;
}

function continueTraining(previousRoom = null) {
  if (gameFinished || trainingFinished) return;
  const plan = loadTrainingPlan();
  if (!plan?.assignments?.length) { trainingFinished = true; finishGameWithoutTraining(); return; }
  const next = getTrainingRouteTarget(plan);
  if (!next) { startTrainingRoom(20, plan, previousRoom, null); return; }
  const roomNumber = getTrainingRoomForTarget(next.targetId);
  if (!roomNumber || roomNumber < 15 || roomNumber > 20) { trainingFinished = true; finishGameWithoutTraining(); return; }
  if (!startTrainingRoom(roomNumber, plan, previousRoom, next.targetId)) { trainingFinished = true; finishGameWithoutTraining(); return; }
  companion?.say("تمرین بعدی طبق برنامه‌ای که برات تعیین شده ادامه پیدا می‌کنه.", 0, "calm");
}
function startRoom09(context = { previousRoom: "ROOM_08" }) { continueTraining(context.previousRoom || "ROOM_08"); }

function loadTrainingRuntime() { try { const runtimeKey = `psychgame_training_runtime_${session.getPlayerCode()}`; const recoveryKey = `psychgame_training_recovery_${session.getPlayerCode()}`; const raw = sessionStorage.getItem(runtimeKey) || localStorage.getItem(recoveryKey); return raw ? JSON.parse(raw) : null; } catch (_) { return null; } }
function resumeTrainingIfNeeded() {
  if (gameFinished || trainingFinished) return false;
  const plan = loadTrainingPlan(); const runtime = loadTrainingRuntime(); const finalResult = session.getTrainingResult?.();
  if (!plan?.assignments?.length || finalResult) return false;
  if (plan.planId && runtime?.planId !== plan.planId) return false;
  const roomNumber = Number(runtime?.roomId); if (roomNumber < 15 || roomNumber > 20) return false;
  gameFinished = false; trainingFinished = false;
  const activeTarget = getTrainingRouteTarget(plan); const expectedRoom = activeTarget ? getTrainingRoomForTarget(activeTarget.targetId) : null;
  if (!activeTarget) { if (roomNumber !== 20) continueTraining(runtime?.roomId || null); else startTrainingRoom(20, plan, runtime?.roomId || null, null); companion?.say("تمرین قبلی برگشته... از همون مرحله ادامه می‌دیم.", 0, "calm"); return true; }
  const resumeRoom = expectedRoom || roomNumber; startTrainingRoom(resumeRoom, plan, runtime?.roomId || null, activeTarget.targetId); companion?.say("تمرین قبلی برگشته... از همون مرحله ادامه می‌دیم.", 0, "calm"); return true;
}
setTimeout(resumeTrainingIfNeeded, 0);

function finishGameWithoutTraining() {
  if (gameFinished) return;
  gameFinished = true; session.saveSession({ completed: true }); session.uploadCompletedSession(); clearRoomTransitionTimers(); interaction.currentTarget = null; interaction.finishLook();
  const titleEl = document.getElementById("pg-title"); const hintEl = document.getElementById("pg-hint"); const targetEl = document.getElementById("pg-target"); const interactButton = document.getElementById("pg-touch-interact");
  if (titleEl) titleEl.textContent = "YOL · پایان"; if (hintEl) hintEl.textContent = "سفر تمام شد."; if (targetEl) targetEl.style.display = "none"; if (interactButton) interactButton.style.display = "none"; audioManager.playPulse("dark");
}

window.addEventListener("psychgame-training-room-complete", (event) => {
  const roomId = event.detail?.roomId; if (!roomId || trainingFinished) return;
  const completedRoomNumber = Number(String(roomId).replace("ROOM_", ""));
  const expectedRoomClass = { 15: "Room15", 16: "Room16", 17: "Room17", 18: "Room18", 19: "Room19", 20: "Room20" }[completedRoomNumber];
  if (!expectedRoomClass || activeRoom?.constructor?.name !== expectedRoomClass || !activeRoom.completed || interaction.room !== activeRoom || interaction.roomNumber !== completedRoomNumber) return;
  tracker.log("TRAINING_PHASE_ROOM_COMPLETED", { roomId, targetId: event.detail.targetId || null });
  if (completedRoomNumber >= 15 && completedRoomNumber <= 19) { scheduleRoomTransition(() => continueTraining(roomId), 500); return; }
  if (roomId === "ROOM_20" && event.detail.final) { trainingFinished = true; gameFinished = true; clearRoomTransitionTimers(); interaction.currentTarget = null; interaction.finishLook(); const titleEl = document.getElementById("pg-title"); const hintEl = document.getElementById("pg-hint"); const targetEl = document.getElementById("pg-target"); const interactButton = document.getElementById("pg-touch-interact"); if (titleEl) titleEl.textContent = "YOL · پایان تمرین"; if (hintEl) hintEl.textContent = "مرحله تمرینی تمام شد."; if (targetEl) targetEl.style.display = "none"; if (interactButton) interactButton.style.display = "none"; audioManager.playPulse("dark"); }
});

window.addEventListener("psychgame-game-complete",(event)=>{ if(event.detail?.roomId!=="ROOM_08" || gameFinished)return; if(activeRoom?.constructor?.name!=="Room08" || !activeRoom.completed)return; if(interaction.room !== activeRoom || interaction.roomNumber !== 8)return; gameFinished = true; session.saveSession({ completed: true }); session.uploadCompletedSession(); clearRoomTransitionTimers(); interaction.currentTarget = null; interaction.finishLook(); const titleEl=document.getElementById("pg-title"); const hintEl=document.getElementById("pg-hint"); const targetEl=document.getElementById("pg-target"); const interactButton=document.getElementById("pg-touch-interact"); if(titleEl)titleEl.textContent="YOL · پایان"; if(hintEl)hintEl.textContent="سفر تمام شد."; if(targetEl)targetEl.style.display="none"; if(interactButton)interactButton.style.display="none"; audioManager.playPulse("dark"); });
window.addEventListener("psychgame-audio-pulse",(event)=>{ audioManager.playPulse(event.detail?.type || "dark"); });
window.addEventListener("psychgame-room-complete",(event)=>{
  if (gameFinished) return;
  const d=event.detail||{};
  const expectedRooms = { ROOM_04:"Room04", ROOM_05:"Room05", ROOM_06:"Room06", ROOM_07:"Room07" };
  if (expectedRooms[d.roomId] && (interaction.roomNumber !== Number(d.roomId.replace("ROOM_","")) || interaction.room !== activeRoom || !activeRoom.completed)) return;
  audioManager.playPulse("dark");
  if(d.roomId==="ROOM_04"){
    behavioralHistory.hallBehavior=d.behavior||{};
    scheduleRoomTransition(()=>startRoom05?.({previousRoom:"ROOM_04",companion}));
  }
  if(d.roomId==="ROOM_05"){
    behavioralHistory.mirrorBehavior=d.behavior||{};
    scheduleRoomTransition(()=>startRoom06?.({previousRoom:"ROOM_05",companion}));
  }
  if(d.roomId==="ROOM_06"){
    behavioralHistory.recordingBehavior=d.behavior||{};
    scheduleRoomTransition(()=>startRoom07?.({previousRoom:"ROOM_06",companion}));
  }
  if(d.roomId==="ROOM_07"){
    behavioralHistory.trustBehavior=d.trustBehavior||{};
    scheduleRoomTransition(()=>startRoom08?.({previousRoom:"ROOM_07",companion}));
  }
});
