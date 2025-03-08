// 航空機の基本物理特性を定義するクラス
export class Aircraft {
    constructor() {
        // 位置と姿勢
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { pitch: 0, roll: 0, yaw: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { pitch: 0, roll: 0, yaw: 0 };

        // 機体特性
        this.mass = 1000;  // kg
        this.inertia = {
            pitch: 2000,
            roll: 1500,
            yaw: 3000
        };

        // エンジン特性（YSFLIGHTのfsrealprop.cppを参考に）
        this.engine = {
            maxThrust: 20000,  // N
            maxRPM: 2400,
            currentRPM: 0,
            throttle: 0,
            engineBrakeZeroThrottleRpm: 700,
            engineBrakeMaxThrottleRpm: 3000,
            engineBrakeTorquePerRpm: 0.1
        };

        // 空力特性
        this.aerodynamics = {
            wingArea: 16.2,      // m^2
            aspectRatio: 7.32,   // 翼縦横比
            dragCoefficient: 0.027,
            liftSlopeCurve: 6.28,
            zeroLiftAoA: -2 * Math.PI / 180,  // -2度をラジアンに変換
            stallAngleHigh: 15 * Math.PI / 180,
            stallAngleLow: -12 * Math.PI / 180
        };

        // 制御面の状態
        this.controls = {
            elevator: 0,    // -1 to 1
            aileron: 0,     // -1 to 1
            rudder: 0,      // -1 to 1
            flaps: 0        // 0 to 1
        };
    }

    // 大気密度の計算（YSFLIGHTのfsairproperty.cppを参考に）
    getAirDensity(altitude) {
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

    // 揚力係数の計算
    getLiftCoefficient(angleOfAttack) {
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
    getDragCoefficient(liftCoefficient) {
        return this.aerodynamics.dragCoefficient + 
               Math.pow(liftCoefficient, 2) / 
               (Math.PI * this.aerodynamics.aspectRatio * 0.85);
    }

    // 機体に働く力の計算
    calculateForces(deltaTime) {
        const altitude = this.position.y;
        const airDensity = this.getAirDensity(altitude);
        
        // 速度の大きさと動圧の計算
        const velocityMagnitude = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
        const dynamicPressure = 0.5 * airDensity * velocityMagnitude * velocityMagnitude;

        // 迎え角の計算
        const angleOfAttack = Math.atan2(this.velocity.y, this.velocity.x);

        // 揚力と抗力の係数
        const liftCoefficient = this.getLiftCoefficient(angleOfAttack);
        const dragCoefficient = this.getDragCoefficient(liftCoefficient);

        // 揚力と抗力の計算
        const lift = dynamicPressure * this.aerodynamics.wingArea * liftCoefficient;
        const drag = dynamicPressure * this.aerodynamics.wingArea * dragCoefficient;

        // エンジン推力の計算（YSFLIGHTのfsrealprop.cppを参考に）
        const thrust = this.engine.maxThrust * this.engine.throttle;

        // 重力
        const gravity = -9.81 * this.mass;

        // 力の合成
        return {
            x: thrust - drag,
            y: lift + gravity,
            z: 0  // 簡略化のため、横方向の力は現時点では無視
        };
    }

    // 状態の更新
    update(deltaTime) {
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

        // 角速度による姿勢の更新
        this.rotation.pitch += this.angularVelocity.pitch * deltaTime;
        this.rotation.roll += this.angularVelocity.roll * deltaTime;
        this.rotation.yaw += this.angularVelocity.yaw * deltaTime;

        // エンジンRPMの更新
        this.updateEngineRPM(deltaTime);
    }

    // エンジンRPMの更新（YSFLIGHTのfsrealprop.cppを参考に）
    updateEngineRPM(deltaTime) {
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