// filepath: /Users/toming/wsflight/scripts/test.ts
/**
 * WSFlightのテスト実行スクリプト
 * Denoのテストランナーを使用して、プロジェクト内のすべてのテストを実行します
 */

const runTests = async () => {
  console.log("WSFlight テストを実行中...\n");

  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "test",
      "--allow-read",
      "--allow-net",
      "--allow-env",
      "tests/",
    ],
  });

  const { code, stdout, stderr } = await command.output();
  
  // 標準出力と標準エラー出力を表示
  await Deno.stdout.write(stdout);
  await Deno.stderr.write(stderr);
  
  return code;
};

// テストを実行してプロセス終了コードを設定
const exitCode = await runTests();
Deno.exit(exitCode);