import * as THREE from "three";
import { PlayerController } from "./player/PlayerController.js";
import { BehaviorTracker } from "./psychology/BehaviorTracker.js";
import { InteractionSystem } from "./interaction/InteractionSystem.js";
import { SessionManager } from "./session/SessionManager.js";

// =====================================
// PsychGame — Main Game Engine
// =====================================

const game = document.getElementById("game");

const scene = new THREE.Scene();

scene.background =
  new THREE.Color(0x080a0d);

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

scene.add(ambientLight);

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

scene.add(mainLight);

// =====================================
// Temporary Floor
// =====================================

const floorGeometry =
  new THREE.BoxGeometry(
    10,
    0.2,
    10
  );

const floorMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x302a26,
    roughness: 0.8
  });

const floor =
  new THREE.Mesh(
    floorGeometry,
    floorMaterial
  );

floor.position.y = -0.1;

floor.receiveShadow = true;

scene.add(floor);

// =====================================
// Systems
// =====================================

const tracker =
  new BehaviorTracker();

const session =
  new SessionManager();

const player =
  new PlayerController(
    camera
  );

const interaction =
  new InteractionSystem(
    camera,
    session.getTracker()
  );

// =====================================
// Player Session
// =====================================

console.log(
  "================================="
);

console.log(
  "PsychGame Session Started"
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
  "================================="
);

session
  .getTracker()
  .log(
    "GAME_START",
    {
      playerCode:
        session.getPlayerCode()
    }
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

  player.update(delta);

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
