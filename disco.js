import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('c');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 0.18, 11.2);

const root = new THREE.Group();
scene.add(root);

const ballGroup = new THREE.Group();
root.add(ballGroup);

const sparkGroup = new THREE.Group();
ballGroup.add(sparkGroup);

/* studio reflections without a network fetch — the mirror tiles live off this */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
pmrem.dispose();

/* white studio light on green mirrors — tinted lights flatten the tile contrast */
scene.add(new THREE.AmbientLight(0x1c241e, 0.5));

const key = new THREE.DirectionalLight(0xffffff, 3.4);
key.position.set(-3.2, 5.8, 6.2);
scene.add(key);

const rim = new THREE.DirectionalLight(0xeaffef, 1.4);
rim.position.set(5, 0.5, -2);
scene.add(rim);

const fill = new THREE.PointLight(0xd9ffe4, 0.9, 20, 2);
fill.position.set(2.6, -2.2, 4.5);
scene.add(fill);

const sphereRadius = 2.35;
const tileLift = 0.012;

const coreSphere = new THREE.Mesh(
  new THREE.SphereGeometry(sphereRadius - 0.015, 96, 72),
  new THREE.MeshPhysicalMaterial({
    color: 0x061a0d,
    metalness: 0.1,
    roughness: 0.97,
  })
);
ballGroup.add(coreSphere);

/* ============================================================
   tiles — the reference ball lives on hard per-tile contrast:
   near-black forest green sitting next to blown-out silver-mint
   ============================================================ */

const hotDir = new THREE.Vector3(-0.45, 0.6, 0.66).normalize();

function tileColorFor(normal) {
  const c = new THREE.Color();
  const roll = Math.random();
  let h = 0.345 + Math.random() * 0.045;
  let s = 0.62 + Math.random() * 0.33;
  let l;

  if (roll < 0.16) {
    l = 0.07 + Math.random() * 0.13; // deep dark tiles
  } else if (roll > 0.93) {
    l = 0.7 + Math.random() * 0.22; // silver-mint flashes
    s = 0.25 + Math.random() * 0.3;
  } else {
    l = 0.24 + Math.random() * 0.3;
  }

  const vert = (normal.y + 1) / 2;
  l *= 0.42 + 0.72 * Math.pow(vert, 0.65); // shaded underside
  l += Math.pow(Math.max(0, normal.dot(hotDir)), 3) * 0.24; // hot zone upper-left
  c.setHSL(h, s, Math.min(0.95, l));
  return c;
}

const tileMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.12,
  envMapIntensity: 1.6,
});

const tileData = [];
let tilesMesh = null;

function buildTiles() {
  const baseGeometry = new THREE.BoxGeometry(1, 1, 0.1);
  const latBands = 24;
  const radius = sphereRadius + tileLift;
  const targetWidth = 0.32;

  const rows = [];
  let total = 0;

  for (let lat = 0; lat < latBands; lat += 1) {
    const v0 = lat / latBands;
    const v1 = (lat + 1) / latBands;
    const phiMid = (v0 + v1) * 0.5 * Math.PI - Math.PI / 2;
    const ringRadius = Math.max(0.04, Math.cos(phiMid) * radius);
    const circumference = Math.max(0.25, ringRadius * Math.PI * 2);
    const tileCount = Math.max(6, Math.round(circumference / targetWidth));
    rows.push({ lat, tileCount, v0, v1 });
    total += tileCount;
  }

  const tiles = new THREE.InstancedMesh(baseGeometry, tileMaterial, total);
  tiles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);

  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();

  let index = 0;
  for (const row of rows) {
    const latCenter = (row.v0 + row.v1) * 0.5;
    const phi = latCenter * Math.PI - Math.PI / 2;
    const bandHeight = Math.PI * radius / latBands;
    const tileHeight = bandHeight * 0.9;
    const ringRadius = Math.max(0.03, Math.cos(phi) * radius);
    const circumference = Math.max(0.2, ringRadius * Math.PI * 2);
    const tileWidth = circumference / row.tileCount;

    for (let i = 0; i < row.tileCount; i += 1) {
      /* half-tile brick stagger on alternate rows */
      const theta = (i / row.tileCount) * Math.PI * 2 + (row.lat % 2) * (Math.PI / row.tileCount);

      normal.set(
        Math.cos(theta) * Math.cos(phi),
        Math.sin(phi),
        Math.sin(theta) * Math.cos(phi)
      ).normalize();

      tangent.set(-Math.sin(theta), 0, Math.cos(theta)).normalize();
      bitangent.copy(normal).cross(tangent).normalize();

      quaternion.setFromRotationMatrix(matrix.makeBasis(tangent, bitangent, normal));
      position.copy(normal).multiplyScalar(radius + 0.014);
      scale.set(tileWidth * 0.9, tileHeight * 0.9, 0.11);

      matrix.compose(position, quaternion, scale);
      tiles.setMatrixAt(index, matrix);

      const baseColor = tileColorFor(normal);
      tiles.setColorAt(index, baseColor);

      tileData.push({
        index,
        position: position.clone(),
        normal: normal.clone(),
        baseColor,
      });

      index += 1;
    }
  }

  tiles.instanceMatrix.needsUpdate = true;
  tiles.instanceColor.needsUpdate = true;
  ballGroup.add(tiles);
  tilesMesh = tiles;
}

/* ============================================================
   logo — three circular arcs sharing a center below the mark,
   round caps, top arc longest/thickest, whole group tilted.
   mapped onto a curved shell so it wraps the ball like a decal
   ============================================================ */

const logoGroup = new THREE.Group();
scene.add(logoGroup);

function buildLogo() {
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = 1024;
  logoCanvas.height = 1024;
  const ctx = logoCanvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 1024);

  ctx.strokeStyle = '#060606';
  ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(512, 512);
  ctx.rotate(-0.1);

  const waves = [
    { cy: 560, r: 730, half: 0.47, w: 118 },
    { cy: 560, r: 585, half: 0.49, w: 104 },
    { cy: 560, r: 450, half: 0.51, w: 90 },
  ];

  for (const wv of waves) {
    ctx.beginPath();
    ctx.lineWidth = wv.w;
    ctx.arc(0, wv.cy, wv.r, -Math.PI / 2 - wv.half, -Math.PI / 2 + wv.half);
    ctx.stroke();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(logoCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const shellRadius = sphereRadius + 0.16;
  const span = 1.9; // radians of sphere the decal covers
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(
      shellRadius, 64, 64,
      Math.PI / 2 - span / 2, span,
      Math.PI / 2 - span / 2, span
    ),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  shell.renderOrder = 10;
  logoGroup.add(shell);
}

/* ============================================================
   flash — twinkling tiles + starburst glints on the rim
   ============================================================ */

function worldZ(normal) {
  const a = root.rotation.y;
  return Math.cos(a) * normal.z - Math.sin(a) * normal.x;
}

const WHITE = new THREE.Color(0xffffff);
const twinkleColor = new THREE.Color();
const twinkles = [];
let twinkleTimer = 0;
let nextTwinkle = 0.2;

function spawnTwinkle(time) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const tile = tileData[(Math.random() * tileData.length) | 0];
    if (worldZ(tile.normal) > 0.25) {
      twinkles.push({ tile, born: time, life: 0.25 + Math.random() * 0.35 });
      return;
    }
  }
}

function updateTwinkles(time) {
  if (!twinkles.length) return;
  for (let i = twinkles.length - 1; i >= 0; i -= 1) {
    const tw = twinkles[i];
    const t = (time - tw.born) / tw.life;
    if (t >= 1) {
      tilesMesh.setColorAt(tw.tile.index, tw.tile.baseColor);
      twinkles.splice(i, 1);
    } else {
      twinkleColor.copy(tw.tile.baseColor).lerp(WHITE, Math.sin(t * Math.PI));
      tilesMesh.setColorAt(tw.tile.index, twinkleColor);
    }
  }
  tilesMesh.instanceColor.needsUpdate = true;
}

function makeStarTexture() {
  const size = 256;
  const starCanvas = document.createElement('canvas');
  starCanvas.width = size;
  starCanvas.height = size;
  const ctx = starCanvas.getContext('2d');

  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(255,255,255,0.9)');
  glow.addColorStop(0.15, 'rgba(235,255,240,0.5)');
  glow.addColorStop(0.4, 'rgba(180,255,205,0.12)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(size / 2, size / 2);

  /* four long thin rays */
  for (let i = 0; i < 4; i += 1) {
    const len = i % 2 === 0 ? size * 0.48 : size * 0.3;
    const ray = ctx.createLinearGradient(0, -len, 0, len);
    ray.addColorStop(0, 'rgba(255,255,255,0)');
    ray.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    ray.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = ray;
    ctx.lineWidth = i % 2 === 0 ? 5 : 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(0, len);
    ctx.stroke();
    ctx.rotate(Math.PI / 4);
  }

  const texture = new THREE.CanvasTexture(starCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const starTexture = makeStarTexture();
const activeSparks = [];
let sparkleClock = 0;
let nextSpark = 1.2;

function spawnStarburst(time) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const tile = tileData[(Math.random() * tileData.length) | 0];
    const z = worldZ(tile.normal);
    /* rim glints live near the silhouette, like the reference */
    if (z > -0.05 && z < 0.35 && Math.abs(tile.normal.y) < 0.75) {
      const spark = new THREE.Sprite(new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      }));
      spark.position.copy(tile.position).addScaledVector(tile.normal, 0.12);
      spark.scale.setScalar(0.01);
      spark.userData = {
        born: time,
        life: 0.9 + Math.random() * 0.6,
        size: 0.7 + Math.random() * 0.5,
      };
      sparkGroup.add(spark);
      activeSparks.push(spark);
      return;
    }
  }
}

function updateSparks(time) {
  for (let i = activeSparks.length - 1; i >= 0; i -= 1) {
    const spark = activeSparks[i];
    const t = (time - spark.userData.born) / spark.userData.life;

    if (t >= 1) {
      sparkGroup.remove(spark);
      spark.material.dispose();
      activeSparks.splice(i, 1);
      continue;
    }

    const pulse = Math.sin(t * Math.PI);
    spark.scale.setScalar(spark.userData.size * pulse);
    spark.material.opacity = pulse;
    spark.material.rotation = time * 0.6;
  }
}

buildTiles();
buildLogo();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.65, 0.55);
composer.addPass(bloomPass);

const clock = new THREE.Clock();

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  bloomPass.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize, { passive: true });
resize();

let announced = false;
let startTime = null;

/* keeps the ball clear of the wordmark that sits below it in the overlay */
const BALL_SCALE = 0.76;
const BALL_LIFT = 1.05;

function animate() {
  const time = clock.elapsedTime;
  const delta = clock.getDelta();

  if (startTime === null) startTime = time;
  const entrance = Math.min(1, (time - startTime) / 0.7);
  const ease = 1 - Math.pow(1 - entrance, 3);
  root.scale.setScalar((0.55 + 0.45 * ease) * BALL_SCALE);

  root.rotation.y = time * (Math.PI * 2 / 12.5);
  root.rotation.x = Math.sin(time * 0.42) * 0.035;
  root.rotation.z = Math.cos(time * 0.31) * 0.022;
  root.position.y = BALL_LIFT + Math.sin(time * 0.8) * 0.07;

  /* logo stays camera-facing but rides the wobble so it feels glued on */
  logoGroup.scale.copy(root.scale);
  logoGroup.rotation.x = root.rotation.x;
  logoGroup.rotation.z = root.rotation.z;
  logoGroup.position.y = root.position.y;

  twinkleTimer += delta;
  if (twinkleTimer > nextTwinkle) {
    twinkleTimer = 0;
    nextTwinkle = 0.1 + Math.random() * 0.22;
    spawnTwinkle(time);
  }

  sparkleClock += delta;
  if (sparkleClock > nextSpark) {
    sparkleClock = 0;
    nextSpark = 1.3 + Math.random() * 1.4;
    spawnStarburst(time);
  }

  updateTwinkles(time);
  updateSparks(time);
  composer.render();

  if (!announced) {
    announced = true;
    if (window.parent !== window) window.parent.postMessage('disco-ready', '*');
  }

  requestAnimationFrame(animate);
}

animate();
