import * as THREE from 'three';

/**
 * YSFLIGHTのテキスト形式SRF（Surface）ファイルを読み込むためのローダー
 * バイナリ形式とは異なり、テキスト形式のファイルを解析する
 */
export class TextSRFLoader {
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
      const text = await response.text();
      return this.parse(text, url);
    } catch (error) {
      console.error(`Error loading SRF file: ${error}`);
      // エラー時は空のグループを返す
      return new THREE.Group();
    }
  }
  
  /**
   * SRFテキストデータを解析する
   * @param text SRFファイルのテキストデータ
   * @param url ファイルURL (デバッグ用)
   * @returns Three.jsのGroupオブジェクト
   */
  private parse(text: string, url: string): THREE.Group {
    try {
      // テキストを行に分割
      const lines = text.split('\n').map(line => line.trim());
      
      // ヘッダー検証
      if (lines.length < 1 || lines[0] !== "SURF") {
        console.error(`Invalid SRF text format in ${url}: Missing SURF header`);
        return new THREE.Group();
      }
      
      console.log(`Parsing text SRF file: ${url}`);
      
      // 頂点データと面データを収集
      const vertices: number[] = [];
      const indices: number[] = [];
      const colors: number[] = [];
      const normals: number[] = [];
      
      let vertexIndex = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line || line.startsWith("#")) {
          // 空行またはコメント行
          continue;
        }
        
        // 頂点定義（V x y z [r g b [a]]）
        if (line.startsWith("V ")) {
          const parts = line.split(" ").filter(p => p !== "");
          
          if (parts.length >= 4) {
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);
            
            // YSFLIGHTの座標系からThree.jsの座標系に変換
            vertices.push(x, y, -z);
            
            // 色情報（存在する場合）
            let r = 0.8, g = 0.8, b = 0.8;
            
            // カラーコード（"R", "G", "B"など）がある場合
            if (parts.length > 4 && parts[parts.length - 1].match(/[A-Z]/)) {
              const colorCode = parts[parts.length - 1];
              
              switch(colorCode) {
                case "R": r = 1.0; g = 0.2; b = 0.2; break; // 赤
                case "G": r = 0.2; g = 1.0; b = 0.2; break; // 緑
                case "B": r = 0.2; g = 0.2; b = 1.0; break; // 青
                case "C": r = 0.2; g = 1.0; b = 1.0; break; // シアン
                case "M": r = 1.0; g = 0.2; b = 1.0; break; // マゼンタ
                case "Y": r = 1.0; g = 1.0; b = 0.2; break; // 黄
                case "W": r = 1.0; g = 1.0; b = 1.0; break; // 白
                case "K": r = 0.2; g = 0.2; b = 0.2; break; // 黒
                default:  r = 0.8; g = 0.8; b = 0.8; break; // デフォルトはグレー
              }
            } 
            // RGB値が直接指定されている場合
            else if (parts.length >= 7) {
              r = parseFloat(parts[4]);
              g = parseFloat(parts[5]);
              b = parseFloat(parts[6]);
            }
            
            colors.push(r, g, b);
            
            // 法線値はまだ設定しない（後で計算する）
            
            vertexIndex++;
          }
        }
        
        // 多角形面定義（P 頂点数 v1 v2 v3 ... nx ny nz [r g b [a]]）
        else if (line.startsWith("P ")) {
          const parts = line.split(" ").filter(p => p !== "");
          
          if (parts.length >= 5) { // P + 頂点数 + 最低2頂点 + 法線
            const numVertices = parseInt(parts[1], 10);
            const vertexIndices: number[] = [];
            
            for (let j = 0; j < numVertices; j++) {
              if (2 + j < parts.length) {
                const index = parseInt(parts[2 + j], 10);
                if (!isNaN(index) && index >= 0 && index < vertexIndex) {
                  vertexIndices.push(index);
                }
              }
            }
            
            // 法線情報（指定されていれば）
            const normalStartIdx = 2 + numVertices;
            if (normalStartIdx + 2 < parts.length) {
              const nx = parseFloat(parts[normalStartIdx]);
              const ny = parseFloat(parts[normalStartIdx + 1]);
              const nz = parseFloat(parts[normalStartIdx + 2]);
              
              // 法線をThree.jsの座標系に変換
              for (let j = 0; j < vertexIndices.length; j++) {
                normals[vertexIndices[j] * 3] = nx;
                normals[vertexIndices[j] * 3 + 1] = ny;
                normals[vertexIndices[j] * 3 + 2] = -nz;
              }
            }
            
            // 三角形に分割
            for (let j = 0; j < vertexIndices.length - 2; j++) {
              indices.push(vertexIndices[0], vertexIndices[j + 1], vertexIndices[j + 2]);
            }
          }
        }
        
        // 三角形面定義（F v1 v2 v3 [nx ny nz] [r g b [a]]）
        else if (line.startsWith("F ")) {
          const parts = line.split(" ").filter(p => p !== "");
          
          if (parts.length >= 4) { // F + 3つの頂点
            const v1 = parseInt(parts[1], 10);
            const v2 = parseInt(parts[2], 10);
            const v3 = parseInt(parts[3], 10);
            
            if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3) &&
                v1 >= 0 && v1 < vertexIndex &&
                v2 >= 0 && v2 < vertexIndex &&
                v3 >= 0 && v3 < vertexIndex) {
              indices.push(v1, v2, v3);
              
              // 法線情報（指定されていれば）
              if (parts.length >= 7) {
                const nx = parseFloat(parts[4]);
                const ny = parseFloat(parts[5]);
                const nz = parseFloat(parts[6]);
                
                // 法線をThree.jsの座標系に変換
                normals[v1 * 3] = nx;
                normals[v1 * 3 + 1] = ny;
                normals[v1 * 3 + 2] = -nz;
                
                normals[v2 * 3] = nx;
                normals[v2 * 3 + 1] = ny;
                normals[v2 * 3 + 2] = -nz;
                
                normals[v3 * 3] = nx;
                normals[v3 * 3 + 1] = ny;
                normals[v3 * 3 + 2] = -nz;
              }
            }
          }
        }
      }
      
      // メッシュを作成
      if (vertices.length > 0 && indices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // 色情報がすべての頂点に揃っている場合
        if (colors.length === vertices.length) {
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        }
        
        // 法線情報がすべての頂点に揃っている場合
        if (normals.length === vertices.length) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        } else {
          geometry.computeVertexNormals();
        }
        
        geometry.setIndex(indices);
        
        // マテリアルを作成（頂点カラーを使用）
        const material = new THREE.MeshPhongMaterial({
          vertexColors: colors.length === vertices.length,
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
      
      console.warn(`No valid geometry data found in SRF file: ${url}`);
      return new THREE.Group();
    } catch (error) {
      console.error(`Error parsing SRF text file: ${error}`);
      return new THREE.Group();
    }
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