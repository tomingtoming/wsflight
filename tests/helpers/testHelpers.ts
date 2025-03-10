// filepath: /Users/toming/wsflight/tests/helpers/testHelpers.ts
/**
 * テスト用のヘルパー関数とモックオブジェクト
 */

// DOM要素のモック
class MockElement {
    style: { [key: string]: string } = {};
    addEventListener() {}
    removeEventListener() {}
    setAttribute() {}
    appendChild() {}
}

// documentのモック
export const mockDocument = {
    createElement: () => new MockElement(),
};

// WebGLRendererのモック
export class MockWebGLRenderer {
    domElement: MockElement;
    
    constructor() {
        this.domElement = new MockElement();
    }
    
    setSize(width: number, height: number) {}
    setPixelRatio(ratio: number) {}
    render(scene: any, camera: any) {}
}

// テスト用のグローバル変数設定
export function setupTestEnvironment() {
    (globalThis as any).document = mockDocument;
}

// テスト用のグローバル変数をクリーンアップ
export function cleanupTestEnvironment() {
    delete (globalThis as any).document;
}