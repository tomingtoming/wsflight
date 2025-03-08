# wsflight

## プロジェクト概要
wsflightは、ブラウザ上で遊べる無料の飛行シミュレーターで、リアルな飛行体験を提供します。Version 1.0では、1種類の航空機と自由飛行モード、基本的な天候設定（晴れと曇り）を提供し、キーボードでの操作が可能です。

## 特徴と技術

### 特徴:
- 1機の詳細な航空機モデル
- 自由飛行モード
- 基本的な天候設定（晴れと曇り）
- キーボード操作
- マルチプレイヤー機能の追加
- 追加の航空機モデル
- 新しいゲームモードの導入
- より複雑な天候システム

### 使用技術:
- フロントエンド: Three.js で3Dレンダリング
- バックエンド: Deno でサーバー管理
- 通信: Socket.io でリアルタイム通信

## インストールと使用方法
ローカルでwsflightを動かすには以下の手順に従ってください：

1. リポジトリをクローン：
   ```
   git clone https://github.com/tomingtoming/wsflight
   ```

2. Denoをインストール（未インストールの場合）：
   ```
   curl -fsSL https://deno.land/x/install/install.sh | sh
   ```

3. プロジェクトディレクトリに移動：
   ```
   cd wsflight
   ```

4. サーバーを起動：
   ```
   deno run --allow-net server.ts
   ```

5. ブラウザで `http://localhost:8000` にアクセスして飛行開始。

## 貢献方法
このプロジェクトへの貢献を歓迎します。以下の手順に従ってください：

1. リポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを開く

## 将来の計画
- マルチプレイヤー機能の追加
- 追加の航空機モデル
- 新しいゲームモードの導入
- より複雑な天候システム

## ライセンス
このプロジェクトはBSD-3-Clauseライセンスの下で公開されています。
