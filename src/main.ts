import { Application, Router, Context } from "oak";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";

const app = new Application();
const router = new Router();

// 現在のディレクトリのパスを取得
const currentDir = dirname(fromFileUrl(import.meta.url));
const publicDir = join(currentDir, "..", "public");

// 静的ファイルの提供
router.get("/", async (ctx) => {
  try {
    await ctx.send({
      root: publicDir,
      index: "index.html",
    });
  } catch (err) {
    console.error("Error serving index.html:", err);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
});

// 静的ファイルのルーティング - 修正版
router.get("/static/(.*)", async (ctx) => {
  try {
    // URLからパスを抽出
    const pathname = ctx.request.url.pathname;
    const path = pathname.replace("/static/", "");
    
    console.log(`Serving static file: ${path}`);
    
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

app.use(router.routes());
app.use(router.allowedMethods());

// エラーハンドリング
app.addEventListener("error", (evt) => {
  console.error("Server error:", evt.error);
});

// サーバー起動
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });