const { spawn } = require("node:child_process");
const { createServer } = require("node:net");
const fs = require("node:fs");
const { resolve, dirname, join, delimiter } = require("node:path");

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i], equal = arg.indexOf("="), key = equal < 0 ? arg : arg.slice(0, equal);
    if (key === "--help" || key === "-h") { options.help = true; continue; }
    if (!["--browser-executable", "--browser", "--browser-args", "--no-open", "--port"].includes(key)) {
      throw new Error(`Unsupported Studio argument: ${arg}. Use --help for supported options.`);
    }
    if (options[key] !== undefined) throw new Error(`Duplicate Studio argument: ${key}`);
    if (key === "--no-open") {
      const value = equal < 0 ? "true" : arg.slice(equal + 1);
      if (!["true", "false"].includes(value)) throw new Error("--no-open must be true or false");
      options[key] = value;
      continue;
    }
    const value = equal < 0 ? args[++i] : arg.slice(equal + 1);
    if (!value || (value.startsWith("--") && key !== "--browser-args") || /[\x00-\x1f\x7f]/u.test(value)) throw new Error(`Missing or invalid value for ${key}`);
    options[key] = value;
  }
  if (options["--port"] !== undefined && (!/^\d+$/u.test(options["--port"])
    || Number(options["--port"]) < 1 || Number(options["--port"]) > 65535)) throw new Error("--port must be an integer from 1 to 65535");
  return options;
}

function isExecutable(file) {
  try {
    if (!fs.statSync(file).isFile()) return false;
    if (process.platform !== "win32") fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch { return false; }
}

/** Read-only local discovery. Never pass a null browser to Remotion's render queue. */
function installedBrowser(explicit) {
  const requested = explicit || process.env.REMOTION_BROWSER_EXECUTABLE;
  if (requested) {
    if (/[\x00-\x1f\x7f]/u.test(requested) || !isExecutable(resolve(requested))) {
      throw new Error(`Selected browser is not an executable regular file: ${requested}. Select an existing Chrome/Chromium/Edge executable; no browser was installed or downloaded.`);
    }
    return resolve(requested);
  }
  const candidates = process.platform === "win32"
    ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean)
      .flatMap((prefix) => [join(prefix, "Microsoft/Edge/Application/msedge.exe"), join(prefix, "Google/Chrome/Application/chrome.exe")])
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
      : ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/bin/microsoft-edge"];
  for (const folder of (process.env.PATH || "").split(delimiter).filter(Boolean)) {
    for (const name of ["microsoft-edge", "msedge", "google-chrome", "chromium", "chromium-browser"]) {
      candidates.push(resolve(folder, name + (process.platform === "win32" ? ".exe" : "")));
    }
  }
  const browser = candidates.find(isExecutable);
  if (!browser) throw new Error("No installed Chrome/Chromium/Edge executable found. Pass --browser-executable=<existing-path> or REMOTION_BROWSER_EXECUTABLE. If installation is needed, confirm its source, target and authorization first. No server, browser download or installation was started.");
  return resolve(browser);
}

function isPortFree(port) {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(port, () => {
      server.close(() => resolvePromise(true));
    });
  });
}

async function findPort(start = 3000, end = 3010) {
  for (let port = start; port <= end; port++) {
    try {
      await isPortFree(port);
      return port;
    } catch {
      // try next port
    }
  }
  throw new Error("no free port between 3000 and 3010 for Remotion Studio");
}

async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) {
    console.log("Usage: npm run render:studio -- [--browser-executable=<existing-path>] [--browser=<UI-app-or-path>] [--browser-args=<args>] [--no-open[=true|false]] [--port=3000]\nREMOTION_BROWSER_EXECUTABLE is also supported. Without a selected browser, discover a local installed Chrome/Chromium/Edge; never download one. Default port selection checks 3000 through 3010.");
    return 0;
  }
  // Resolve and validate before opening a socket or launching the CLI. An explicit
  // invalid path never falls back to another browser or Remotion's downloader.
  const browser = installedBrowser(options["--browser-executable"]);
  const root = process.cwd(), entry = resolve(root, "src/video/index.ts");
  const port = options["--port"] === undefined ? await findPort() : Number(options["--port"]);
  if (options["--port"] !== undefined) await isPortFree(port);
  const forwarded = [`--browser-executable=${browser}`, `--browser=${options["--browser"] || browser}`];
  if (options["--browser-args"] !== undefined) forwarded.push(`--browser-args=${options["--browser-args"]}`);
  // Remotion 4's minimist route recognizes bare --no-open as open=false;
  // --no-open=true is NOT equivalent. Explicit false means do not add the flag.
  if (options["--no-open"] === "true") forwarded.push("--no-open");
  console.error(`Remotion Studio: http://localhost:${port}`);
  console.error(`Using installed render browser: ${browser}`);
  const child = spawn(
    process.execPath,
    [resolve(dirname(require.resolve("@remotion/cli/package.json")), "remotion-cli.js"), "studio", entry, `--port=${port}`, ...forwarded],
    { cwd: root, stdio: "inherit", shell: false },
  );
  return new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolvePromise(code ?? 1));
  });
}

module.exports = {parseOptions, installedBrowser, main};
if (require.main === module) main().then((code) => { process.exitCode = code; }).catch((error) => {
  console.error(`Studio blocked: ${error.message}`);
  process.exitCode = 1;
});
