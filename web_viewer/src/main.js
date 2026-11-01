import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import './style.css';

const canvas = document.querySelector('#scene-canvas');
const frame = document.querySelector('#viewer-frame');
const loadingState = document.querySelector('#loading-state');
const loadingMessage = document.querySelector('#loading-message');
const pointCount = document.querySelector('#point-count');
const rotateButton = document.querySelector('#rotate-button');
const resetButton = document.querySelector('#reset-button');
const downloadLink = document.querySelector('#download-link');
const pointCloudUrl = '/models/sparse_pc.ply';

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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.65;

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

const resizeObserver = new ResizeObserver(resizeViewer);
resizeObserver.observe(frame);
resizeViewer();

function showError(message) {
  loadingState.classList.add('is-error');
  loadingMessage.textContent = message;
  pointCount.textContent = 'Point cloud could not be loaded';
}

new PLYLoader().load(
  pointCloudUrl,
  (geometry) => {
    const positions = geometry.getAttribute('position');
    if (!positions || positions.count === 0) {
      geometry.dispose();
      showError('The point-cloud file contains no points.');
      return;
    }

    // Robust bounds keep a few reconstruction outliers from shrinking the scene.
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
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    camera.position.set(radius * 1.5, radius * 0.9, radius * 2.3);
    camera.near = Math.max(radius / 1000, 0.001);
    camera.far = Math.max(radius * 30, 100);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = Math.max(radius * 0.08, 0.05);
    controls.maxDistance = Math.max(radius * 12, 10);
    controls.update();

    pointCount.textContent = `${positions.count.toLocaleString()} points`;
    downloadLink.href = pointCloudUrl;
    loadingState.classList.add('is-hidden');
  },
  undefined,
  (error) => {
    console.error('Unable to load the Namma Space point cloud.', error);
    showError('Could not load the point cloud. Please refresh and try again.');
  },
);

rotateButton.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateButton.setAttribute('aria-pressed', String(controls.autoRotate));
});

resetButton.addEventListener('click', () => {
  controls.reset();
});

function animate() {
  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
