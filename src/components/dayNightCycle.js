import * as THREE from 'three';

/**
 * Sets up the day-night cycle system
 * @param {THREE.Scene} scene - The scene to apply the day-night cycle to
 * @param {THREE.DirectionalLight} sunLight - The directional light representing the sun
 * @returns {Object} Day-night cycle controller with update method
 */
export function setupDayNightCycle(scene, sunLight) {
  // Day-night cycle parameters
  const cycleParams = {
    dayDuration: 240, // Full day-night cycle duration in seconds (slower)
    timeOfDay: 0.5,   // Starting time (0-1), 0.5 = noon (brightest)
    paused: false,
    
    // Sky colors
    daySkyTop: new THREE.Color(0x1a8cff),      // Day sky top color (brighter blue)
    daySkyBottom: new THREE.Color(0xa6e6ff),   // Day sky bottom color (brighter light blue)
    nightSkyTop: new THREE.Color(0x000033),    // Night sky top color (dark blue)
    nightSkyBottom: new THREE.Color(0x000066), // Night sky bottom color (slightly lighter dark blue)
    
    // Sun/moon light colors and intensities
    dayLightColor: new THREE.Color(0xffffcc),  // Sun light color (warm white)
    nightLightColor: new THREE.Color(0x3a3a6a), // Moon light color (bluish)
    dayLightIntensity: 2.5,                    // Sun light intensity (increased)
    nightLightIntensity: 0.5,                  // Moon light intensity (increased)
    
    // Ambient light parameters
    dayAmbientColor: new THREE.Color(0x606060),  // Day ambient color (brighter)
    nightAmbientColor: new THREE.Color(0x202040), // Night ambient color (brighter)
    dayAmbientIntensity: 1.5,                    // Day ambient intensity (increased)
    nightAmbientIntensity: 0.5                   // Night ambient intensity (increased)
  };
  
  // Create ambient light for the scene
  const ambientLight = new THREE.AmbientLight(cycleParams.dayAmbientColor, cycleParams.dayAmbientIntensity);
  scene.add(ambientLight);
  
  // Create moon light (opposite to sun)
  const moonLight = new THREE.DirectionalLight(cycleParams.nightLightColor, 0);
  moonLight.position.set(-1, 1, -1); // Opposite to sun
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
  scene.add(moonLight);
  
  // Find sky dome in the scene
  let skyDome = null;
  scene.traverse((object) => {
    if (object.isMesh && object.geometry instanceof THREE.SphereGeometry && 
        object.material instanceof THREE.ShaderMaterial) {
      skyDome = object;
    }
  });
  
  // Create stars (only visible at night)
  const stars = createStars();
  stars.visible = false; // Start with stars hidden during day
  scene.add(stars);
  
  // Day-night cycle controller
  return {
    // Update method called every frame
    update: (delta) => {
      if (cycleParams.paused) return;
      
      // Update time of day
      cycleParams.timeOfDay = (cycleParams.timeOfDay + delta / cycleParams.dayDuration) % 1.0;
      
      // Calculate sun position based on time of day
      updateSunPosition(sunLight, moonLight, cycleParams.timeOfDay);
      
      // Update lighting based on time of day
      updateLighting(sunLight, moonLight, ambientLight, cycleParams);
      
      // Update sky colors
      updateSkyColors(skyDome, cycleParams);
      
      // Update stars visibility
      updateStars(stars, cycleParams.timeOfDay);
    },
    
    // Method to get current time of day
    getTimeOfDay: () => cycleParams.timeOfDay,
    
    // Method to set time of day manually
    setTimeOfDay: (time) => {
      cycleParams.timeOfDay = time % 1.0;
    },
    
    // Method to pause/unpause the cycle
    togglePause: () => {
      cycleParams.paused = !cycleParams.paused;
      return cycleParams.paused;
    },
    
    // Method to set cycle speed
    setCycleSpeed: (durationInSeconds) => {
      if (durationInSeconds > 0) {
        cycleParams.dayDuration = durationInSeconds;
      }
    }
  };
}

/**
 * Updates the sun and moon positions based on time of day
 */
function updateSunPosition(sunLight, moonLight, timeOfDay) {
  // Calculate sun angle based on time of day (0-1)
  const sunAngle = timeOfDay * Math.PI * 2;
  
  // Calculate sun position
  const sunX = Math.cos(sunAngle);
  const sunY = Math.sin(sunAngle);
  
  // Position sun
  sunLight.position.set(sunX * 5, sunY * 10, 1);
  
  // Position moon opposite to sun
  moonLight.position.set(-sunX * 5, -sunY * 10, -1);
  
  // Update visual sun position if it exists
  if (sunLight.parent && sunLight.parent.userData && sunLight.parent.userData.sky && 
      sunLight.parent.userData.sky.userData && sunLight.parent.userData.sky.userData.sun) {
    
    const visualSun = sunLight.parent.userData.sky.userData.sun;
    
    // Calculate visual sun position (larger orbit)
    const radius = 300;
    const visualSunX = Math.cos(sunAngle) * radius;
    const visualSunY = Math.max(0, Math.sin(sunAngle) * radius); // Keep above horizon
    const visualSunZ = Math.sin(sunAngle + Math.PI * 0.5) * radius;
    
    // Update visual sun position
    visualSun.position.set(visualSunX, visualSunY, visualSunZ);
    
    // Make sun always face the camera
    visualSun.children.forEach(child => {
      child.lookAt(0, 0, 0);
    });
    
    // Adjust sun opacity based on height (fade out when setting)
    const sunHeight = Math.sin(sunAngle);
    const opacity = Math.max(0, Math.min(1, (sunHeight + 0.2) * 2));
    
    visualSun.children.forEach(child => {
      if (child.material) {
        child.material.opacity = opacity;
      }
    });
    
    // Only show sun during day
    visualSun.visible = sunHeight > -0.2;
  }
}

/**
 * Updates lighting based on time of day
 */
function updateLighting(sunLight, moonLight, ambientLight, params) {
  // Calculate day/night transition factors
  // Use a sine wave to smoothly transition between day and night
  const dayFactor = Math.max(0, Math.sin(params.timeOfDay * Math.PI * 2));
  const nightFactor = 1 - dayFactor;
  
  // Adjust sun light intensity and color
  sunLight.intensity = params.dayLightIntensity * dayFactor;
  sunLight.color.copy(params.dayLightColor);
  
  // Adjust moon light intensity and color
  moonLight.intensity = params.nightLightIntensity * nightFactor;
  moonLight.color.copy(params.nightLightColor);
  
  // Adjust ambient light
  ambientLight.intensity = (params.dayAmbientIntensity * dayFactor) + 
                          (params.nightAmbientIntensity * nightFactor);
  
  // Blend ambient light color between day and night
  ambientLight.color.copy(params.dayAmbientColor)
    .lerp(params.nightAmbientColor, nightFactor);
}

/**
 * Updates sky colors based on time of day
 */
function updateSkyColors(skyDome, params) {
  if (!skyDome) return;
  
  // Calculate day/night transition factor
  const dayFactor = Math.max(0, Math.sin(params.timeOfDay * Math.PI * 2));
  const nightFactor = 1 - dayFactor;
  
  // Get sky shader uniforms
  const uniforms = skyDome.material.uniforms;
  
  // Blend sky top color between day and night
  const topColor = new THREE.Color().copy(params.daySkyTop)
    .lerp(params.nightSkyTop, nightFactor);
  
  // Blend sky bottom color between day and night
  const bottomColor = new THREE.Color().copy(params.daySkyBottom)
    .lerp(params.nightSkyBottom, nightFactor);
  
  // Update shader uniforms
  if (uniforms.topColor) uniforms.topColor.value = topColor;
  if (uniforms.bottomColor) uniforms.bottomColor.value = bottomColor;
}

/**
 * Updates stars visibility based on time of day
 */
function updateStars(stars, timeOfDay) {
  if (!stars) return;
  
  // Calculate day/night transition factor
  const dayFactor = Math.max(0, Math.sin(timeOfDay * Math.PI * 2));
  
  // Show stars at night, hide during day
  stars.visible = dayFactor < 0.1;
  
  // Adjust stars opacity for smooth transition
  if (stars.material) {
    const opacity = Math.max(0, 0.1 - dayFactor) / 0.1;
    stars.material.opacity = opacity;
  }
}

/**
 * Creates a star field
 */
function createStars() {
  const starCount = 2000;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = [];
  const starColors = [];
  
  // Generate random star positions
  for (let i = 0; i < starCount; i++) {
    // Generate random position on a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 450; // Slightly inside the sky dome
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    starPositions.push(x, y, z);
    
    // Random star color (mostly white with some blue and yellow tints)
    const colorChoice = Math.random();
    if (colorChoice > 0.9) {
      // Bluish stars
      starColors.push(0.8, 0.8, 1);
    } else if (colorChoice > 0.8) {
      // Yellowish stars
      starColors.push(1, 1, 0.8);
    } else {
      // White stars with slight variations
      const brightness = 0.8 + Math.random() * 0.2;
      starColors.push(brightness, brightness, brightness);
    }
  }
  
  // Create star geometry
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  
  // Create star material
  const starMaterial = new THREE.PointsMaterial({
    size: 1.5,
    transparent: true,
    opacity: 0,
    vertexColors: true,
    sizeAttenuation: false
  });
  
  // Create star points
  return new THREE.Points(starGeometry, starMaterial);
}
