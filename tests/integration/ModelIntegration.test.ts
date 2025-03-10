// filepath: /Users/toming/wsflight/tests/integration/ModelIntegration.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { ModelManager } from "../../src/core/models/ModelManager.ts";
import { SceneManager } from "../../src/core/controllers/SceneManager.ts";
import * as THREE from 'three';

// モックでThree.jsのWebGLRendererを再現
class MockWebGLRenderer {
  domElement = document.createElement('div');
  setSize(width: number, height: number) {}
  setPixelRatio(ratio: number) {}
  render(scene: THREE.Scene, camera: THREE.Camera) {}
}

describe("Model Integration Tests", () => {
  let modelManager: ModelManager;
  let sceneManager: SceneManager;
  let mockRenderer: MockWebGLRenderer;
  
  beforeEach(() => {
    mockRenderer = new MockWebGLRenderer();
    modelManager = new ModelManager();
    sceneManager = new SceneManager(mockRenderer as unknown as THREE.WebGLRenderer);
    sceneManager.createScene();
  });
  
  it("should create and add a basic aircraft model to the scene", () => {
    // 基本的な航空機モデルを作成
    const aircraftModel = modelManager.createBasicAircraftModel();
    
    // シーンに追加
    sceneManager.addAircraft(aircraftModel);
    
    // シーンのchildren配列にモデルが追加されたことを検証
    const scene = sceneManager.getScene();
    
    // 少なくとも1つの子要素がある（地面+航空機など）
    assertEquals(scene.children.length > 0, true);
    
    // 追加された航空機モデルが見つかるか確認
    let aircraftFound = false;
    scene.traverse((object) => {
      if (object.name === "BasicAircraft") {
        aircraftFound = true;
      }
    });
    
    assertEquals(aircraftFound, true, "Aircraft model was not found in the scene");
  });
  
  it("should update aircraft position in the scene", () => {
    // 基本的な航空機モデルを作成してシーンに追加
    const aircraftModel = modelManager.createBasicAircraftModel();
    sceneManager.addAircraft(aircraftModel);
    
    // 機体の位置と姿勢を更新
    const position = { x: 100, y: 200, z: 300 };
    const rotation = { pitch: 0.1, roll: 0.2, yaw: 0.3 };
    
    sceneManager.updateAircraftPosition(position, rotation);
    
    // 航空機の位置が正しく更新されたことを検証
    let aircraft: THREE.Object3D | undefined;
    sceneManager.getScene().traverse((object) => {
      if (object.name === "BasicAircraft") {
        aircraft = object;
      }
    });
    
    // 航空機モデルが見つかった場合、その位置を検証
    if (aircraft) {
      assertEquals(aircraft.position.x, position.x);
      assertEquals(aircraft.position.y, position.y);
      assertEquals(aircraft.position.z, position.z);
    } else {
      assertEquals(true, false, "Aircraft model not found in scene");
    }
  });
  
  it("should handle model rotation via ModelManager", () => {
    // 基本的な航空機モデルを作成
    const aircraftModel = modelManager.createBasicAircraftModel();
    
    // モデルの回転を試みる - 例外が発生しないことをテスト
    try {
      modelManager.rotateNode(aircraftModel, "wing", 0.5);
      assertEquals(true, true); // 例外なしで通過した
    } catch (error) {
      assertEquals(true, false, `Exception thrown: ${error}`);
    }
  });
});