import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runPythonCli(args: string[], env?: NodeJS.ProcessEnv) {
  // Use 'python' on Windows, 'python3' on Unix-like systems
  const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
  const pyPath = path.join(__dirname, "../../py_scripts/stego_aes_lsb_cli.py");
  const result = spawnSync(pythonCmd, [pyPath, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf-8",
    shell: process.platform === 'win32' // Use shell on Windows for better compatibility
  });
  return result; // { stdout, stderr, status }
}
