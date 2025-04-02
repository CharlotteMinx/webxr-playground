import './style.css';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { createTerrain } from './components/terrain.js';
import { createSky } from './components/sky.js';
import { createTrees } from './components/trees.js';
import { setupDayNightCycle } from './components/dayNightCycle.js';
import { setupAudio } from './components/audio.js';
import { createPlayer } from './components/player.js';

// Main scene variables
let scene, camera, renderer, composer;
let terrain, sky;
let controllers = [];
let controllerGrips = [];
let player;
let clock = new THREE.Clock();
let dayNightCycle;
let bloomLayer;
let stats;

// Movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let playerVelocity = new THREE.Vector3();
let playerDirection = new THREE.Vector3();
let moveSpeed = 5.0; // Units per second

// Initialize the scene
function init() {
  // Create scene
  scene = new THREE.Scene();
  
  // Create camera with initial overview position
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 20, 30); // Set initial camera higher up for overview
  camera.lookAt(0, 0, 0); // Look at the center of the scene
  
  // Create renderer with basic settings
  renderer = new THREE.WebGLRenderer({ 
    antialias: true
  });
  
  // Use a lower pixel ratio for better performance
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Enable WebXR
  renderer.xr.enabled = true;
  
  // Enable shadows with optimized settings
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  document.body.appendChild(renderer.domElement);
  
  // Setup bloom layer
  bloomLayer = new THREE.Layers();
  bloomLayer.set(1);
  
  // Add VR button
  document.body.appendChild(VRButton.createButton(renderer));
  
  // Add stats for FPS monitoring
  stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
  
  // No post-processing for better stability
  
  // Add stronger ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);
  
  // Add bright directional light (sun) with optimized shadow settings
  const directionalLight = new THREE.DirectionalLight(0xffffcc, 2.5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  // Use smaller shadow maps for better performance
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  
  // Adjust shadow camera to cover more area
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  
  scene.add(directionalLight);
  
  // Add a secondary sun light for better illumination
  const secondarySunLight = new THREE.DirectionalLight(0xffffee, 1.5);
  secondarySunLight.position.set(-3, 8, -5);
  secondarySunLight.castShadow = false; // No shadows for better performance
  scene.add(secondarySunLight);
  
  // Add additional lights for better illumination
  addAdditionalLights();
  
  // Create environment components
  terrain = createTerrain();
  scene.add(terrain);
  
  sky = createSky();
  scene.add(sky);
  
  const trees = createTrees();
  scene.add(trees);
  
  // Store reference to sky for day-night cycle
  scene.userData.sky = sky;
  
  // Create player character
  player = createPlayer();
  scene.add(player.group);
  
  // Setup day-night cycle
  dayNightCycle = setupDayNightCycle(scene, directionalLight);
  
  // Setup audio
  setupAudio(camera);
  
  // Setup VR controllers
  setupControllers();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Add keyboard event listeners for testing
  window.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'KeyW': moveForward = true; break;
      case 'KeyS': moveBackward = true; break;
      case 'KeyA': moveLeft = true; break;
      case 'KeyD': moveRight = true; break;
    }
  });
  
  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'KeyW': moveForward = false; break;
      case 'KeyS': moveBackward = false; break;
      case 'KeyA': moveLeft = false; break;
      case 'KeyD': moveRight = false; break;
    }
  });
  
  // Start animation loop
  renderer.setAnimationLoop(animate);
  
  // Check WebXR support
  if (!navigator.xr) {
    showWebXRNotSupportedMessage();
  }
}

function enterVR() {
  // When entering VR, move camera to eye level position
  camera.position.set(0, 1.6, 0); // Set camera at human eye level (1.6m)
  camera.lookAt(0, 1.6, -1); // Look forward
  
  renderer.xr.getController(0);
  document.body.classList.add('vr-mode');
}

function showWebXRNotSupportedMessage() {
  const info = document.getElementById('info');
  info.innerHTML = '<h1>WebXR Not Supported</h1><p>Your browser does not support WebXR or no VR headset is connected.</p>';
}

function setupControllers() {
  // Controller model factory
  const controllerModelFactory = new XRControllerModelFactory();
  
  // Setup controllers
  for (let i = 0; i < 2; i++) {
    // Controller
    const controller = renderer.xr.getController(i);
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    controller.addEventListener('connected', (event) => {
      // Set controller data
      controller.userData.handedness = event.data.handedness;
      controller.userData.gamepad = event.data.gamepad;
    });
    controller.addEventListener('disconnected', () => {
      controller.userData.gamepad = null;
    });
    scene.add(controller);
    controllers.push(controller);
    
    // Controller grip
    const controllerGrip = renderer.xr.getControllerGrip(i);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    scene.add(controllerGrip);
    controllerGrips.push(controllerGrip);
  }
}

function onSelectStart(event) {
  const controller = event.target;
  controller.userData.isSelecting = true;
  // Handle controller selection start
}

function onSelectEnd(event) {
  const controller = event.target;
  controller.userData.isSelecting = false;
  // Handle controller selection end
}


function addAdditionalLights() {
  // Add a stronger warm fill light
  const fillLight = new THREE.PointLight(0xffcc77, 1.2);
  fillLight.position.set(-10, 15, 10);
  fillLight.castShadow = true;
  fillLight.shadow.mapSize.width = 512;
  fillLight.shadow.mapSize.height = 512;
  fillLight.distance = 50;
  fillLight.decay = 1.5;
  fillLight.layers.enable(1); // Add to bloom layer
  scene.add(fillLight);
  
  // Add a stronger cool rim light
  const rimLight = new THREE.PointLight(0x77ccff, 1.0);
  rimLight.position.set(10, 5, -10);
  rimLight.castShadow = false;
  rimLight.distance = 40;
  rimLight.decay = 1.5;
  rimLight.layers.enable(1); // Add to bloom layer
  scene.add(rimLight);
  
  // Add a brighter ground light
  const groundLight = new THREE.PointLight(0x33aa33, 0.8);
  groundLight.position.set(0, 0.1, 0);
  groundLight.distance = 30;
  groundLight.decay = 1.5;
  groundLight.castShadow = false;
  scene.add(groundLight);
  
  // Add a bright hemisphere light for overall illumination
  const hemisphereLight = new THREE.HemisphereLight(
    0xffffbb, // Sky color
    0x080820, // Ground color
    1.5       // Intensity
  );
  scene.add(hemisphereLight);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // Begin stats measurement
  stats.begin();
  
  const delta = clock.getDelta();
  
  // Update day-night cycle
  if (dayNightCycle) {
    dayNightCycle.update(delta);
  }
  
  // Update sky (clouds movement)
  if (sky) {
    sky.update(delta);
  }
  
  // Update fireflies animation
  if (terrain && terrain.userData.fireflies) {
    terrain.userData.fireflies.update(delta);
  }
  
  // Update controllers and player hands
  updateControllers(delta);
  
  // Update player hand positions based on controllers
  if (player && controllers.length > 0) {
    player.updateHands(controllerGrips);
  }
  
  // Update player movement
  updatePlayerMovement(delta);
  
  // Render scene with simple approach
  renderer.render(scene, camera);
  
  // End stats measurement
  stats.end();
}


/**
 * Updates controller input and handles joystick movement
 */
function updateControllers(delta) {
  // Check for connected gamepads
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  
  for (let i = 0; i < gamepads.length; i++) {
    const gamepad = gamepads[i];
    
    if (gamepad) {
      // Check if this gamepad has axes (joystick)
      if (gamepad.axes && gamepad.axes.length >= 2) {
        const axes = gamepad.axes;
        
        // Get joystick values (typically axes[0] is X, axes[1] is Y)
        const joystickX = axes[0]; // -1 (left) to 1 (right)
        const joystickY = axes[1]; // -1 (up) to 1 (down)
        
        // Apply deadzone to avoid drift
        const deadzone = 0.15;
        
        // Check joystick position and set movement flags
        if (Math.abs(joystickX) > deadzone) {
          if (joystickX < 0) moveLeft = true;
          if (joystickX > 0) moveRight = true;
        }
        
        if (Math.abs(joystickY) > deadzone) {
          if (joystickY < 0) moveForward = true;
          if (joystickY > 0) moveBackward = true;
        }
      }
    }
  }
}

/**
 * Updates player movement based on controller input
 */
function updatePlayerMovement(delta) {
  if (!player) return;
  
  // Reset velocity
  playerVelocity.set(0, 0, 0);
  
  // Get camera direction
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0; // Keep movement on the horizontal plane
  playerDirection.normalize();
  
  // Calculate forward/backward movement
  if (moveForward) {
    playerVelocity.add(playerDirection.clone().multiplyScalar(moveSpeed * delta));
  }
  if (moveBackward) {
    playerVelocity.add(playerDirection.clone().multiplyScalar(-moveSpeed * delta));
  }
  
  // Calculate left/right movement (perpendicular to forward direction)
  const rightDirection = new THREE.Vector3().crossVectors(playerDirection, new THREE.Vector3(0, 1, 0));
  
  if (moveRight) {
    playerVelocity.add(rightDirection.clone().multiplyScalar(moveSpeed * delta));
  }
  if (moveLeft) {
    playerVelocity.add(rightDirection.clone().multiplyScalar(-moveSpeed * delta));
  }
  
  // Apply movement to player and camera
  if (playerVelocity.lengthSq() > 0) {
    // Move player group
    player.group.position.add(playerVelocity);
    
    // Move camera with player
    camera.position.add(playerVelocity);
  }
}

// Initialize the application
init();
