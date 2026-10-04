import * as THREE from "three";
import { PlayerController } from "./player/PlayerController.js";
import { InteractionSystem } from "./interaction/InteractionSystem.js";
import { SessionManager } from "./session/SessionManager.js";
import { Room01 } from "./rooms/Room01.js";

// =====================================
// PsychGame — Main Game Engine
// =====================================

const game =
  document.getElementById("game");

const scene =
  new THREE.Scene();

scene.background =
  new THREE.Color(0x080a0d);

// =====================================
// Camera
// =====================================

const camera =
  new THREE.PerspectiveCamera(
    70,
    window.innerWidth /
      window.innerHeight,
    0.1,
    100
  );

camera.position.set(
  0,
  1.7,
  5
);

// =====================================
// Renderer
// =====================================

const renderer =
  new THREE.WebGLRenderer({
    antialias: true
  });

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    2
  )
);

game.appendChild(
  renderer.domElement
);

// =====================================
// Lighting
// =====================================

const ambientLight =
  new THREE.HemisphereLight(
    0x8899aa,
    0x111111,
    1.5
  );

scene.add(
  ambientLight
);

const mainLight =
  new THREE.PointLight(
    0xffd6a0,
    20,
    12
  );

mainLight.position.set(
  0,
  3,
  0
);

mainLight.castShadow = true;

scene.add(
  mainLight
);

// =====================================
// Session
// =====================================

const session =
  new SessionManager();

const tracker =
  session.getTracker();

// =====================================
// Player
// =====================================

const player =
  new PlayerController(
    camera
  );

// =====================================
// Interaction
// =====================================

const interaction =
  new InteractionSystem(
    camera,
    tracker,
    scene,
    mainLight
);

// =====================================
// Room 01
// =====================================

const room01 =
  new Room01(
    scene,
    tracker
  );

room01.start();

room01
  .getInteractableObjects()
  .forEach(
    (object) => {
      interaction.register(
        object,
        object.userData.objectId
      );
    }
  );

// =====================================
// Game Start
// =====================================

tracker.log(
  "GAME_START",
  {
    playerCode:
      session.getPlayerCode()
  }
);

// =====================================
// Debug / Author Console
// =====================================

window.psychGame =
  {
    session,
    tracker,

    getPlayerCode() {
      return session.getPlayerCode();
    },

    getEvents() {
      return tracker.getEvents();
    },

    getAnalysis() {
      return session.getAnalysis();
    },

    getReport() {
      return session.getSessionData();
    },

    exportSession() {
      return session.exportSession();
    }
  };

console.log(
  "================================="
);

console.log(
  "PsychGame Started"
);

console.log(
  "Player Code:",
  session.getPlayerCode()
);

console.log(
  "Session ID:",
  session.getSessionId()
);

console.log(
  "Author tools available:"
);

console.log(
  "psychGame.getAnalysis()"
);

console.log(
  "psychGame.getReport()"
);

console.log(
  "psychGame.getEvents()"
);

console.log(
  "================================="
);

// =====================================
// Game Loop
// =====================================

const clock =
  new THREE.Clock();

function animate() {
  requestAnimationFrame(
    animate
  );

  const delta =
    clock.getDelta();

  player.update(
    delta
  );

  interaction.update();

  renderer.render(
    scene,
    camera
  );
}

animate();

// =====================================
// Resize
// =====================================

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);
