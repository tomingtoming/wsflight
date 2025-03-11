/**
 * Graphics Renderer Module
 *
 * This module is responsible for rendering the 3D scene using three.js.
 * It handles the initialization of the renderer, scene, camera, and lighting.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Main renderer class
class Renderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  constructor() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view
      globalThis.innerWidth / globalThis.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      10000, // Far clipping plane
    );
    this.camera.position.set(0, 10, 20);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
    this.renderer.setPixelRatio(globalThis.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Add renderer to DOM
    document.body.appendChild(this.renderer.domElement);

    // Initialize controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Add event listener for window resize
    globalThis.addEventListener("resize", () => this.onWindowResize());

    // Add basic lighting
    this.setupLighting();
  }

  /**
   * Set up basic lighting for the scene
   */
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;

    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;

    this.scene.add(directionalLight);
  }

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    this.camera.aspect = globalThis.innerWidth / globalThis.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
  }

  /**
   * Add an object to the scene
   */
  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove an object from the scene
   */
  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Render the scene
   */
  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Get the scene
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the camera
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}

// Singleton instance
let rendererInstance: Renderer | null = null;

/**
 * Initialize the graphics renderer
 */
export function initializeGraphics(): Renderer {
  if (!rendererInstance) {
    rendererInstance = new Renderer();
    console.log("Graphics renderer initialized");
  }
  return rendererInstance;
}

/**
 * Get the renderer instance
 */
export function getRenderer(): Renderer | null {
  return rendererInstance;
}
