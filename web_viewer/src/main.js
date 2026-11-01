import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import './style.css';

const trainedViewerElement = document.querySelector('#trained-viewer');
const canvas = document.querySelector('#scene-canvas');
const frame = document.querySelector('#viewer-frame');
const minimapPanel = document.querySelector('#room-minimap-panel');
const minimapCanvas = document.querySelector('#room-minimap');
const minimapContext = minimapCanvas.getContext('2d');
const minimapPosition = document.querySelector('#minimap-position');
const loadingState = document.querySelector('#loading-state');
const loadingMessage = document.querySelector('#loading-message');
const pointCount = document.querySelector('#point-count');
const sceneDescription = document.querySelector('#scene-description');
const viewerTagLabel = document.querySelector('#viewer-tag-label');
const trainedModeButton = document.querySelector('#trained-mode');
const sparseModeButton = document.querySelector('#sparse-mode');
const resetButton = document.querySelector('#reset-button');
const fullscreenButton = document.querySelector('#fullscreen-button');
const downloadLink = document.querySelector('#download-link');
const viewerStatus = document.querySelector('#viewer-status');

const trainedModelUrl = '/models/drjohnson-splat-rgb.ply';
const sparseModelUrl = '/models/sparse_pc.ply';
const trainedSplatCount = 1_025_179;
let activeMode = 'trained';
let trainedLoaded = false;
let sparseLoaded = false;
let trainedFailed = false;
let sparseFailed = false;
let sparseGeometry;
let sparsePoints;
let gaussianViewer;
let trainedViewerPointerInside = false;
let navigationFrame = 0;
let lastNavigationTime = 0;
const pressedNavigationKeys = new Set();
const navigationSpeed = 1.5;
const roomBounds = { minX: -1.5, maxX: 1.5, minY: -1.5, maxY: 1.5 };
const minimapPadding = 18;
const minimapCloud = new Uint8Array(64 * 92);
const minimapCloudCanvas = document.createElement('canvas');
minimapCloudCanvas.width = minimapCanvas.width;
minimapCloudCanvas.height = minimapCanvas.height;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101714');

const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);
camera.position.set(7, 5, 9);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const sparseControls = new OrbitControls(camera, renderer.domElement);
sparseControls.enableDamping = true;
sparseControls.dampingFactor = 0.06;

function resizeViewer() {
  const { width, height } = frame.getBoundingClientRect();
  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function getMedianCenter(position) {
  const middle = Math.floor(position.count / 2);
  const values = [0, 1, 2].map((axis) => {
    const coordinates = new Float32Array(position.count);
    for (let i = 0; i < position.count; i += 1) {
      coordinates[i] = position.getComponent(i, axis);
    }
    coordinates.sort();
    return coordinates[middle];
  });
  return new THREE.Vector3(...values);
}

function getFitRadius(position) {
  const distances = new Float32Array(position.count);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    distances[i] = Math.sqrt(x * x + y * y + z * z);
  }
  distances.sort();
  return Math.max(distances[Math.floor((position.count - 1) * 0.995)], 0.01);
}

function getMinimapCoordinates(x, y) {
  const width = minimapCanvas.width - minimapPadding * 2;
  const height = minimapCanvas.height - minimapPadding * 2;
  const scale = Math.min(
    width / (roomBounds.maxX - roomBounds.minX),
    height / (roomBounds.maxY - roomBounds.minY),
  );
  const roomWidth = (roomBounds.maxX - roomBounds.minX) * scale;
  const roomHeight = (roomBounds.maxY - roomBounds.minY) * scale;
  const left = (minimapCanvas.width - roomWidth) / 2;
  const top = (minimapCanvas.height - roomHeight) / 2;
  return {
    x: left + (x - roomBounds.minX) * scale,
    y: top + (roomBounds.maxY - y) * scale,
  };
}

function drawMinimapBackground() {
  const context = minimapCloudCanvas.getContext('2d');
  const topLeft = getMinimapCoordinates(roomBounds.minX, roomBounds.maxY);
  const bottomRight = getMinimapCoordinates(roomBounds.maxX, roomBounds.minY);
  const cellWidth = (bottomRight.x - topLeft.x) / 64;
  const cellHeight = (bottomRight.y - topLeft.y) / 92;

  context.clearRect(0, 0, minimapCloudCanvas.width, minimapCloudCanvas.height);
  context.fillStyle = 'rgba(5, 11, 8, 0.84)';
  context.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

  for (let row = 0; row < 92; row += 1) {
    for (let column = 0; column < 64; column += 1) {
      const density = minimapCloud[row * 64 + column];
      if (!density) continue;

      context.fillStyle = `rgba(193, 228, 155, ${Math.min(0.52, 0.12 + density * 0.055)})`;
      context.fillRect(
        topLeft.x + column * cellWidth,
        topLeft.y + row * cellHeight,
        Math.max(cellWidth, 1),
        Math.max(cellHeight, 1),
      );
    }
  }

  context.beginPath();
  for (let row = 0; row < 92; row += 1) {
    for (let column = 0; column < 64; column += 1) {
      if (minimapCloud[row * 64 + column] < 2) continue;

      const left = topLeft.x + column * cellWidth;
      const right = left + cellWidth;
      const top = topLeft.y + row * cellHeight;
      const bottom = top + cellHeight;
      if (column === 0 || minimapCloud[row * 64 + column - 1] < 2) {
        context.moveTo(left, top);
        context.lineTo(left, bottom);
      }
      if (column === 63 || minimapCloud[row * 64 + column + 1] < 2) {
        context.moveTo(right, top);
        context.lineTo(right, bottom);
      }
      if (row === 0 || minimapCloud[(row - 1) * 64 + column] < 2) {
        context.moveTo(left, top);
        context.lineTo(right, top);
      }
      if (row === 91 || minimapCloud[(row + 1) * 64 + column] < 2) {
        context.moveTo(left, bottom);
        context.lineTo(right, bottom);
      }
    }
  }
  context.strokeStyle = 'rgba(238, 240, 233, 0.9)';
  context.lineWidth = 1.2;
  context.stroke();

  context.strokeStyle = 'rgba(232, 238, 224, 0.42)';
  context.lineWidth = 1.5;
  context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  context.strokeStyle = 'rgba(232, 238, 224, 0.14)';
  context.lineWidth = 1;
  for (let division = 1; division < 4; division += 1) {
    const x = topLeft.x + (bottomRight.x - topLeft.x) * division / 4;
    const y = topLeft.y + (bottomRight.y - topLeft.y) * division / 4;
    context.beginPath();
    context.moveTo(x, topLeft.y);
    context.lineTo(x, bottomRight.y);
    context.moveTo(topLeft.x, y);
    context.lineTo(bottomRight.x, y);
    context.stroke();
  }

  context.fillStyle = 'rgba(238, 240, 233, 0.72)';
  context.font = '9px Segoe UI, sans-serif';
  context.textAlign = 'center';
  context.fillText('N', (topLeft.x + bottomRight.x) / 2, topLeft.y - 6);
}

function buildMinimapCloud() {
  const mesh = gaussianViewer.splatMesh;
  const center = new THREE.Vector3();
  const splatCount = mesh.getSplatCount();
  const sampleCount = Math.min(20_000, splatCount);
  let seed = 0x9e3779b9;

  minimapCloud.fill(0);
  for (let sample = 0; sample < sampleCount; sample += 1) {
    seed = (1_664_525 * seed + 1_013_904_223) >>> 0;
    const index = Math.floor(seed / 4_294_967_296 * splatCount);
    mesh.getSplatCenter(index, center, true);
    if (
      center.x < roomBounds.minX || center.x > roomBounds.maxX
      || center.y < roomBounds.minY || center.y > roomBounds.maxY
    ) {
      continue;
    }

    const column = Math.min(63, Math.floor(
      (center.x - roomBounds.minX) / (roomBounds.maxX - roomBounds.minX) * 64,
    ));
    const row = Math.min(91, Math.floor(
      (roomBounds.maxY - center.y) / (roomBounds.maxY - roomBounds.minY) * 92,
    ));
    const cell = row * 64 + column;
    minimapCloud[cell] = Math.min(minimapCloud[cell] + 1, 255);
  }

  drawMinimapBackground();
}

function updateRoomMinimap() {
  if (!gaussianViewer || activeMode !== 'trained') return;

  const camera = gaussianViewer.camera;
  const position = getMinimapCoordinates(camera.position.x, camera.position.y);

  const context = minimapContext;
  context.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  context.drawImage(minimapCloudCanvas, 0, 0);

  const direction = camera.getWorldDirection(new THREE.Vector3());
  const angle = Math.atan2(direction.x, direction.y);
  context.save();
  context.translate(position.x, position.y);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(0, -8);
  context.lineTo(6, 6);
  context.lineTo(0, 3);
  context.lineTo(-6, 6);
  context.closePath();
  context.fillStyle = '#c1e49b';
  context.strokeStyle = '#101714';
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  context.restore();

  minimapPosition.textContent = `X ${camera.position.x.toFixed(1)} · Y ${camera.position.y.toFixed(1)}`;
}

function updateLoadingState() {
  const isLoaded = activeMode === 'trained' ? trainedLoaded : sparseLoaded;
  const hasFailed = activeMode === 'trained' ? trainedFailed : sparseFailed;

  if (isLoaded) {
    loadingState.classList.remove('is-error');
    loadingState.classList.add('is-hidden');
    return;
  }

  loadingState.classList.remove('is-hidden');
  if (hasFailed) {
    loadingState.classList.add('is-error');
    loadingMessage.textContent = activeMode === 'trained'
      ? 'Trained model could not be loaded. Try the COLMAP sparse view.'
      : 'Sparse point cloud could not be loaded.';
    return;
  }

  loadingState.classList.remove('is-error');
  loadingMessage.textContent = activeMode === 'trained'
    ? 'Loading trained Gaussian model…'
    : 'Loading COLMAP sparse cloud…';
}

function setMode(mode) {
  activeMode = mode;
  const showTrained = mode === 'trained';
  clearNavigationKeys();
  trainedViewerPointerInside = false;

  trainedViewerElement.classList.toggle('is-hidden', !showTrained);
  minimapPanel.classList.toggle('is-hidden', !showTrained);
  canvas.classList.toggle('is-hidden', showTrained);
  canvas.setAttribute('aria-hidden', String(showTrained));
  trainedModeButton.classList.toggle('is-active', showTrained);
  trainedModeButton.setAttribute('aria-selected', String(showTrained));
  sparseModeButton.classList.toggle('is-active', !showTrained);
  sparseModeButton.setAttribute('aria-selected', String(!showTrained));

  if (showTrained) {
    if (sparsePoints) scene.remove(sparsePoints);
    if (trainedLoaded) {
      gaussianViewer.start();
      updateRoomMinimap();
    }
    viewerTagLabel.textContent = 'NERFSTUDIO SPLATFACTO';
    sceneDescription.textContent = 'Nerfstudio Splatfacto · RGB Gaussian splats';
    pointCount.textContent = `${trainedSplatCount.toLocaleString()} Gaussian splats · step 29,999`;
    downloadLink.classList.add('is-hidden');
    downloadLink.setAttribute('aria-hidden', 'true');
  } else {
    if (gaussianViewer) gaussianViewer.stop();
    if (sparsePoints) scene.add(sparsePoints);
    viewerTagLabel.textContent = 'COLMAP SPARSE RECONSTRUCTION';
    sceneDescription.textContent = 'Photogrammetry · RGB point cloud';
    pointCount.textContent = sparseLoaded
      ? `${sparseGeometry.getAttribute('position').count.toLocaleString()} points`
      : 'COLMAP sparse cloud';
    downloadLink.href = sparseModelUrl;
    downloadLink.download = 'drjohnson-colmap-sparse.ply';
    downloadLink.classList.remove('is-hidden');
    downloadLink.setAttribute('aria-hidden', 'false');
  }

  updateLoadingState();
}

const resizeObserver = new ResizeObserver(resizeViewer);
resizeObserver.observe(frame);
resizeViewer();

gaussianViewer = new GaussianSplats3D.Viewer({
  rootElement: trainedViewerElement,
  cameraUp: [0, 0, 1],
  initialCameraPosition: [-0.53, -1.2, 0.88],
  initialCameraLookAt: [0.2, 0.8, 0.35],
  gpuAcceleratedSort: false,
  sharedMemoryForWorkers: false,
  halfPrecisionCovariancesOnGPU: true,
  integerBasedSort: false,
  sphericalHarmonicsDegree: 0,
});
gaussianViewer.controls?.stopListenToKeyEvents();
gaussianViewer.controls?.addEventListener('change', updateRoomMinimap);

gaussianViewer.addSplatScene(trainedModelUrl, {
  showLoadingUI: false,
  progressiveLoad: true,
  splatAlphaRemovalThreshold: 1,
}).then(() => {
  trainedLoaded = true;
  buildMinimapCloud();
  updateRoomMinimap();
  if (activeMode === 'trained') gaussianViewer.start();
  updateLoadingState();
  if (activeMode === 'trained') {
    pointCount.textContent = `${trainedSplatCount.toLocaleString()} Gaussian splats · step 29,999`;
  }
}).catch((error) => {
  console.error('Unable to load the Nerfstudio Gaussian splat.', error);
  trainedFailed = true;
  updateLoadingState();
});

new PLYLoader().load(
  sparseModelUrl,
  (geometry) => {
    const positions = geometry.getAttribute('position');
    if (!positions || positions.count === 0) {
      geometry.dispose();
      sparseFailed = true;
      updateLoadingState();
      return;
    }

    const center = getMedianCenter(positions);
    geometry.translate(-center.x, -center.y, -center.z);
    const radius = getFitRadius(geometry.getAttribute('position'));
    scene.fog = new THREE.Fog('#101714', radius * 3, radius * 8);

    const material = new THREE.PointsMaterial({
      size: Math.max(radius * 0.004, 0.012),
      sizeAttenuation: true,
      vertexColors: geometry.hasAttribute('color'),
      color: geometry.hasAttribute('color') ? 0xffffff : 0xb9c9b8,
      transparent: true,
      opacity: 0.96,
    });
    sparseGeometry = geometry;
    sparsePoints = new THREE.Points(sparseGeometry, material);
    if (activeMode === 'sparse') scene.add(sparsePoints);

    camera.position.set(radius * 1.5, radius * 0.9, radius * 2.3);
    camera.near = Math.max(radius / 1000, 0.001);
    camera.far = Math.max(radius * 30, 100);
    camera.updateProjectionMatrix();
    sparseControls.target.set(0, 0, 0);
    sparseControls.minDistance = Math.max(radius * 0.08, 0.05);
    sparseControls.maxDistance = Math.max(radius * 12, 10);
    sparseControls.update();

    sparseLoaded = true;
    if (activeMode === 'sparse') {
      pointCount.textContent = `${positions.count.toLocaleString()} points`;
    }
    updateLoadingState();
  },
  undefined,
  (error) => {
    console.error('Unable to load the COLMAP sparse point cloud.', error);
    sparseFailed = true;
    updateLoadingState();
  },
);

trainedModeButton.addEventListener('click', () => setMode('trained'));
sparseModeButton.addEventListener('click', () => setMode('sparse'));

resetButton.addEventListener('click', () => {
  const activeControls = activeMode === 'trained' ? gaussianViewer.controls : sparseControls;
  if (activeControls) {
    activeControls.reset();
    if (activeMode === 'trained') updateRoomMinimap();
  }
});

function updateFullscreenButton() {
  const isFullscreen = document.fullscreenElement === frame;
  fullscreenButton.textContent = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  fullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
  fullscreenButton.setAttribute(
    'aria-label',
    isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen',
  );
}

fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement === frame) {
      await document.exitFullscreen();
    } else {
      await frame.requestFullscreen();
    }
    viewerStatus.textContent = '';
  } catch (error) {
    console.error('Unable to change viewer fullscreen state.', error);
    viewerStatus.textContent = 'Fullscreen is unavailable in this browser.';
  }
});

document.addEventListener('fullscreenchange', updateFullscreenButton);
updateFullscreenButton();

function clearNavigationKeys() {
  pressedNavigationKeys.clear();
  lastNavigationTime = 0;
}

function moveTrainedCamera(timestamp) {
  if (
    activeMode !== 'trained'
    || !trainedLoaded
    || !trainedViewerPointerInside
    || pressedNavigationKeys.size === 0
  ) {
    navigationFrame = 0;
    lastNavigationTime = 0;
    return;
  }

  const camera = gaussianViewer.camera;
  const controls = gaussianViewer.controls;
  const deltaSeconds = lastNavigationTime
    ? Math.min((timestamp - lastNavigationTime) / 1000, 0.05)
    : 0;
  lastNavigationTime = timestamp;

  const forward = controls.target.clone().sub(camera.position);
  forward.z = 0;
  if (forward.lengthSq() > 0) forward.normalize();
  const right = forward.clone().cross(new THREE.Vector3(0, 0, 1)).normalize();
  const movement = new THREE.Vector3();

  if (pressedNavigationKeys.has('KeyW')) movement.add(forward);
  if (pressedNavigationKeys.has('KeyS')) movement.sub(forward);
  if (pressedNavigationKeys.has('KeyD')) movement.add(right);
  if (pressedNavigationKeys.has('KeyA')) movement.sub(right);

  if (movement.lengthSq() > 0 && deltaSeconds > 0) {
    movement.normalize().multiplyScalar(navigationSpeed * deltaSeconds);
    camera.position.add(movement);
    controls.target.add(movement);
    controls.update();
    updateRoomMinimap();
  }

  navigationFrame = requestAnimationFrame(moveTrainedCamera);
}

trainedViewerElement.addEventListener('pointerenter', () => {
  trainedViewerPointerInside = true;
});
trainedViewerElement.addEventListener('pointerleave', () => {
  trainedViewerPointerInside = false;
  clearNavigationKeys();
});

window.addEventListener('keydown', (event) => {
  if (
    activeMode !== 'trained'
    || !trainedLoaded
    || !trainedViewerPointerInside
    || !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)
    || event.target instanceof HTMLElement
      && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
  ) {
    return;
  }

  event.preventDefault();
  pressedNavigationKeys.add(event.code);
  if (!navigationFrame) navigationFrame = requestAnimationFrame(moveTrainedCamera);
});
window.addEventListener('keyup', (event) => {
  pressedNavigationKeys.delete(event.code);
});
window.addEventListener('blur', clearNavigationKeys);

function animate() {
  sparseControls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
setMode(activeMode);
