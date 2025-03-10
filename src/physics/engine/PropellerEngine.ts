// filepath: /Users/toming/wsflight/src/physics/engine/PropellerEngine.ts
import { Vector3, PropellerBlade, EngineCharacteristics, IEngine } from '../types';

/**
 * プロペラエンジンを表すクラス
 * YSFLIGHTのfsrealprop.cppを参考に実装
 */
export class PropellerEngine implements IEngine {
    private characteristics: EngineCharacteristics;
    
    /**
     * プロペラエンジンを初期化する
     * @param characteristics エンジンの特性
     */
    constructor(characteristics: EngineCharacteristics) {
        this.characteristics = { ...characteristics };
        
        // プロペラブレードが未初期化の場合は生成
        if (!this.characteristics.propellerBlades || this.characteristics.propellerBlades.length === 0) {
            this.characteristics.propellerBlades = this.initializePropellerBlades();
        }
    }
    
    /**
     * プロペラブレードの初期化
     * YSFLIGHTのfsrealprop.cppを参考に実装
     * @returns 初期化されたプロペラブレードの配列
     */
    private initializePropellerBlades(): PropellerBlade[] {
        const blades: PropellerBlade[] = [];
        const numBlades = 2; // 2枚ブレードのプロペラ
        
        for (let i = 0; i < numBlades; i++) {
            // ブレードのベース特性
            const blade: PropellerBlade = {
                area: 0.25,         // ブレード面積（m^2）
                kCl: 1.4 / (20.0 * Math.PI / 180.0), // 揚力係数の傾き
                ClZero: 0.35,       // 迎え角0での揚力係数
                kCd: 0.213 / Math.pow((25.0 * Math.PI / 180.0), 2), // 抗力係数の傾き
                CdMin: 0.012,       // 最小抗力係数
                minCdAOA: -5.0 * Math.PI / 180.0, // 最小抗力係数の迎え角
                
                minPitch: Math.PI / 36.0,   // 最小ピッチ角（5度）
                maxPitch: Math.PI / 4.0,    // 最大ピッチ角（45度）
                kGoverner: 0.05,            // ガバナー定数
                
                gravityCenter: 0.6,  // 重心位置（回転軸からの距離、m）
                liftCenter: 0.6,     // 揚力中心（回転軸からの距離、m）
                
                weight: 10.0,        // ブレード重量（kg）
                clockwise: true,     // 時計回りに回転
                
                // ブレードの初期状態
                state: {
                    angle: Math.PI * i, // ブレード角度（均等に配置）
                    pitch: 18.0 * Math.PI / 180.0 // 初期ピッチ角（18度）
                },
                
                // 計算結果の初期値
                lift: { x: 0, y: 0, z: 0 },
                drag: { x: 0, y: 0, z: 0 },
                torque: 0,
                aoa: 0
            };
            
            blades.push(blade);
        }
        
        return blades;
    }
    
    /**
     * エンジンを更新する
     * @param deltaTime 更新時間間隔 (秒)
     * @param airDensity 現在の大気密度 (kg/m^3)
     * @param relativeVelocity 相対速度ベクトル (機体座標系)
     */
    public update(deltaTime: number, airDensity: number, relativeVelocity: Vector3 = { x: 0, y: 0, z: 0 }): void {
        // プロペラモデルが有効なら、詳細な物理計算を行う
        if (this.characteristics.propellerBlades && this.characteristics.propellerBlades.length > 0 &&
            this.characteristics.radianPerSec !== undefined) {
            
            // プロペラの物理計算
            this.calculateBladeForcesAndTorque(deltaTime, airDensity, relativeVelocity);
            this.controlPropellerPitch(deltaTime);
            
            // RPMに換算
            this.characteristics.currentRPM = Math.abs(this.characteristics.radianPerSec * 60.0 / (Math.PI * 2.0));
        } else {
            // 従来のシンプルなRPM計算
            this.updateSimpleRPM(deltaTime);
        }
    }
    
    /**
     * シンプルなRPM計算（プロペラ物理モデルを使わない場合）
     * @param deltaTime 更新時間間隔 (秒)
     */
    private updateSimpleRPM(deltaTime: number): void {
        const targetRPM = this.characteristics.maxRPM * this.characteristics.throttle;
        const currentRPM = this.characteristics.currentRPM;
        
        // エンジンブレーキの効果を計算
        if (currentRPM > this.characteristics.engineBrakeZeroThrottleRpm) {
            const brakingRPM = (currentRPM - this.characteristics.engineBrakeZeroThrottleRpm) *
                              this.characteristics.engineBrakeTorquePerRpm * deltaTime;
            this.characteristics.currentRPM = Math.max(targetRPM, currentRPM - brakingRPM);
        } else {
            // 通常のRPM変化
            const rpmChange = (targetRPM - currentRPM) * deltaTime * 2.0;
            this.characteristics.currentRPM += rpmChange;
        }
    }
    
    /**
     * プロペラブレードに働く力と生じるトルクを計算する
     * YSFLIGHTのfsrealprop.cppのCalculateForceを参考に実装
     * @param deltaTime 更新時間間隔 (秒)
     * @param airDensity 現在の大気密度 (kg/m^3)
     * @param relVelInPropCoord 相対速度ベクトル (機体座標系)
     */
    private calculateBladeForcesAndTorque(
        deltaTime: number, 
        airDensity: number, 
        relVelInPropCoord: Vector3
    ): void {
        // 早期リターン: プロペラブレードが設定されていない場合
        if (!this.characteristics.propellerBlades || this.characteristics.propellerBlades.length === 0) {
            return;
        }
        
        let totalTorque = 0;
        let totalMomentOfInertia = 0;
        
        // 各ブレードに対する力とトルクの計算
        for (const blade of this.characteristics.propellerBlades) {
            // ブレードの角度を0〜2πの範囲に正規化
            if (blade.state.angle > Math.PI * 2) {
                blade.state.angle -= Math.PI * 2;
            } else if (blade.state.angle < 0) {
                blade.state.angle += Math.PI * 2;
            }
            
            // プロペラの回転速度
            const omega = this.characteristics.radianPerSec || 0;
            const propSpeed = blade.liftCenter * omega;
            const directionOfRotation = blade.clockwise ? -1.0 : 1.0;
            
            // プロペラ速度ベクトルの計算（プロペラ座標系）
            const propVel = {
                x: 0,
                y: propSpeed * directionOfRotation,
                z: 0
            };
            
            // プロペラ速度の回転（ブレード角度に合わせる）
            this.rotateVectorXY(propVel, blade.state.angle);
            
            // 相対速度との合成
            const totalVel = {
                x: propVel.x + relVelInPropCoord.x,
                y: propVel.y + relVelInPropCoord.y,
                z: propVel.z + relVelInPropCoord.z
            };
            
            // ブレード座標系での相対速度計算
            const relVelBlade = { ...totalVel };
            this.rotateVectorXY(relVelBlade, -blade.state.angle);
            
            // 迎え角の計算
            blade.aoa = blade.state.pitch - Math.atan2(relVelBlade.z, -relVelBlade.y);
            
            // 揚力係数と抗力係数の計算
            const Cl = blade.kCl * blade.aoa + blade.ClZero;
            const Cd = blade.kCd * Math.pow(blade.aoa - blade.minCdAOA, 2) + blade.CdMin;
            
            // 速度の二乗計算
            const vSquared = relVelBlade.x * relVelBlade.x +
                             relVelBlade.y * relVelBlade.y +
                             relVelBlade.z * relVelBlade.z;
                             
            // 揚力と抗力の計算
            const liftMagnitude = 0.5 * Cl * airDensity * vSquared * blade.area;
            const dragMagnitude = 0.5 * Cd * airDensity * vSquared * blade.area;
            
            // 抗力ベクトルの計算
            const totalVelMagnitude = Math.sqrt(vSquared);
            if (totalVelMagnitude > 0.001) { // 分母がゼロに近い場合の対策
                blade.drag = {
                    x: -dragMagnitude * totalVel.x / totalVelMagnitude,
                    y: -dragMagnitude * totalVel.y / totalVelMagnitude,
                    z: -dragMagnitude * totalVel.z / totalVelMagnitude
                };
            } else {
                blade.drag = { x: 0, y: 0, z: 0 };
            }
            
            // 揚力ベクトルの計算（揚力は相対速度に垂直）
            blade.lift = { ...relVelBlade };
            this.rotateVectorZY(blade.lift, Math.PI / 2.0); // 90度回転
            this.rotateVectorXY(blade.lift, blade.state.angle);
            
            // 揚力の大きさを設定
            const liftMag = Math.sqrt(
                blade.lift.x * blade.lift.x +
                blade.lift.y * blade.lift.y +
                blade.lift.z * blade.lift.z
            );
            
            if (liftMag > 0.001) {
                blade.lift = {
                    x: liftMagnitude * blade.lift.x / liftMag,
                    y: liftMagnitude * blade.lift.y / liftMag,
                    z: liftMagnitude * blade.lift.z / liftMag
                };
            } else {
                blade.lift = { x: 0, y: 0, z: 0 };
            }
            
            // ブレードの力中心をプロペラ座標系で計算
            const forceCenterInPropCoord = {
                x: blade.liftCenter * Math.cos(blade.state.angle),
                y: blade.liftCenter * Math.sin(blade.state.angle),
                z: 0
            };
            
            // XY平面内の力成分
            const forceXY = {
                x: blade.lift.x + blade.drag.x,
                y: blade.lift.y + blade.drag.y,
                z: 0
            };
            
            // トルク計算（力×距離の外積、Z成分のみ）
            const torqueZ = forceCenterInPropCoord.x * forceXY.y - forceCenterInPropCoord.y * forceXY.x;
            const bladeDirection = blade.clockwise ? -1 : 1;
            blade.torque = torqueZ * bladeDirection;
            
            // 合計トルクと慣性モーメントの計算
            totalTorque += blade.torque;
            totalMomentOfInertia += blade.weight * blade.gravityCenter * blade.gravityCenter;
        }
        
        // 慣性モーメントがほぼゼロの場合の対策
        if (totalMomentOfInertia < 0.000001) {
            totalTorque = 0;
            totalMomentOfInertia = 1.0;
        }
        
        // エンジンブレーキトルクの計算
        if (this.characteristics.engineBrakeTorquePerRpm > 0.000001) {
            const rpm = Math.abs((this.characteristics.radianPerSec || 0) * 30.0 / Math.PI);
            const engineBrakeRpm0 = this.characteristics.engineBrakeZeroThrottleRpm +
                                   (this.characteristics.engineBrakeMaxThrottleRpm - this.characteristics.engineBrakeZeroThrottleRpm) *
                                   this.characteristics.throttle;
            
            if (engineBrakeRpm0 < rpm) {
                const excessRpm = rpm - engineBrakeRpm0;
                const engineBrakeTorque = this.characteristics.engineBrakeTorquePerRpm * excessRpm;
                
                if ((this.characteristics.radianPerSec || 0) > 0) {
                    totalTorque -= engineBrakeTorque;
                } else {
                    totalTorque += engineBrakeTorque;
                }
            }
        }
        
        // 回転加速度と回転速度の計算
        const angularAccel = totalTorque / totalMomentOfInertia;
        if (this.characteristics.radianPerSec !== undefined) {
            this.characteristics.radianPerSec += angularAccel * deltaTime;
            
            // エンジン出力によるエネルギー加算
            if (this.characteristics.maxPowerJoulesPerSec !== undefined &&
                this.characteristics.idlePowerJoulesPerSec !== undefined) {
                
                const airDensityBias = airDensity / 1.225; // 標準大気密度との比率
                const joulePerSec = (
                    this.characteristics.idlePowerJoulesPerSec * (1.0 - this.characteristics.throttle) +
                    this.characteristics.maxPowerJoulesPerSec * this.characteristics.throttle
                ) * airDensityBias;
                
                // 現在のエネルギーと新たなエネルギーを計算
                const currentEnergy = 0.5 * totalMomentOfInertia * this.characteristics.radianPerSec * this.characteristics.radianPerSec;
                const sign = (this.characteristics.radianPerSec > 0) ? 1.0 : -1.0;
                const newEnergy = currentEnergy + sign * joulePerSec * deltaTime;
                
                // エネルギーから新たな回転速度を計算
                if (newEnergy >= 0) {
                    this.characteristics.radianPerSec = sign * Math.sqrt(2.0 * newEnergy / totalMomentOfInertia);
                } else {
                    // エネルギーが負になった場合（回転方向が反転）
                    this.characteristics.radianPerSec = -sign * Math.sqrt(2.0 * Math.abs(newEnergy) / totalMomentOfInertia);
                }
            }
        } else {
            this.characteristics.radianPerSec = 0;
        }
        
        // ブレードの角度を更新
        for (const blade of this.characteristics.propellerBlades) {
            blade.state.angle += (this.characteristics.radianPerSec || 0) * deltaTime;
        }
    }
    
    /**
     * プロペラピッチの制御
     * YSFLIGHTのfsrealprop.cppのControlPitchを参考に実装
     * @param deltaTime 更新時間間隔 (秒)
     */
    private controlPropellerPitch(deltaTime: number): void {
        if (!this.characteristics.propellerBlades || this.characteristics.propellerBlades.length === 0 ||
            this.characteristics.propLeverPosition === undefined ||
            this.characteristics.ctlRadianPerSecMin === undefined ||
            this.characteristics.ctlRadianPerSecMax === undefined ||
            this.characteristics.radianPerSec === undefined) {
            return;
        }
        
        // 目標回転速度を計算
        const desiredRadianPerSec =
            this.characteristics.ctlRadianPerSecMin * (1.0 - this.characteristics.propLeverPosition) +
            this.characteristics.ctlRadianPerSecMax * this.characteristics.propLeverPosition;
        
        // 現在の回転速度と目標回転速度の差
        const speedDiff = this.characteristics.radianPerSec - desiredRadianPerSec;
        
        // 各ブレードのピッチを調整
        for (const blade of this.characteristics.propellerBlades) {
            const pitchChange = blade.kGoverner * speedDiff * deltaTime;
            blade.state.pitch += pitchChange;
            
            // ピッチ角の範囲制限
            if (blade.state.pitch < blade.minPitch) {
                blade.state.pitch = blade.minPitch;
            } else if (blade.state.pitch > blade.maxPitch) {
                blade.state.pitch = blade.maxPitch;
            }
        }
    }
    
    /**
     * プロペラエンジンの推力計算
     * @returns 計算された推力 (N)
     */
    public getThrust(): number {
        if (!this.characteristics.propellerBlades || this.characteristics.propellerBlades.length === 0) {
            // プロペラモデルがない場合は単純な推力モデルを使用
            return this.characteristics.maxThrust * this.characteristics.throttle;
        }
        
        let totalThrust = 0;
        
        // 各ブレードのZ方向（前進方向）の力を合計
        for (const blade of this.characteristics.propellerBlades) {
            totalThrust += blade.lift.z + blade.drag.z;
        }
        
        return totalThrust;
    }
    
    /**
     * スロットルを設定する
     * @param value スロットル値（0-1の範囲）
     */
    public setThrottle(value: number): void {
        this.characteristics.throttle = Math.max(0, Math.min(1, value));
    }
    
    /**
     * 現在のスロットル値を取得する
     * @returns スロットル値（0-1の範囲）
     */
    public getThrottle(): number {
        return this.characteristics.throttle;
    }
    
    /**
     * 現在のRPMを取得する
     * @returns エンジンの現在のRPM
     */
    public getCurrentRPM(): number {
        return this.characteristics.currentRPM;
    }
    
    /**
     * プロペラレバー位置を設定する（可変ピッチプロペラのみ）
     * @param position プロペラレバー位置（0-1の範囲）
     */
    public setPropellerLeverPosition(position: number): void {
        if (this.characteristics.propLeverPosition !== undefined) {
            this.characteristics.propLeverPosition = Math.max(0, Math.min(1, position));
        }
    }
    
    /**
     * プロペラレバー位置を取得する
     * @returns プロペラレバー位置
     */
    public getPropellerLeverPosition(): number {
        return this.characteristics.propLeverPosition || 0;
    }
    
    /**
     * ベクトルをXY平面で回転させるヘルパーメソッド
     * @param vector 回転させるベクトル
     * @param angle 回転角（ラジアン）
     */
    private rotateVectorXY(vector: Vector3, angle: number): void {
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        const x = vector.x;
        const y = vector.y;
        
        vector.x = x * cosAngle - y * sinAngle;
        vector.y = x * sinAngle + y * cosAngle;
    }
    
    /**
     * ベクトルをZY平面で回転させるヘルパーメソッド
     * @param vector 回転させるベクトル
     * @param angle 回転角（ラジアン）
     */
    private rotateVectorZY(vector: Vector3, angle: number): void {
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        const z = vector.z;
        const y = vector.y;
        
        vector.z = z * cosAngle - y * sinAngle;
        vector.y = z * sinAngle + y * cosAngle;
    }
}