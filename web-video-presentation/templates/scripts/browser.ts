import { existsSync } from 'node:fs';
/** Local executable discovery only. Never lets Remotion implicitly download a browser. */
export function installedBrowser(explicit?: string | null): string {
  const requested = explicit || process.env.REMOTION_BROWSER_EXECUTABLE;
  if (requested) {
    if (!existsSync(requested)) throw new Error(`Browser executable does not exist: ${requested}`);
    return requested;
  }
  const candidates = process.platform === 'win32'
    ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)
      .flatMap((prefix) => [`${prefix}\\Microsoft\\Edge\\Application\\msedge.exe`, `${prefix}\\Google\\Chrome\\Application\\chrome.exe`])
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/microsoft-edge'];
  const browser = candidates.find((path) => existsSync(path));
  if (!browser) throw new Error('No installed Chrome/Chromium/Edge found. Specify --browser-executable. Browser downloads are disabled.');
  return browser;
}
