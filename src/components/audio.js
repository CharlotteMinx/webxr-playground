import * as THREE from 'three';

// Audio sources
const AUDIO_FILES = {
  BIRDS: 'audio/birds.mp3',
  WIND: 'audio/wind.mp3',
  NIGHT: 'audio/night_ambience.mp3',
  FOOTSTEPS: 'audio/footsteps.mp3'
};

// Audio state
let audioListener;
let audioSources = {};
let dayNightState = 'day';

/**
 * Sets up audio for the VR experience
 * @param {THREE.Camera} camera - The camera to attach the audio listener to
 */
export function setupAudio(camera) {
  // Create audio listener
  audioListener = new THREE.AudioListener();
  camera.add(audioListener);
  
  // Create audio sources
  createAudioSources();
  
  // Create placeholder audio files
  createPlaceholderAudioFiles();
  
  // Start ambient audio
  playAmbientAudio();
}

/**
 * Creates audio sources for different sound effects
 */
function createAudioSources() {
  // Create bird sounds (positional)
  audioSources.birds = new THREE.PositionalAudio(audioListener);
  audioSources.birds.setRefDistance(20);
  audioSources.birds.setVolume(0.5);
  audioSources.birds.setLoop(true);
  
  // Create wind sounds (non-positional)
  audioSources.wind = new THREE.Audio(audioListener);
  audioSources.wind.setVolume(0.3);
  audioSources.wind.setLoop(true);
  
  // Create night ambience (non-positional)
  audioSources.night = new THREE.Audio(audioListener);
  audioSources.night.setVolume(0);  // Start with volume 0
  audioSources.night.setLoop(true);
  
  // Create footsteps (positional)
  audioSources.footsteps = new THREE.PositionalAudio(audioListener);
  audioSources.footsteps.setRefDistance(1);
  audioSources.footsteps.setVolume(0.7);
  audioSources.footsteps.setLoop(false);
}

/**
 * Creates placeholder audio files
 * In a real application, you would load actual audio files
 */
function createPlaceholderAudioFiles() {
  // Create audio loader
  const audioLoader = new THREE.AudioLoader();
  
  // Since we don't have actual audio files in this example,
  // we'll create empty audio buffers as placeholders
  
  // Create empty audio buffer for each sound
  const sampleRate = 44100;
  const duration = 2;  // 2 seconds
  const numChannels = 2;  // Stereo
  const length = sampleRate * duration;
  
  // Create empty buffer
  const buffer = audioListener.context.createBuffer(
    numChannels, length, sampleRate
  );
  
  // Assign buffer to audio sources
  Object.values(audioSources).forEach(source => {
    source.setBuffer(buffer);
  });
  
  // In a real application, you would load actual audio files like this:
  /*
  audioLoader.load(AUDIO_FILES.BIRDS, (buffer) => {
    audioSources.birds.setBuffer(buffer);
    audioSources.birds.play();
  });
  
  audioLoader.load(AUDIO_FILES.WIND, (buffer) => {
    audioSources.wind.setBuffer(buffer);
    audioSources.wind.play();
  });
  
  audioLoader.load(AUDIO_FILES.NIGHT, (buffer) => {
    audioSources.night.setBuffer(buffer);
    audioSources.night.play();
  });
  
  audioLoader.load(AUDIO_FILES.FOOTSTEPS, (buffer) => {
    audioSources.footsteps.setBuffer(buffer);
  });
  */
}

/**
 * Plays ambient audio based on time of day
 */
function playAmbientAudio() {
  // Start ambient sounds
  if (audioSources.birds.buffer) {
    audioSources.birds.play();
  }
  
  if (audioSources.wind.buffer) {
    audioSources.wind.play();
  }
  
  if (audioSources.night.buffer) {
    audioSources.night.play();
  }
}

/**
 * Updates audio based on time of day
 * @param {number} timeOfDay - Current time of day (0-1)
 */
export function updateAudioForTimeOfDay(timeOfDay) {
  if (!audioSources.birds || !audioSources.night) return;
  
  // Calculate day/night factor
  const dayFactor = Math.max(0, Math.sin(timeOfDay * Math.PI * 2));
  const nightFactor = 1 - dayFactor;
  
  // Determine if it's day or night
  const newState = dayFactor > 0.3 ? 'day' : 'night';
  
  // Adjust volumes based on time of day
  if (audioSources.birds.isPlaying) {
    audioSources.birds.setVolume(0.5 * dayFactor);
  }
  
  if (audioSources.night.isPlaying) {
    audioSources.night.setVolume(0.5 * nightFactor);
  }
  
  // Handle state transitions
  if (newState !== dayNightState) {
    dayNightState = newState;
    
    // Play transition sounds if needed
    if (dayNightState === 'day') {
      // Transition to day - could play morning birds sound
    } else {
      // Transition to night - could play owl sound
    }
  }
}

/**
 * Plays footstep sounds when moving
 * @param {boolean} isMoving - Whether the player is moving
 */
export function playFootstepSounds(isMoving) {
  if (!audioSources.footsteps || !audioSources.footsteps.buffer) return;
  
  if (isMoving && !audioSources.footsteps.isPlaying) {
    audioSources.footsteps.play();
  }
}

/**
 * Places bird sound sources in the scene
 * @param {THREE.Scene} scene - The scene to add bird sound sources to
 */
export function placeBirdSoundSources(scene) {
  if (!audioSources.birds) return;
  
  // Create multiple bird sound sources
  const birdCount = 10;
  
  for (let i = 0; i < birdCount; i++) {
    // Clone the bird sound
    const birdSound = audioSources.birds.clone();
    
    // Create an invisible object to hold the sound
    const soundObject = new THREE.Object3D();
    
    // Position randomly in the scene
    const radius = 20 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    const height = 5 + Math.random() * 10;
    
    soundObject.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    
    // Add sound to the object
    soundObject.add(birdSound);
    
    // Add to scene
    scene.add(soundObject);
  }
}

/**
 * Adjusts wind sound based on player elevation
 * @param {number} elevation - Player's current elevation
 */
export function adjustWindForElevation(elevation) {
  if (!audioSources.wind) return;
  
  // Increase wind volume with elevation
  const baseVolume = 0.3;
  const elevationFactor = Math.max(0, Math.min(1, elevation / 20));
  const windVolume = baseVolume + (elevationFactor * 0.4);
  
  audioSources.wind.setVolume(windVolume);
}

/**
 * Mutes or unmutes all audio
 * @param {boolean} muted - Whether audio should be muted
 */
export function setAudioMuted(muted) {
  if (!audioListener) return;
  
  audioListener.setMasterVolume(muted ? 0 : 1);
}
