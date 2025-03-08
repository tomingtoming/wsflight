import * as esbuild from "https://deno.land/x/esbuild@v0.19.12/mod.js";
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { dirname, fromFileUrl, join } from "https://deno.land/std@0.210.0/path/mod.ts";

// 現在のディレクトリのパスを取得
const currentDir = dirname(fromFileUrl(import.meta.url));
const rootDir = join(currentDir, "..");
const publicDir = join(rootDir, "public");

// クライアントリロードスクリプト
const LIVE_RELOAD_SCRIPT = `
  <script>
    // シンプルなライブリロード
    const socket = new WebSocket('ws://' + window.location.host + '/livereload');
    socket.addEventListener('message', (event) => {
      if (event.data === 'reload') {
        console.log('[DEV] ページをリロードします...');
        window.location.reload();
      }
    });
  </script>
`;

// オープンしているWebSocketコネクション
const sockets: WebSocket[] = [];

// esbuildのコンテキスト
let context: any = null;

// esbuildでバンドルを開始
const startBuild = async () => {
  console.log("🔨 TypeScriptファイルをバンドル中...");
  
  try {
    context = await esbuild.context({
      entryPoints: ["./public/scripts/main.ts"],
      bundle: true,
      outfile: "./public/scripts/main.js",
      format: "esm",
      target: "es2020",
      external: ["three", "three/*"],
      sourcemap: true,
      minify: false,
    });

    console.log("👀 変更を監視中...");
    await context.watch();
    console.log("✅ バンドル完了！");
    
    // 変更を検知したらWebSocketクライアントにリロード信号を送信
    context.rebuild = async () => {
      try {
        const result = await context.rebuild();
        console.log("🔄 再ビルド完了、ブラウザをリロードします...");
        
        // すべてのWebSocketクライアントにリロード信号を送信
        for (const socket of sockets) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send("reload");
          }
        }
        
        return result;
      } catch (err) {
        console.error("❌ ビルドエラー:", err);
        throw err;
      }
    };
    
    return context;
  } catch (err) {
    console.error("❌ バンドルエラー:", err);
    Deno.exit(1);
  }
};

// サーバーの設定と起動
const startServer = async () => {
  const app = new Application();
  const router = new Router();

  // WebSocket用のアップグレードハンドラ
  app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === "/livereload") {
      if (!ctx.isUpgradable) {
        ctx.throw(501);
        return;
      }
      
      const ws = await ctx.upgrade();
      console.log("🔌 新しいWebSocket接続");
      
      sockets.push(ws);
      
      ws.onclose = () => {
        const index = sockets.indexOf(ws);
        if (index !== -1) {
          sockets.splice(index, 1);
          console.log("🔌 WebSocket接続が閉じられました");
        }
      };
      
      return;
    }
    await next();
  });

  // ルートへのアクセス - index.htmlにLiveReloadスクリプトを注入
  router.get("/", async (ctx) => {
    try {
      const htmlPath = join(publicDir, "index.html");
      let html = await Deno.readTextFile(htmlPath);
      
      // LiveReloadスクリプトをbody終了タグの前に挿入
      html = html.replace("</body>", `${LIVE_RELOAD_SCRIPT}\n</body>`);
      
      ctx.response.type = "text/html";
      ctx.response.body = html;
    } catch (err) {
      console.error("Error serving index.html:", err);
      ctx.response.status = 500;
      ctx.response.body = "Internal server error";
    }
  });

  // 静的ファイルのルーティング
  router.get("/static/(.*)", async (ctx) => {
    try {
      const pathname = ctx.request.url.pathname;
      const path = pathname.replace("/static/", "");
      
      await ctx.send({
        root: publicDir,
        path: path,
      });
    } catch (err) {
      console.error(`Error serving static file: ${ctx.request.url.pathname}`, err);
      ctx.response.status = 404;
      ctx.response.body = "File not found";
    }
  });

  // 他の静的ファイル
  router.get("/(.*)", async (ctx) => {
    try {
      await ctx.send({
        root: publicDir,
        path: ctx.params[0],
      });
    } catch (err) {
      ctx.response.status = 404;
      ctx.response.body = "File not found";
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  // エラーハンドリング
  app.addEventListener("error", (evt) => {
    console.error("Server error:", evt.error);
  });

  // サーバー起動
  const port = 8000;
  console.log(`🚀 開発サーバー起動: http://localhost:${port}`);
  await app.listen({ port });
};

// メイン処理
const main = async () => {
  await startBuild();
  await startServer();
};

// 開発サーバー起動
main().catch((err) => {
  console.error("エラーが発生しました:", err);
  Deno.exit(1);
});

// クリーンアップ
const cleanup = async () => {
  if (context) {
    await context.dispose();
  }
  console.log("\n👋 開発サーバーを終了します");
  Deno.exit(0);
};

// シグナルハンドリング
Deno.addSignalListener("SIGINT", cleanup);
Deno.addSignalListener("SIGTERM", cleanup);