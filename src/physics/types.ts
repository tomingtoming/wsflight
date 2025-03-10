// 基本的な3D座標系の型
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

// 航空機の姿勢を表す型
export interface Attitude {
    pitch: number;  // ピッチ角（ラジアン）
    roll: number;   // ロール角（ラジアン）
    yaw: number;    // ヨー角（ラジアン）
}

// プロペラブレードの特性を表す型
export interface PropellerBlade {
    area: number;               // ブレード面積（m^2）
    kCl: number;                // 揚力係数の傾き
    ClZero: number;             // 迎え角0での揚力係数
    kCd: number;                // 抗力係数の傾き
    CdMin: number;              // 最小抗力係数
    minCdAOA: number;           // 最小抗力係数の迎え角（ラジアン）
    
    minPitch: number;           // 最小ピッチ角（ラジアン）
    maxPitch: number;           // 最大ピッチ角（ラジアン）
    kGoverner: number;          // ガバナー定数
    
    gravityCenter: number;      // 重心位置（回転軸からの距離、m）
    liftCenter: number;         // 揚力中心（回転軸からの距離、m）
    
    weight: number;             // ブレード重量（kg）
    clockwise: boolean;         // 時計回りに回転するか
    
    // ブレードの状態
    state: {
        angle: number;          // 角度（ラジアン）
        pitch: number;          // ピッチ角（ラジアン）
    };
    
    // 計算結果
    lift: Vector3;              // 揚力ベクトル
    drag: Vector3;              // 抗力ベクトル
    torque: number;             // トルク
    aoa: number;                // 迎え角（ラジアン）
}

// エンジン特性を表す型
export interface EngineCharacteristics {
    maxThrust: number;            // 最大推力（N）
    maxRPM: number;               // 最大回転数
    currentRPM: number;           // 現在の回転数
    throttle: number;             // スロットル位置（0-1）
    engineBrakeZeroThrottleRpm: number;  // スロットル0でのブレーキ開始RPM
    engineBrakeMaxThrottleRpm: number;   // 最大スロットルでのブレーキ開始RPM
    engineBrakeTorquePerRpm: number;     // RPMあたりのブレーキトルク
    
    // プロペラエンジン拡張パラメータ
    maxPowerJoulesPerSec?: number;      // 最大出力（J/s）
    idlePowerJoulesPerSec?: number;     // アイドル出力（J/s）
    propellerBlades?: PropellerBlade[]; // プロペラブレード配列
    radianPerSec?: number;              // 回転速度（ラジアン/秒）
    ctlRadianPerSecMin?: number;        // 最小制御回転速度
    ctlRadianPerSecMax?: number;        // 最大制御回転速度
    propLeverPosition?: number;         // プロペラレバー位置（0-1）
}

// 空力特性を表す型
export interface Aerodynamics {
    wingArea: number;       // 主翼面積（m^2）
    aspectRatio: number;    // アスペクト比
    dragCoefficient: number; // 抗力係数
    liftSlopeCurve: number; // 揚力傾斜
    zeroLiftAoA: number;    // ゼロ揚力迎角（ラジアン）
    stallAngleHigh: number; // 最大失速角（ラジアン）
    stallAngleLow: number;  // 最小失速角（ラジアン）
}

// 制御入力を表す型
export interface Controls {
    elevator: number;   // エレベーター位置（-1 to 1）
    aileron: number;    // エルロン位置（-1 to 1）
    rudder: number;     // ラダー位置（-1 to 1）
    flaps: number;      // フラップ位置（0 to 1）
    throttle: number;   // スロットル位置（0 to 1）
}

// 大気特性を表す型
export interface AtmosphericData {
    density: number;    // 大気密度（kg/m^3）
    machOne: number;    // マッハ1の速度（m/s）
    temperature: number; // 温度（K）
}

// エンジンインターフェース（すべてのエンジンタイプに共通）
export interface IEngine {
    update(deltaTime: number, airDensity: number): void;
    setThrottle(value: number): void;
    getThrottle(): number;
    getCurrentRPM(): number;
    getThrust(): number;
}

// 空力モデルインターフェース
export interface IAerodynamicsModel {
    calculateForces(
        velocity: Vector3,
        attitude: Attitude,
        controls: Controls,
        airDensity: number
    ): { lift: Vector3, drag: Vector3, moments: Attitude };
    getLiftCoefficient(angleOfAttack: number): number;
    getDragCoefficient(liftCoefficient: number): number;
}

// カメラインターフェース
export interface ICameraController {
    update(aircraft: Aircraft): void;
    setCameraMode(mode: CameraMode): void;
    getCameraMode(): CameraMode;
}

// カメラモード
export enum CameraMode {
    COCKPIT = 0,
    EXTERNAL = 1,
    CHASE = 2,
    TOWER = 3
}

// HUDインターフェース
export interface IHUDManager {
    update(aircraftData: AircraftData): void;
    setVisible(visible: boolean): void;
    showDemoScreen(visible: boolean): void;
}

// 入力ハンドラインターフェース
export interface IInputHandler {
    update(): void;
    setDemo(isDemo: boolean): void;
    addKeyboardListeners(): void;
    addMouseListeners(): void;
    removeAllListeners(): void;
    getMouseControlsEnabled(): boolean;
    setMouseControlsEnabled(enabled: boolean): void;
}

// モデルローダーインターフェース
export interface IModelLoader {
    loadModel(path: string): Promise<THREE.Object3D>;
    getLoadedModel(name: string): THREE.Object3D | null;
}

// 航空機データ（HUDや他のシステムに渡すためのデータ）
export interface AircraftData {
    position: Vector3;
    rotation: Attitude;
    velocity: Vector3;
    altitude: number;
    speed: number;
    throttle: number;
    rpm: number;
    cameraMode: CameraMode;
    mouseJoystickEnabled: boolean;
}

// 物理環境インターフェース
export interface IPhysicsEnvironment {
    getAirDensity(altitude: number): number;
    getMachOne(altitude: number): number;
    getGravity(): number;
    getWind(position: Vector3): Vector3;
}

// Aircraft クラスのインターフェース（参照用）
export interface Aircraft {
    update(deltaTime: number): void;
    setControls(newControls: Partial<Controls>): void;
    setThrottle(throttle: number): void;
    getPosition(): Vector3;
    setPosition(position: Vector3): void;
    setVelocity(velocity: Vector3): void;
    setRotation(rotation: Attitude): void;
    getRotation(): Attitude;
    getVelocity(): Vector3;
    getCurrentRPM(): number;
    getControls(): Controls;
}

// シーン管理インターフェース
export interface ISceneManager {
    createScene(): void;
    addAircraft(aircraft: THREE.Object3D): void;
    updateAircraftPosition(position: Vector3, rotation: Attitude): void;
    render(camera: THREE.Camera): void;
    resize(): void;
}

// モデルマネージャーインターフェイス
export interface IModelManager {
    /**
     * YSFLIGHTのDNM（Dynamic Model）ファイルを読み込む
     * @param url DNMファイルのURL
     * @param useCache キャッシュを使用するかどうか
     * @returns 読み込まれたモデルのGroup
     */
    loadDNM(url: string, useCache?: boolean): Promise<THREE.Group>;
    
    /**
     * YSFLIGHTのSRF（Surface）ファイルを読み込む
     * @param url SRFファイルのURL
     * @param useCache キャッシュを使用するかどうか
     * @returns 読み込まれたモデル
     */
    loadSRF(url: string, useCache?: boolean): Promise<THREE.Group>;
    
    /**
     * テクスチャを読み込む
     * @param url テクスチャのURL
     * @param useCache キャッシュを使用するかどうか
     * @returns 読み込まれたテクスチャ
     */
    loadTexture(url: string, useCache?: boolean): Promise<THREE.Texture>;
    
    /**
     * モデルにテクスチャを適用する
     * @param model 対象のモデル
     * @param texturePath テクスチャパス
     */
    applyTexture(model: THREE.Group, texturePath: string): Promise<void>;
    
    /**
     * キャッシュをクリアする
     */
    clearCache(): void;
    
    /**
     * DNMモデルのノードを回転させる
     * @param model DNMモデルのルートグループ
     * @param nodeName 回転させるノードの名前
     * @param angle 回転角度（ラジアン）
     */
    rotateNode(model: THREE.Group, nodeName: string, angle: number): void;
    
    /**
     * 簡易的な航空機モデルを作成
     * @returns 基本航空機モデル
     */
    createBasicAircraftModel(): THREE.Group;
}