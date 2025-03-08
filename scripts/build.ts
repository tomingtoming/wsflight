import { build, BuildOptions } from "https://deno.land/x/dnt@0.38.1/mod.ts";
import { join } from "https://deno.land/std@0.210.0/path/mod.ts";

const isWatchMode = Deno.args.includes("--watch");

// フロントエンドファイルをビルド
const buildFrontend = async () => {
  console.log("🔨 フロントエンドのTypeScriptファイルをビルド中...");
  
  // public/scripts内のTSファイルをJSにコンパイル
  const cmd = [
    "deno",
    "run",
    "--allow-read",
    "--allow-write",
    "--allow-env",
    "--allow-run",
    "--allow-net",
    "https://deno.land/x/esbuild@v0.19.12/mod.js",
    "./public/scripts/main.ts",
    "--bundle",
    "--outfile=./public/scripts/main.js",
    "--format=esm",
    "--target=es2020",
    "--external:three",
    "--external:three/*",
  ];

  if (isWatchMode) {
    cmd.push("--watch");
  }

  const process = Deno.run({ cmd });
  const status = await process.status();

  if (!status.success) {
    console.error("❌ フロントエンドのビルドに失敗しました");
    Deno.exit(1);
  }

  console.log("✅ フロントエンドのビルド完了");
};

// サーバーファイルをビルド
const buildServer = async () => {
  console.log("🔨 サーバーサイドのTypeScriptファイルをビルド中...");

  try {
    await Deno.mkdir("./dist", { recursive: true });
  } catch (e) {
    // ディレクトリが既に存在する場合は無視
  }

  const process = Deno.run({
    cmd: [
      "deno",
      "compile",
      "--allow-read",
      "--allow-write",
      "--allow-net",
      "--allow-env",
      "--output",
      "./dist/server",
      "./src/main.ts",
    ],
  });

  const status = await process.status();

  if (!status.success) {
    console.error("❌ サーバーサイドのビルドに失敗しました");
    Deno.exit(1);
  }

  console.log("✅ サーバーサイドのビルド完了");
};

// メインビルドプロセス
const main = async () => {
  await buildFrontend();
  
  if (!isWatchMode) {
    await buildServer();
  }
};

// ビルド実行
main().catch((err) => {
  console.error("ビルド中にエラーが発生しました:", err);
  Deno.exit(1);
});