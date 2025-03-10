// filepath: /Users/toming/wsflight/src/core/models/loaders/DNMLoader.ts
import * as THREE from 'three';

/**
 * YSFLIGHTのDNM（Dynamic Model）ファイルを読み込むためのローダー
 * YSFLIGHTのソースコードを参考に実装
 */
export class DNMLoader {
  constructor() {}
  
  /**
   * DNMファイルを読み込み、Three.jsのGroupオブジェクトに変換する
   * @param url DNMファイルのURL
   * @returns Three.jsのGroupオブジェクト
   */
  async load(url: string): Promise<THREE.Group> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load DNM file: ${url}`);
      }
      const buffer = await response.arrayBuffer();
      return this.parse(buffer);
    } catch (error) {
      console.error(`Error loading DNM file: ${error}`);
      // エラー時は空のグループを返す
      return new THREE.Group();
    }
  }
  
  /**
   * DNMファイルのバイナリデータを解析する
   * @param buffer DNMファイルのバイナリデータ
   * @returns Three.jsのGroupオブジェクト
   */
  private parse(buffer: ArrayBuffer): THREE.Group {
    const dataView = new DataView(buffer);
    let offset = 0;
    
    // DNMファイルのヘッダーを読み取る
    // YSFLIGHTのDNMファイルは "DNM " で始まる
    const signature = this.readString(dataView, offset, 4);
    offset += 4;
    if (signature !== "DNM ") {
      console.error("Invalid DNM file format");
      return new THREE.Group();
    }
    
    // バージョン情報を読み取る
    const version = dataView.getInt32(offset, true);
    offset += 4;
    console.log(`DNM Version: ${version}`);
    
    // ノード数を読み取る
    const numNodes = dataView.getInt32(offset, true);
    offset += 4;
    console.log(`Number of nodes: ${numNodes}`);
    
    // ルートグループを作成
    const rootGroup = new THREE.Group();
    rootGroup.name = "DNM_Root";
    
    // ノード情報を読み取る
    for (let i = 0; i < numNodes; i++) {
      const nodeResult = this.parseNode(dataView, offset, version);
      offset = nodeResult.newOffset;
      
      if (nodeResult.node) {
        rootGroup.add(nodeResult.node);
      }
    }
    
    return rootGroup;
  }
  
  /**
   * DNMファイルのノード情報を解析する
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param version DNMファイルのバージョン
   * @returns ノード情報と新しいオフセット
   */
  private parseNode(dataView: DataView, offset: number, version: number): { node: THREE.Object3D | null, newOffset: number } {
    // ノードタイプを読み取る
    const nodeType = dataView.getInt32(offset, true);
    offset += 4;
    
    // ノード名を読み取る
    const nameLength = dataView.getInt32(offset, true);
    offset += 4;
    const nodeName = this.readString(dataView, offset, nameLength);
    offset += nameLength;
    
    console.log(`Node: ${nodeName}, Type: ${nodeType}`);
    
    // ノードタイプに応じた処理
    switch (nodeType) {
      case 0: // 通常のメッシュノード
        return this.parseMeshNode(dataView, offset, nodeName, version);
      case 1: // 回転ノード
        return this.parseRotationNode(dataView, offset, nodeName, version);
      case 2: // 非表示ノード
        return { node: null, newOffset: offset };
      default:
        console.warn(`Unknown node type: ${nodeType}`);
        return { node: null, newOffset: offset };
    }
  }
  
  /**
   * メッシュノードを解析する
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param nodeName ノード名
   * @param version DNMファイルのバージョン
   * @returns メッシュノードと新しいオフセット
   */
  private parseMeshNode(dataView: DataView, offset: number, nodeName: string, version: number): { node: THREE.Mesh, newOffset: number } {
    // 頂点数を読み取る
    const numVertices = dataView.getInt32(offset, true);
    offset += 4;
    
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
    
    // 面データを読み取る
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    let hasTextures = false;
    let textureName = '';
    
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
      
      // 面の法線を読み取る（存在する場合）
      if (version >= 20) {
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
      }
      
      // テクスチャ情報を読み取る（存在する場合）
      if (version >= 30) {
        const hasTexture = dataView.getInt32(offset, true);
        offset += 4;
        
        if (hasTexture === 1) {
          hasTextures = true;
          
          // テクスチャ名の長さを読み取る
          const textureNameLength = dataView.getInt32(offset, true);
          offset += 4;
          
          // テクスチャ名を読み取る
          textureName = this.readString(dataView, offset, textureNameLength);
          offset += textureNameLength;
          
          // テクスチャ座標を読み取る
          for (let j = 0; j < numVerticesInPolygon; j++) {
            const u = dataView.getFloat32(offset, true);
            offset += 4;
            const v = dataView.getFloat32(offset, true);
            offset += 4;
            
            // Three.jsのUV座標系に合わせる
            uvs.push(u, 1.0 - v);
          }
        }
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
    
    if (normals.length > 0) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geometry.computeVertexNormals();
    }
    
    if (uvs.length > 0) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }
    
    geometry.setIndex(indices);
    
    // マテリアルを作成
    const material = new THREE.MeshPhongMaterial({
      color: 0x888888,
      flatShading: false,
      side: THREE.DoubleSide
    });
    
    // テクスチャ情報をメタデータとして保存
    if (hasTextures) {
      material.userData = {
        textureName: textureName
      };
    }
    
    // メッシュを作成
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = nodeName;
    
    // テクスチャ情報をメッシュのユーザーデータにも保存
    if (hasTextures) {
      mesh.userData.textureName = textureName;
    }
    
    return { node: mesh, newOffset: offset };
  }
  
  /**
   * 回転ノードを解析する
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param nodeName ノード名
   * @param version DNMファイルのバージョン
   * @returns 回転ノードと新しいオフセット
   */
  private parseRotationNode(dataView: DataView, offset: number, nodeName: string, version: number): { node: THREE.Group, newOffset: number } {
    // 回転軸の原点を読み取る
    const originX = dataView.getFloat32(offset, true);
    offset += 4;
    const originY = dataView.getFloat32(offset, true);
    offset += 4;
    const originZ = dataView.getFloat32(offset, true);
    offset += 4;
    
    // 回転軸の方向を読み取る
    const axisX = dataView.getFloat32(offset, true);
    offset += 4;
    const axisY = dataView.getFloat32(offset, true);
    offset += 4;
    const axisZ = dataView.getFloat32(offset, true);
    offset += 4;
    
    // 回転角度の初期値を読み取る
    const initialAngle = dataView.getFloat32(offset, true);
    offset += 4;
    
    // 子ノード数を読み取る
    const numChildren = dataView.getInt32(offset, true);
    offset += 4;
    
    // 回転ノードを表すグループを作成
    const rotationGroup = new THREE.Group();
    rotationGroup.name = nodeName;
    
    // 回転軸の原点と方向をThree.jsの座標系に変換
    const origin = new THREE.Vector3(originX, originY, -originZ);
    const axis = new THREE.Vector3(axisX, axisY, -axisZ).normalize();
    
    // 回転軸の情報をユーザーデータとして保存
    rotationGroup.userData = {
      type: 'rotation',
      origin: origin,
      axis: axis,
      initialAngle: initialAngle,
      currentAngle: initialAngle
    };
    
    // 初期回転を適用
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(axis, initialAngle);
    rotationGroup.quaternion.copy(quaternion);
    
    // 子ノードを解析
    for (let i = 0; i < numChildren; i++) {
      const childResult = this.parseNode(dataView, offset, version);
      offset = childResult.newOffset;
      
      if (childResult.node) {
        rotationGroup.add(childResult.node);
      }
    }
    
    return { node: rotationGroup, newOffset: offset };
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
   * DNMファイルのノードを回転させる
   * @param group DNMモデルのルートグループ
   * @param nodeName 回転させるノードの名前
   * @param angle 回転角度（ラジアン）
   */
  public rotateNode(group: THREE.Group, nodeName: string, angle: number): void {
    // 指定された名前のノードを検索
    const node = this.findNodeByName(group, nodeName);
    
    if (node && node.userData && node.userData.type === 'rotation') {
      // 回転軸と原点を取得
      const axis = node.userData.axis as THREE.Vector3;
      
      // 回転を適用
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);
      node.quaternion.copy(quaternion);
      
      // 現在の角度を更新
      node.userData.currentAngle = angle;
    }
  }
  
  /**
   * 名前でノードを検索する
   * @param group 検索対象のグループ
   * @param name 検索するノード名
   * @returns 見つかったノード（見つからない場合はnull）
   */
  private findNodeByName(group: THREE.Object3D, name: string): THREE.Object3D | null {
    if (group.name === name) {
      return group;
    }
    
    for (const child of group.children) {
      const found = this.findNodeByName(child, name);
      if (found) {
        return found;
      }
    }
    
    return null;
  }
}