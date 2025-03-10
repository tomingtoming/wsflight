import {
    Vector3,
    Attitude,
    EngineCharacteristics,
    PropellerBlade,
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
            engineBrakeTorquePerRpm: 0.1,
            
            // プロペラエンジン拡張パラメータ
            maxPowerJoulesPerSec: 120000, // 約160馬力相当
            idlePowerJoulesPerSec: 12000, // アイドル時の出力
            radianPerSec: 0,              // 初期回転速度
            ctlRadianPerSecMin: Math.PI * 2.0 * 500.0 / 60.0,  // 500RPM
            ctlRadianPerSecMax: Math.PI * 2.0 * 3000.0 / 60.0, // 3000RPM
            propLeverPosition: 0.7,       // プロペラレバー位置（70%）
            
            // プロペラブレード初期化
            propellerBlades: this.initializePropellerBlades()
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
    
    /**
     * プロペラブレードの初期化
     * YSFLIGHTのfsrealprop.cppを参考に実装
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
        let thrust = 0;
        if (this.engine.propellerBlades && this.engine.propellerBlades.length > 0) {
            // プロペラモデルが有効な場合は、ブレードの計算による推力を使用
            thrust = this.calculatePropellerThrust();
        } else {
            // 従来のシンプルなモデル
            thrust = this.engine.maxThrust * this.engine.throttle;
        }

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

    /**
     * プロペラブレードに働く力の計算
     * YSFLIGHTのfsrealprop.cppのCalculateForceを参考に実装
     */
    private calculateBladeForcesAndTorque(deltaTime: number): void {
        // 早期リターン: プロペラブレードが設定されていない場合
        if (!this.engine.propellerBlades || this.engine.propellerBlades.length === 0) {
            return;
        }
        
        // 大気密度の取得
        const altitude = this.position.y;
        const airDensity = this.getAirDensity(altitude);
        
        // 相対速度ベクトル（機体座標系での値を想定）
        const relVelInPropCoord = {
            x: this.velocity.x,
            y: this.velocity.y,
            z: this.velocity.z
        };
        
        let totalTorque = 0;
        let totalMomentOfInertia = 0;
        
        // 各ブレードに対する力とトルクの計算
        for (const blade of this.engine.propellerBlades) {
            // ブレードの角度を0〜2πの範囲に正規化
            if (blade.state.angle > Math.PI * 2) {
                blade.state.angle -= Math.PI * 2;
            } else if (blade.state.angle < 0) {
                blade.state.angle += Math.PI * 2;
            }
            
            // プロペラの回転速度
            const omega = this.engine.radianPerSec || 0;
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
        if (this.engine.engineBrakeTorquePerRpm > 0.000001) {
            const rpm = Math.abs((this.engine.radianPerSec || 0) * 30.0 / Math.PI);
            const engineBrakeRpm0 = this.engine.engineBrakeZeroThrottleRpm +
                                   (this.engine.engineBrakeMaxThrottleRpm - this.engine.engineBrakeZeroThrottleRpm) *
                                   this.engine.throttle;
            
            if (engineBrakeRpm0 < rpm) {
                const excessRpm = rpm - engineBrakeRpm0;
                const engineBrakeTorque = this.engine.engineBrakeTorquePerRpm * excessRpm;
                
                if ((this.engine.radianPerSec || 0) > 0) {
                    totalTorque -= engineBrakeTorque;
                } else {
                    totalTorque += engineBrakeTorque;
                }
            }
        }
        
        // 回転加速度と回転速度の計算
        const angularAccel = totalTorque / totalMomentOfInertia;
        if (this.engine.radianPerSec !== undefined) {
            this.engine.radianPerSec += angularAccel * deltaTime;
            
            // エンジン出力によるエネルギー加算
            if (this.engine.maxPowerJoulesPerSec !== undefined &&
                this.engine.idlePowerJoulesPerSec !== undefined) {
                
                const airDensityBias = airDensity / 1.225; // 標準大気密度との比率
                const joulePerSec = (
                    this.engine.idlePowerJoulesPerSec * (1.0 - this.engine.throttle) +
                    this.engine.maxPowerJoulesPerSec * this.engine.throttle
                ) * airDensityBias;
                
                // 現在のエネルギーと新たなエネルギーを計算
                const currentEnergy = 0.5 * totalMomentOfInertia * this.engine.radianPerSec * this.engine.radianPerSec;
                const sign = (this.engine.radianPerSec > 0) ? 1.0 : -1.0;
                const newEnergy = currentEnergy + sign * joulePerSec * deltaTime;
                
                // エネルギーから新たな回転速度を計算
                if (newEnergy >= 0) {
                    this.engine.radianPerSec = sign * Math.sqrt(2.0 * newEnergy / totalMomentOfInertia);
                } else {
                    // エネルギーが負になった場合（回転方向が反転）
                    this.engine.radianPerSec = -sign * Math.sqrt(2.0 * Math.abs(newEnergy) / totalMomentOfInertia);
                }
            }
        } else {
            this.engine.radianPerSec = 0;
        }
        
        // ブレードの角度を更新
        for (const blade of this.engine.propellerBlades) {
            blade.state.angle += (this.engine.radianPerSec || 0) * deltaTime;
        }
    }
    
    /**
     * プロペラピッチの制御
     * YSFLIGHTのfsrealprop.cppのControlPitchを参考に実装
     */
    private controlPropellerPitch(deltaTime: number): void {
        if (!this.engine.propellerBlades || this.engine.propellerBlades.length === 0 ||
            this.engine.propLeverPosition === undefined ||
            this.engine.ctlRadianPerSecMin === undefined ||
            this.engine.ctlRadianPerSecMax === undefined ||
            this.engine.radianPerSec === undefined) {
            return;
        }
        
        // 目標回転速度を計算
        const desiredRadianPerSec =
            this.engine.ctlRadianPerSecMin * (1.0 - this.engine.propLeverPosition) +
            this.engine.ctlRadianPerSecMax * this.engine.propLeverPosition;
        
        // 現在の回転速度と目標回転速度の差
        const speedDiff = this.engine.radianPerSec - desiredRadianPerSec;
        
        // 各ブレードのピッチを調整
        for (const blade of this.engine.propellerBlades) {
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
     */
    private calculatePropellerThrust(): number {
        if (!this.engine.propellerBlades || this.engine.propellerBlades.length === 0) {
            return 0;
        }
        
        let totalThrust = 0;
        
        // 各ブレードのZ方向（前進方向）の力を合計
        for (const blade of this.engine.propellerBlades) {
            totalThrust += blade.lift.z + blade.drag.z;
        }
        
        return totalThrust;
    }
    
    /**
     * エンジンRPMの更新（YSFLIGHTのfsrealprop.cppを参考に拡張）
     */
    private updateEngineRPM(deltaTime: number): void {
        // プロペラモデルが有効なら、詳細な物理計算を行う
        if (this.engine.propellerBlades && this.engine.propellerBlades.length > 0 &&
            this.engine.radianPerSec !== undefined) {
            
            // プロペラの物理計算
            this.calculateBladeForcesAndTorque(deltaTime);
            this.controlPropellerPitch(deltaTime);
            
            // RPMに換算
            this.engine.currentRPM = Math.abs(this.engine.radianPerSec * 60.0 / (Math.PI * 2.0));
        } else {
            // 従来のシンプルなRPM計算
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
    }
    
    /**
     * ベクトルをXY平面で回転させるヘルパーメソッド
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
     */
    private rotateVectorZY(vector: Vector3, angle: number): void {
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        const z = vector.z;
        const y = vector.y;
        
        vector.z = z * cosAngle - y * sinAngle;
        vector.y = z * sinAngle + y * cosAngle;
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

    // 位置の設定
    setPosition(position: Vector3): void {
        this.position = { ...position };
    }

    // 速度の設定
    setVelocity(velocity: Vector3): void {
        this.velocity = { ...velocity };
    }

    // 姿勢の設定
    setRotation(rotation: Attitude): void {
        this.rotation = { ...rotation };
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