/**
 * global-setup — يعمل قبل إقلاع خادم الويب في كل تشغيل E2E
 * يستدعي seed-e2e.ts بـ bun (لضمان runtime موحد مع bun:sqlite)
 */
import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("bun tests/e2e/seed-e2e.ts", {
    cwd: process.cwd(),
    stdio: "inherit",
    timeout: 120_000,
  });
}
