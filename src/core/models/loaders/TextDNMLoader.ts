import * as THREE from 'three';

/**
 * YSFLIGHTのテキスト形式DNM（Dynamic Model）ファイルを読み込むためのローダー
 * バイナリ形式とは異なり、テキスト形式のファイルを解析する
 */
export class TextDNMLoader {
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
      const text = await response.text();
      return this.parse(text, url);
    } catch (error) {
      console.error(`Error loading DNM file: ${error}`);
      // エラー時は空のグループを返す
      return new THREE.Group();
    }
  }
  
  /**
   * DNMテキストデータを解析する
   * @param text DNMファイルのテキストデータ
   * @param url ファイルURL (デバッグ用)
   * @returns Three.jsのGroupオブジェクト
   */
  private parse(text: string, url: string): THREE.Group {
    try {
      // テキストを行に分割
      const lines = text.split('\n').map(line => line.trim());
      
      // ヘッダー検証
      if (lines.length < 2 || lines[0] !== "DYNAMODEL") {
        console.error(`Invalid DNM text format in ${url}: Missing DYNAMODEL header`);
        return new THREE.Group();
      }
      
      // バージョン検出
      const versionLine = lines[1];
      if (!versionLine.startsWith("DNMVER ")) {
        console.error(`Invalid DNM text format in ${url}: Missing version information`);
        return new THREE.Group();
      }
      
      const version = parseInt(versionLine.substring(7), 10);
      console.log(`DNM Text Version: ${version}`);
      
      // ルートグループを作成
      const rootGroup = new THREE.Group();
      rootGroup.name = "DNM_Root";
      
      // 行ごとに解析
      let lineIndex = 2;
      while (lineIndex < lines.length) {
        const line = lines[lineIndex];
        
        // 空行または終端
        if (!line || line === "END") {
          lineIndex++;
          continue;
        }
        
        // ノード定義
        if (line.startsWith("PCK ")) {
          const result = this.parsePackage(lines, lineIndex, version);
          if (result.node) {
            rootGroup.add(result.node);
          }
          lineIndex = result.nextLineIndex;
          continue;
        }
        
        // 回転ノード定義
        if (line.startsWith("ROT ")) {
          const result = this.parseRotationNode(lines, lineIndex, version);
          if (result.node) {
            rootGroup.add(result.node);
          }
          lineIndex = result.nextLineIndex;
          continue;
        }
        
        // その他の行は無視
        lineIndex++;
      }
      
      return rootGroup;
    } catch (error) {
      console.error(`Error parsing DNM text file: ${error}`);
      return new THREE.Group();
    }
  }
  
  /**
   * パッケージ（メッシュノード）を解析する
   * @param lines テキスト行の配列
   * @param startLine 開始行インデックス
   * @param version DNMファイルのバージョン
   * @returns ノード情報と次の行インデックス
   */
  private parsePackage(lines: string[], startLine: number, version: number): { 
    node: THREE.Object3D | null, 
    nextLineIndex: number 
  } {
    const nodeName = lines[startLine].substring(4).trim();
    console.log(`Parsing Package: ${nodeName}`);
    
    let lineIndex = startLine + 1;
    let hasVertices = false;
    let hasPolygons = false;
    
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // "END"まで行を解析
    while (lineIndex < lines.length && lines[lineIndex] !== "END") {
      const line = lines[lineIndex].trim();
      
      // 頂点定義（V x y z）
      if (line.startsWith("V ")) {
        hasVertices = true;
        const parts = line.split(" ");
        if (parts.length >= 4) {
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const z = parseFloat(parts[3]);
          
          // YSFLIGHTの座標系からThree.jsの座標系に変換
          vertices.push(x, y, -z);
        }
      }
      
      // ポリゴン定義（F v1 v2 v3 ...）
      else if (line.startsWith("F ")) {
        hasPolygons = true;
        const parts = line.split(" ").filter(p => p !== "");
        if (parts.length >= 4) { // F + 少なくとも3つの頂点
          const vertexIndices: number[] = [];
          
          for (let i = 1; i < parts.length; i++) {
            const index = parseInt(parts[i], 10);
            if (!isNaN(index)) {
              vertexIndices.push(index);
            }
          }
          
          // 三角形に分割
          for (let i = 0; i < vertexIndices.length - 2; i++) {
            indices.push(vertexIndices[0], vertexIndices[i + 1], vertexIndices[i + 2]);
          }
        }
      }
      
      lineIndex++;
    }
    
    // "END"まで進む
    if (lineIndex < lines.length && lines[lineIndex] === "END") {
      lineIndex++;
    }
    
    // メッシュを作成
    if (hasVertices && hasPolygons) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      
      const material = new THREE.MeshPhongMaterial({
        color: 0x888888,
        flatShading: false,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = nodeName;
      
      return { node: mesh, nextLineIndex: lineIndex };
    }
    
    return { node: null, nextLineIndex: lineIndex };
  }
  
  /**
   * 回転ノードを解析する
   * @param lines テキスト行の配列
   * @param startLine 開始行インデックス
   * @param version DNMファイルのバージョン
   * @returns ノード情報と次の行インデックス
   */
  private parseRotationNode(lines: string[], startLine: number, version: number): { 
    node: THREE.Group | null, 
    nextLineIndex: number 
  } {
    // ROTパラメータを取得
    const rotLine = lines[startLine].split(" ");
    if (rotLine.length < 8) {
      console.warn(`Invalid rotation node definition at line ${startLine}`);
      return { node: null, nextLineIndex: startLine + 1 };
    }
    
    const nodeName = rotLine[1].trim();
    console.log(`Parsing Rotation Node: ${nodeName}`);
    
    // 回転軸の原点と方向ベクトル
    const originX = parseFloat(rotLine[2]);
    const originY = parseFloat(rotLine[3]);
    const originZ = parseFloat(rotLine[4]);
    
    const axisX = parseFloat(rotLine[5]);
    const axisY = parseFloat(rotLine[6]);
    const axisZ = parseFloat(rotLine[7]);
    
    // 初期角度（指定されていれば）
    let initialAngle = 0;
    if (rotLine.length > 8) {
      initialAngle = parseFloat(rotLine[8]) * (Math.PI / 180.0); // 度からラジアンへ変換
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
    let lineIndex = startLine + 1;
    
    // "END"まで子ノードを解析
    while (lineIndex < lines.length && lines[lineIndex] !== "END") {
      const line = lines[lineIndex].trim();
      
      // 子ノード: パッケージ
      if (line.startsWith("PCK ")) {
        const result = this.parsePackage(lines, lineIndex, version);
        if (result.node) {
          rotationGroup.add(result.node);
        }
        lineIndex = result.nextLineIndex;
        continue;
      }
      
      // 子ノード: 回転ノード
      if (line.startsWith("ROT ")) {
        const result = this.parseRotationNode(lines, lineIndex, version);
        if (result.node) {
          rotationGroup.add(result.node);
        }
        lineIndex = result.nextLineIndex;
        continue;
      }
      
      // その他の行は無視
      lineIndex++;
    }
    
    // "END"まで進む
    if (lineIndex < lines.length && lines[lineIndex] === "END") {
      lineIndex++;
    }
    
    return { node: rotationGroup, nextLineIndex: lineIndex };
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