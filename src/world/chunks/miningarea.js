// file: src/world/chunks/miningarea.js

import * as THREE from 'three';

export default class MiningArea {
    constructor() {
        this.mesh = new THREE.Group();

        // Define a base color for the mining area ground.
        // Using a saddle brown color for a "mine" feel.
        const baseColor = new THREE.Color('#8B4513'); 

        // 1. Create the outer 50x50 ground plane.
        const outerGeo = new THREE.PlaneGeometry(50, 50);
        const outerMat = new THREE.MeshBasicMaterial({ color: baseColor });

        const outerMesh = new THREE.Mesh(outerGeo, outerMat);
        outerMesh.rotation.x = -Math.PI / 2; // Rotate to be flat on the XZ plane.
        this.mesh.add(outerMesh);
        
        // 2. Create the inner 25x25 area with a darker shade.
        const innerGeo = new THREE.PlaneGeometry(25, 25);
        
        // Create a new material that is a darker shade of the main ground.
        const innerColor = baseColor.clone().multiplyScalar(0.75); // 25% darker.
        const innerMat = new THREE.MeshBasicMaterial({ color: innerColor });
        
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        innerMesh.rotation.x = -Math.PI / 2;
        
        // Position the inner area slightly above the outer one to prevent z-fighting.
        innerMesh.position.y = 0.01; 
        this.mesh.add(innerMesh);
    }

    update(time) {
        // This method will be used for animations or updates within the chunk later on.
    }
}
