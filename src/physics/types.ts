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