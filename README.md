# WSFlight - Web Flight Simulator

YSFLIGHTライクなWebブラウザベースのフライトシミュレーター

## プロジェクト概要

WSFlightは、Three.jsを使用した3DグラフィックスとDenoのバックエンドを組み合わせた
モダンなフライトシミュレーターです。

## 技術スタック

- **フロントエンド**:
  - Three.js (3Dグラフィックス)
  - ES Modules
  - カスタムHUDシステム

- **バックエンド**:
  - Deno
  - Oak (Webフレームワーク)

## 開発環境のセットアップ

1. 必要条件
   - [Deno](https://deno.land/) v1.40.0以上

2. インストール
   ```bash
   # リポジトリのクローン
   git clone https://github.com/yourusername/wsflight.git
   cd wsflight
   ```

3. 開発サーバーの起動
   ```bash
   deno task dev
   ```

4. ブラウザでアクセス
   ```
   http://localhost:8000
   ```

## プロジェクト構造

```
wsflight/
├── docs/              # プロジェクトドキュメント
│   └── flight_physics.md  # 物理モデルの仕様
├── public/            # 静的ファイル
│   ├── index.html     # メインHTML
│   ├── styles/        # CSSファイル
│   └── scripts/       # フロントエンドJavaScript
├── src/              # バックエンドソース
│   └── main.ts       # Denoサーバー
└── deno.json         # Deno設定ファイル
```

## 実装状況

### 完了した機能
- ✅ 基本的な開発環境の構築
- ✅ Three.jsの基本セットアップ
- ✅ 静的ファイル配信の実装
- ✅ 基本的なHUDレイアウト

### 進行中の機能
- 🚧 物理エンジンの実装
- 🚧 航空機モデルの設計
- 🚧 地形システムの実装

### 今後の実装予定
- 📅 マルチプレイヤー対応
- 📅 サウンドシステム
- 📅 ミッションシステム

## 貢献方法

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
