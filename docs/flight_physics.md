# WSFlightの飛行物理モデル

このドキュメントでは、YSFLIGHTのソースコードを参考にして実装された飛行物理モデルについて説明します。

## 1. 大気モデル

YSFLIGHTのソースコードから抽出した大気特性の実装です。

### 1.1 大気密度の計算

高度に応じた大気密度の変化は以下のように計算されます：

```typescript
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
```

### 1.2 音速（マッハ1）の計算

高度に応じた音速の変化は以下のように計算されます：

```typescript
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
```

## 2. 航空力学モデル

### 2.1 揚力係数（Lift Coefficient）

迎え角（Angle of Attack, AoA）に応じた揚力係数の計算：

```typescript
// 揚力係数の計算
private getLiftCoefficient(angleOfAttack: number): number {
    if (angleOfAttack > this.aerodynamics.stallAngleHigh) {
        // 失速領域（高迎え角）
        return Math.cos(angleOfAttack) * 2 * Math.PI;
    } else if (angleOfAttack < this.aerodynamics.stallAngleLow) {
        // 失速領域（低迎え角）
        return Math.cos(angleOfAttack) * 2 * Math.PI;
    } else {
        // 通常の線形領域
        return this.aerodynamics.liftSlopeCurve * 
               (angleOfAttack - this.aerodynamics.zeroLiftAoA);
    }
}
```

### 2.2 抗力係数（Drag Coefficient）

揚力係数から誘導抗力を含めた抗力係数の計算：

```typescript
// 抗力係数の計算
private getDragCoefficient(liftCoefficient: number): number {
    // パラサイト抗力 + 誘導抗力
    return this.aerodynamics.dragCoefficient + 
           Math.pow(liftCoefficient, 2) / 
           (Math.PI * this.aerodynamics.aspectRatio * 0.85);
}
```

## 3. エンジンモデル

### 3.1 エンジンRPMの計算

スロットル位置に応じたエンジンRPMの変化と、エンジンブレーキの効果：

```typescript
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
```

## 4. 機体制御モデル

### 4.1 制御入力の影響

操縦桿、ラダーペダル、スロットルレバーなどの入力に対する機体の応答：

```typescript
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

    // 角速度の減衰（空気抵抗など）
    this.angularVelocity.pitch *= 0.95;
    this.angularVelocity.roll *= 0.95;
    this.angularVelocity.yaw *= 0.95;
}
```

## 5. 今後の改善点

### 5.1 より正確な空力モデル
- 横滑り角（サイドスリップ）の影響
- マッハ数による空力特性の変化
- 地面効果（Ground Effect）

### 5.2 詳細な機体モデル
- フラップによる揚力・抗力特性の変化
- 着陸装置による抗力増加
- エアブレーキの実装

### 5.3 環境要因
- 風の影響
- 乱気流
- 異なる気象条件

## 参考資料

YSFLIGHTのソースコードから参考にした主なファイル：
- fsairproperty.cpp/h：大気モデル
- fsrealprop.cpp/h：エンジンモデル
- fsaerodynamics.cpp/h：空力モデル