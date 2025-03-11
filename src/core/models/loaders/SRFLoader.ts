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
      return this.parse(buffer, url);
    } catch (error) {
      console.error(`Error loading SRF file: ${error}`);
      // エラー時は空のグループを返す
      return new THREE.Group();
    }
  }
  
  /**
   * SRFファイルのバイナリデータを解析する
   * @param buffer SRFファイルのバイナリデータ
   * @param url ファイルURL (ログ出力用)
   * @returns Three.jsのGroupオブジェクト
   */
  private parse(buffer: ArrayBuffer, url: string = "unknown"): THREE.Group {
    // 最小限のサイズチェック（ヘッダー + バージョン + 頂点数）
    const minSize = 4 + 4 + 4; // シグネチャ + バージョン + 頂点数
    if (buffer.byteLength < minSize) {
      console.error(`Invalid SRF file format: File size too small (${buffer.byteLength} bytes, minimum is ${minSize} bytes)`);
      return new THREE.Group();
    }

    // バイナリのヘッダーダンプを出力（デバッグ用）
    this.dumpBinaryHeader(new DataView(buffer), 0, Math.min(32, buffer.byteLength), url);

    const dataView = new DataView(buffer);
    let offset = 0;
    
    try {
      // SRFファイルのヘッダーを読み取る
      // YSFLIGHTのSRFファイルは通常 "SURF" で始まる
      const signature = this.readString(dataView, offset, 4);
      offset += 4;

      // シグネチャの検証
      const validSignatures = ["SURF"];
      
      if (!validSignatures.includes(signature)) {
        console.error(`Invalid SRF file format in ${url}: Expected signature "SURF" but got "${signature}"`);
        
        // エンディアンが異なる可能性をチェック
        if (this.swapEndianness(signature) === "SURF") {
          console.warn(`${url}: File might have different endianness than expected, trying to swap`);
          return this.parseWithDifferentEndianness(buffer, url);
        }
        
        // 他のファイルタイプの可能性もチェック
        if (signature === "DYNM" || signature === "DNM ") {
          console.warn(`${url}: This appears to be a DNM file, not an SRF file`);
          return new THREE.Group();
        }
        
        return new THREE.Group();
      }
      
      // バージョン情報を読み取る
      this.validateOffset(offset, 4, buffer.byteLength, "version");
      const version = dataView.getInt32(offset, true);
      offset += 4;
      
      // 不自然に大きいバージョン番号はエンディアン問題の兆候
      if (version > 1000000) {
        console.warn(`${url}: SRF Version number suspiciously high: ${version}. Attempting to read with different endianness.`);
        return this.parseWithDifferentEndianness(buffer, url);
      }
      
      console.log(`SRF Version: ${version}`);
      
      // 頂点数を読み取る
      this.validateOffset(offset, 4, buffer.byteLength, "vertex count");
      const numVertices = dataView.getInt32(offset, true);
      offset += 4;
      
      // 頂点数が妥当かチェック
      if (numVertices <= 0 || numVertices > 100000) {
        console.error(`${url}: Invalid vertex count: ${numVertices}, might be an endianness issue`);
        return this.parseWithDifferentEndianness(buffer, url);
      }
      
      console.log(`Number of vertices: ${numVertices}`);
      
      // 頂点データを読み取る
      const vertices: number[] = [];
      for (let i = 0; i < numVertices; i++) {
        this.validateOffset(offset, 12, buffer.byteLength, `vertex ${i} data`);
        const x = dataView.getFloat32(offset, true);
        offset += 4;
        const y = dataView.getFloat32(offset, true);
        offset += 4;
        const z = dataView.getFloat32(offset, true);
        offset += 4;
        
        // NaNやInfinityのチェック
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
          console.warn(`${url}: Invalid vertex coordinates at index ${i}: (${x}, ${y}, ${z})`);
          // デフォルト値を設定
          vertices.push(0, 0, 0);
        } else {
          // YSFLIGHTの座標系からThree.jsの座標系に変換
          vertices.push(x, y, -z);
        }
      }
      
      // 面数を読み取る
      this.validateOffset(offset, 4, buffer.byteLength, "polygon count");
      const numPolygons = dataView.getInt32(offset, true);
      offset += 4;
      
      // 面数が妥当かチェック
      if (numPolygons < 0 || numPolygons > 100000) {
        console.error(`${url}: Invalid polygon count: ${numPolygons}, might be an endianness issue`);
        return this.parseWithDifferentEndianness(buffer, url);
      }
      
      console.log(`Number of polygons: ${numPolygons}`);
      
      // 面データを読み取る
      const indices: number[] = [];
      const normals: number[] = [];
      const colors: number[] = [];
      
      for (let i = 0; i < numPolygons; i++) {
        try {
          // 面の頂点数を読み取る
          this.validateOffset(offset, 4, buffer.byteLength, `polygon ${i} vertex count`);
          const numVerticesInPolygon = dataView.getInt32(offset, true);
          offset += 4;
          
          // 頂点数が妥当かチェック
          if (numVerticesInPolygon < 3 || numVerticesInPolygon > 32) {
            console.warn(`${url}: Skipping polygon ${i} with invalid vertex count: ${numVerticesInPolygon}`);
            // このポリゴンをスキップして、次の安全なポイントに移動を試みる
            offset = this.findNextValidOffset(dataView, offset, buffer.byteLength);
            continue;
          }
          
          // 面の頂点インデックスを読み取る
          const polygonIndices: number[] = [];
          let hasValidIndices = true;
          
          for (let j = 0; j < numVerticesInPolygon; j++) {
            this.validateOffset(offset, 4, buffer.byteLength, `polygon ${i} vertex ${j} index`);
            const vertexIndex = dataView.getInt32(offset, true);
            offset += 4;
            
            // インデックスが妥当かチェック
            if (vertexIndex < 0 || vertexIndex >= numVertices) {
              console.warn(`${url}: Invalid vertex index ${vertexIndex} at polygon ${i}, vertex ${j}`);
              hasValidIndices = false;
              break;
            } else {
              polygonIndices.push(vertexIndex);
            }
          }
          
          if (!hasValidIndices) {
            // このポリゴンをスキップ
            offset = this.findNextValidOffset(dataView, offset, buffer.byteLength);
            continue;
          }
          
          // 面の法線を読み取る
          this.validateOffset(offset, 12, buffer.byteLength, `polygon ${i} normal`);
          const nx = dataView.getFloat32(offset, true);
          offset += 4;
          const ny = dataView.getFloat32(offset, true);
          offset += 4;
          const nz = dataView.getFloat32(offset, true);
          offset += 4;
          
          // NaNやInfinityのチェック
          let normalX = nx;
          let normalY = ny;
          let normalZ = nz;
          if (!isFinite(nx) || !isFinite(ny) || !isFinite(nz)) {
            console.warn(`${url}: Invalid normal for polygon ${i}: (${nx}, ${ny}, ${nz})`);
            normalX = 0;
            normalY = 1;
            normalZ = 0;
          }
          
          // 法線をThree.jsの座標系に変換
          for (let j = 0; j < numVerticesInPolygon; j++) {
            normals.push(normalX, normalY, -normalZ);
          }
          
          // 面の色を読み取る
          this.validateOffset(offset, 16, buffer.byteLength, `polygon ${i} color`);
          const r = dataView.getFloat32(offset, true);
          offset += 4;
          const g = dataView.getFloat32(offset, true);
          offset += 4;
          const b = dataView.getFloat32(offset, true);
          offset += 4;
          const a = dataView.getFloat32(offset, true);
          offset += 4;
          
          // 色が妥当かチェック
          let red = r;
          let green = g;
          let blue = b;
          if (!isFinite(r) || !isFinite(g) || !isFinite(b) || 
              r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) {
            console.warn(`${url}: Invalid color for polygon ${i}: (${r}, ${g}, ${b}, ${a})`);
            red = 0.8;
            green = 0.8;
            blue = 0.8;
          }
          
          // 色情報を各頂点に適用
          for (let j = 0; j < numVerticesInPolygon; j++) {
            colors.push(red, green, blue);
          }
          
          // 三角形分割（三角形以外の面も三角形に分割）
          if (numVerticesInPolygon >= 3) {
            for (let j = 0; j < numVerticesInPolygon - 2; j++) {
              indices.push(polygonIndices[0], polygonIndices[j + 1], polygonIndices[j + 2]);
            }
          }
        } catch (error) {
          console.error(`${url}: Error processing polygon ${i}: ${error}`);
          // このポリゴンをスキップして次へ
          offset = this.findNextValidOffset(dataView, offset, buffer.byteLength);
          continue;
        }
      }
      
      // インデックスが空の場合は空のメッシュを返す
      if (indices.length === 0) {
        console.warn(`${url}: No valid polygons found in SRF file`);
        const emptyGeometry = new THREE.BufferGeometry();
        const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const mesh = new THREE.Mesh(emptyGeometry, material);
        mesh.name = "SRF_Mesh";
        const group = new THREE.Group();
        group.name = "SRF_Model";
        group.add(mesh);
        return group;
      }
      
      // ジオメトリを作成
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      // バッファサイズのチェック
      if (normals.length >= vertices.length) {
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      } else {
        console.warn(`${url}: Normal data is incomplete, computing vertex normals`);
        geometry.computeVertexNormals();
      }
      
      if (colors.length >= vertices.length) {
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      }
      
      geometry.setIndex(indices);
      
      // マテリアルを作成（頂点カラーを使用）
      const material = new THREE.MeshPhongMaterial({
        vertexColors: colors.length > 0,
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
    } catch (error) {
      console.error(`${url}: Error parsing SRF file: ${error}`);
      return new THREE.Group();
    }
  }
  
  /**
   * エンディアンを反転させて解析を試みる
   * @param buffer SRFファイルのバイナリデータ
   * @param url ファイルURL (ログ出力用)
   * @returns Three.jsのGroupオブジェクト
   */
  private parseWithDifferentEndianness(buffer: ArrayBuffer, url: string): THREE.Group {
    console.warn(`${url}: Attempting to parse with different endianness - Note: This is experimental`);
    
    const dataView = new DataView(buffer);
    let offset = 0;
    
    try {
      // シグネチャ（エンディアンネスが逆転しているため、直接バイトを読み取る）
      const byte1 = dataView.getUint8(offset++);
      const byte2 = dataView.getUint8(offset++);
      const byte3 = dataView.getUint8(offset++);
      const byte4 = dataView.getUint8(offset++);
      
      const signature = String.fromCharCode(byte4, byte3, byte2, byte1);
      console.log(`${url}: Inverted signature: "${signature}"`);
      
      if (signature !== "SURF") {
        console.error(`${url}: Still invalid signature after endianness swap: ${signature}`);
        return new THREE.Group();
      }
      
      // バージョン情報 (ビッグエンディアン)
      const version = dataView.getInt32(offset, false);
      offset += 4;
      console.log(`${url}: SRF Version (with swapped endianness): ${version}`);
      
      if (version < 0 || version > 100) {
        console.error(`${url}: Version number still invalid after endianness swap: ${version}`);
        return new THREE.Group();
      }
      
      // 頂点数
      const numVertices = dataView.getInt32(offset, false);
      offset += 4;
      console.log(`${url}: Number of vertices (with swapped endianness): ${numVertices}`);
      
      if (numVertices <= 0 || numVertices > 100000) {
        console.error(`${url}: Vertex count still invalid after endianness swap: ${numVertices}`);
        return new THREE.Group();
      }
      
      // ここから完全なエンディアンネスが反転したパーサーの実装が必要ですが、
      // 実装が複雑になるため、現在のところは簡易的な処理に留めます
      console.warn(`${url}: Full implementation of different endianness parsing not completed yet`);
      
      // バイナリの代替フォーマットの検出を試みる
      return this.attemptAlternateFormats(buffer, url);
    } catch (error) {
      console.error(`${url}: Error in endianness-swapped parsing: ${error}`);
      return new THREE.Group();
    }
  }
  
  /**
   * 代替フォーマットの検出を試みる
   * @param buffer バイナリデータ
   * @param url ファイルURL (ログ出力用)
   */
  private attemptAlternateFormats(buffer: ArrayBuffer, url: string): THREE.Group {
    // DNMフォーマットの可能性を確認
    const dataView = new DataView(buffer);
    const isDNM = this.checkSignature(dataView, 0, "DNM ") || this.checkSignature(dataView, 0, "DYNA");
    
    if (isDNM) {
      console.warn(`${url}: This file appears to be in DNM format, not SRF format`);
      return new THREE.Group();
    }
    
    // 他の代替フォーマットの検出を追加できます
    
    return new THREE.Group();
  }
  
  /**
   * 指定されたオフセットにシグネチャが存在するか確認
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param signature 確認するシグネチャ
   */
  private checkSignature(dataView: DataView, offset: number, signature: string): boolean {
    try {
      for (let i = 0; i < signature.length; i++) {
        if (offset + i >= dataView.byteLength) return false;
        if (dataView.getUint8(offset + i) !== signature.charCodeAt(i)) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 次の有効なオフセットを探す
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param bufferLength バッファの長さ
   * @returns 次の推定安全オフセット
   */
  private findNextValidOffset(dataView: DataView, offset: number, bufferLength: number): number {
    // 最も単純な実装: 単純に4の倍数の次のオフセットに進む
    const nextOffset = Math.min(offset + 4, bufferLength);
    return nextOffset;
    
    // 注: より高度な実装では、バイト列をスキャンして有効なパターンを見つけることができます
  }
  
  /**
   * バイナリファイルの先頭部分をダンプしてデバッグ情報を表示
   * @param dataView データビュー
   * @param offset 開始オフセット
   * @param length ダンプするバイト数
   * @param url ファイルURL (ログ出力用)
   */
  private dumpBinaryHeader(dataView: DataView, offset: number, length: number, url: string): void {
    let hexDump = '';
    let asciiDump = '';
    
    console.log(`${url}: Binary file header dump (${length} bytes):`);
    
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
    try {
      let result = '';
      for (let i = 0; i < length; i++) {
        if (offset + i >= dataView.byteLength) {
          break; // バッファ終端を超えたらループを終了
        }
        const charCode = dataView.getUint8(offset + i);
        if (charCode === 0) break; // null終端
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (error) {
      console.error(`Error reading string at offset ${offset}, length ${length}: ${error}`);
      return '';
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