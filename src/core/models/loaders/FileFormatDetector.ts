/**
 * YSFLIGHTのファイル形式を検出するユーティリティクラス
 */
export class FileFormatDetector {
  /**
   * ファイルのフォーマットを検出する
   * @param buffer ファイルのバイナリデータ
   * @returns 検出結果
   */
  static detectFormat(buffer: ArrayBuffer): FileDetectionResult {
    if (buffer.byteLength < 8) {
      return { 
        format: 'unknown', 
        confidence: 0,
        details: 'File too small to determine format'
      };
    }
    
    const dataView = new DataView(buffer);
    
    // バイナリヘッダーのHEXとASCII表示を生成
    const headerDump = this.generateHeaderDump(dataView, 0, Math.min(32, buffer.byteLength));
    
    // シグネチャを取得
    let signature = '';
    try {
      for (let i = 0; i < 4; i++) {
        signature += String.fromCharCode(dataView.getUint8(i));
      }
    } catch (e) {
      return { 
        format: 'unknown', 
        confidence: 0,
        details: 'Error reading signature',
        headerDump
      };
    }
    
    // シグネチャに基づいて形式を推定
    switch (signature) {
      case 'DNM ':
        return this.analyzeDNM(dataView, buffer.byteLength, headerDump);
      case 'DYNA':
        return { 
          format: 'dnm-dynamic', 
          confidence: 0.9,
          details: 'DNM Dynamic format detected by signature',
          headerDump
        };
      case 'SURF':
        return this.analyzeSRF(dataView, buffer.byteLength, headerDump);
      default:
        // リバースエンディアンでチェック
        const reversedSignature = signature.split('').reverse().join('');
        if (reversedSignature === 'DNM ' || reversedSignature === 'DYNA') {
          return { 
            format: 'dnm-reversed', 
            confidence: 0.7,
            details: 'Possible DNM with reversed endianness',
            headerDump
          };
        }
        if (reversedSignature === 'SURF') {
          return { 
            format: 'srf-reversed', 
            confidence: 0.7,
            details: 'Possible SRF with reversed endianness',
            headerDump
          };
        }
        
        // その他のYSFLIGHTフォーマットの可能性をチェック
        if (this.checkTextFileSignature(dataView, '.dem')) {
          return { format: 'dem', confidence: 0.6, details: 'Possible DEM file', headerDump };
        }
        if (this.checkTextFileSignature(dataView, '.fld')) {
          return { format: 'fld', confidence: 0.6, details: 'Possible FLD file', headerDump };
        }
        if (this.checkTextFileSignature(dataView, '.yfs')) {
          return { format: 'yfs', confidence: 0.6, details: 'Possible YFS file', headerDump };
        }
        
        // バイナリパターンによる推測
        // より詳細な分析をここに追加することができる
        
        return { 
          format: 'unknown', 
          confidence: 0,
          details: `Unknown signature: "${signature}"`,
          headerDump
        };
    }
  }
  
  /**
   * DNMファイル形式を詳細に分析
   */
  private static analyzeDNM(dataView: DataView, length: number, headerDump: string): FileDetectionResult {
    try {
      // バージョン情報
      const version = dataView.getInt32(4, true);
      
      // 不自然に大きい値はエンディアンネスの問題を示唆
      if (version > 1000000) {
        return { 
          format: 'dnm-invalid', 
          confidence: 0.5,
          details: `DNM with suspicious version number: ${version}`,
          headerDump
        };
      }
      
      // ノード数
      const numNodes = dataView.getInt32(8, true);
      
      // 不自然に大きいノード数はファイル形式の問題を示唆
      if (numNodes < 0 || numNodes > 10000) {
        return { 
          format: 'dnm-invalid', 
          confidence: 0.5,
          details: `DNM with suspicious node count: ${numNodes}`,
          headerDump
        };
      }
      
      return { 
        format: 'dnm', 
        confidence: 0.9,
        details: `Valid DNM format, version: ${version}, nodes: ${numNodes}`,
        headerDump
      };
    } catch (e) {
      return { 
        format: 'dnm-invalid', 
        confidence: 0.6,
        details: 'Error analyzing DNM format',
        headerDump
      };
    }
  }
  
  /**
   * SRFファイル形式を詳細に分析
   */
  private static analyzeSRF(dataView: DataView, length: number, headerDump: string): FileDetectionResult {
    try {
      // バージョン情報
      const version = dataView.getInt32(4, true);
      
      // 不自然に大きい値はエンディアンネスの問題を示唆
      if (version > 1000000) {
        return { 
          format: 'srf-invalid', 
          confidence: 0.5,
          details: `SRF with suspicious version number: ${version}`,
          headerDump
        };
      }
      
      // 頂点数
      const numVertices = dataView.getInt32(8, true);
      
      // 不自然に大きい頂点数はファイル形式の問題を示唆
      if (numVertices < 0 || numVertices > 100000) {
        return { 
          format: 'srf-invalid', 
          confidence: 0.5,
          details: `SRF with suspicious vertex count: ${numVertices}`,
          headerDump
        };
      }
      
      return { 
        format: 'srf', 
        confidence: 0.9,
        details: `Valid SRF format, version: ${version}, vertices: ${numVertices}`,
        headerDump
      };
    } catch (e) {
      return { 
        format: 'srf-invalid', 
        confidence: 0.6,
        details: 'Error analyzing SRF format',
        headerDump
      };
    }
  }
  
  /**
   * テキストファイルの特定のシグネチャをチェック
   */
  private static checkTextFileSignature(dataView: DataView, signature: string): boolean {
    // テキストファイルの場合、特定のパターンが見つかるかをチェック
    try {
      const maxCheck = Math.min(dataView.byteLength - signature.length, 100);
      for (let i = 0; i < maxCheck; i++) {
        let match = true;
        for (let j = 0; j < signature.length; j++) {
          if (dataView.getUint8(i + j) !== signature.charCodeAt(j)) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    } catch (e) {}
    return false;
  }
  
  /**
   * バイナリファイルのヘッダー部分をHEXダンプとASCII表示で出力
   */
  private static generateHeaderDump(dataView: DataView, offset: number, length: number): string {
    let result = '';
    let hexLine = '';
    let asciiLine = '';
    
    for (let i = 0; i < length; i++) {
      if (i % 16 === 0 && i > 0) {
        result += `0x${(i - 16).toString(16).padStart(4, '0')}: ${hexLine} | ${asciiLine}\n`;
        hexLine = '';
        asciiLine = '';
      }
      
      try {
        const byte = dataView.getUint8(offset + i);
        hexLine += byte.toString(16).padStart(2, '0') + ' ';
        // 表示可能なASCII文字の場合は表示し、そうでなければ '.' を表示
        asciiLine += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
      } catch (e) {
        hexLine += '?? ';
        asciiLine += '?';
      }
    }
    
    // 残りがあれば出力
    if (hexLine) {
      const lastLineOffset = Math.floor(length / 16) * 16;
      result += `0x${lastLineOffset.toString(16).padStart(4, '0')}: ${hexLine.padEnd(48, ' ')} | ${asciiLine}\n`;
    }
    
    return result;
  }
}

/**
 * ファイル形式の検出結果
 */
export interface FileDetectionResult {
  /** 検出されたフォーマット */
  format: string;
  
  /** 検出の信頼度 (0-1) */
  confidence: number;
  
  /** 詳細情報 */
  details: string;
  
  /** ヘッダーのバイナリダンプ (デバッグ用) */
  headerDump?: string;
}