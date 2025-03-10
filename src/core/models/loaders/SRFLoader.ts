// filepath: /Users/toming/wsflight/src/core/models/loaders/SRFLoader.ts
import * as THREE from 'three';

/**
 * YSFLIGHTのSRF（Surface）ファイルを読み込むためのローダー
 * YSFLIGHTのソースコードを参考に実装
 */
export class SRFLoader {
  constructor() {}
  
  /**
   * SRFファイルを読み込み、Three.jsのGroupオブジェクトに変換する
   * @param url SRFファイルのURL
   * @returns Three.jsのGroupオブジェクト
   */
  async load(url: string): Promise<THREE.Group> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load SRF file: ${url}`);
      }
      const buffer = await response.arrayBuffer();
      return this.parse(buffer);
    } catch (error) {
      console.error(`Error loading SRF file: ${error}`);
      // エラー時は空のグループを返す
      return new THREE.Group();
    }
  }
  
  /**
   * SRFファイルのバイナリデータを解析する
   * @param buffer SRFファイルのバイナリデータ
   * @returns Three.jsのGroupオブジェクト
   */
  private parse(buffer: ArrayBuffer): THREE.Group {
    const dataView = new DataView(buffer);
    let offset = 0;
    
    // SRFファイルのヘッダーを読み取る
    // YSFLIGHTのSRFファイルは "SURF" で始まる
    const signature = this.readString(dataView, offset, 4);
    offset += 4;
    if (signature !== "SURF") {
      console.error("Invalid SRF file format");
      return new THREE.Group();
    }
    
    // バージョン情報を読み取る
    const version = dataView.getInt32(offset, true);
    offset += 4;
    console.log(`SRF Version: ${version}`);
    
    // 頂点数を読み取る
    const numVertices = dataView.getInt32(offset, true);
    offset += 4;
    console.log(`Number of vertices: ${numVertices}`);
    
    // 頂点データを読み取る
    const vertices: number[] = [];
    for (let i = 0; i < numVertices; i++) {
      const x = dataView.getFloat32(offset, true);
      offset += 4;
      const y = dataView.getFloat32(offset, true);
      offset += 4;
      const z = dataView.getFloat32(offset, true);
      offset += 4;
      
      // YSFLIGHTの座標系からThree.jsの座標系に変換
      vertices.push(x, y, -z);
    }
    
    // 面数を読み取る
    const numPolygons = dataView.getInt32(offset, true);
    offset += 4;
    console.log(`Number of polygons: ${numPolygons}`);
    
    // 面データを読み取る
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    
    for (let i = 0; i < numPolygons; i++) {
      // 面の頂点数を読み取る
      const numVerticesInPolygon = dataView.getInt32(offset, true);
      offset += 4;
      
      // 面の頂点インデックスを読み取る
      const polygonIndices: number[] = [];
      for (let j = 0; j < numVerticesInPolygon; j++) {
        const vertexIndex = dataView.getInt32(offset, true);
        offset += 4;
        polygonIndices.push(vertexIndex);
      }
      
      // 面の法線を読み取る
      const nx = dataView.getFloat32(offset, true);
      offset += 4;
      const ny = dataView.getFloat32(offset, true);
      offset += 4;
      const nz = dataView.getFloat32(offset, true);
      offset += 4;
      
      // 法線をThree.jsの座標系に変換
      for (let j = 0; j < numVerticesInPolygon; j++) {
        normals.push(nx, ny, -nz);
      }
      
      // 面の色を読み取る
      const r = dataView.getFloat32(offset, true);
      offset += 4;
      const g = dataView.getFloat32(offset, true);
      offset += 4;
      const b = dataView.getFloat32(offset, true);
      offset += 4;
      const a = dataView.getFloat32(offset, true);
      offset += 4;
      
      // 色情報を各頂点に適用
      for (let j = 0; j < numVerticesInPolygon; j++) {
        colors.push(r, g, b);
      }
      
      // 三角形分割（三角形以外の面も三角形に分割）
      if (numVerticesInPolygon >= 3) {
        for (let j = 0; j < numVerticesInPolygon - 2; j++) {
          indices.push(polygonIndices[0], polygonIndices[j + 1], polygonIndices[j + 2]);
        }
      }
    }
    
    // ジオメトリを作成
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    
    // マテリアルを作成（頂点カラーを使用）
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide
    });
    
    // メッシュを作成
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "SRF_Mesh";
    
    // グループを作成してメッシュを追加
    const group = new THREE.Group();
    group.name = "SRF_Model";
    group.add(mesh);
    
    return group;
  }
  
  /**
   * バイナリデータから文字列を読み取る
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param length 文字列の長さ
   * @returns 読み取った文字列
   */
  private readString(dataView: DataView, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const charCode = dataView.getUint8(offset + i);
      if (charCode === 0) break; // null終端
      result += String.fromCharCode(charCode);
    }
    return result;
  }
  
  /**
   * 透明度を設定
   * @param model SRFモデル
   * @param opacity 不透明度 (0.0-1.0)
   */
  public setOpacity(model: THREE.Group, opacity: number): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.material instanceof THREE.MeshPhongMaterial) {
          object.material.transparent = opacity < 1.0;
          object.material.opacity = opacity;
          object.material.needsUpdate = true;
        }
      }
    });
  }
  
  /**
   * メッシュの色を設定
   * @param model SRFモデル
   * @param color 色（16進数または THREE.Color）
   */
  public setColor(model: THREE.Group, color: number | THREE.Color): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.material instanceof THREE.MeshPhongMaterial) {
          // 頂点カラーの代わりに単色を使用するよう変更
          object.material.vertexColors = false;
          object.material.color = new THREE.Color(color);
          object.material.needsUpdate = true;
        }
      }
    });
  }
}