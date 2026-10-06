import * as THREE from "three";

const KEY_LAYOUT = {
  2: { position:[1.12,0.43,1.38], clue:[3.55,1.48,-1.74], color:0x9f8455 },
  3: { position:[4.15,0.68,0.55], clue:[3.75,1.2,0.8], color:0xd0b16a },
  4: { position:[1.05,0.62,-18.2], clue:[1.08,1.18,-17.55], color:0xb58d52 },
  5: { position:[5.9,0.72,1.65], clue:[5.65,1.3,1.25], color:0xc4a05d },
  6: { position:[-5.7,0.7,1.55], clue:[-5.25,1.25,1.8], color:0xd2ad62 },
  7: { position:[5.55,0.7,2.45], clue:[5.2,1.25,2.1], color:0xc29b59 },
  8: { position:[6.35,0.7,-3.75], clue:[5.95,1.25,-3.35], color:0xd5b56d }
};

export function attachRoomKey(scene, tracker, roomNumber) {
  const cfg = KEY_LAYOUT[roomNumber];
  if (!cfg) return null;

  const group = new THREE.Group();
  group.position.set(...cfg.position);
  group.rotation.set(0.18, 0.35, -0.12);
  group.scale.setScalar(roomNumber === 2 ? 0.62 : 1.65);

  const metal = new THREE.MeshStandardMaterial({
    color: cfg.color, roughness: .24, metalness: .82,
    emissive: new THREE.Color(cfg.color), emissiveIntensity: roomNumber === 2 ? .055 : .18
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.13,.035,10,24), metal);
  ring.rotation.x = Math.PI / 2;
  const stem = new THREE.Mesh(new THREE.BoxGeometry(.42,.065,.075), metal);
  stem.position.x = .22;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(.10,.14,.075), metal);
  shoulder.position.set(.38,0,0);
  const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(.07,.13,.075), metal);
  tooth1.position.set(.45,-.055,0);
  const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(.07,.09,.075), metal);
  tooth2.position.set(.56,-.025,0);
  group.add(ring, stem, shoulder, tooth1, tooth2);
  group.userData.objectId = `ROOM_KEY_${String(roomNumber).padStart(2,"0")}`;
  group.userData.isRoomKey = true;
  group.userData.roomNumber = roomNumber;
  group.traverse(node => { if (node.isMesh) { node.castShadow=true; node.receiveShadow=true; } });
  scene.add(group);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(.26,.30,.18,24),
    new THREE.MeshStandardMaterial({color:0x5b5144,roughness:.72,metalness:.12})
  );
  pedestal.position.set(cfg.position[0],0.12,cfg.position[2]);
  scene.add(pedestal);

  const clue = new THREE.Mesh(
    new THREE.BoxGeometry(.32,.018,.2),
    new THREE.MeshStandardMaterial({ color:0x756347, roughness:.82, metalness:.05 })
  );
  clue.position.set(...cfg.clue);
  clue.scale.setScalar(1.35);
  clue.scale.setScalar(1.35);
  clue.userData.objectId = `KEY_CLUE_${String(roomNumber).padStart(2,"0")}`;
  clue.userData.isKeyClue = true;
  scene.add(clue);

  tracker.log("ROOM_KEY_PLACED", { roomId:`ROOM_${String(roomNumber).padStart(2,"0")}`, position:cfg.position });
  return { key:group, clue };
}
