import { assertEquals, assertExists } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { beforeEach, describe, it, afterEach } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { ModelManager } from "../../src/core/models/ModelManager.ts";
import { SceneManager } from "../../src/core/controllers/SceneManager.ts";
import { MockWebGLRenderer, setupTestEnvironment, cleanupTestEnvironment } from "../helpers/testHelpers.ts";
import * as THREE from 'three';

describe("Model Integration Tests", () => {
  let modelManager: ModelManager;
  let sceneManager: SceneManager;
  let mockRenderer: MockWebGLRenderer;
  
  beforeEach(() => {
    setupTestEnvironment();
    mockRenderer = new MockWebGLRenderer();
    modelManager = new ModelManager();
    sceneManager = new SceneManager(mockRenderer as unknown as THREE.WebGLRenderer);
    sceneManager.createScene();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });
  
  it("should create and add a basic aircraft model to the scene", () => {
    const aircraftModel = modelManager.createBasicAircraftModel();
    sceneManager.addAircraft(aircraftModel);
    
    const scene = sceneManager.getScene();
    assertEquals(scene.children.length > 0, true);
    
    let aircraftFound = false;
    scene.traverse((object) => {
      if (object.name === "BasicAircraft") {
        aircraftFound = true;
      }
    });
    
    assertEquals(aircraftFound, true, "Aircraft model was not found in the scene");
  });
  
  it("should update aircraft position in the scene", () => {
    const aircraftModel = modelManager.createBasicAircraftModel();
    sceneManager.addAircraft(aircraftModel);
    
    const position = { x: 100, y: 200, z: 300 };
    const rotation = { pitch: 0.1, roll: 0.2, yaw: 0.3 };
    
    sceneManager.updateAircraftPosition(position, rotation);
    
    let aircraft: THREE.Object3D | undefined;
    sceneManager.getScene().traverse((object) => {
      if (object.name === "BasicAircraft") {
        aircraft = object;
      }
    });
    
    if (aircraft) {
      assertEquals(aircraft.position.x, position.x);
      assertEquals(aircraft.position.y, position.y);
      assertEquals(aircraft.position.z, position.z);
    } else {
      assertEquals(true, false, "Aircraft model not found in scene");
    }
  });
  
  it("should handle model rotation via ModelManager", () => {
    const aircraftModel = modelManager.createBasicAircraftModel();
    
    try {
      modelManager.rotateNode(aircraftModel, "wing", 0.5);
      assertEquals(true, true);
    } catch (error) {
      assertEquals(true, false, `Exception thrown: ${error}`);
    }
  });
});