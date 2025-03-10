# 失速時の挙動改善

航空機の失速（スタール）時の挙動をより現実的に再現するための実装について解説します。

## 概要

航空機の失速とは、翼の迎え角（Angle of Attack, AoA）が大きくなりすぎた場合に、翼上面の気流が剥離して揚力が急激に減少する現象です。実際の航空機では、失速時には以下のような挙動が見られます：

1. 揚力の急激な減少
2. 抗力の増加
3. 機首下げモーメントの発生
4. 操縦性の低下
5. 場合によっては片翼失速によるロール（横転）

本プロジェクトでは、YSFLIGHTの物理モデルを参考に、これらの挙動をより正確に再現するための改善を実装しました。

## 実装の詳細

### 1. 非線形な揚力係数モデル

従来の実装では、揚力係数（CL）は迎え角に対して線形に増加するモデルを使用していましたが、実際の航空機では迎え角が大きくなると非線形な挙動を示します。新しい実装では、以下のような非線形モデルを採用しています：

```typescript
// 迎え角に応じた揚力係数の計算
private calculateLiftCoefficient(angleOfAttack: number): number {
  // 失速角（通常は15〜20度程度）
  const stallAngle = this.stallAngleDegrees * (Math.PI / 180);
  
  // 失速前の領域（線形）
  if (Math.abs(angleOfAttack) < stallAngle) {
    return this.liftSlope * angleOfAttack;
  } 
  // 失速後の領域（非線形）
  else {
    const stallSeverity = 0.8; // 失速の急峻さを制御（0〜1）
    const postStallSlope = -0.3; // 失速後の揚力勾配
    
    // 失速点での揚力係数
    const clMax = this.liftSlope * stallAngle;
    
    // 失速後の揚力係数（徐々に減少）
    const excessAngle = Math.abs(angleOfAttack) - stallAngle;
    const dropOff = clMax * stallSeverity * (1 - Math.exp(-excessAngle * 3));
    const postStallCl = clMax - dropOff + postStallSlope * excessAngle;
    
    return Math.sign(angleOfAttack) * postStallCl;
  }
}
```

このモデルでは、失速角を超えると揚力係数が急激に減少し、その後緩やかに変化する挙動を再現しています。

### 2. 失速時の抗力増加

失速時には気流の剥離により抗力が大幅に増加します。これを再現するため、抗力係数（CD）の計算を以下のように改善しました：

```typescript
// 迎え角に応じた抗力係数の計算
private calculateDragCoefficient(angleOfAttack: number): number {
  // 基本抗力係数（形状抗力）
  const cd0 = this.dragCoefficient;
  
  // 失速角
  const stallAngle = this.stallAngleDegrees * (Math.PI / 180);
  
  // 誘導抗力係数（揚力依存抗力）
  const cl = this.calculateLiftCoefficient(angleOfAttack);
  const inducedDrag = (cl * cl) / (Math.PI * this.aspectRatio * this.ostwaldEfficiency);
  
  // 失速による追加抗力
  let stallDrag = 0;
  if (Math.abs(angleOfAttack) > stallAngle) {
    const excessAngle = Math.abs(angleOfAttack) - stallAngle;
    stallDrag = 0.5 * (1 - Math.exp(-excessAngle * 4)); // 失速時の抗力増加
  }
  
  return cd0 + inducedDrag + stallDrag;
}
```

このモデルでは、失速角を超えると基本抗力と誘導抗力に加えて、失速による追加抗力が発生します。

### 3. 機首下げモーメントの実装

失速時には通常、機首下げモーメントが発生します。これは翼の空力中心が後方に移動することによるもので、自然な回復を促す重要な特性です。この挙動を再現するため、以下のようなコードを実装しました：

```typescript
// 失速時の機首下げモーメントの計算
private calculateStallPitchingMoment(angleOfAttack: number): number {
  const stallAngle = this.stallAngleDegrees * (Math.PI / 180);
  
  // 失速していない場合は0
  if (Math.abs(angleOfAttack) <= stallAngle) {
    return 0;
  }
  
  // 失速時の機首下げモーメント
  const excessAngle = Math.abs(angleOfAttack) - stallAngle;
  const momentMagnitude = 0.3 * (1 - Math.exp(-excessAngle * 2));
  
  // 迎え角の符号に応じて方向を反転（常に機首下げ方向）
  return -Math.sign(angleOfAttack) * momentMagnitude;
}
```

このモーメントは、航空機の姿勢計算時にピッチ角速度に影響を与えます。

### 4. 操縦性の低下

失速時には舵面の効きが悪くなります。これを再現するため、舵面効果の計算に失速状態を考慮するようにしました：

```typescript
// 舵面効果の計算（エレベータ例）
private calculateElevatorEffect(elevatorInput: number, angleOfAttack: number): number {
  const stallAngle = this.stallAngleDegrees * (Math.PI / 180);
  
  // 失速状態に応じた効き係数（失速時は効きが悪くなる）
  let effectivenessFactor = 1.0;
  if (Math.abs(angleOfAttack) > stallAngle) {
    const excessAngle = Math.abs(angleOfAttack) - stallAngle;
    effectivenessFactor = Math.max(0.2, 1.0 - 0.8 * (1 - Math.exp(-excessAngle * 2)));
  }
  
  return this.elevatorEffectiveness * elevatorInput * effectivenessFactor;
}
```

このコードにより、失速時にはエレベータ（昇降舵）の効きが最大80%低下し、操縦が難しくなります。

### 5. 片翼失速のシミュレーション

実際の航空機では、片方の翼だけが先に失速することがあり、これによって予期せぬロール（横転）が発生することがあります。この現象を簡易的に再現するため、以下のようなコードを実装しました：

```typescript
// 片翼失速によるロールモーメントの計算
private calculateAsymmetricStallRollMoment(angleOfAttack: number, sideslipAngle: number): number {
  const stallAngle = this.stallAngleDegrees * (Math.PI / 180);
  
  // 失速していない場合は0
  if (Math.abs(angleOfAttack) <= stallAngle * 0.9) {
    return 0;
  }
  
  // 失速領域付近での非対称性（横滑り角とランダム性を考慮）
  const asymmetryFactor = 0.2 * sideslipAngle + 0.05 * (Math.random() - 0.5);
  const excessAngle = Math.abs(angleOfAttack) - stallAngle * 0.9;
  const momentMagnitude = 0.4 * (1 - Math.exp(-excessAngle * 3)) * asymmetryFactor;
  
  return momentMagnitude;
}
```

このコードにより、失速時に横滑り角（サイドスリップ）がある場合や、わずかなランダム性により、予測困難なロール特性が発生します。

## YSFLIGHTとの比較

YSFLIGHTの失速モデルは、`fsairplaneproperty.cpp`の`GetLiftCurveSlope`関数などで実装されています。本プロジェクトでは、YSFLIGHTのモデルを参考にしつつ、以下の点で改善を行いました：

1. **より滑らかな遷移**: 失速前後の遷移をより滑らかにし、急激な挙動変化を抑制
2. **迎え角依存性の強化**: 迎え角に対する各種係数の依存性をより詳細にモデル化
3. **ランダム性の導入**: 片翼失速などの予測困難な挙動に若干のランダム性を導入
4. **パラメータの調整**: 実際の飛行テストに基づいて各種パラメータを微調整

## 効果と今後の課題

### 改善された点

1. **より現実的な失速挙動**: 急激な揚力低下と回復の難しさが再現され、より現実的な失速体験を提供
2. **操縦技術の重要性**: 失速を避けるための適切な速度と迎え角管理が重要になり、操縦技術の向上が求められる
3. **回復手順の再現**: 実機と同様の失速回復手順（機首下げ、パワー増加）が有効になる

### 今後の課題

1. **機種別の失速特性**: 異なる航空機タイプ（戦闘機、旅客機、プロペラ機など）ごとの失速特性の実装
2. **高迎え角飛行の改善**: F-18などの高迎え角飛行が可能な機体の特殊な失速特性の実装
3. **スピン（自転）の実装**: 深い失速から発展するスピン状態とその回復手順の実装
4. **フラップ効果の考慮**: フラップ展開時の失速特性変化（失速角の増加など）の実装
5. **気象条件の影響**: 乱気流や風のシアなどが失速特性に与える影響の実装

## 参考資料

- YSFLIGHTのソースコード: `fsairplaneproperty.cpp`, `fsaerodynamics.cpp`
- 航空力学の基礎理論: Anderson, J.D. "Fundamentals of Aerodynamics"
- 失速特性に関する実験データ: NASA Technical Reports