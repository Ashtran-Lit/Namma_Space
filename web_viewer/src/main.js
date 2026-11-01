import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import './style.css';

const trainedViewerElement = document.querySelector('#trained-viewer');
const canvas = document.querySelector('#scene-canvas');
const frame = document.querySelector('#viewer-frame');
const loadingState = document.querySelector('#loading-state');
const loadingMessage = document.querySelector('#loading-message');
const pointCount = document.querySelector('#point-count');
const sceneDescription = document.querySelector('#scene-description');
const viewerTagLabel = document.querySelector('#viewer-tag-label');
const trainedModeButton = document.querySelector('#trained-mode');
const sparseModeButton = document.querySelector('#sparse-mode');
const rotateButton = document.querySelector('#rotate-button');
const resetButton = document.querySelector('#reset-button');
const downloadLink = document.querySelector('#download-link');

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
sparseControls.autoRotate = false;
sparseControls.autoRotateSpeed = 0.65;

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

  trainedViewerElement.classList.toggle('is-hidden', !showTrained);
  canvas.classList.toggle('is-hidden', showTrained);
  canvas.setAttribute('aria-hidden', String(showTrained));
  trainedModeButton.classList.toggle('is-active', showTrained);
  trainedModeButton.setAttribute('aria-selected', String(showTrained));
  sparseModeButton.classList.toggle('is-active', !showTrained);
  sparseModeButton.setAttribute('aria-selected', String(!showTrained));

  if (showTrained) {
    if (sparsePoints) scene.remove(sparsePoints);
    if (trainedLoaded) gaussianViewer.start();
    sparseControls.autoRotate = false;
    viewerTagLabel.textContent = 'NERFSTUDIO SPLATFACTO';
    sceneDescription.textContent = 'Nerfstudio Splatfacto · RGB Gaussian splats';
    pointCount.textContent = `${trainedSplatCount.toLocaleString()} Gaussian splats · step 29,999`;
    downloadLink.href = trainedModelUrl;
    downloadLink.download = 'drjohnson-splatfacto.ply';
  } else {
    if (gaussianViewer) gaussianViewer.stop();
    if (sparsePoints) scene.add(sparsePoints);
    sparseControls.autoRotate = false;
    viewerTagLabel.textContent = 'COLMAP SPARSE RECONSTRUCTION';
    sceneDescription.textContent = 'Photogrammetry · RGB point cloud';
    pointCount.textContent = sparseLoaded
      ? `${sparseGeometry.getAttribute('position').count.toLocaleString()} points`
      : 'COLMAP sparse cloud';
    downloadLink.href = sparseModelUrl;
    downloadLink.download = 'drjohnson-colmap-sparse.ply';
  }

  rotateButton.setAttribute('aria-pressed', 'false');
  updateLoadingState();
}

const resizeObserver = new ResizeObserver(resizeViewer);
resizeObserver.observe(frame);
resizeViewer();

gaussianViewer = new GaussianSplats3D.Viewer({
  rootElement: trainedViewerElement,
  cameraUp: [0, 0, 1],
  initialCameraPosition: [-2.16, -3.72, 0.74],
  initialCameraLookAt: [-0.65, 0.5, 0.33],
  gpuAcceleratedSort: false,
  sharedMemoryForWorkers: false,
  halfPrecisionCovariancesOnGPU: true,
  integerBasedSort: false,
  sphericalHarmonicsDegree: 0,
});

gaussianViewer.addSplatScene(trainedModelUrl, {
  showLoadingUI: false,
  progressiveLoad: true,
  splatAlphaRemovalThreshold: 1,
}).then(() => {
  trainedLoaded = true;
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

rotateButton.addEventListener('click', () => {
  const activeControls = activeMode === 'trained' ? gaussianViewer.controls : sparseControls;
  if (!activeControls) return;
  activeControls.autoRotate = !activeControls.autoRotate;
  rotateButton.setAttribute('aria-pressed', String(activeControls.autoRotate));
});

resetButton.addEventListener('click', () => {
  const activeControls = activeMode === 'trained' ? gaussianViewer.controls : sparseControls;
  if (activeControls) activeControls.reset();
});

function animate() {
  sparseControls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
setMode(activeMode);
