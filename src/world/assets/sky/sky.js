// file: src/world/assets/sky/sky.js
import * as THREE from 'three';

export default class Sky {
  constructor(scene, lighting, {
    radius = 4000,
    topColor = 0x0077ff,
    bottomColor = 0xffffff,
    offset = 0.0,
    exponent = 0.6
  } = {}) {
    this.scene = scene;

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
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        vec3 col = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    this.uniforms = {
      topColor:    { value: new THREE.Color(topColor) },
      bottomColor: { value: new THREE.Color(bottomColor) },
      offset:      { value: offset },
      exponent:    { value: exponent }
    };

    // Link the sky top color to the hemisphere light color if provided
    if (lighting?.hemiLight?.color) {
      this.uniforms.topColor.value.copy(lighting.hemiLight.color);
    }

    // Fog to match the lower sky color
    this.scene.fog = new THREE.Fog(this.uniforms.bottomColor.value.clone(), 1, 5000);

    const skyGeo = new THREE.SphereGeometry(radius, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(skyGeo, skyMat);
    this.mesh.name = 'SkyDome';
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {}; // ignore raycasts

    // Keep sky centered on camera each frame (prevents floating as player moves)
    this.mesh.onBeforeRender = (_r, _s, camera) => {
      this.mesh.position.copy(camera.position);
    };

    this.scene.add(this.mesh);
  }

  update(_time) { /* static for now */ }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
  }
}