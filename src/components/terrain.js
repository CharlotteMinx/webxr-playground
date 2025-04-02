import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

/**
 * Creates a low-poly terrain with grass and glowing elements
 * @returns {THREE.Group} The terrain group
 */
export function createTerrain() {
  const terrainGroup = new THREE.Group();
  
  // Create a simple flat terrain for debugging
  const groundGeometry = new THREE.PlaneGeometry(400, 400, 20, 20);
  
  // Create a material with texture for better depth perception
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b7d4e, // Green color
    flatShading: true, // Use flat shading for low-poly look
    roughness: 0.8,
    metalness: 0.1,
    wireframe: false
  });
  
  // Create the ground mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.receiveShadow = true; // Important for receiving shadows from trees
  ground.castShadow = false;
  terrainGroup.add(ground);
  
  // Add a grid helper for better depth perception
  const gridHelper = new THREE.GridHelper(400, 40, 0x000000, 0x000000);
  gridHelper.position.y = 0.01; // Slightly above ground to avoid z-fighting
  gridHelper.material.opacity = 0.2;
  gridHelper.material.transparent = true;
  terrainGroup.add(gridHelper);
  
  // Store reference to ground for collision detection
  terrainGroup.userData.ground = ground;
  
  // Store reference to fireflies for animation (empty group for now)
  const fireflies = new THREE.Group();
  fireflies.update = () => {}; // Empty update function
  terrainGroup.userData.fireflies = fireflies;
  
  return terrainGroup;
}

/**
 * Creates a low-poly plane geometry
 */
function createLowPolyPlane(width, height, widthSegments, heightSegments) {
  const geometry = new THREE.PlaneGeometry(
    width,
    height,
    widthSegments,
    heightSegments
  );
  
  // Randomize vertices slightly for more natural look
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    if (i % 9 === 0) { // Only modify certain vertices for low-poly look
      vertices[i] += (Math.random() - 0.5) * 0.5;
      vertices[i + 2] += (Math.random() - 0.5) * 0.5;
    }
  }
  
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Applies a height map to the geometry using simplex noise
 */
function applyHeightMap(geometry, intensity = 5) {
  const noise = new SimplexNoise();
  const vertices = geometry.attributes.position.array;
  
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const z = vertices[i + 2];
    
    // Apply noise at different frequencies for more natural terrain
    const noise1 = noise.noise(x * 0.01, z * 0.01) * 0.5;
    const noise2 = noise.noise(x * 0.05, z * 0.05) * 0.25;
    const noise3 = noise.noise(x * 0.2, z * 0.2) * 0.125;
    
    // Combine noise values and apply to y-coordinate
    vertices[i + 1] = (noise1 + noise2 + noise3) * intensity;
    
    // Create flat areas occasionally
    if (Math.random() > 0.97) {
      vertices[i + 1] *= 0.1;
    }
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Applies colors to the terrain vertices based on height and randomness
 */
function applyTerrainColors(geometry) {
  const positions = geometry.attributes.position.array;
  const colors = [];
  
  // Base colors
  const grassColor = new THREE.Color(0x3b7d4e); // Medium green
  const darkGrassColor = new THREE.Color(0x2d5d3b); // Dark green
  const dirtColor = new THREE.Color(0x8B4513); // Brown
  
  for (let i = 0; i < positions.length; i += 3) {
    const height = positions[i + 1];
    
    // Choose color based on height and randomness
    let color;
    if (height < 0) {
      // Mix dirt and dark grass for low areas
      color = dirtColor.clone().lerp(darkGrassColor, 0.3 + Math.random() * 0.3);
    } else if (height < 2) {
      // Regular grass with slight variation
      color = grassColor.clone();
      color.r += (Math.random() - 0.5) * 0.1;
      color.g += (Math.random() - 0.5) * 0.1;
      color.b += (Math.random() - 0.5) * 0.1;
    } else {
      // Lighter grass for higher areas
      color = grassColor.clone().lerp(new THREE.Color(0x7cad6d), Math.min(1, (height - 2) / 3));
    }
    
    colors.push(color.r, color.g, color.b);
  }
  
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

/**
 * Adds grass patches to the terrain (optimized for performance)
 */
function addGrassPatches(terrainGroup, ground) {
  const grassCount = 800; // Increased count for better coverage
  
  // Create grass geometry (improved triangle with better shape)
  const grassGeometry = new THREE.BufferGeometry();
  const grassVertices = new Float32Array([
    -0.1, 0, 0.05,
    0.1, 0, 0.05,
    0, 0.5, 0,
    -0.1, 0, -0.05,
    0.1, 0, -0.05,
    0, 0.5, 0
  ]);
  
  // Create faces for the grass blade (two triangles)
  const indices = new Uint16Array([
    0, 1, 2, // front face
    3, 5, 4  // back face
  ]);
  
  grassGeometry.setAttribute('position', new THREE.BufferAttribute(grassVertices, 3));
  grassGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
  grassGeometry.computeVertexNormals();
  
  // Create grass materials with different shades
  const grassMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x4caf50, flatShading: true }), // Medium green
    new THREE.MeshStandardMaterial({ color: 0x388e3c, flatShading: true }), // Dark green
    new THREE.MeshStandardMaterial({ color: 0x81c784, flatShading: true })  // Light green
  ];
  
  // Create grass instances and distribute them
  const groundVertices = ground.geometry.attributes.position.array;
  const groundVertexCount = groundVertices.length / 3;
  
  for (let i = 0; i < grassCount; i++) {
    // Get a random vertex from the ground
    const randomIndex = Math.floor(Math.random() * groundVertexCount) * 3;
    const x = groundVertices[randomIndex];
    const y = groundVertices[randomIndex + 1];
    const z = groundVertices[randomIndex + 2];
    
    // Create grass blade
    const grassMaterial = grassMaterials[Math.floor(Math.random() * grassMaterials.length)];
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    
    // Position grass on the terrain
    grass.position.set(x, y, z);
    
    // Rotate grass randomly
    grass.rotation.y = Math.random() * Math.PI * 2;
    
    // Add slight random tilt
    grass.rotation.x = (Math.random() - 0.5) * 0.2;
    grass.rotation.z = (Math.random() - 0.5) * 0.2;
    
    // Scale grass randomly
    const scale = 0.2 + Math.random() * 0.3;
    grass.scale.set(scale, scale, scale);
    
    // Apply ground rotation to grass
    grass.rotation.x -= Math.PI / 2; // Adjust for ground rotation
    
    // Add to terrain group
    terrainGroup.add(grass);
  }
}

/**
 * Adds glowing elements to the terrain for bloom effect
 */
function addGlowingElements(terrainGroup, ground) {
  const noise = new SimplexNoise();
  
  // Create glowing mushrooms
  addGlowingMushrooms(terrainGroup, ground, noise);
  
  // Create glowing crystals
  addGlowingCrystals(terrainGroup, ground, noise);
  
  // Create fireflies
  addFireflies(terrainGroup, ground, noise);
}

/**
 * Adds glowing mushrooms to the terrain
 */
function addGlowingMushrooms(terrainGroup, ground, noise) {
  const mushroomCount = 50; // Increased count for better distribution
  const groundVertices = ground.geometry.attributes.position.array;
  const groundVertexCount = groundVertices.length / 3;
  
  // Create mushroom materials
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.7,
    metalness: 0.2
  });
  
  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    emissive: 0x4477ff,
    emissiveIntensity: 0.8,
    roughness: 0.5,
    metalness: 0.3
  });
  
  for (let i = 0; i < mushroomCount; i++) {
    // Get a random vertex from the ground
    const randomIndex = Math.floor(Math.random() * groundVertexCount) * 3;
    const x = groundVertices[randomIndex];
    const y = groundVertices[randomIndex + 1];
    const z = groundVertices[randomIndex + 2];
    
    // Create mushroom group
    const mushroom = new THREE.Group();
    
    // Create stem
    const stemHeight = 0.2 + Math.random() * 0.3;
    const stemRadius = 0.05 + Math.random() * 0.05;
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.8, stemRadius, stemHeight, 8, 1
    );
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = stemHeight / 2;
    mushroom.add(stem);
    
    // Create cap
    const capRadius = stemRadius * (2 + Math.random());
    const capGeometry = new THREE.SphereGeometry(capRadius, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = stemHeight;
    cap.scale.y = 0.7;
    
    // Add cap to bloom layer
    cap.layers.enable(1);
    
    mushroom.add(cap);
    
    // Position mushroom on terrain
    mushroom.position.set(x, y, z);
    
    // Apply ground rotation
    mushroom.rotation.x = -Math.PI / 2;
    
    // Add to terrain group
    terrainGroup.add(mushroom);
  }
}

/**
 * Adds glowing crystals to the terrain
 */
function addGlowingCrystals(terrainGroup, ground, noise) {
  const crystalCount = 25; // Increased count for better distribution
  const groundVertices = ground.geometry.attributes.position.array;
  const groundVertexCount = groundVertices.length / 3;
  
  // Create crystal materials with different colors
  const crystalMaterials = [
    new THREE.MeshStandardMaterial({
      color: 0xff77aa,
      emissive: 0xff2277,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    }),
    new THREE.MeshStandardMaterial({
      color: 0x77ffaa,
      emissive: 0x22ff77,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    }),
    new THREE.MeshStandardMaterial({
      color: 0x77aaff,
      emissive: 0x2277ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    })
  ];
  
  for (let i = 0; i < crystalCount; i++) {
    // Get a random vertex from the ground
    const randomIndex = Math.floor(Math.random() * groundVertexCount) * 3;
    const x = groundVertices[randomIndex];
    const y = groundVertices[randomIndex + 1];
    const z = groundVertices[randomIndex + 2];
    
    // Create crystal group
    const crystal = new THREE.Group();
    
    // Create 2-4 crystal shards
    const shardCount = 2 + Math.floor(Math.random() * 3);
    
    for (let j = 0; j < shardCount; j++) {
      // Create crystal shard
      const height = 0.3 + Math.random() * 0.7;
      const radius = 0.05 + Math.random() * 0.1;
      
      // Use cone geometry for crystal shard
      const shardGeometry = new THREE.ConeGeometry(radius, height, 5, 1);
      
      // Select random material
      const material = crystalMaterials[Math.floor(Math.random() * crystalMaterials.length)];
      const shard = new THREE.Mesh(shardGeometry, material);
      
      // Position shard within crystal group
      const angle = (j / shardCount) * Math.PI * 2;
      const distance = 0.1 * Math.random();
      shard.position.set(
        Math.cos(angle) * distance,
        height / 2,
        Math.sin(angle) * distance
      );
      
      // Random rotation
      shard.rotation.x = (Math.random() - 0.5) * 0.3;
      shard.rotation.z = (Math.random() - 0.5) * 0.3;
      
      // Add to bloom layer
      shard.layers.enable(1);
      
      crystal.add(shard);
    }
    
    // Position crystal on terrain
    crystal.position.set(x, y, z);
    
    // Apply ground rotation
    crystal.rotation.x = -Math.PI / 2;
    
    // Add to terrain group
    terrainGroup.add(crystal);
  }
}

/**
 * Adds fireflies (small glowing particles) to the terrain
 */
function addFireflies(terrainGroup, ground, noise) {
  const fireflyCount = 150; // Increased count for better effect
  
  // Create firefly material (use MeshStandardMaterial for emissive properties)
  const fireflyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff77,
    emissive: 0xffff00,
    emissiveIntensity: 1.0,
    roughness: 0.3,
    metalness: 0.2
  });
  
  // Create firefly geometry (small sphere)
  const fireflyGeometry = new THREE.SphereGeometry(0.05, 4, 4);
  
  // Create firefly group
  const fireflies = new THREE.Group();
  
  for (let i = 0; i < fireflyCount; i++) {
    // Create firefly
    const firefly = new THREE.Mesh(fireflyGeometry, fireflyMaterial);
    
    // Position randomly in the scene
    const radius = 40 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    const height = 0.5 + Math.random() * 5;
    
    firefly.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    
    // Add to bloom layer
    firefly.layers.enable(1);
    
    // Store original position for animation
    firefly.userData.originalY = firefly.position.y;
    firefly.userData.originalX = firefly.position.x;
    firefly.userData.originalZ = firefly.position.z;
    firefly.userData.speed = 0.2 + Math.random() * 0.5;
    firefly.userData.phase = Math.random() * Math.PI * 2;
    
    // Add to fireflies group
    fireflies.add(firefly);
  }
  
  // Add animation function to the fireflies group
  fireflies.update = (delta) => {
    const time = Date.now() * 0.001;
    
    // Animate each firefly
    fireflies.children.forEach((firefly, index) => {
      // Gentle floating motion
      firefly.position.y = firefly.userData.originalY + 
                          Math.sin(time * firefly.userData.speed + firefly.userData.phase) * 0.5;
      
      // Gentle horizontal motion
      const horizontalPhase = firefly.userData.phase + index;
      firefly.position.x = firefly.userData.originalX + 
                          Math.sin(time * 0.2 + horizontalPhase) * 1.0;
      firefly.position.z = firefly.userData.originalZ + 
                          Math.cos(time * 0.2 + horizontalPhase) * 1.0;
      
      // Pulse the size slightly
      const scale = 0.8 + Math.sin(time * 2 + index) * 0.2;
      firefly.scale.set(scale, scale, scale);
    });
  };
  
  // Add fireflies to terrain group
  terrainGroup.add(fireflies);
  
  // Store reference to fireflies for animation
  terrainGroup.userData.fireflies = fireflies;
}
