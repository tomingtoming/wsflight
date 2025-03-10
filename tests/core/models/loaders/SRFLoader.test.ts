// filepath: /Users/toming/wsflight/tests/core/models/loaders/SRFLoader.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { beforeEach, describe, it, afterEach } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { SRFLoader } from "../../../../src/core/models/loaders/SRFLoader.ts";
import * as THREE from 'three';

// SRFファイルのヘッダー形式をモックするためのヘルパー
function createMockSRFBuffer(version = 20, numVertices = 3, numPolygons = 1): ArrayBuffer {
  // "SURF" シグネチャ + バージョン + 頂点数 + 頂点データ + 面数 + 面データ
  const headerSize = 4 + 4 + 4; // シグネチャ(4) + バージョン(4) + 頂点数(4)
  const verticesSize = numVertices * 4 * 3; // 頂点数 * (x,y,z) * 4バイト
  const polygonHeaderSize = 4; // 面数(4)
  const polygonData = numPolygons * (4 + 4*3 + 4*3 + 4*4); // 面ごとの頂点数(4) + 頂点インデックス(3*4) + 法線(3*4) + 色(4*4)
  
  const bufferSize = headerSize + verticesSize + polygonHeaderSize + polygonData;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  let offset = 0;
  
  // SRFシグネチャ "SURF"
  view.setUint8(offset++, 83); // 'S'
  view.setUint8(offset++, 85); // 'U'
  view.setUint8(offset++, 82); // 'R'
  view.setUint8(offset++, 70); // 'F'
  
  // バージョン
  view.setInt32(offset, version, true);
  offset += 4;
  
  // 頂点数
  view.setInt32(offset, numVertices, true);
  offset += 4;
  
  // 頂点データ (三角形の3頂点)
  // 頂点1
  view.setFloat32(offset, 0.0, true); offset += 4; // x
  view.setFloat32(offset, 0.0, true); offset += 4; // y
  view.setFloat32(offset, 0.0, true); offset += 4; // z
  
  // 頂点2
  view.setFloat32(offset, 1.0, true); offset += 4; // x
  view.setFloat32(offset, 0.0, true); offset += 4; // y
  view.setFloat32(offset, 0.0, true); offset += 4; // z
  
  // 頂点3
  view.setFloat32(offset, 0.5, true); offset += 4; // x
  view.setFloat32(offset, 1.0, true); offset += 4; // y
  view.setFloat32(offset, 0.0, true); offset += 4; // z
  
  // 面数
  view.setInt32(offset, numPolygons, true);
  offset += 4;
  
  // 三角形の面データ
  // 面の頂点数
  view.setInt32(offset, 3, true); offset += 4;
  
  // 頂点インデックス (三角形)
  view.setInt32(offset, 0, true); offset += 4;
  view.setInt32(offset, 1, true); offset += 4;
  view.setInt32(offset, 2, true); offset += 4;
  
  // 法線 (上向き)
  view.setFloat32(offset, 0.0, true); offset += 4; // nx
  view.setFloat32(offset, 0.0, true); offset += 4; // ny
  view.setFloat32(offset, 1.0, true); offset += 4; // nz
  
  // 色 (赤)
  view.setFloat32(offset, 1.0, true); offset += 4; // r
  view.setFloat32(offset, 0.0, true); offset += 4; // g
  view.setFloat32(offset, 0.0, true); offset += 4; // b
  view.setFloat32(offset, 1.0, true); offset += 4; // a
  
  return buffer;
}

// モックfetchの実装
function setupFetchMock(responseBuffer: ArrayBuffer | null, success = true) {
  const originalFetch = globalThis.fetch;
  
  // fetchをモック化
  globalThis.fetch = async (url: string | URL | Request): Promise<Response> => {
    if (success) {
      return {
        ok: true,
        arrayBuffer: async () => responseBuffer || new ArrayBuffer(0)
      } as Response;
    } else {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found"
      } as Response;
    }
  };
  
  // テスト終了後に元に戻すための関数を返す
  return () => {
    globalThis.fetch = originalFetch;
  };
}

describe("SRFLoader", () => {
  let loader: SRFLoader;
  let restoreFetch: () => void;
  
  beforeEach(() => {
    loader = new SRFLoader();
  });
  
  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
    }
  });
  
  it("should create an SRFLoader instance", () => {
    assertExists(loader);
  });
  
  it("should load a valid SRF file", async () => {
    const mockSRFBuffer = createMockSRFBuffer();
    restoreFetch = setupFetchMock(mockSRFBuffer);
    
    const result = await loader.load("test.srf");
    
    assertExists(result);
    assertEquals(result.name, "SRF_Model");
    assertEquals(result.children.length, 1);
    assertEquals(result.children[0].name, "SRF_Mesh");
  });
  
  it("should handle invalid SRF signature", async () => {
    // 不正なシグネチャを持つバッファ
    const invalidBuffer = new ArrayBuffer(12);
    const view = new DataView(invalidBuffer);
    
    // "ABCD" (不正なシグネチャ)
    view.setUint8(0, 65); // 'A'
    view.setUint8(1, 66); // 'B'
    view.setUint8(2, 67); // 'C'
    view.setUint8(3, 68); // 'D'
    
    restoreFetch = setupFetchMock(invalidBuffer);
    
    const result = await loader.load("invalid.srf");
    
    assertExists(result);
    // シグネチャが不正な場合は空のグループを返す
    assertEquals(result.children.length, 0);
  });
  
  it("should handle fetch errors", async () => {
    restoreFetch = setupFetchMock(null, false);
    
    const result = await loader.load("error.srf");
    
    assertExists(result);
    // エラー時は空のグループを返す
    assertEquals(result.children.length, 0);
  });
  
  it("should set opacity correctly", () => {
    // モックグループを作成
    const mockGroup = new THREE.Group();
    const mockMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshPhongMaterial()
    );
    mockGroup.add(mockMesh);
    
    // 透明度設定のテスト
    loader.setOpacity(mockGroup, 0.5);
    
    // meshのmaterialにアクセス
    const material = mockMesh.material as THREE.MeshPhongMaterial;
    assertEquals(material.transparent, true);
    assertEquals(material.opacity, 0.5);
  });
  
  it("should set color correctly", () => {
    // モックグループを作成
    const mockGroup = new THREE.Group();
    const mockMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshPhongMaterial({ vertexColors: true })
    );
    mockGroup.add(mockMesh);
    
    // 色設定のテスト
    const testColor = 0xFF0000; // 赤
    loader.setColor(mockGroup, testColor);
    
    // meshのmaterialにアクセス
    const material = mockMesh.material as THREE.MeshPhongMaterial;
    assertEquals(material.vertexColors, false);
    assertEquals(material.color.getHex(), testColor);
  });
});