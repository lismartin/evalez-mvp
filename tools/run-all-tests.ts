import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

type PackageJson = {
  scripts?: Record<string, string>;
};

const packageJsonPath = resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
const testScripts = Object.keys(packageJson.scripts ?? {}).filter((name) =>
  name.startsWith("test:"),
);

for (const script of testScripts) {
  console.log(`\n> ${script}`);

  const result = spawnSync("corepack", ["pnpm", "run", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error || result.status !== 0) {
    console.error(`\nLa prueba ${script} falló.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\n${testScripts.length} pruebas completadas.`);
