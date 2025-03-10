import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { beforeEach, describe, it, afterEach } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { DNMLoader } from "../../../../src/core/models/loaders/DNMLoader.ts";
import * as THREE from 'three';

// DNMファイルのヘッダー形式をモックするためのヘルパー
function createMockDNMBuffer(): ArrayBuffer {
    // バッファサイズの計算
    const headerSize = 12; // シグネチャ(4) + バージョン(4) + ノード数(4)
    const nodeNameLength = 9; // "TestNode\0"
    const nodeHeaderSize = 8; // ノードタイプ(4) + 名前長(4)
    const vertexCount = 1;
    const vertexSize = 12; // 3 * 4バイト (x,y,z)
    const normalCount = 1;
    const normalSize = 12; // 3 * 4バイト (nx,ny,nz)
    const polygonCount = 1;
    const polygonSize = 4; // インデックス数(4)
    const indexSize = 12; // 3 * 4バイト (3頂点のインデックス)
    const totalSize = headerSize + nodeHeaderSize + nodeNameLength + 
                     4 + vertexSize + // 頂点数(4) + 頂点データ
                     4 + normalSize + // 法線数(4) + 法線データ
                     4 + polygonSize + indexSize; // ポリゴン数(4) + ポリゴンデータ

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // DNMシグネチャ "DNM "
    view.setUint8(offset++, 68); // 'D'
    view.setUint8(offset++, 78); // 'N'
    view.setUint8(offset++, 77); // 'M'
    view.setUint8(offset++, 32); // ' '

    // バージョン
    view.setInt32(offset, 30, true);
    offset += 4;

    // ノード数
    view.setInt32(offset, 1, true);
    offset += 4;

    // ノードタイプ (0=メッシュ)
    view.setInt32(offset, 0, true);
    offset += 4;

    // ノード名の長さ (ヌル文字含む)
    view.setInt32(offset, nodeNameLength, true);
    offset += 4;

    // ノード名 "TestNode\0"
    const nodeName = "TestNode";
    for (let i = 0; i < nodeName.length; i++) {
        view.setUint8(offset++, nodeName.charCodeAt(i));
    }
    view.setUint8(offset++, 0); // null terminator

    // 頂点数
    view.setInt32(offset, vertexCount, true);
    offset += 4;

    // 頂点データ
    view.setFloat32(offset, 1.0, true); offset += 4; // x
    view.setFloat32(offset, 0.0, true); offset += 4; // y
    view.setFloat32(offset, 0.0, true); offset += 4; // z

    // 法線数
    view.setInt32(offset, normalCount, true);
    offset += 4;

    // 法線データ
    view.setFloat32(offset, 0.0, true); offset += 4; // nx
    view.setFloat32(offset, 1.0, true); offset += 4; // ny
    view.setFloat32(offset, 0.0, true); offset += 4; // nz

    // ポリゴン数
    view.setInt32(offset, polygonCount, true);
    offset += 4;

    // ポリゴンの頂点数
    view.setInt32(offset, 3, true);
    offset += 4;

    // インデックスデータ
    view.setInt32(offset, 0, true); offset += 4;
    view.setInt32(offset, 0, true); offset += 4;
    view.setInt32(offset, 0, true); offset += 4;

    return buffer;
}

// モックfetchの実装
function setupFetchMock(responseBuffer: ArrayBuffer | null, success = true) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request): Promise<Response> => {
        if (success) {
            return {
                ok: true,
                arrayBuffer: async () => responseBuffer || new ArrayBuffer(0)
            } as Response;
        } else {
            throw new Error("Failed to load DNM file: " + url);
        }
    };
    return () => { globalThis.fetch = originalFetch; };
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
        const invalidBuffer = new ArrayBuffer(12);
        const view = new DataView(invalidBuffer);
        view.setUint8(0, 65); // 'A'
        view.setUint8(1, 66); // 'B'
        view.setUint8(2, 67); // 'C'
        view.setUint8(3, 32); // ' '
        
        restoreFetch = setupFetchMock(invalidBuffer);
        const result = await loader.load("invalid.dnm");
        assertExists(result);
        assertEquals(result.children.length, 0);
    });
    
    it("should handle fetch errors", async () => {
        restoreFetch = setupFetchMock(null, false);
        const result = await loader.load("error.dnm");
        assertExists(result);
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