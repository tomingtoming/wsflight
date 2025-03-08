import {
    Vector3,
    Attitude,
    EngineCharacteristics,
    Aerodynamics,
    Controls
} from './types';

export class Aircraft {
    // 位置と運動状態
    private position: Vector3;
    private rotation: Attitude;
    private velocity: Vector3;
    private angularVelocity: Attitude;

    // 機体特性
    private readonly mass: number;
    private readonly inertia: Attitude;
    private readonly engine: EngineCharacteristics;
    private readonly aerodynamics: Aerodynamics;

    // 制御状態
    private controls: Controls;

    constructor() {
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

        // エンジン特性
        this.engine = {
            maxThrust: 20000,
            maxRPM: 2400,
            currentRPM: 0,
            throttle: 0,
            engineBrakeZeroThrottleRpm: 700,
            engineBrakeMaxThrottleRpm: 3000,
            engineBrakeTorquePerRpm: 0.1
        };

        // 空力特性
        this.aerodynamics = {
            wingArea: 16.2,
            aspectRatio: 7.32,
            dragCoefficient: 0.027,
            liftSlopeCurve: 6.28,
            zeroLiftAoA: -2 * Math.PI / 180,  // -2度をラジアンに変換
            stallAngleHigh: 15 * Math.PI / 180,
            stallAngleLow: -12 * Math.PI / 180
        };

        // 制御初期化
        this.controls = {
            elevator: 0,
            aileron: 0,
            rudder: 0,
            flaps: 0
        };
    }

    // 大気密度の計算（YSFLIGHTのfsairproperty.cppを参考に）
    private getAirDensity(altitude: number): number {
        const rhoTab = [
            1.224991,  //     0m
            0.819122,  //  4000m
            0.529999,  //  8000m
            0.299988,  // 12000m
            0.153000,  // 16000m
            0.084991   // 20000m
        ];

        const a = Math.floor(altitude / 4000.0);
        if (a < 0) return rhoTab[0];
        if (a > 4) return rhoTab[5];

        // 線形補間
        const base = rhoTab[a];
        const diff = rhoTab[a + 1] - rhoTab[a];
        const t = (altitude - 4000.0 * a) / 4000.0;
        return base + diff * t;
    }

    // マッハ1の速度を計算（YSFLIGHTのfsairproperty.cppを参考に）
    private getMachOne(altitude: number): number {
        const machTab = [
            340.294,  //     0m
            324.579,  //  4000m
            308.063,  //  8000m
            295.069,  // 12000m
            295.069,  // 16000m
            295.069   // 20000m
        ];

        const a = Math.floor(altitude / 4000.0);
        if (a < 0) return machTab[0];
        if (a > 4) return machTab[4];

        // 線形補間
        const base = machTab[a];
        const diff = machTab[a + 1] - machTab[a];
        const t = (altitude - 4000.0 * a) / 4000.0;
        return base + diff * t;
    }

    // 揚力係数の計算
    private getLiftCoefficient(angleOfAttack: number): number {
        if (angleOfAttack > this.aerodynamics.stallAngleHigh) {
            return Math.cos(angleOfAttack) * 2 * Math.PI;
        } else if (angleOfAttack < this.aerodynamics.stallAngleLow) {
            return Math.cos(angleOfAttack) * 2 * Math.PI;
        } else {
            return this.aerodynamics.liftSlopeCurve * 
                   (angleOfAttack - this.aerodynamics.zeroLiftAoA);
        }
    }

    // 抗力係数の計算
    private getDragCoefficient(liftCoefficient: number): number {
        return this.aerodynamics.dragCoefficient + 
               Math.pow(liftCoefficient, 2) / 
               (Math.PI * this.aerodynamics.aspectRatio * 0.85);
    }

    // 機体に働く力の計算
    private calculateForces(deltaTime: number): Vector3 {
        const altitude = this.position.y;
        const airDensity = this.getAirDensity(altitude);
        
        // 速度の大きさと動圧の計算
        const velocityMagnitude = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
        const dynamicPressure = 0.5 * airDensity * velocityMagnitude * velocityMagnitude;

        // 迎え角の計算（シンプルな近似）
        const angleOfAttack = Math.atan2(this.velocity.y, this.velocity.x);

        // 揚力と抗力の係数
        const liftCoefficient = this.getLiftCoefficient(angleOfAttack);
        const dragCoefficient = this.getDragCoefficient(liftCoefficient);

        // 揚力と抗力の計算
        const lift = dynamicPressure * this.aerodynamics.wingArea * liftCoefficient;
        const drag = dynamicPressure * this.aerodynamics.wingArea * dragCoefficient;

        // エンジン推力の計算
        const thrust = this.engine.maxThrust * this.engine.throttle;

        // 重力
        const gravity = -9.81 * this.mass;

        // 制御面の影響を計算
        const elevatorEffect = this.controls.elevator * 5000; // 適当な係数
        const aileronEffect = this.controls.aileron * 2000;   // 適当な係数

        // 力の合成
        return {
            x: thrust - drag,
            y: lift + gravity + elevatorEffect, // エレベーターの効果を追加
            z: aileronEffect  // エルロンの効果を追加
        };
    }

    // エンジンRPMの更新（YSFLIGHTのfsrealprop.cppを参考に）
    private updateEngineRPM(deltaTime: number): void {
        const targetRPM = this.engine.maxRPM * this.engine.throttle;
        const currentRPM = this.engine.currentRPM;

        // エンジンブレーキの効果を計算
        if (currentRPM > this.engine.engineBrakeZeroThrottleRpm) {
            const brakingRPM = (currentRPM - this.engine.engineBrakeZeroThrottleRpm) * 
                              this.engine.engineBrakeTorquePerRpm * deltaTime;
            this.engine.currentRPM = Math.max(targetRPM, currentRPM - brakingRPM);
        } else {
            // 通常のRPM変化
            const rpmChange = (targetRPM - currentRPM) * deltaTime * 2.0;
            this.engine.currentRPM += rpmChange;
        }
    }

    // 角速度の計算と更新
    private updateAngularVelocity(deltaTime: number): void {
        // 制御入力から角加速度を計算
        const angularAcceleration = {
            pitch: this.controls.elevator * 2.0 / this.inertia.pitch,
            roll: this.controls.aileron * 3.0 / this.inertia.roll,
            yaw: this.controls.rudder * 1.0 / this.inertia.yaw
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

    // 状態の更新
    update(deltaTime: number): void {
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

        // エンジンRPMの更新
        this.updateEngineRPM(deltaTime);
    }

    // 制御入力の設定
    setControls(newControls: Partial<Controls>): void {
        this.controls = { ...this.controls, ...newControls };
    }

    // スロットル設定
    setThrottle(throttle: number): void {
        this.engine.throttle = Math.max(0, Math.min(1, throttle));
    }

    // 現在の状態を取得するメソッド群
    getPosition(): Vector3 {
        return { ...this.position };
    }

    getRotation(): Attitude {
        return { ...this.rotation };
    }

    getVelocity(): Vector3 {
        return { ...this.velocity };
    }

    getCurrentRPM(): number {
        return this.engine.currentRPM;
    }

    getControls(): Controls {
        return { ...this.controls };
    }
}