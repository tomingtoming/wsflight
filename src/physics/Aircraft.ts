import {
    Vector3,
    Attitude,
    EngineCharacteristics,
    Aerodynamics,
    Controls,
    IEngine,
    IAerodynamicsModel,
    IPhysicsEnvironment
} from './types';
import { PropellerEngine } from './engine/PropellerEngine';
import { AerodynamicsModel } from './aerodynamics/AerodynamicsModel';
import { PhysicsEnvironment } from './environment/PhysicsEnvironment';

/**
 * 航空機の物理挙動をシミュレートするクラス
 */
export class Aircraft {
    // 位置と運動状態
    private position: Vector3;
    private rotation: Attitude;
    private velocity: Vector3;
    private angularVelocity: Attitude;
    
    // 機体特性
    private readonly mass: number;
    private readonly inertia: Attitude;
    
    // 制御状態
    private controls: Controls;
    
    // モジュール化されたコンポーネント
    private engine: IEngine;
    private aerodynamics: IAerodynamicsModel;
    private environment: IPhysicsEnvironment;
    
    /**
     * 航空機を初期化する
     * @param engineCharacteristics エンジン特性（オプション）
     * @param aerodynamicsProperties 空力特性（オプション）
     */
    constructor(
        engineCharacteristics?: EngineCharacteristics,
        aerodynamicsProperties?: Aerodynamics
    ) {
        // 初期位置と姿勢
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { pitch: 0, roll: 0, yaw: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { pitch: 0, roll: 0, yaw: 0 };
        
        // 機体特性（YSFLIGHTの値を参考に設定）
        this.mass = 1000;  // kg
        this.inertia = {
            pitch: 2000,
            roll: 1500,
            yaw: 3000
        };
        
        // 制御初期化
        this.controls = {
            elevator: 0,
            aileron: 0,
            rudder: 0,
            flaps: 0,
            throttle: 0
        };
        
        // デフォルトのエンジン特性
        const defaultEngineCharacteristics: EngineCharacteristics = {
            maxThrust: 20000,
            maxRPM: 2400,
            currentRPM: 0,
            throttle: 0,
            engineBrakeZeroThrottleRpm: 700,
            engineBrakeMaxThrottleRpm: 3000,
            engineBrakeTorquePerRpm: 0.1,
            
            // プロペラエンジン拡張パラメータ
            maxPowerJoulesPerSec: 120000, // 約160馬力相当
            idlePowerJoulesPerSec: 12000, // アイドル時の出力
            radianPerSec: 0,              // 初期回転速度
            ctlRadianPerSecMin: Math.PI * 2.0 * 500.0 / 60.0,  // 500RPM
            ctlRadianPerSecMax: Math.PI * 2.0 * 3000.0 / 60.0, // 3000RPM
            propLeverPosition: 0.7        // プロペラレバー位置（70%）
        };
        
        // デフォルトの空力特性
        const defaultAerodynamics: Aerodynamics = {
            wingArea: 16.2,
            aspectRatio: 7.32,
            dragCoefficient: 0.027,
            liftSlopeCurve: 6.28,
            zeroLiftAoA: -2 * Math.PI / 180,  // -2度をラジアンに変換
            stallAngleHigh: 15 * Math.PI / 180,
            stallAngleLow: -12 * Math.PI / 180
        };
        
        // モジュール化されたコンポーネントの初期化
        this.engine = new PropellerEngine(engineCharacteristics || defaultEngineCharacteristics);
        this.aerodynamics = new AerodynamicsModel(aerodynamicsProperties || defaultAerodynamics);
        this.environment = new PhysicsEnvironment();
    }
    
    /**
     * 機体に働く力の計算
     * @param deltaTime 更新時間間隔
     * @returns 機体に働く力ベクトル
     */
    private calculateForces(deltaTime: number): Vector3 {
        // 高度に基づく大気密度を取得
        const altitude = this.position.y;
        const airDensity = this.environment.getAirDensity(altitude);
        
        // エンジン更新（推力を更新するため）
        this.engine.update(deltaTime, airDensity, this.velocity);
        
        // 空力的な力を計算
        const aerodynamicForces = this.aerodynamics.calculateForces(
            this.velocity,
            this.rotation,
            this.controls,
            airDensity
        );
        
        // エンジン推力の計算
        const thrust = this.engine.getThrust();
        
        // 機体の前方ベクトル（機体座標系でのX軸正方向）
        const forwardVector = {
            x: Math.cos(this.rotation.yaw) * Math.cos(this.rotation.pitch),
            y: Math.sin(this.rotation.pitch),
            z: Math.sin(this.rotation.yaw) * Math.cos(this.rotation.pitch)
        };
        
        // 重力
        const gravity = -this.environment.getGravity() * this.mass;
        
        // 力の合成
        return {
            x: forwardVector.x * thrust + aerodynamicForces.lift.x + aerodynamicForces.drag.x,
            y: forwardVector.y * thrust + aerodynamicForces.lift.y + aerodynamicForces.drag.y + gravity,
            z: forwardVector.z * thrust + aerodynamicForces.lift.z + aerodynamicForces.drag.z
        };
    }
    
    /**
     * 角速度の計算と更新
     * @param deltaTime 更新時間間隔
     */
    private updateAngularVelocity(deltaTime: number): void {
        // 空力的なモーメントを取得
        const altitude = this.position.y;
        const airDensity = this.environment.getAirDensity(altitude);
        
        const aerodynamicForces = this.aerodynamics.calculateForces(
            this.velocity,
            this.rotation,
            this.controls,
            airDensity
        );
        
        // 制御入力から角加速度を計算
        const angularAcceleration = {
            pitch: this.controls.elevator * 2.0 / this.inertia.pitch + aerodynamicForces.moments.pitch,
            roll: this.controls.aileron * 3.0 / this.inertia.roll + aerodynamicForces.moments.roll,
            yaw: this.controls.rudder * 1.0 / this.inertia.yaw + aerodynamicForces.moments.yaw
        };
        
        // 角速度の更新
        this.angularVelocity.pitch += angularAcceleration.pitch * deltaTime;
        this.angularVelocity.roll += angularAcceleration.roll * deltaTime;
        this.angularVelocity.yaw += angularAcceleration.yaw * deltaTime;
        
        // 角速度の減衰
        this.angularVelocity.pitch *= 0.95;
        this.angularVelocity.roll *= 0.95;
        this.angularVelocity.yaw *= 0.95;
    }
    
    /**
     * 航空機の状態を更新する
     * @param deltaTime 更新時間間隔（秒）
     */
    public update(deltaTime: number): void {
        // 力の計算
        const forces = this.calculateForces(deltaTime);
        
        // 加速度の計算
        const acceleration = {
            x: forces.x / this.mass,
            y: forces.y / this.mass,
            z: forces.z / this.mass
        };
        
        // 速度の更新
        this.velocity.x += acceleration.x * deltaTime;
        this.velocity.y += acceleration.y * deltaTime;
        this.velocity.z += acceleration.z * deltaTime;
        
        // 位置の更新
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // 角速度の更新
        this.updateAngularVelocity(deltaTime);
        
        // 姿勢の更新
        this.rotation.pitch += this.angularVelocity.pitch * deltaTime;
        this.rotation.roll += this.angularVelocity.roll * deltaTime;
        this.rotation.yaw += this.angularVelocity.yaw * deltaTime;
        
        // 地面との衝突判定
        if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            
            // 地面摩擦
            this.velocity.x *= 0.95;
            this.velocity.z *= 0.95;
        }
    }
    
    /**
     * 制御入力を設定
     * @param newControls 新しい制御入力
     */
    public setControls(newControls: Partial<Controls>): void {
        this.controls = { ...this.controls, ...newControls };
    }
    
    /**
     * スロットルを設定
     * @param throttle スロットル値（0-1）
     */
    public setThrottle(throttle: number): void {
        const normalizedThrottle = Math.max(0, Math.min(1, throttle));
        this.engine.setThrottle(normalizedThrottle);
        this.controls.throttle = normalizedThrottle;
    }
    
    /**
     * 位置を取得
     * @returns 航空機の現在位置
     */
    public getPosition(): Vector3 {
        return { ...this.position };
    }
    
    /**
     * 位置を設定
     * @param position 新しい位置
     */
    public setPosition(position: Vector3): void {
        this.position = { ...position };
    }
    
    /**
     * 速度を設定
     * @param velocity 新しい速度
     */
    public setVelocity(velocity: Vector3): void {
        this.velocity = { ...velocity };
    }
    
    /**
     * 姿勢を設定
     * @param rotation 新しい姿勢
     */
    public setRotation(rotation: Attitude): void {
        this.rotation = { ...rotation };
    }
    
    /**
     * 姿勢を取得
     * @returns 航空機の現在の姿勢
     */
    public getRotation(): Attitude {
        return { ...this.rotation };
    }
    
    /**
     * 速度を取得
     * @returns 航空機の現在の速度
     */
    public getVelocity(): Vector3 {
        return { ...this.velocity };
    }
    
    /**
     * 現在のRPMを取得
     * @returns エンジンの現在のRPM
     */
    public getCurrentRPM(): number {
        return this.engine.getCurrentRPM();
    }
    
    /**
     * 制御入力を取得
     * @returns 現在の制御入力
     */
    public getControls(): Controls {
        this.controls.throttle = this.engine.getThrottle();
        return { ...this.controls };
    }
    
    /**
     * エンジンオブジェクトを取得
     * @returns エンジンオブジェクト
     */
    public getEngine(): IEngine {
        return this.engine;
    }
    
    /**
     * 空力モデルを取得
     * @returns 空力モデルオブジェクト
     */
    public getAerodynamics(): IAerodynamicsModel {
        return this.aerodynamics;
    }
    
    /**
     * 物理環境を取得
     * @returns 物理環境オブジェクト
     */
    public getEnvironment(): IPhysicsEnvironment {
        return this.environment;
    }
}