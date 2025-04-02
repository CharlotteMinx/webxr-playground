import * as THREE from 'three';

/**
 * Creates a player character with hand models for VR controllers
 * @returns {Object} Player object with methods to update controller positions
 */
export function createPlayer() {
  // Create a group to hold all player components
  const playerGroup = new THREE.Group();
  
  // Create the player body
  const body = createPlayerBody();
  playerGroup.add(body);
  
  // Create hand models
  const leftHand = createHandModel(true); // true for left hand
  const rightHand = createHandModel(false); // false for right hand
  
  // Initially hide hands until controllers are connected
  leftHand.visible = false;
  rightHand.visible = false;
  
  // Add hands to player group
  playerGroup.add(leftHand);
  playerGroup.add(rightHand);
  
  // Return player object with methods to update controller positions
  return {
    group: playerGroup,
    body: body,
    leftHand: leftHand,
    rightHand: rightHand,
    
    // Method to update hand positions based on controller positions
    updateHands: (controllers) => {
      if (controllers.length > 0) {
        // Update left hand
        leftHand.visible = true;
        leftHand.position.copy(controllers[0].position);
        leftHand.quaternion.copy(controllers[0].quaternion);
      }
      
      if (controllers.length > 1) {
        // Update right hand
        rightHand.visible = true;
        rightHand.position.copy(controllers[1].position);
        rightHand.quaternion.copy(controllers[1].quaternion);
      }
    }
  };
}

/**
 * Creates a simple player body
 */
function createPlayerBody() {
  const bodyGroup = new THREE.Group();
  
  // Create head
  const headGeometry = new THREE.SphereGeometry(0.15, 16, 12);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc99, // Skin tone
    roughness: 0.7,
    metalness: 0.1
  });
  
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.6; // Eye level
  head.castShadow = true;
  bodyGroup.add(head);
  
  // Create torso
  const torsoGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12);
  const torsoMaterial = new THREE.MeshStandardMaterial({
    color: 0x2194ce, // Blue
    roughness: 0.8,
    metalness: 0.1
  });
  
  const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
  torso.position.y = 1.2; // Below head
  torso.castShadow = true;
  bodyGroup.add(torso);
  
  // Create lower body
  const lowerBodyGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.5, 12);
  const lowerBody = new THREE.Mesh(lowerBodyGeometry, torsoMaterial);
  lowerBody.position.y = 0.8; // Below torso
  lowerBody.castShadow = true;
  bodyGroup.add(lowerBody);
  
  return bodyGroup;
}

/**
 * Creates a hand model for VR controllers
 * @param {boolean} isLeft - Whether this is a left hand
 */
function createHandModel(isLeft) {
  const handGroup = new THREE.Group();
  
  // Create hand material
  const handMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc99, // Skin tone
    roughness: 0.7,
    metalness: 0.1
  });
  
  // Create palm
  const palmGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.1);
  const palm = new THREE.Mesh(palmGeometry, handMaterial);
  palm.castShadow = true;
  handGroup.add(palm);
  
  // Create fingers
  const fingerCount = 5;
  const fingerSpacing = 0.02;
  const fingerWidth = 0.01;
  const fingerHeight = 0.01;
  const fingerLength = 0.03;
  
  for (let i = 0; i < fingerCount; i++) {
    // Calculate finger position
    const offset = (i - 2) * (fingerWidth + fingerSpacing);
    
    // Create finger
    const fingerGeometry = new THREE.BoxGeometry(fingerWidth, fingerHeight, fingerLength);
    const finger = new THREE.Mesh(fingerGeometry, handMaterial);
    
    // Position finger at front of palm
    finger.position.set(offset, 0, fingerLength / 2 + 0.05);
    finger.castShadow = true;
    
    // Add finger to hand
    handGroup.add(finger);
  }
  
  // Create thumb (positioned differently)
  const thumbGeometry = new THREE.BoxGeometry(fingerWidth, fingerHeight, fingerLength);
  const thumb = new THREE.Mesh(thumbGeometry, handMaterial);
  
  // Position thumb at side of palm
  const thumbOffset = isLeft ? -0.05 : 0.05;
  thumb.position.set(thumbOffset, 0, 0.02);
  thumb.rotation.y = isLeft ? Math.PI / 4 : -Math.PI / 4;
  thumb.castShadow = true;
  
  // Add thumb to hand
  handGroup.add(thumb);
  
  // Rotate hand to match controller orientation
  handGroup.rotation.x = -Math.PI / 2; // Point fingers forward
  
  // Adjust for left/right hand
  if (isLeft) {
    handGroup.scale.x = -1; // Mirror for left hand
  }
  
  return handGroup;
}
