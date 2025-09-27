// file: src/world/assets/sky/sky.js
import * as THREE from 'three';
import { scene } from '../../../core/three.js';
import Lighting from '../../../core/lighting.js';

export default class Sky {
  static main = null;

  static create() {
    if (Sky.main) return;
    if (!Lighting.main) throw new Error('Sky cannot be created before Lighting system.');
    Sky.main = new Sky(scene, Lighting.main);
  }

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
      }`;
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
      }`;
    this.uniforms = {
      topColor: { value: new THREE.Color(topColor) },
      bottomColor: { value: new THREE.Color(bottomColor) },
      offset: { value: offset },
      exponent: { value: exponent }
    };

    if (lighting?.hemiLight?.color) {
      this.uniforms.topColor.value.copy(lighting.hemiLight.color);
    }

    this.scene.fog = new THREE.Fog(this.uniforms.bottomColor.value.clone(), 1, 5000);

    const skyGeo = new THREE.SphereGeometry(radius, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader, fragmentShader,
      side: THREE.BackSide, depthWrite: false
    });

    this.mesh = new THREE.Mesh(skyGeo, skyMat);
    this.mesh.name = 'SkyDome';
    this.mesh.frustumCulled = false;
    this.mesh.onBeforeRender = (_r, _s, camera) => {
      this.mesh.position.copy(camera.position);
    };
    this.scene.add(this.mesh);
  }
}
