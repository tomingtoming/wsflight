import * as THREE from 'three';

/**
 * YSFLIGHTのテキスト形式DNM（Dynamic Model）ファイルを読み込むためのローダー
 */
export class TextBasedDNMLoader {
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
      
      // テキストとして読み込む
      const text = await response.text();
      return this.parse(text);
    } catch (error) {
      console.error(`Error loading text-based DNM file: ${error}`);
      // エラー時は空のグループを返す
      return new THREE.Group();
    }
  }

  /**
   * DNMテキストファイルを解析する
   * @param text DNMファイルのテキスト内容
   * @returns Three.jsのGroupオブジェクト
   */
  private parse(text: string): THREE.Group {
    // ルートグループを作成
    const rootGroup = new THREE.Group();
    rootGroup.name = "DNM_Root";

    try {
      // 行ごとに分割
      const lines = text.split('\n');
      
      // ヘッダー確認
      if (lines.length < 2 || !lines[0].startsWith('DYNAMODEL')) {
        throw new Error('Invalid text-based DNM file format: Missing DYNAMODEL header');
      }
      
      // バージョン確認
      const versionMatch = lines[1].match(/DNMVER\s+(\d+)/);
      if (!versionMatch) {
        throw new Error('Invalid text-based DNM file format: Missing or invalid version');
      }
      
      const version = parseInt(versionMatch[1], 10);
      console.log(`Text-based DNM version: ${version}`);
      
      // パース処理の開始
      let lineIndex = 2;
      
      // シェルのパース
      while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        // シェルの定義行を検索
        if (line.startsWith('SHL')) {
          const { mesh, newIndex } = this.parseShell(lines, lineIndex);
          if (mesh) {
            rootGroup.add(mesh);
          }
          lineIndex = newIndex;
        }
        // 回転ノードの定義行
        else if (line.startsWith('ROT')) {
          const { rotGroup, newIndex } = this.parseRotationNode(lines, lineIndex);
          if (rotGroup) {
            rootGroup.add(rotGroup);
          }
          lineIndex = newIndex;
        }
        // 他のコマンド
        else {
          lineIndex++;
        }
      }
      
      console.log(`Loaded text-based DNM model with ${rootGroup.children.length} nodes`);
      
    } catch (error) {
      console.error(`Error parsing text-based DNM file: ${error}`);
    }
    
    return rootGroup;
  }
  
  /**
   * シェル（メッシュ）ノードを解析する
   * @param lines ファイルの行配列
   * @param startIndex 開始行インデックス
   * @returns メッシュと次の行インデックス
   */
  private parseShell(lines: string[], startIndex: number): { mesh: THREE.Mesh | null, newIndex: number } {
    let lineIndex = startIndex;
    
    try {
      // SHL行を解析（例: "SHL shellName"）
      const parts = lines[lineIndex].trim().split(/\s+/);
      const shellName = parts[1] || `Shell_${startIndex}`;
      lineIndex++;
      
      // 頂点と面のデータを格納する配列
      const vertices: number[] = [];
      const indices: number[] = [];
      const normals: number[] = [];
      
      // 頂点データを読み取る
      while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        // 頂点定義（例: "V 0 0.6 4.2 R"）
        if (line.startsWith('V ')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);
            
            // YSFLIGHTの座標系からThree.jsの座標系に変換
            vertices.push(x, y, -z);
          }
          lineIndex++;
        }
        // 面定義（例: "F 0 1 2 3"）
        else if (line.startsWith('F ')) {
          const parts = line.split(/\s+/).slice(1); // "F "以降の部分を取得
          
          // 三角形分割
          if (parts.length >= 3) {
            const firstVertex = parseInt(parts[0], 10);
            for (let i = 1; i < parts.length - 1; i++) {
              const vertex2 = parseInt(parts[i], 10);
              const vertex3 = parseInt(parts[i + 1], 10);
              indices.push(firstVertex, vertex2, vertex3);
            }
          }
          
          lineIndex++;
        }
        // 法線定義（例: "N 0 1 0"）
        else if (line.startsWith('N ')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const nx = parseFloat(parts[1]);
            const ny = parseFloat(parts[2]);
            const nz = parseFloat(parts[3]);
            
            // YSFLIGHTの座標系からThree.jsの座標系に変換
            normals.push(nx, ny, -nz);
          }
          lineIndex++;
        }
        // 別のシェル・回転ノードの開始または終了
        else if (line.startsWith('SHL') || line.startsWith('ROT') || line.startsWith('END')) {
          break;
        }
        else {
          // その他の行はスキップ
          lineIndex++;
        }
      }
      
      // ジオメトリを作成
      const geometry = new THREE.BufferGeometry();
      
      if (vertices.length > 0) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        if (indices.length > 0) {
          geometry.setIndex(indices);
        }
        
        if (normals.length > 0 && normals.length === vertices.length) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        } else {
          geometry.computeVertexNormals();
        }
        
        // マテリアルを作成
        const material = new THREE.MeshPhongMaterial({
          color: 0x888888,
          flatShading: false,
          side: THREE.DoubleSide
        });
        
        // メッシュを作成
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = shellName;
        
        return { mesh, newIndex: lineIndex };
      }
      
      return { mesh: null, newIndex: lineIndex };
    } catch (error) {
      console.error(`Error parsing shell at line ${startIndex}: ${error}`);
      return { mesh: null, newIndex: startIndex + 1 };
    }
  }
  
  /**
   * 回転ノードを解析する
   * @param lines ファイルの行配列
   * @param startIndex 開始行インデックス
   * @returns 回転グループと次の行インデックス
   */
  private parseRotationNode(lines: string[], startIndex: number): { rotGroup: THREE.Group | null, newIndex: number } {
    let lineIndex = startIndex;
    
    try {
      // ROT行を解析（例: "ROT nodeName"）
      const parts = lines[lineIndex].trim().split(/\s+/);
      const nodeName = parts[1] || `Rotation_${startIndex}`;
      lineIndex++;
      
      // 回転ノード情報
      let originX = 0, originY = 0, originZ = 0;
      let axisX = 0, axisY = 1, axisZ = 0;
      let initialAngle = 0;
      
      // 回転軸情報を読み取る
      while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        // 原点定義（例: "POS 0 0 0"）
        if (line.startsWith('POS ')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            originX = parseFloat(parts[1]);
            originY = parseFloat(parts[2]);
            originZ = parseFloat(parts[3]);
          }
          lineIndex++;
        }
        // 軸定義（例: "VEC 0 1 0"）
        else if (line.startsWith('VEC ')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            axisX = parseFloat(parts[1]);
            axisY = parseFloat(parts[2]);
            axisZ = parseFloat(parts[3]);
          }
          lineIndex++;
        }
        // 初期角度（例: "ANG 0.0"）
        else if (line.startsWith('ANG ')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            initialAngle = parseFloat(parts[1]);
          }
          lineIndex++;
        }
        // 子ノードか終了
        else if (line.startsWith('SHL') || line.startsWith('ROT') || line.startsWith('END')) {
          break;
        }
        else {
          // その他の行はスキップ
          lineIndex++;
        }
      }
      
      // 回転ノードを表すグループを作成
      const rotationGroup = new THREE.Group();
      rotationGroup.name = nodeName;
      
      // 回転軸の原点と方向をThree.jsの座標系に変換
      const origin = new THREE.Vector3(originX, originY, -originZ);
      
      // 軸ベクトルがゼロでないか確認
      const axisLength = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
      let axis: THREE.Vector3;
      
      if (axisLength < 0.0001) {
        console.warn(`Zero-length rotation axis for node ${nodeName}, using default Y-up`);
        axis = new THREE.Vector3(0, 1, 0);
      } else {
        // YSFLIGHTの座標系からThree.jsの座標系に変換
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
      
      // 子ノードを処理
      while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        if (line.startsWith('SHL')) {
          const { mesh, newIndex } = this.parseShell(lines, lineIndex);
          if (mesh) {
            rotationGroup.add(mesh);
          }
          lineIndex = newIndex;
        }
        else if (line.startsWith('ROT')) {
          const { rotGroup, newIndex } = this.parseRotationNode(lines, lineIndex);
          if (rotGroup) {
            rotationGroup.add(rotGroup);
          }
          lineIndex = newIndex;
        }
        else if (line.startsWith('END')) {
          lineIndex++;
          break;
        }
        else {
          lineIndex++;
        }
      }
      
      return { rotGroup: rotationGroup, newIndex: lineIndex };
    } catch (error) {
      console.error(`Error parsing rotation node at line ${startIndex}: ${error}`);
      return { rotGroup: null, newIndex: startIndex + 1 };
    }
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