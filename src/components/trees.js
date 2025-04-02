import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

// Tree models cache
let treeModels = null;
let treesLoaded = false;

/**
 * Creates procedurally generated trees
 * @returns {THREE.Group} The trees group
 */
export function createTrees() {
  const treesGroup = new THREE.Group();
  
  // Create trees using procedural generation
  createProceduralTrees(treesGroup);
  
  // Load GLTF tree models
  loadTreeModels(treesGroup);
  
  return treesGroup;
}

/**
 * Creates procedurally generated low-poly trees
 */
function createProceduralTrees(treesGroup) {
  const treeCount = 100; // Increased count for better coverage
  const noise = new SimplexNoise();
  
  // Create different tree types
  const treeTypes = [
    createPineTree,
    createBroadleafTree,
    createSimpleTree
  ];
  
  // Distribute trees using noise for natural clustering
  for (let i = 0; i < treeCount; i++) {
    // Use noise to determine position
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 150; // Increased radius for wider distribution
    
    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;
    
    // Add noise to position for more natural distribution
    const noiseValue = noise.noise(x * 0.02, z * 0.02);
    
    // Skip this position if noise value is below threshold (creates clearings)
    if (noiseValue < -0.3) continue;
    
    // Adjust position based on noise
    x += noiseValue * 10;
    z += noiseValue * 10;
    
    // Select tree type based on position and noise
    const treeTypeIndex = Math.floor((noiseValue + 1) * 1.5) % treeTypes.length;
    const createTreeFn = treeTypes[treeTypeIndex];
    
    // Create tree
    const tree = createTreeFn();
    
    // Position tree
    tree.position.set(x, 0, z);
    
    // Random rotation
    tree.rotation.y = Math.random() * Math.PI * 2;
    
    // Random scale variation
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale + Math.random() * 0.2, scale);
    
    // Add to trees group
    treesGroup.add(tree);
  }
}

/**
 * Creates a simple pine tree with glowing elements
 */
function createPineTree() {
  const treeGroup = new THREE.Group();
  
  // Create trunk with proper connected geometry and higher detail
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 12, 4, false);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    flatShading: false, // Use smooth shading for better appearance
    roughness: 0.9
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true; // Important for casting shadows
  trunk.receiveShadow = true;
  trunk.position.y = 1;
  treeGroup.add(trunk);
  
  // Create foliage (multiple cones for pine tree)
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5d3b,
    flatShading: true, // Use flat shading for low-poly look
    roughness: 0.8,
    side: THREE.DoubleSide // Ensure both sides are rendered
  });
  
  // Add some glowing pine cones
  addGlowingPineCones(treeGroup);
  
  // Add several layers of foliage
  const foliageLayers = 4;
  for (let i = 0; i < foliageLayers; i++) {
    const layerHeight = 1.5;
    const layerSize = 1.8 - (i * 0.3);
    
    // Use fewer segments but ensure they're properly connected
    const coneGeometry = new THREE.ConeGeometry(layerSize, layerHeight, 8, 1, false);
    const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
    cone.castShadow = true; // Important for casting shadows
    cone.receiveShadow = true;
    cone.position.y = 2 + (i * layerHeight * 0.7);
    
    // Apply subtle randomization to maintain connected geometry
    const vertices = cone.geometry.attributes.position.array;
    for (let j = 0; j < vertices.length; j += 3) {
      if (j > 9) { // Don't modify the tip vertex
        // Use smaller random values to avoid breaking the mesh
        vertices[j] += (Math.random() - 0.5) * 0.1;
        vertices[j + 2] += (Math.random() - 0.5) * 0.1;
      }
    }
    
    cone.geometry.computeVertexNormals();
    treeGroup.add(cone);
  }
  
  return treeGroup;
}

/**
 * Adds glowing pine cones to a pine tree
 */
function addGlowingPineCones(treeGroup) {
  const pineConesCount = 3 + Math.floor(Math.random() * 4);
  
  // Create pine cone material with emissive properties
  const pineConeGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffaa44,
    emissive: 0xff7700,
    emissiveIntensity: 0.5,
    roughness: 0.7,
    metalness: 0.3
  });
  
  for (let i = 0; i < pineConesCount; i++) {
    // Create pine cone geometry
    const pineConeSphereGeometry = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 8, 6);
    const pineCone = new THREE.Mesh(pineConeSphereGeometry, pineConeGlowMaterial);
    
    // Position pine cone on the tree
    const height = 1.5 + Math.random() * 2;
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 0.5;
    
    pineCone.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    
    // Add to bloom layer
    pineCone.layers.enable(1);
    
    // Add to tree group
    treeGroup.add(pineCone);
  }
}

/**
 * Creates a broadleaf tree with glowing elements
 */
function createBroadleafTree() {
  const treeGroup = new THREE.Group();
  
  // Add glowing fruit or flowers
  addGlowingFruits(treeGroup);
  
  // Create trunk with more segments for better connectivity and higher detail
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 3, 12, 5, false);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    flatShading: false, // Use smooth shading for better appearance
    roughness: 0.9
  });
  
  // Apply subtle randomization to maintain connected geometry
  const trunkVertices = trunkGeometry.attributes.position.array;
  for (let i = 0; i < trunkVertices.length; i += 3) {
    if (i > 18) { // Don't modify top and bottom center vertices
      // Use smaller random values to avoid breaking the mesh
      trunkVertices[i] += (Math.random() - 0.5) * 0.05;
      trunkVertices[i + 2] += (Math.random() - 0.5) * 0.05;
    }
  }
  
  trunkGeometry.computeVertexNormals();
  
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.position.y = 1.5;
  treeGroup.add(trunk);
  
  // Create foliage (sphere for broadleaf tree) with proper detail
  const foliageGeometry = new THREE.SphereGeometry(1.5, 12, 8);
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x4caf50,
    flatShading: true, // Use flat shading for low-poly look
    roughness: 0.8,
    side: THREE.DoubleSide // Ensure both sides are rendered
  });
  
  // Apply subtle randomization to maintain connected geometry
  const foliageVertices = foliageGeometry.attributes.position.array;
  for (let i = 0; i < foliageVertices.length; i += 3) {
    // Use smaller random values to avoid breaking the mesh
    foliageVertices[i] += (Math.random() - 0.5) * 0.15;
    foliageVertices[i + 1] += (Math.random() - 0.5) * 0.15;
    foliageVertices[i + 2] += (Math.random() - 0.5) * 0.15;
  }
  
  foliageGeometry.computeVertexNormals();
  
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.castShadow = true; // Important for casting shadows
  foliage.receiveShadow = true;
  foliage.position.y = 3.5;
  treeGroup.add(foliage);
  
  return treeGroup;
}

/**
 * Adds glowing fruits or flowers to a broadleaf tree
 */
function addGlowingFruits(treeGroup) {
  const fruitCount = 5 + Math.floor(Math.random() * 5);
  
  // Create fruit materials with different colors
  const fruitMaterials = [
    new THREE.MeshStandardMaterial({
      color: 0xff5555,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.2
    }),
    new THREE.MeshStandardMaterial({
      color: 0xffff55,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.2
    }),
    new THREE.MeshStandardMaterial({
      color: 0xff55ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.2
    })
  ];
  
  for (let i = 0; i < fruitCount; i++) {
    // Create fruit geometry
    const fruitGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.05, 8, 6);
    
    // Select random material
    const material = fruitMaterials[Math.floor(Math.random() * fruitMaterials.length)];
    const fruit = new THREE.Mesh(fruitGeometry, material);
    
    // Position fruit on the tree
    const height = 3 + Math.random() * 1.5;
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.8 + Math.random() * 0.7;
    
    fruit.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    
    // Add to bloom layer
    fruit.layers.enable(1);
    
    // Add to tree group
    treeGroup.add(fruit);
  }
}

/**
 * Creates a simple stylized tree with glowing elements
 */
function createSimpleTree() {
  const treeGroup = new THREE.Group();
  
  // Add glowing leaves
  addGlowingLeaves(treeGroup);
  
  // Create trunk with more segments for better connectivity and higher detail
  const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, 2.5, 12, 5, false);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    flatShading: false, // Use smooth shading for better appearance
    roughness: 0.9
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.position.y = 1.25;
  treeGroup.add(trunk);
  
  // Create foliage (multiple boxes for stylized look)
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x7cad6d,
    flatShading: false, // Use smooth shading for better appearance
    roughness: 0.8
  });
  
  // Create main foliage block with proper segments
  const mainFoliageGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5, 1, 1, 1);
  const mainFoliage = new THREE.Mesh(mainFoliageGeometry, foliageMaterial);
  mainFoliage.castShadow = true; // Important for casting shadows
  mainFoliage.receiveShadow = true;
  mainFoliage.position.y = 3;
  
  // Apply subtle randomization to maintain connected geometry
  const vertices = mainFoliage.geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    // Use smaller random values to avoid breaking the mesh
    vertices[i] += (Math.random() - 0.5) * 0.1;
    vertices[i + 1] += (Math.random() - 0.5) * 0.1;
    vertices[i + 2] += (Math.random() - 0.5) * 0.1;
  }
  
  mainFoliage.geometry.computeVertexNormals();
  treeGroup.add(mainFoliage);
  
  // Add smaller foliage blocks
  const smallBlockCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < smallBlockCount; i++) {
    const size = 0.7 + Math.random() * 0.5;
    // Use simpler geometry for better connectivity
    const blockGeometry = new THREE.BoxGeometry(size, size, size, 1, 1, 1);
    
    // Apply subtle randomization to maintain connected geometry
    const blockVertices = blockGeometry.attributes.position.array;
    for (let j = 0; j < blockVertices.length; j += 3) {
      // Use smaller random values to avoid breaking the mesh
      blockVertices[j] += (Math.random() - 0.5) * 0.1;
      blockVertices[j + 1] += (Math.random() - 0.5) * 0.1;
      blockVertices[j + 2] += (Math.random() - 0.5) * 0.1;
    }
    
    blockGeometry.computeVertexNormals();
    
    const block = new THREE.Mesh(blockGeometry, foliageMaterial);
    block.castShadow = true; // Important for casting shadows
    block.receiveShadow = true;
    
    // Position around main block
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.8 + Math.random() * 0.3;
    block.position.x = Math.cos(angle) * radius;
    block.position.z = Math.sin(angle) * radius;
    block.position.y = 3 + (Math.random() - 0.5) * 1;
    
    // Random rotation
    block.rotation.set(
      Math.random() * Math.PI * 0.2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 0.2
    );
    
    treeGroup.add(block);
  }
  
  return treeGroup;
}

/**
 * Loads GLTF tree models and adds them to the scene
 */
function loadTreeModels(treesGroup) {
  // Create a loader
  const loader = new GLTFLoader();
  
  // We'll simulate loading GLTF models by creating placeholder objects
  // In a real application, you would load actual models from files
  
  // Create placeholder models
  treeModels = [
    createGLTFTreePlaceholder(0x2d5d3b), // Dark green
    createGLTFTreePlaceholder(0x4caf50), // Medium green
    createGLTFTreePlaceholder(0x7cad6d)  // Light green
  ];
  
  // Place GLTF tree models
  placeGLTFTrees(treesGroup);
  
  // Mark trees as loaded
  treesLoaded = true;
}

/**
 * Creates a placeholder for GLTF tree models
 * In a real application, this would be replaced with actual model loading
 */
function createGLTFTreePlaceholder(color) {
  const treeGroup = new THREE.Group();
  
  // Create a more detailed tree as a placeholder
  // Trunk with more segments for better connectivity and higher detail
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 12, 6, false);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    flatShading: false, // Use smooth shading for better appearance
    roughness: 0.9
  });
  
  // Apply subtle randomization to maintain connected geometry
  const trunkVertices = trunkGeometry.attributes.position.array;
  for (let i = 0; i < trunkVertices.length; i += 3) {
    if (i > 18) { // Don't modify top and bottom center vertices
      // Use smaller random values to avoid breaking the mesh
      trunkVertices[i] += (Math.random() - 0.5) * 0.05;
      trunkVertices[i + 2] += (Math.random() - 0.5) * 0.05;
    }
  }
  
  trunkGeometry.computeVertexNormals();
  
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.position.y = 1;
  treeGroup.add(trunk);
  
  // Foliage - use multiple geometries for more detailed look
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: color,
    flatShading: false, // Use smooth shading for better appearance
    roughness: 0.8
  });
  
  // Create a single main foliage part first (as a base) with higher detail
  const mainFoliageGeometry = new THREE.SphereGeometry(1.2, 18, 14);
  const mainFoliage = new THREE.Mesh(mainFoliageGeometry, foliageMaterial);
  mainFoliage.position.y = 2.5;
  mainFoliage.castShadow = true; // Important for casting shadows
  mainFoliage.receiveShadow = true;
  treeGroup.add(mainFoliage);
  
  // Create additional foliage parts
  const foliageParts = 3 + Math.floor(Math.random() * 3); // Reduced count for better performance
  for (let i = 0; i < foliageParts; i++) {
    // Alternate between different geometry types with higher detail
    let geometry;
    const geometryType = i % 3;
    
    if (geometryType === 0) {
      geometry = new THREE.IcosahedronGeometry(0.7 + Math.random() * 0.3, 2); // Increased detail
    } else if (geometryType === 1) {
      geometry = new THREE.SphereGeometry(0.6 + Math.random() * 0.4, 12, 10); // Increased detail
    } else {
      geometry = new THREE.OctahedronGeometry(0.6 + Math.random() * 0.4, 2); // Increased detail
    }
    
    // Apply subtle randomization to maintain connected geometry
    const vertices = geometry.attributes.position.array;
    for (let j = 0; j < vertices.length; j += 3) {
      // Use smaller random values to avoid breaking the mesh
      vertices[j] += (Math.random() - 0.5) * 0.1;
      vertices[j + 1] += (Math.random() - 0.5) * 0.1;
      vertices[j + 2] += (Math.random() - 0.5) * 0.1;
    }
    
    geometry.computeVertexNormals();
    
    const foliagePart = new THREE.Mesh(geometry, foliageMaterial);
    foliagePart.castShadow = true; // Important for casting shadows
    foliagePart.receiveShadow = true;
    
    // Position foliage parts to form a tree shape
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 0.5;
    const height = 2 + Math.random() * 1.5;
    
    foliagePart.position.x = Math.cos(angle) * radius;
    foliagePart.position.y = height;
    foliagePart.position.z = Math.sin(angle) * radius;
    
    treeGroup.add(foliagePart);
  }
  
  return treeGroup;
}

/**
 * Adds glowing leaves to a stylized tree
 */
function addGlowingLeaves(treeGroup) {
  const leavesCount = 8 + Math.floor(Math.random() * 8);
  
  // Create leaf materials with different colors
  const leafMaterials = [
    new THREE.MeshStandardMaterial({
      color: 0x88ff88,
      emissive: 0x44ff44,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.2
    }),
    new THREE.MeshStandardMaterial({
      color: 0xaaffaa,
      emissive: 0x66ff66,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.2
    })
  ];
  
  for (let i = 0; i < leavesCount; i++) {
    // Create leaf geometry (flattened box)
    const leafGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.2);
    
    // Select random material
    const material = leafMaterials[Math.floor(Math.random() * leafMaterials.length)];
    const leaf = new THREE.Mesh(leafGeometry, material);
    
    // Position leaf on the tree
    const height = 2.5 + Math.random() * 1.5;
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.6 + Math.random() * 0.8;
    
    leaf.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    
    // Random rotation
    leaf.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    // Add to bloom layer
    leaf.layers.enable(1);
    
    // Add to tree group
    treeGroup.add(leaf);
  }
}

/**
 * Places GLTF tree models in the scene
 */
function placeGLTFTrees(treesGroup) {
  // Place more GLTF trees for better coverage
  const treeCount = 30;
  const noise = new SimplexNoise();
  
  for (let i = 0; i < treeCount; i++) {
    // Use noise for natural distribution
    const angle = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 150; // Increased radius for wider distribution
    
    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;
    
    // Add noise to position
    const noiseValue = noise.noise(x * 0.03, z * 0.03);
    
    // Skip this position if noise value is below threshold
    if (noiseValue < -0.4) continue;
    
    // Adjust position based on noise
    x += noiseValue * 8;
    z += noiseValue * 8;
    
    // Select a random tree model
    const modelIndex = Math.floor(Math.random() * treeModels.length);
    const treeModel = treeModels[modelIndex].clone();
    
    // Position tree
    treeModel.position.set(x, 0, z);
    
    // Random rotation
    treeModel.rotation.y = Math.random() * Math.PI * 2;
    
    // Random scale variation
    const scale = 1 + Math.random() * 0.5;
    treeModel.scale.set(scale, scale + Math.random() * 0.3, scale);
    
    // Add to trees group
    treesGroup.add(treeModel);
  }
}
