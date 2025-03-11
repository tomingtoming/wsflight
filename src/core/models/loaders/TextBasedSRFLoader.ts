import * as THREE from 'three';

/**
 * YSFLIGHTのテキスト形式SRF（Surface）ファイルを読み込むためのローダー
 */
export class TextBasedSRFLoader {
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
      
      // テキストとして読み込む
      const text = await response.text();
      return this.parse(text);
    } catch (error) {
      console.error(`Error loading text-based SRF file: ${error}`);
      // エラー時は空のグループを返す
      return new THREE.Group();
    }
  }

  /**
   * SRFテキストファイルを解析する
   * @param text SRFファイルのテキスト内容
   * @returns Three.jsのGroupオブジェクト
   */
  private parse(text: string): THREE.Group {
    // ルートグループを作成
    const rootGroup = new THREE.Group();
    rootGroup.name = "SRF_Model";

    try {
      // 行ごとに分割
      const lines = text.split('\n');
      
      // ヘッダー確認
      if (lines.length < 1 || !lines[0].startsWith('SURF')) {
        throw new Error('Invalid text-based SRF file format: Missing SURF header');
      }
      
      console.log(`Parsing text-based SRF with ${lines.length} lines`);
      
      // 頂点と面のデータを格納する配列
      const vertices: number[] = [];
      const indices: number[] = [];
      const normals: number[] = [];
      const colors: number[] = [];
      
      // 頂点カラーのデフォルト
      let currentRed = 0.8;
      let currentGreen = 0.8;
      let currentBlue = 0.8;
      
      // 行ごとに処理
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 空行はスキップ
        if (line === '') continue;
        
        // 頂点定義（例: "V 0 0.6 4.2 R"）
        if (line.startsWith('V ')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);
            
            // YSFLIGHTの座標系からThree.jsの座標系に変換
            vertices.push(x, y, -z);
            
            // 残りのフラグや色情報を処理
            let hasColor = false;
            for (let j = 4; j < parts.length; j++) {
              // R = 赤, G = 緑, B = 青, W = 白, L = 照明あり, N = 法線あり, など
              if (parts[j] === 'R') {
                currentRed = 1.0; currentGreen = 0.0; currentBlue = 0.0;
                hasColor = true;
              } else if (parts[j] === 'G') {
                currentRed = 0.0; currentGreen = 1.0; currentBlue = 0.0;
                hasColor = true;
              } else if (parts[j] === 'B') {
                currentRed = 0.0; currentGreen = 0.0; currentBlue = 1.0;
                hasColor = true;
              } else if (parts[j] === 'W') {
                currentRed = 1.0; currentGreen = 1.0; currentBlue = 1.0;
                hasColor = true;
              } else if (parts[j] === 'C') {
                currentRed = 0.0; currentGreen = 1.0; currentBlue = 1.0;
                hasColor = true;
              } else if (parts[j] === 'M') {
                currentRed = 1.0; currentGreen = 0.0; currentBlue = 1.0;
                hasColor = true;
              } else if (parts[j] === 'Y') {
                currentRed = 1.0; currentGreen = 1.0; currentBlue = 0.0;
                hasColor = true;
              }
            }
            
            // 現在の色を頂点カラーとして追加
            if (hasColor) {
              colors.push(currentRed, currentGreen, currentBlue);
            }
          }
        }
        // 面定義（例: "F 0 1 2 3"）
        else if (line.startsWith('F ')) {
          const parts = line.split(/\s+/).slice(1); // "F "以降の部分を取得
          
          // インデックスが数値かどうか確認
          const indexValues = parts.map(p => parseInt(p, 10))
            .filter(idx => !isNaN(idx) && idx >= 0);
          
          // 三角形分割
          if (indexValues.length >= 3) {
            const firstVertex = indexValues[0];
            
            // 面の法線を計算
            const v0 = new THREE.Vector3(
              vertices[firstVertex * 3],
              vertices[firstVertex * 3 + 1],
              vertices[firstVertex * 3 + 2]
            );
            const v1 = new THREE.Vector3(
              vertices[indexValues[1] * 3],
              vertices[indexValues[1] * 3 + 1],
              vertices[indexValues[1] * 3 + 2]
            );
            const v2 = new THREE.Vector3(
              vertices[indexValues[2] * 3],
              vertices[indexValues[2] * 3 + 1],
              vertices[indexValues[2] * 3 + 2]
            );
            
            const edge1 = new THREE.Vector3().subVectors(v1, v0);
            const edge2 = new THREE.Vector3().subVectors(v2, v0);
            const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
            
            // 三角形分割
            for (let j = 1; j < indexValues.length - 1; j++) {
              const vertex2 = indexValues[j];
              const vertex3 = indexValues[j + 1];
              
              indices.push(firstVertex, vertex2, vertex3);
              
              // 法線を各頂点に適用
              normals.push(normal.x, normal.y, normal.z);
              normals.push(normal.x, normal.y, normal.z);
              normals.push(normal.x, normal.y, normal.z);
            }
          }
        }
        // 色定義（例: "C 1.0 0.0 0.0"）- 次の頂点や面に適用される色
        else if (line.startsWith('C ')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            currentRed = parseFloat(parts[1]);
            currentGreen = parseFloat(parts[2]);
            currentBlue = parseFloat(parts[3]);
            
            // 値が0-1の範囲になるよう正規化
            currentRed = Math.max(0, Math.min(1, currentRed));
            currentGreen = Math.max(0, Math.min(1, currentGreen));
            currentBlue = Math.max(0, Math.min(1, currentBlue));
          }
        }
        // その他のコマンド - 今のところ無視
      }
      
      console.log(`Loaded text-based SRF model with ${vertices.length/3} vertices and ${indices.length/3} triangles`);
      
      // データが存在する場合のみジオメトリを作成
      if (vertices.length > 0 && indices.length > 0) {
        // ジオメトリを作成
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        
        // 頂点法線が十分にある場合はそれを使用、そうでなければ計算
        if (normals.length === vertices.length) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        } else {
          geometry.computeVertexNormals();
        }
        
        // 頂点カラーがある場合は適用
        if (colors.length > 0) {
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        }
        
        // マテリアルを作成（頂点カラーを使用）
        const material = new THREE.MeshPhongMaterial({
          vertexColors: colors.length > 0,
          flatShading: true,
          side: THREE.DoubleSide
        });
        
        // メッシュを作成
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "SRF_Mesh";
        
        // ルートグループに追加
        rootGroup.add(mesh);
      }
    } catch (error) {
      console.error(`Error parsing text-based SRF file: ${error}`);
    }
    
    return rootGroup;
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