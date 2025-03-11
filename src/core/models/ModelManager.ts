import * as THREE from 'three';
import { DNMLoader } from './loaders/DNMLoader';
import { SRFLoader } from './loaders/SRFLoader';
import { FileFormatDetector } from './loaders/FileFormatDetector';
import { TextBasedDNMLoader } from './loaders/TextBasedDNMLoader';
import { TextBasedSRFLoader } from './loaders/TextBasedSRFLoader';

/**
 * モデル管理クラス
 * 様々な形式の3Dモデルをロード・管理するためのクラス
 */
export class ModelManager {
  private dnmLoader: DNMLoader;
  private srfLoader: SRFLoader;
  private textDnmLoader: TextBasedDNMLoader;
  private textSrfLoader: TextBasedSRFLoader;
  private models: Map<string, THREE.Group>;

  constructor() {
    this.dnmLoader = new DNMLoader();
    this.srfLoader = new SRFLoader();
    this.textDnmLoader = new TextBasedDNMLoader();
    this.textSrfLoader = new TextBasedSRFLoader();
    this.models = new Map<string, THREE.Group>();
  }

  /**
   * モデルを取得する
   * @param modelId モデルID
   * @returns モデルのクローン（存在しない場合はnull）
   */
  getModel(modelId: string): THREE.Group | null {
    const model = this.models.get(modelId);
    if (model) {
      return model.clone();
    }
    return null;
  }

  /**
   * DNMファイルを読み込む
   * @param url DNMファイルのURL
   * @param modelId 保存時のモデルID
   * @returns 読み込んだモデル
   */
  async loadDNM(url: string, modelId: string): Promise<THREE.Group | null> {
    try {
      // 先にファイルを取得して形式を判定
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${url}`);
      }
      
      const buffer = await response.arrayBuffer();
      const firstBytes = new Uint8Array(buffer.slice(0, Math.min(32, buffer.byteLength)));
      
      // ファイル形式のログを出力
      const formatInfo = FileFormatDetector.detectFormat(buffer);
      console.log(`Format detection for ${url}: ${formatInfo.details}`);
      
      // ファイルがテキスト形式かどうかを判定
      const isTextFormat = this.isTextFormat(firstBytes);
      
      let model: THREE.Group;
      
      if (isTextFormat) {
        // テキスト形式の場合
        console.log(`${url} appears to be a text-based DNM file.`);
        model = await this.textDnmLoader.load(url);
      } else {
        // バイナリ形式の場合
        console.log(`${url} appears to be a binary DNM file.`);
        model = await this.dnmLoader.load(url);
      }
      
      if (model && model.children.length > 0) {
        this.models.set(modelId, model);
        console.log(`Successfully loaded DNM model: ${modelId}`);
        return model.clone();
      } else {
        console.warn(`DNM model loaded but empty: ${url}`);
        return null;
      }
    } catch (error) {
      console.error(`Error loading DNM model ${url}: ${error}`);
      return null;
    }
  }

  /**
   * SRFファイルを読み込む
   * @param url SRFファイルのURL
   * @param modelId 保存時のモデルID
   * @returns 読み込んだモデル
   */
  async loadSRF(url: string, modelId: string): Promise<THREE.Group | null> {
    try {
      // 先にファイルを取得して形式を判定
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${url}`);
      }
      
      const buffer = await response.arrayBuffer();
      const firstBytes = new Uint8Array(buffer.slice(0, Math.min(32, buffer.byteLength)));
      
      // ファイル形式のログを出力
      const formatInfo = FileFormatDetector.detectFormat(buffer);
      console.log(`Format detection for ${url}: ${formatInfo.details}`);
      
      // ファイルがテキスト形式かどうかを判定
      const isTextFormat = this.isTextFormat(firstBytes);
      
      let model: THREE.Group;
      
      if (isTextFormat) {
        // テキスト形式の場合
        console.log(`${url} appears to be a text-based SRF file.`);
        model = await this.textSrfLoader.load(url);
      } else {
        // バイナリ形式の場合
        console.log(`${url} appears to be a binary SRF file.`);
        model = await this.srfLoader.load(url);
      }
      
      if (model && model.children.length > 0) {
        this.models.set(modelId, model);
        console.log(`Successfully loaded SRF model: ${modelId}`);
        return model.clone();
      } else {
        console.warn(`SRF model loaded but empty: ${url}`);
        return null;
      }
    } catch (error) {
      console.error(`Error loading SRF model ${url}: ${error}`);
      return null;
    }
  }

  /**
   * GLTFファイルを読み込む（拡張用）
   * @param url GLTFファイルのURL
   * @param modelId 保存時のモデルID
   * @returns 読み込んだモデル
   */
  async loadGLTF(url: string, modelId: string): Promise<THREE.Group | null> {
    // この実装は将来の拡張のためのプレースホルダー
    console.warn('GLTF loading not yet implemented');
    return null;
  }

  /**
   * モデルを回転させる
   * @param modelId モデルID
   * @param nodeName 回転させるノード名
   * @param angle 角度（ラジアン）
   */
  rotateNode(modelId: string, nodeName: string, angle: number): void {
    const model = this.models.get(modelId);
    if (model) {
      // バイナリとテキストベースの両方の回転ノードに対応
      this.dnmLoader.rotateNode(model, nodeName, angle);
      
      // テキストベースのDNMの場合も試行
      try {
        this.textDnmLoader.rotateNode(model, nodeName, angle);
      } catch (e) {
        // エラーは無視 - すでにバイナリ版で回転を試みている
      }
    }
  }

  /**
   * モデルの透明度を設定する
   * @param modelId モデルID
   * @param opacity 不透明度（0.0-1.0）
   */
  setOpacity(modelId: string, opacity: number): void {
    const model = this.models.get(modelId);
    if (model) {
      // バイナリとテキストベースの両方に対応
      this.srfLoader.setOpacity(model, opacity);
      this.textSrfLoader.setOpacity(model, opacity);
    }
  }

  /**
   * モデルの色を設定する
   * @param modelId モデルID
   * @param color 色（16進数または THREE.Color）
   */
  setColor(modelId: string, color: number | THREE.Color): void {
    const model = this.models.get(modelId);
    if (model) {
      // バイナリとテキストベースの両方に対応
      this.srfLoader.setColor(model, color);
      this.textSrfLoader.setColor(model, color);
    }
  }

  /**
   * 全てのモデルをクリアする
   */
  clearAllModels(): void {
    this.models.clear();
  }

  /**
   * モデル情報を取得する（デバッグ用）
   * @returns モデル情報の配列
   */
  getModelInfo(): Array<{id: string, children: number}> {
    const info: Array<{id: string, children: number}> = [];
    this.models.forEach((model, id) => {
      info.push({
        id,
        children: model.children.length
      });
    });
    return info;
  }

  /**
   * バイト配列がテキスト形式かどうかを判定する
   * @param bytes 検査するバイト配列
   * @returns テキスト形式の場合はtrue
   */
  private isTextFormat(bytes: Uint8Array): boolean {
    // ASCII文字の範囲（特に制御文字を除く）のバイトをカウント
    let asciiCount = 0;
    let binaryCount = 0;
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      // ASCII制御文字を許可するが、一部は改行や空白として特別扱い
      if (byte === 10 || byte === 13 || byte === 9 || byte === 32) {
        // 改行、CR、タブ、空白は明確にテキスト
        asciiCount++;
      }
      else if (byte >= 32 && byte <= 126) {
        // 表示可能なASCII文字
        asciiCount++;
      }
      else if (byte < 9 || (byte > 13 && byte < 32) || byte > 126) {
        // 制御文字（改行等を除く）や非ASCII文字はバイナリを示唆
        binaryCount++;
      }
    }
    
    // テキスト内容を示す特定のキーワードを探す
    const textSignatures = [
      'SURF\n', 'DYNAMODEL\n', 'DNM', 'SRF', 'VER', 'DNMVER'
    ];
    
    const content = new TextDecoder().decode(bytes);
    
    for (const signature of textSignatures) {
      if (content.includes(signature)) {
        return true;
      }
    }
    
    // 75%以上がASCII文字ならテキストと判断
    return (asciiCount > binaryCount) && (asciiCount > bytes.length * 0.75);
  }

  /**
   * 簡易的な航空機モデルを作成する（テスト用）
   * @returns 基本的な航空機のモデル
   */
  createBasicAircraftModel(): THREE.Group {
    // 航空機のルートグループを作成
    const aircraftGroup = new THREE.Group();
    aircraftGroup.name = "BasicAircraft";
    
    // 機体本体（赤い箱）
    const fuselageGeometry = new THREE.BoxGeometry(4, 1, 10);
    const fuselageMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    aircraftGroup.add(fuselage);
    
    // 主翼（青い板）
    const wingGeometry = new THREE.BoxGeometry(15, 0.2, 3);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.set(0, 0, -1);
    aircraftGroup.add(wing);
    
    // 尾翼（緑の板）
    const tailGeometry = new THREE.BoxGeometry(5, 0.2, 2);
    const tailMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.5, -6);
    aircraftGroup.add(tail);
    
    // コックピット（黄色い箱）
    const cockpitGeometry = new THREE.BoxGeometry(1.5, 1, 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.5, 3);
    aircraftGroup.add(cockpit);
    
    // プロペラ（回転する茶色い円盤）
    const propellerGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16);
    const propellerMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    propeller.rotateX(Math.PI / 2);
    propeller.position.set(0, 0, 5);
    propeller.name = "propeller"; // 回転アニメーション用に名前をつける
    aircraftGroup.add(propeller);
    
    // モデルを正しい方向に向けるための調整
    aircraftGroup.rotation.y = Math.PI; // 機首を前に向ける
    
    return aircraftGroup;
  }
}