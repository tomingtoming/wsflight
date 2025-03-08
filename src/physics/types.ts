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

// エンジン特性を表す型
export interface EngineCharacteristics {
    maxThrust: number;           // 最大推力（N）
    maxRPM: number;             // 最大回転数
    currentRPM: number;         // 現在の回転数
    throttle: number;           // スロットル位置（0-1）
    engineBrakeZeroThrottleRpm: number;  // スロットル0でのブレーキ開始RPM
    engineBrakeMaxThrottleRpm: number;   // 最大スロットルでのブレーキ開始RPM
    engineBrakeTorquePerRpm: number;     // RPMあたりのブレーキトルク
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
}