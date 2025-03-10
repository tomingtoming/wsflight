# YSFLIGHTモデルローダー解説

YSFLIGHTのモデルファイル（.dnm, .srf）をThree.jsで読み込むためのローダーの実装について解説します。

## 概要

YSFLIGHTでは、以下の2種類の主要なモデルファイル形式が使用されています：

1. **DNM (Dynamic Model)**: 階層構造を持つ動的モデル。回転ノードを含み、アニメーション（着陸装置の開閉、プロペラの回転など）が可能。
2. **SRF (Surface)**: 単純な静的メッシュモデル。主に衝突判定や簡易的な形状表現に使用。

これらのファイルはバイナリ形式で、YSFLIGHTの独自フォーマットです。本プロジェクトでは、これらのファイルを直接読み込み、Three.jsのオブジェクトに変換するローダーを実装しています。

## 座標系の違い

YSFLIGHTとThree.jsでは座標系が異なります：

- **YSFLIGHT**: Y-up座標系（Y軸が上方向）
- **Three.js**: デフォルトではY-up座標系だが、本プロジェクトではY-upを使用

座標変換は以下のように行います：
```
Three.js座標 = (YSFLIGHT.x, YSFLIGHT.y, -YSFLIGHT.z)
```

Z軸の符号を反転させることで、前方向を合わせています。

## DNMLoader

DNMファイルは階層構造を持つ動的モデルで、以下の特徴があります：

- ヘッダー情報（シグネチャ "DNM "、バージョン番号）
- ノード数
- 各ノードの情報
  - ノードタイプ（0: メッシュノード、1: 回転ノード、2: 非表示ノード）
  - ノード名
  - ノード固有のデータ（メッシュデータや回転軸情報など）

### 実装の詳細

`DNMLoader`クラスは以下の主要なメソッドを持ちます：

1. **load(url)**: DNMファイルをURLから読み込み、Three.jsのGroupオブジェクトに変換
2. **parse(buffer)**: バイナリデータを解析し、Three.jsのオブジェクトに変換
3. **parseNode(dataView, offset, version)**: 個々のノードを解析
4. **parseMeshNode(dataView, offset, nodeName, version)**: メッシュノードを解析
5. **parseRotationNode(dataView, offset, nodeName, version)**: 回転ノードを解析
6. **rotateNode(group, nodeName, angle)**: 指定したノードを回転させる

回転ノードは、Three.jsのGroupオブジェクトとして表現され、回転軸の情報はuserDataに保存されます。これにより、プロペラの回転や着陸装置の開閉などのアニメーションが可能になります。

### バージョン対応

DNMファイルには複数のバージョンが存在し、バージョンによって含まれる情報が異なります：

- バージョン20以上: 面の法線情報を含む
- バージョン30以上: テクスチャ情報を含む

現在の実装では、これらのバージョンの違いに対応しています。

## SRFLoader

SRFファイルは単純な静的メッシュモデルで、以下の特徴があります：

- ヘッダー情報（シグネチャ "SURF"、バージョン番号）
- 頂点数と頂点データ
- 面数と面データ（頂点インデックス、法線、色情報）

### 実装の詳細

`SRFLoader`クラスは以下の主要なメソッドを持ちます：

1. **load(url)**: SRFファイルをURLから読み込み、Three.jsのGroupオブジェクトに変換
2. **parse(buffer)**: バイナリデータを解析し、Three.jsのオブジェクトに変換

SRFファイルは比較的シンプルな構造で、頂点データと面データを直接Three.jsのBufferGeometryに変換します。色情報は頂点カラーとして適用されます。

## 使用方法

```typescript
import { DNMLoader, SRFLoader } from './loaders/index.ts';

// DNMファイルの読み込み
const dnmLoader = new DNMLoader();
dnmLoader.load('/YSFLIGHT/runtime/aircraft/f18.dnm').then((model) => {
  scene.add(model);
});

// SRFファイルの読み込み
const srfLoader = new SRFLoader();
srfLoader.load('/YSFLIGHT/runtime/aircraft/f18coll.srf').then((model) => {
  scene.add(model);
});

// 回転ノードのアニメーション（プロペラなど）
function animate() {
  requestAnimationFrame(animate);
  
  // プロペラノードを回転
  if (aircraftModel) {
    dnmLoader.rotateNode(aircraftModel, 'propeller', propellerAngle);
    propellerAngle += 0.1; // 回転角度を更新
  }
  
  renderer.render(scene, camera);
}
```

## 今後の課題

1. **テクスチャ対応の完全実装**: 現在、テクスチャ情報は読み込まれますが、実際のテクスチャファイルの読み込みと適用は未実装です。
2. **アニメーションの完全対応**: 着陸装置の開閉など、複雑なアニメーションの対応が必要です。
3. **パフォーマンス最適化**: 大規模なモデルの読み込み時のパフォーマンス改善が必要です。
4. **エラーハンドリングの強化**: 破損したファイルや未対応のバージョンに対する堅牢なエラーハンドリングが必要です。
5. **DATファイルの対応**: 航空機のパラメータファイル（.dat）の読み込みと統合が必要です。

## YSFLIGHTのソースコードからの知見

YSFLIGHTのソースコードを分析した結果、以下の重要な知見が得られました：

1. DNMファイルの回転ノードは、回転軸の原点と方向ベクトルで定義されています。
2. SRFファイルの面は、必ずしも三角形ではなく、多角形の場合もあります（Three.jsでは三角形に分割して対応）。
3. テクスチャ座標系はYSFLIGHTとThree.jsで異なるため、V座標を反転させる必要があります。
4. YSFLIGHTでは、モデルファイルとは別に衝突判定用のSRFファイルが用意されていることが多いです。

## 参考資料

- YSFLIGHTのソースコード: `YSFLIGHT/src/graphics/`ディレクトリ
  - `ysdnm.cpp`: DNMファイルの読み込み処理
  - `yssrf.cpp`: SRFファイルの読み込み処理
- Three.js公式ドキュメント: [カスタムローダーの作成](https://threejs.org/docs/#manual/en/introduction/How-to-create-a-custom-loader)