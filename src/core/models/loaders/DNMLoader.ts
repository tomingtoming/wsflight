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
    // 最小限のサイズチェック（ヘッダー + バージョン + ノード数）
    const minSize = 4 + 4 + 4; // シグネチャ + バージョン + ノード数
    if (buffer.byteLength < minSize) {
      console.error(`Invalid DNM file format: File size too small (${buffer.byteLength} bytes, minimum is ${minSize} bytes)`);
      return new THREE.Group();
    }

    const dataView = new DataView(buffer);
    let offset = 0;
    
    try {
      // DNMファイルのヘッダーを読み取る
      // YSFLIGHTのDNMファイルは "DNM " で始まる
      // バージョンによっては "DYNA" で始まるものもある
      const signature = this.readString(dataView, offset, 4);
      offset += 4;
      
      // バイナリのダンプを出力（デバッグ用）
      this.dumpBinaryHeader(dataView, 0, Math.min(32, buffer.byteLength));
      
      // シグネチャの検証
      const validSignatures = ["DNM ", "DYNA"];
      if (!validSignatures.includes(signature)) {
        console.error(`Invalid DNM file format: Expected signature "DNM " or "DYNA" but got "${signature}"`);
        // エンディアンの異なる可能性もチェック
        if (this.swapEndianness(signature) === "DNM " || this.swapEndianness(signature) === "DYNA") {
          console.warn("File might have different endianness than expected. Attempting to swap bytes.");
          return this.parseWithDifferentEndianness(buffer);
        }
        return new THREE.Group();
      }
      
      const isDynamicFormat = (signature === "DYNA");
      
      // バージョン情報を読み取る
      if (offset + 4 > buffer.byteLength) {
        console.error("Invalid DNM file format: Unexpected end of file when reading version");
        return new THREE.Group();
      }
      const version = dataView.getInt32(offset, true);
      offset += 4;
      
      // バージョン番号が異常に大きい場合、エンディアンネスが異なる可能性がある
      if (version > 1000000) {
        console.warn(`DNM Version number suspiciously high: ${version}. Attempting to read with different endianness.`);
        return this.parseWithDifferentEndianness(buffer);
      }
      
      console.log(`DNM Version: ${version}, Format: ${isDynamicFormat ? "Dynamic" : "Standard"}`);
      
      // ノード数を読み取る
      if (offset + 4 > buffer.byteLength) {
        console.error("Invalid DNM file format: Unexpected end of file when reading node count");
        return new THREE.Group();
      }
      const numNodes = dataView.getInt32(offset, true);
      offset += 4;
      console.log(`Number of nodes: ${numNodes}`);
      
      // 負の値や極端に大きいノード数のチェック
      if (numNodes < 0 || numNodes > 10000) {
        console.error(`Invalid DNM file format: Unexpected number of nodes (${numNodes})`);
        return new THREE.Group();
      }
      
      // ルートグループを作成
      const rootGroup = new THREE.Group();
      rootGroup.name = "DNM_Root";
      
      // Dynamic形式の場合、異なる処理が必要かもしれない
      if (isDynamicFormat) {
        console.warn("DYNA format detected. This format may require special handling.");
        // ここにDYNA形式の特別な処理を追加することができます
      }
      
      // ノード情報を読み取る
      for (let i = 0; i < numNodes; i++) {
        try {
          const nodeResult = this.parseNode(dataView, offset, version, buffer.byteLength);
          offset = nodeResult.newOffset;
          
          if (nodeResult.node) {
            rootGroup.add(nodeResult.node);
          }
        } catch (error) {
          console.error(`Error parsing node ${i}: ${error}`);
          // エラーが発生しても続行する
          continue;
        }
      }
      
      return rootGroup;
    } catch (error) {
      console.error(`Error parsing DNM file: ${error}`);
      return new THREE.Group();
    }
  }
  
  /**
   * エンディアンネスを変更して解析を試みる
   * @param buffer DNMファイルのバイナリデータ
   * @returns Three.jsのGroupオブジェクト
   */
  private parseWithDifferentEndianness(buffer: ArrayBuffer): THREE.Group {
    // この実装はシンプルな例です。実際には、すべての数値読み込みでエンディアンネスを逆にする必要があります
    console.warn("Attempting to parse with different endianness - Note: This is experimental");
    
    const dataView = new DataView(buffer);
    let offset = 0;
    
    try {
      // シグネチャ（エンディアンネスが逆転しているため、直接バイトを読み取る）
      const byte1 = dataView.getUint8(offset++);
      const byte2 = dataView.getUint8(offset++);
      const byte3 = dataView.getUint8(offset++);
      const byte4 = dataView.getUint8(offset++);
      
      const signature = String.fromCharCode(byte4, byte3, byte2, byte1);
      console.log(`Inverted signature: "${signature}"`);
      
      if (signature !== "DNM " && signature !== "DYNA") {
        console.error(`Still invalid signature after endianness swap: ${signature}`);
        return new THREE.Group();
      }
      
      // バージョン情報 (ビッグエンディアン)
      const version = dataView.getInt32(offset, false);
      offset += 4;
      console.log(`DNM Version (with swapped endianness): ${version}`);
      
      // ここから完全な実装が必要ですが、とりあえず空のグループを返します
      console.warn("Full implementation of different endianness parsing not completed yet");
      return new THREE.Group();
    } catch (error) {
      console.error(`Error in endianness-swapped parsing: ${error}`);
      return new THREE.Group();
    }
  }
  
  /**
   * バイナリファイルの先頭部分をダンプしてデバッグ情報を表示
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param length ダンプするバイト数
   */
  private dumpBinaryHeader(dataView: DataView, offset: number, length: number): void {
    let hexDump = '';
    let asciiDump = '';
    
    console.log(`Binary file header dump (${length} bytes):`);
    
    for (let i = 0; i < length; i++) {
      if (i % 16 === 0 && i > 0) {
        console.log(`0x${(i - 16).toString(16).padStart(4, '0')}: ${hexDump} | ${asciiDump}`);
        hexDump = '';
        asciiDump = '';
      }
      
      try {
        const byte = dataView.getUint8(offset + i);
        hexDump += byte.toString(16).padStart(2, '0') + ' ';
        // 表示可能なASCII文字の場合は表示し、そうでなければ '.' を表示
        asciiDump += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
      } catch (e) {
        hexDump += '?? ';
        asciiDump += '?';
      }
    }
    
    // 残りがあれば出力
    if (hexDump) {
      const lastLineOffset = Math.floor(length / 16) * 16;
      console.log(`0x${lastLineOffset.toString(16).padStart(4, '0')}: ${hexDump.padEnd(48, ' ')} | ${asciiDump}`);
    }
  }
  
  /**
   * 文字列のバイト順を反転する
   * @param str 元の文字列
   * @returns バイト順を反転した文字列
   */
  private swapEndianness(str: string): string {
    return str.split('').reverse().join('');
  }
  
  /**
   * DNMファイルのノード情報を解析する
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param version DNMファイルのバージョン
   * @param bufferLength バッファの全体サイズ
   * @returns ノード情報と新しいオフセット
   */
  private parseNode(dataView: DataView, offset: number, version: number, bufferLength: number): { node: THREE.Object3D | null, newOffset: number } {
    this.validateOffset(offset, 4, bufferLength, "node type");
    // ノードタイプを読み取る
    const nodeType = dataView.getInt32(offset, true);
    offset += 4;
    
    this.validateOffset(offset, 4, bufferLength, "name length");
    // ノード名を読み取る
    const nameLength = dataView.getInt32(offset, true);
    offset += 4;
    
    // 名前の長さが妥当かチェック
    if (nameLength <= 0 || nameLength > 255) {
      throw new Error(`Invalid node name length: ${nameLength}`);
    }
    
    this.validateOffset(offset, nameLength, bufferLength, "node name");
    const nodeName = this.readString(dataView, offset, nameLength);
    offset += nameLength;
    
    console.log(`Node: ${nodeName}, Type: ${nodeType}`);
    
    // ノードタイプに応じた処理
    switch (nodeType) {
      case 0: // 通常のメッシュノード
        return this.parseMeshNode(dataView, offset, nodeName, version, bufferLength);
      case 1: // 回転ノード
        return this.parseRotationNode(dataView, offset, nodeName, version, bufferLength);
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
   * @param bufferLength バッファの全体サイズ
   * @returns メッシュノードと新しいオフセット
   */
  private parseMeshNode(dataView: DataView, offset: number, nodeName: string, version: number, bufferLength: number): { node: THREE.Mesh, newOffset: number } {
    this.validateOffset(offset, 4, bufferLength, "vertex count");
    // 頂点数を読み取る
    const numVertices = dataView.getInt32(offset, true);
    offset += 4;
    
    // 頂点数が妥当かチェック
    if (numVertices <= 0 || numVertices > 100000) {
      throw new Error(`Invalid vertex count: ${numVertices}`);
    }
    
    // 頂点データを読み取る
    const vertices: number[] = [];
    for (let i = 0; i < numVertices; i++) {
      this.validateOffset(offset, 12, bufferLength, `vertex ${i} data`);
      const x = dataView.getFloat32(offset, true);
      offset += 4;
      const y = dataView.getFloat32(offset, true);
      offset += 4;
      const z = dataView.getFloat32(offset, true);
      offset += 4;
      
      // NaNやInfinityのチェック
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
        console.warn(`Invalid vertex coordinates at index ${i}: (${x}, ${y}, ${z})`);
        // デフォルト値を設定
        vertices.push(0, 0, 0);
      } else {
        // YSFLIGHTの座標系からThree.jsの座標系に変換
        vertices.push(x, y, -z);
      }
    }
    
    this.validateOffset(offset, 4, bufferLength, "polygon count");
    // 面数を読み取る
    const numPolygons = dataView.getInt32(offset, true);
    offset += 4;
    
    // 面数が妥当かチェック
    if (numPolygons < 0 || numPolygons > 100000) {
      throw new Error(`Invalid polygon count: ${numPolygons}`);
    }
    
    // 面データを読み取る
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    let hasTextures = false;
    let textureName = '';
    
    for (let i = 0; i < numPolygons; i++) {
      this.validateOffset(offset, 4, bufferLength, `polygon ${i} vertex count`);
      // 面の頂点数を読み取る
      const numVerticesInPolygon = dataView.getInt32(offset, true);
      offset += 4;
      
      // 頂点数が妥当かチェック
      if (numVerticesInPolygon < 3 || numVerticesInPolygon > 32) {
        console.warn(`Skipping polygon ${i} with invalid vertex count: ${numVerticesInPolygon}`);
        continue;
      }
      
      // 面の頂点インデックスを読み取る
      const polygonIndices: number[] = [];
      for (let j = 0; j < numVerticesInPolygon; j++) {
        this.validateOffset(offset, 4, bufferLength, `polygon ${i} vertex ${j} index`);
        const vertexIndex = dataView.getInt32(offset, true);
        offset += 4;
        
        // インデックスが妥当かチェック
        if (vertexIndex < 0 || vertexIndex >= numVertices) {
          console.warn(`Invalid vertex index ${vertexIndex} at polygon ${i}, vertex ${j}`);
          // 代わりに0を使用
          polygonIndices.push(0);
        } else {
          polygonIndices.push(vertexIndex);
        }
      }
      
      // 面の法線を読み取る（存在する場合）
      if (version >= 20) {
        this.validateOffset(offset, 12, bufferLength, `polygon ${i} normal`);
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
        try {
          this.validateOffset(offset, 4, bufferLength, `polygon ${i} texture flag`);
          const hasTexture = dataView.getInt32(offset, true);
          offset += 4;
          
          if (hasTexture === 1) {
            hasTextures = true;
            
            this.validateOffset(offset, 4, bufferLength, `polygon ${i} texture name length`);
            // テクスチャ名の長さを読み取る
            const textureNameLength = dataView.getInt32(offset, true);
            offset += 4;
            
            // テクスチャ名の長さが妥当かチェック
            if (textureNameLength <= 0 || textureNameLength > 255) {
              console.warn(`Invalid texture name length: ${textureNameLength} for polygon ${i}`);
              continue;
            }
            
            // テクスチャ名を読み取る
            this.validateOffset(offset, textureNameLength, bufferLength, `polygon ${i} texture name`);
            textureName = this.readString(dataView, offset, textureNameLength);
            offset += textureNameLength;
            
            // テクスチャ座標を読み取る
            for (let j = 0; j < numVerticesInPolygon; j++) {
              this.validateOffset(offset, 8, bufferLength, `polygon ${i} vertex ${j} UV`);
              const u = dataView.getFloat32(offset, true);
              offset += 4;
              const v = dataView.getFloat32(offset, true);
              offset += 4;
              
              // UV座標が妥当かチェック
              if (!isFinite(u) || !isFinite(v)) {
                console.warn(`Invalid UV coordinates at polygon ${i}, vertex ${j}: (${u}, ${v})`);
                uvs.push(0, 0);
              } else {
                // Three.jsのUV座標系に合わせる
                uvs.push(u, 1.0 - v);
              }
            }
          }
        } catch (error) {
          console.error(`Error reading texture data for polygon ${i}: ${error}`);
          // テクスチャ読み込みに失敗した場合は、そのポリゴンのテクスチャ情報をスキップ
          continue;
        }
      }
      
      // 三角形分割（三角形以外の面も三角形に分割）
      if (numVerticesInPolygon >= 3) {
        for (let j = 0; j < numVerticesInPolygon - 2; j++) {
          indices.push(polygonIndices[0], polygonIndices[j + 1], polygonIndices[j + 2]);
        }
      }
    }
    
    // インデックスが空の場合は空のメッシュを返す
    if (indices.length === 0) {
      console.warn(`Node ${nodeName} has no valid polygons`);
      const emptyGeometry = new THREE.BufferGeometry();
      const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
      const mesh = new THREE.Mesh(emptyGeometry, material);
      mesh.name = nodeName;
      return { node: mesh, newOffset: offset };
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
   * @param bufferLength バッファの全体サイズ
   * @returns 回転ノードと新しいオフセット
   */
  private parseRotationNode(dataView: DataView, offset: number, nodeName: string, version: number, bufferLength: number): { node: THREE.Group, newOffset: number } {
    // 回転軸の原点を読み取る
    this.validateOffset(offset, 12, bufferLength, "rotation origin");
    const originX = dataView.getFloat32(offset, true);
    offset += 4;
    const originY = dataView.getFloat32(offset, true);
    offset += 4;
    const originZ = dataView.getFloat32(offset, true);
    offset += 4;
    
    // 回転軸の方向を読み取る
    this.validateOffset(offset, 12, bufferLength, "rotation axis");
    const axisX = dataView.getFloat32(offset, true);
    offset += 4;
    const axisY = dataView.getFloat32(offset, true);
    offset += 4;
    const axisZ = dataView.getFloat32(offset, true);
    offset += 4;
    
    // 回転角度の初期値を読み取る
    this.validateOffset(offset, 4, bufferLength, "initial angle");
    const initialAngle = dataView.getFloat32(offset, true);
    offset += 4;
    
    // 子ノード数を読み取る
    this.validateOffset(offset, 4, bufferLength, "child node count");
    const numChildren = dataView.getInt32(offset, true);
    offset += 4;
    
    // 子ノード数が妥当かチェック
    if (numChildren < 0 || numChildren > 1000) {
      throw new Error(`Invalid child node count: ${numChildren}`);
    }
    
    // 回転ノードを表すグループを作成
    const rotationGroup = new THREE.Group();
    rotationGroup.name = nodeName;
    
    // 回転軸の原点と方向をThree.jsの座標系に変換
    const origin = new THREE.Vector3(originX, originY, -originZ);
    
    // 軸ベクトルがゼロでないことを確認
    const axisLength = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
    let axis: THREE.Vector3;
    if (axisLength < 0.0001) {
      console.warn(`Zero-length rotation axis for node ${nodeName}, using default Y-up`);
      axis = new THREE.Vector3(0, 1, 0);
    } else {
      axis = new THREE.Vector3(axisX, axisY, -axisZ).normalize();
    }
    
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
      try {
        const childResult = this.parseNode(dataView, offset, version, bufferLength);
        offset = childResult.newOffset;
        
        if (childResult.node) {
          rotationGroup.add(childResult.node);
        }
      } catch (error) {
        console.error(`Error parsing child node ${i} of rotation node ${nodeName}: ${error}`);
        // エラーが発生しても続行する
        continue;
      }
    }
    
    return { node: rotationGroup, newOffset: offset };
  }
  
  /**
   * バッファ境界をチェックし、アクセス可能か検証する
   * @param offset 現在のオフセット
   * @param bytesToRead 読み取るバイト数
   * @param bufferLength バッファの全長
   * @param elementName エラーメッセージ用の要素名
   */
  private validateOffset(offset: number, bytesToRead: number, bufferLength: number, elementName: string): void {
    if (offset < 0 || offset + bytesToRead > bufferLength) {
      throw new Error(`Buffer access out of bounds when reading ${elementName} at offset ${offset}, needed ${bytesToRead} bytes but buffer length is ${bufferLength}`);
    }
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