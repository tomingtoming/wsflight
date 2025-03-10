// filepath: /Users/toming/wsflight/src/physics/aerodynamics/AerodynamicsModel.ts
import { Vector3, Attitude, Aerodynamics, Controls, IAerodynamicsModel } from '../types';

/**
 * 航空機の空力モデルを表すクラス
 * YSFLIGHTのfsairplaneproperty.cppを参考に実装
 */
export class AerodynamicsModel implements IAerodynamicsModel {
    private properties: Aerodynamics;
    
    /**
     * 空力モデルを初期化する
     * @param properties 空力特性
     */
    constructor(properties: Aerodynamics) {
        this.properties = { ...properties };
    }
    
    /**
     * 揚力係数の計算
     * YSFLIGHTのfsairplaneproperty.cppを参考に、より現実的な失速挙動を実装
     * @param angleOfAttack 迎え角（ラジアン）
     * @returns 揚力係数
     */
    public getLiftCoefficient(angleOfAttack: number): number {
        // 通常の飛行領域での揚力係数計算
        const normalLift = this.properties.liftSlopeCurve *
                          (angleOfAttack - this.properties.zeroLiftAoA);
        
        // 失速後の挙動（非線形）
        if (angleOfAttack > this.properties.stallAngleHigh) {
            // 失速後の揚力低下を計算
            const stallExcess = angleOfAttack - this.properties.stallAngleHigh;
            const stallFactor = Math.exp(-stallExcess * 5); // 指数関数的に減少
            
            // 失速時の揚力係数（通常の揚力係数に失速係数を掛ける）
            const stallLift = normalLift * stallFactor;
            
            // 失速後の揚力は、通常の揚力と失速時の揚力を補間
            return stallLift + (1.0 - stallFactor) * Math.cos(angleOfAttack) * 2 * Math.PI;
        } else if (angleOfAttack < this.properties.stallAngleLow) {
            // 負の失速（背面飛行時など）の挙動
            const stallExcess = this.properties.stallAngleLow - angleOfAttack;
            const stallFactor = Math.exp(-stallExcess * 5);
            
            const stallLift = normalLift * stallFactor;
            return stallLift + (1.0 - stallFactor) * Math.cos(angleOfAttack) * 2 * Math.PI;
        } else {
            // 通常の飛行領域
            return normalLift;
        }
    }
    
    /**
     * 抗力係数の計算
     * @param liftCoefficient 揚力係数
     * @returns 抗力係数
     */
    public getDragCoefficient(liftCoefficient: number): number {
        return this.properties.dragCoefficient + 
               Math.pow(liftCoefficient, 2) / 
               (Math.PI * this.properties.aspectRatio * 0.85);
    }
    
    /**
     * 空力的な力の計算
     * @param velocity 機体の速度ベクトル
     * @param attitude 機体の姿勢
     * @param controls 制御入力
     * @param airDensity 大気密度
     * @returns 揚力、抗力、モーメントのベクトル
     */
    public calculateForces(
        velocity: Vector3,
        attitude: Attitude,
        controls: Controls,
        airDensity: number
    ): { lift: Vector3, drag: Vector3, moments: Attitude } {
        // 速度の大きさと動圧の計算
        const velocityMagnitude = Math.sqrt(
            velocity.x * velocity.x +
            velocity.y * velocity.y +
            velocity.z * velocity.z
        );
        
        // 速度がほぼゼロの場合は力を0とする
        if (velocityMagnitude < 0.001) {
            return { 
                lift: { x: 0, y: 0, z: 0 }, 
                drag: { x: 0, y: 0, z: 0 },
                moments: { pitch: 0, roll: 0, yaw: 0 }
            };
        }
        
        const dynamicPressure = 0.5 * airDensity * velocityMagnitude * velocityMagnitude;
        
        // 機体の前方ベクトル（機体座標系でのX軸正方向）
        const forwardVector = {
            x: Math.cos(attitude.yaw) * Math.cos(attitude.pitch),
            y: Math.sin(attitude.pitch),
            z: Math.sin(attitude.yaw) * Math.cos(attitude.pitch)
        };
        
        // 速度ベクトルの正規化
        const normalizedVelocity = {
            x: velocity.x / velocityMagnitude,
            y: velocity.y / velocityMagnitude,
            z: velocity.z / velocityMagnitude
        };
        
        // 前方ベクトルと速度ベクトルの内積（cosθ）
        const dotProduct =
            forwardVector.x * normalizedVelocity.x +
            forwardVector.y * normalizedVelocity.y +
            forwardVector.z * normalizedVelocity.z;
        
        // 迎え角の計算（arccos(dotProduct)）
        const angleOfAttack = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
        
        // 揚力と抗力の係数
        const liftCoefficient = this.getLiftCoefficient(angleOfAttack);
        const dragCoefficient = this.getDragCoefficient(liftCoefficient);
        
        // 揚力と抗力の計算
        const liftMagnitude = dynamicPressure * this.properties.wingArea * liftCoefficient;
        const dragMagnitude = dynamicPressure * this.properties.wingArea * dragCoefficient;
        
        // 揚力方向の計算（速度ベクトルに垂直で、上向き成分を持つ）
        // 速度ベクトルと上方向ベクトル(0,1,0)の外積で揚力方向を計算
        const liftDirection = {
            x: normalizedVelocity.z,
            y: 0,
            z: -normalizedVelocity.x
        };
        
        // 揚力方向の正規化
        const liftDirectionMagnitude = Math.sqrt(
            liftDirection.x * liftDirection.x +
            liftDirection.y * liftDirection.y +
            liftDirection.z * liftDirection.z
        );
        
        if (liftDirectionMagnitude > 0.001) {
            liftDirection.x /= liftDirectionMagnitude;
            liftDirection.y /= liftDirectionMagnitude;
            liftDirection.z /= liftDirectionMagnitude;
        }
        
        // 制御面の効果を計算（トルク/モーメント）
        const moments = {
            pitch: controls.elevator * 1.0, // エレベータによるピッチモーメント
            roll: controls.aileron * 1.0,   // エルロンによるロールモーメント
            yaw: controls.rudder * 0.5      // ラダーによるヨーモーメント
        };
        
        // 揚力ベクトル
        const lift = {
            x: liftDirection.x * liftMagnitude,
            y: liftDirection.y * liftMagnitude,
            z: liftDirection.z * liftMagnitude
        };
        
        // 抗力ベクトル（速度の反対方向）
        const drag = {
            x: -normalizedVelocity.x * dragMagnitude,
            y: -normalizedVelocity.y * dragMagnitude,
            z: -normalizedVelocity.z * dragMagnitude
        };
        
        return { lift, drag, moments };
    }
    
    /**
     * 空力特性を取得する
     * @returns 空力特性
     */
    public getProperties(): Aerodynamics {
        return { ...this.properties };
    }
    
    /**
     * 空力特性を設定する
     * @param properties 新しい空力特性
     */
    public setProperties(properties: Partial<Aerodynamics>): void {
        this.properties = { ...this.properties, ...properties };
    }
}