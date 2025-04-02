import * as THREE from 'three';

/**
 * Creates a sky with moving clouds
 * @returns {Object} Sky object with mesh and update method
 */
export function createSky() {
  // Create a group to hold all sky elements
  const skyGroup = new THREE.Group();
  
  // Create the sky dome
  const skyDome = createSkyDome();
  skyGroup.add(skyDome);
  
  // Create clouds
  const clouds = createClouds();
  skyGroup.add(clouds);
  
  // Create sun
  const sun = createSun();
  skyGroup.add(sun);
  
  // Add update method to the skyGroup
  skyGroup.update = (delta) => {
    // Rotate clouds slowly
    clouds.rotation.y += delta * 0.02;
    
    // Move individual cloud parts for more dynamic effect
    clouds.children.forEach((cloud, index) => {
      cloud.position.x += Math.sin(Date.now() * 0.0001 + index) * delta * 0.05;
      cloud.position.z += Math.cos(Date.now() * 0.0001 + index * 0.7) * delta * 0.05;
    });
    
    // Store reference to sun for day-night cycle
    skyGroup.userData.sun = sun;
  };
  
  // Return the skyGroup with the update method
  return skyGroup;
}

/**
 * Creates a bright sun in the sky
 */
function createSun() {
  // Create sun group
  const sunGroup = new THREE.Group();
  
  // Create sun disc
  const sunGeometry = new THREE.CircleGeometry(15, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffdd,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  
  const sunDisc = new THREE.Mesh(sunGeometry, sunMaterial);
  
  // Position sun in the sky
  sunDisc.position.set(50, 100, -100);
  
  // Make sun always face the camera
  sunDisc.lookAt(0, 0, 0);
  
  // Add to bloom layer
  sunDisc.layers.enable(1);
  
  sunGroup.add(sunDisc);
  
  // Create sun glow
  const glowGeometry = new THREE.CircleGeometry(30, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffaa,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  
  const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  sunGlow.position.copy(sunDisc.position);
  sunGlow.lookAt(0, 0, 0);
  
  // Add to bloom layer
  sunGlow.layers.enable(1);
  
  sunGroup.add(sunGlow);
  
  // Create sun rays
  const rayCount = 8;
  const rayLength = 40;
  
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    
    const rayGeometry = new THREE.PlaneGeometry(rayLength, 2);
    const rayMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const ray = new THREE.Mesh(rayGeometry, rayMaterial);
    
    // Position ray around sun
    ray.position.copy(sunDisc.position);
    
    // Rotate ray around sun
    ray.lookAt(0, 0, 0);
    ray.rotateZ(angle);
    
    // Add to bloom layer
    ray.layers.enable(1);
    
    sunGroup.add(ray);
  }
  
  return sunGroup;
}

/**
 * Creates a sky dome with gradient
 */
function createSkyDome() {
  // Create a large sphere for the sky with reduced resolution for better performance
  const geometry = new THREE.SphereGeometry(500, 24, 16);
  
  // Invert the geometry so that the material renders on the inside
  geometry.scale(-1, 1, 1);
  
  // Create a shader material for the sky gradient
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `;
  
  // Create the shader material with brighter colors
  const uniforms = {
    topColor: { value: new THREE.Color(0x1a8cff) },     // Brighter sky blue
    bottomColor: { value: new THREE.Color(0xa6e6ff) },  // Brighter light blue
    offset: { value: 10 },
    exponent: { value: 0.5 }                           // Lower exponent for more gradual gradient
  };
  
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide
  });
  
  // Create the sky dome mesh
  return new THREE.Mesh(geometry, material);
}

/**
 * Creates low-poly clouds
 */
function createClouds() {
  const cloudsGroup = new THREE.Group();
  
  // Create cloud material with emissive properties
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xaaaaaa,
    emissiveIntensity: 0.1,
    flatShading: false,
    transparent: true,
    opacity: 0.9,
    roughness: 0.7,
    metalness: 0.1
  });
  
  // Create multiple clouds (reduced count for better performance)
  const cloudCount = 15;
  
  for (let i = 0; i < cloudCount; i++) {
    const cloud = createSingleCloud(cloudMaterial);
    
    // Position clouds randomly in the sky
    const radius = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.3 + Math.PI * 0.2;
    
    cloud.position.x = radius * Math.sin(phi) * Math.cos(theta);
    cloud.position.y = radius * Math.cos(phi) + 20;
    cloud.position.z = radius * Math.sin(phi) * Math.sin(theta);
    
    // Random rotation
    cloud.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    
    // Random scale
    const scale = 5 + Math.random() * 15;
    cloud.scale.set(scale, scale * 0.6, scale);
    
    cloudsGroup.add(cloud);
  }
  
  return cloudsGroup;
}

/**
 * Creates a single low-poly cloud with connected geometry
 */
function createSingleCloud(material) {
  const cloudGroup = new THREE.Group();
  
  // Create a main cloud body first (as a base)
  const mainCloudGeometry = new THREE.SphereGeometry(1.5, 8, 6);
  
  // Apply subtle randomization to maintain connected geometry
  const mainVertices = mainCloudGeometry.attributes.position.array;
  for (let j = 0; j < mainVertices.length; j += 3) {
    // Use smaller random values to avoid breaking the mesh
    mainVertices[j] += (Math.random() - 0.5) * 0.15;
    mainVertices[j + 1] += (Math.random() - 0.5) * 0.15;
    mainVertices[j + 2] += (Math.random() - 0.5) * 0.15;
  }
  
  mainCloudGeometry.computeVertexNormals();
  
  // Create the main cloud mesh
  const mainCloud = new THREE.Mesh(mainCloudGeometry, material);
  cloudGroup.add(mainCloud);
  
  // Create several "puffs" for each cloud
  const puffCount = 2 + Math.floor(Math.random() * 3); // Reduced count for better performance
  
  for (let i = 0; i < puffCount; i++) {
    // Create a sphere with more segments for better connectivity
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    
    // Apply subtle randomization to maintain connected geometry
    const vertices = geometry.attributes.position.array;
    for (let j = 0; j < vertices.length; j += 3) {
      // Use smaller random values to avoid breaking the mesh
      vertices[j] += (Math.random() - 0.5) * 0.1;
      vertices[j + 1] += (Math.random() - 0.5) * 0.1;
      vertices[j + 2] += (Math.random() - 0.5) * 0.1;
    }
    
    geometry.computeVertexNormals();
    
    // Create the puff mesh
    const puff = new THREE.Mesh(geometry, material);
    
    // Position puffs to form a cloud shape
    puff.position.x = (Math.random() - 0.5) * 2;
    puff.position.y = (Math.random() - 0.5) * 0.8;
    puff.position.z = (Math.random() - 0.5) * 2;
    
    // Random scale for each puff
    const scale = 0.8 + Math.random() * 0.5;
    puff.scale.set(scale, scale, scale);
    
    cloudGroup.add(puff);
  }
  
  return cloudGroup;
}
