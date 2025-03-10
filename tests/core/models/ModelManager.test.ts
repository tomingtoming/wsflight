import { assertEquals, assertExists, assertInstanceOf } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { ModelManager } from "../../../src/core/models/ModelManager.ts";
import * as THREE from 'three';

// ThreeJSのテスト用にモックするためのヘルパー
class MockGroup {
  name = "";
  children: MockGroup[] = [];
  visible = true;
  position = { copy: (pos: any) => {} };
  rotation = { copy: (rot: any) => {} };
  quaternion = { copy: (quat: any) => {} };
  scale = { set: (x: number, y: number, z: number) => {} };
  
  constructor(name = "") {
    this.name = name;
  }
  
  add(child: MockGroup) {
    this.children.push(child);
  }
  
  clone(): MockGroup {
    const cloned = new MockGroup(this.name);
    cloned.children = this.children.map(child => child.clone());
    return cloned;
  }
  
  traverse(callback: (object: MockGroup) => void) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
}

describe("ModelManager", () => {
  let modelManager: ModelManager;

  beforeEach(() => {
    modelManager = new ModelManager();
  });

  it("should create a basic aircraft model", () => {
    const model = modelManager.createBasicAircraftModel();
    assertExists(model);
    assertEquals(model.name, "BasicAircraft");
    // モデルには少なくとも1つの子要素があるはず
    assertEquals(model.children.length > 0, true);
  });
  
  it("should handle error when loading an invalid DNM path", async () => {
    const result = await modelManager.loadDNM("invalid/path.dnm");
    assertExists(result);
    // エラー時は空のグループを返す
    assertEquals(result.children.length, 0);
  });

  it("should handle error when loading an invalid SRF path", async () => {
    const result = await modelManager.loadSRF("invalid/path.srf");
    assertExists(result);
    // エラー時は空のグループを返す
    assertEquals(result.children.length, 0);
  });

  it("should cache loaded models", async () => {
    // プライベートキャッシュマップにアクセスするためにanyに型変換
    const manager = modelManager as any;
    
    // モックデータを使ってキャッシュが機能することを確認
    const mockGroup = new MockGroup("TestModel");
    const childGroup = new MockGroup("Child");
    mockGroup.add(childGroup);
    
    // キャッシュにモデルを設定
    manager.modelCache.set("test/path.dnm", mockGroup);
    
    // キャッシュからモデルを取得
    const result = await modelManager.loadDNM("test/path.dnm");
    assertExists(result);
    assertEquals(result.name, "TestModel");
    assertEquals(result.children.length, 1);
    assertEquals(result.children[0].name, "Child");
  });
});