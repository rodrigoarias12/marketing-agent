import { execFile } from "node:child_process";
import { resolve } from "node:path";

const SCRIPTS_DIR = resolve(import.meta.dirname, "../../../scripts");

/**
 * Run one of Eddie's existing .mjs scripts as a child process.
 * Returns { stdout, stderr, code }.
 */
export function runScript(
  scriptName: string,
  args: string[] = [],
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; code: number }> {
  const scriptPath = resolve(SCRIPTS_DIR, scriptName);

  return new Promise((resolve, reject) => {
    const child = execFile(
      "node",
      [scriptPath, ...args],
      {
        cwd: SCRIPTS_DIR,
        env: { ...process.env, ...env },
        timeout: 120_000, // 2 min max
        maxBuffer: 5 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error && !("code" in error)) {
          return reject(error);
        }
        resolve({
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          code: (error as any)?.code ?? 0,
        });
      }
    );
  });
}
