const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);

function candidates() {
  const values = [];
  if (process.env.BASH_PATH) values.push(process.env.BASH_PATH);
  values.push("bash");
  if (process.platform === "win32") {
    values.push(
      "C:\\Program Files\\Git\\bin\\bash.exe",
      "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
      "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
      "C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe",
    );
  }
  return values;
}

function canRun(command) {
  if (/^[a-z]+$/i.test(command)) return true;
  return existsSync(command);
}

let lastError = "";
for (const bash of candidates()) {
  if (!canRun(bash)) continue;
  const result = spawnSync(bash, args, { stdio: "inherit", shell: false });
  if (result.error) {
    lastError = result.error.message;
    continue;
  }
  process.exit(result.status ?? 0);
}

console.error("x Bash not found. Install Git for Windows, add bash to PATH, or set BASH_PATH.");
if (lastError) console.error(lastError);
process.exit(1);
