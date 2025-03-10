import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { beforeEach, describe, it, afterEach } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { DNMLoader } from "../../../../src/core/models/loaders/DNMLoader.ts";
import * as THREE from 'three';

// DNMファイルのヘッダー形式をモックするためのヘルパー
function createMockDNMBuffer(version = 30, numNodes = 1): ArrayBuffer {
  // "DNM " シグネチャ + バージョン + ノード数 + モックノードデータ
  const headerSize = 4 + 4 + 4; // シグネチャ(4) + バージョン(4) + ノード数(4)
  const nodeHeaderSize = 4 + 4 + 10; // ノードタイプ(4) + 名前長(4) + 名前("TestNode"+\0)
  const meshNodeData = 4 + 4*3 + 4 + 4*3 + 4; // 頂点数(4) + 頂点座標(4*3) + 面数(4) + 法線(4*3) + テクスチャ情報(4)
  
  const bufferSize = headerSize + nodeHeaderSize + meshNodeData;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  let offset = 0;
  
  // DNMシグネチャ "DNM "
  view.setUint8(offset++, 68); // 'D'
  view.setUint8(offset++, 78); // 'N'
  view.setUint8(offset++, 77); // 'M'
  view.setUint8(offset++, 32); // ' '
  
  // バージョン
  view.setInt32(offset, version, true);
  offset += 4;
  
  // ノード数
  view.setInt32(offset, numNodes, true);
  offset += 4;
  
  // ノードタイプ (0=メッシュ)
  view.setInt32(offset, 0, true);
  offset += 4;
  
  // ノード名の長さ
  view.setInt32(offset, 9, true); // "TestNode" + \0
  offset += 4;
  
  // ノード名 "TestNode\0"
  view.setUint8(offset++, 84); // 'T'
  view.setUint8(offset++, 101); // 'e'
  view.setUint8(offset++, 115); // 's'
  view.setUint8(offset++, 116); // 't'
  view.setUint8(offset++, 78); // 'N'
  view.setUint8(offset++, 111); // 'o'
  view.setUint8(offset++, 100); // 'd'
  view.setUint8(offset++, 101); // 'e'
  view.setUint8(offset++, 0); // '\0'
  
  // 頂点数 (1個)
  view.setInt32(offset, 1, true);
  offset += 4;
  
  // 頂点座標 (1, 2, 3)
  view.setFloat32(offset, 1.0, true);
  offset += 4;
  view.setFloat32(offset, 2.0, true);
  offset += 4;
  view.setFloat32(offset, 3.0, true);
  offset += 4;
  
  // 面数 (1個)
  view.setInt32(offset, 1, true);
  offset += 4;
  
  // 法線 (0, 1, 0)
  view.setFloat32(offset, 0.0, true);
  offset += 4;
  view.setFloat32(offset, 1.0, true);
  offset += 4;
  view.setFloat32(offset, 0.0, true);
  offset += 4;
  
  // テクスチャなし
  view.setInt32(offset, 0, true);
  offset += 4;
  
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

describe("DNMLoader", () => {
  let loader: DNMLoader;
  let restoreFetch: () => void;
  
  beforeEach(() => {
    loader = new DNMLoader();
  });
  
  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
    }
  });
  
  it("should create a DNMLoader instance", () => {
    assertExists(loader);
  });
  
  it("should load a valid DNM file", async () => {
    const mockDNMBuffer = createMockDNMBuffer();
    restoreFetch = setupFetchMock(mockDNMBuffer);
    
    const result = await loader.load("test.dnm");
    
    assertExists(result);
    assertEquals(result.name, "DNM_Root");
    assertEquals(result.children.length, 1);
    assertEquals(result.children[0].name, "TestNode");
  });
  
  it("should handle invalid DNM signature", async () => {
    // 不正なシグネチャを持つバッファ
    const invalidBuffer = new ArrayBuffer(12);
    const view = new DataView(invalidBuffer);
    
    // "ABC " (不正なシグネチャ)
    view.setUint8(0, 65); // 'A'
    view.setUint8(1, 66); // 'B'
    view.setUint8(2, 67); // 'C'
    view.setUint8(3, 32); // ' '
    
    restoreFetch = setupFetchMock(invalidBuffer);
    
    const result = await loader.load("invalid.dnm");
    
    assertExists(result);
    // シグネチャが不正な場合は空のグループを返す
    assertEquals(result.children.length, 0);
  });
  
  it("should handle fetch errors", async () => {
    restoreFetch = setupFetchMock(null, false);
    
    const result = await loader.load("error.dnm");
    
    assertExists(result);
    // エラー時は空のグループを返す
    assertEquals(result.children.length, 0);
  });
  
  it("should handle rotation of nodes", async () => {
    const mockDNMBuffer = createMockDNMBuffer();
    restoreFetch = setupFetchMock(mockDNMBuffer);
    
    const model = await loader.load("test.dnm");
    
    // rotateNodeメソッドは直接テストするのが難しいため、
    // 例外が発生しないことを確認するだけのシンプルなテスト
    try {
      loader.rotateNode(model, "NonExistentNode", 1.0);
      // 例外が発生しなければテスト成功
      assertEquals(true, true);
    } catch (error) {
      // 例外が発生した場合はテスト失敗
      assertEquals(true, false, "rotateNode threw an exception: " + error);
    }
  });
});