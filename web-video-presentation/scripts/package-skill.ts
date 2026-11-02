import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, realpathSync, writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

// No private desktop defaults, recursive deletion, shell-interpolated paths or npm dependencies.
// Node 24+: node scripts/package-skill.ts --out-dir ../delivery-NEW [--no-zip]
// Verify later: node scripts/package-skill.ts --verify ../delivery-NEW
// Unix needs `zip` on PATH. Windows uses PowerShell/.NET (not Windows-tested).
const SKILL = "web-video-presentation";
const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = "delivery-manifest.json";
const EXCLUDE_DIRS = new Set([
  // Never redistribute research corpora or historical copies, even under nested folders.
  "lq-distillation", "legacy",
  ".idea", "node_modules", ".git", "__pycache__", ".pytest_cache", "delivery-final-smoke", "delivery-final-smoke-2",
  "scaffold-smoke-final", "_tmp", "_verify", "test-v280", "test-v290",
]);

type FileEntry = { path: string; bytes: number; sha256: string };
type Versions = { VERSION: string; "VERSION.json": string; "manifest.json": string };
type DeliveryManifest = {
  schema: 2; skill: string; version: string; packagedAt: string;
  deliveryMode: "directory-only" | "directory-and-zip";
  skillDirectory: string; hashAlgorithm: "sha256"; fileCount: number; totalBytes: number;
  versions: Versions; files: FileEntry[];
  zip: { name: string; bytes: number; sha256: string } | null;
};

function fail(message: string): never { throw new Error(message); }
function sha256(data: Buffer): string { return createHash("sha256").update(data).digest("hex"); }
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function exists(path: string): boolean {
  try { lstatSync(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}
function insideOrEqual(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
function assertPlainPath(path: string): void {
  // Check all existing ancestors, including dangling symlinks / Windows junctions.
  let current = resolve(path);
  while (true) {
    if (exists(current) && lstatSync(current).isSymbolicLink()) fail(`Symbolic-link paths are not allowed: ${current}`);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
function canonicalPotentialPath(path: string): string {
  if (exists(path)) return realpathSync(path);
  const parent = dirname(path);
  if (parent === path) fail(`Cannot resolve destination: ${path}`);
  return join(canonicalPotentialPath(parent), relative(parent, path));
}
function assertRelativePath(path: unknown): asserts path is string {
  if (typeof path !== "string" || path.length === 0 || path.includes("\\") || /[\x00-\x1f:]/.test(path)
    || path.startsWith("/") || path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail(`Unsafe relative file path: ${JSON.stringify(path)}`);
  }
}
function readRegular(path: string, root: string): Buffer {
  assertPlainPath(path);
  const real = realpathSync(path);
  if (!insideOrEqual(realpathSync(root), real)) fail(`Source escapes its root: ${path}`);
  const before = lstatSync(path);
  if (!before.isFile()) fail(`Only regular files are supported: ${path}`);
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || before.dev !== opened.dev || before.ino !== opened.ino) fail(`File changed while opening: ${path}`);
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    if (opened.size !== after.size || opened.mtimeMs !== after.mtimeMs || opened.ctimeMs !== after.ctimeMs
      || bytes.length !== after.size) fail(`File changed while reading: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}
function readJson(path: string, root: string): any {
  return JSON.parse(readRegular(path, root).toString("utf8").replace(/^\uFEFF/, ""));
}
function readVersions(root: string): Versions {
  const version = readRegular(join(root, "VERSION"), root).toString("utf8").replace(/^\uFEFF/, "").trim();
  // Restrict version syntax so it cannot become a path / executable option.
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(version)) {
    fail("VERSION must contain a semantic version such as 2.9.1");
  }
  const metadata = readJson(join(root, "VERSION.json"), root);
  const manifest = readJson(join(root, "manifest.json"), root);
  if (metadata.version !== version || manifest.version !== version
    || (metadata.publicVersion !== undefined && metadata.publicVersion !== version)) {
    fail("Version mismatch: VERSION, VERSION.json.version/publicVersion and manifest.json.version must agree");
  }
  // Deliberately do not use or reproduce deliveryDirectory or other local metadata.
  return { VERSION: version, "VERSION.json": metadata.version, "manifest.json": manifest.version };
}
function excluded(name: string, directory: boolean, parent: string): boolean {
  if (directory && (EXCLUDE_DIRS.has(name) || /^test-v\d+$/.test(name))) return true;
  // Only exact example/sample/template basenames are distributable; e.g.
  // .env.example.local is still private. Apply at every nesting level.
  const privateEnv = /^\.env(?:\.|$)/i.test(name) && !/^\.env\.(?:example|sample|template)$/i.test(name);
  return !directory && (/\.(?:zip|pyc|pyo)$/i.test(name) || name === ".DS_Store" || privateEnv);
}
function collect(root: string, filter: boolean): { files: FileEntry[]; directories: string[] } {
  const files: FileEntry[] = [];
  const directories: string[] = [];
  const walk = (parent: string) => {
    const dir = join(root, parent);
    assertPlainPath(dir);
    if (!lstatSync(dir).isDirectory() || !insideOrEqual(realpathSync(root), realpathSync(dir))) fail(`Unsafe directory: ${dir}`);
    for (const name of readdirSync(dir).sort()) {
      const rel = parent ? `${parent}/${name}` : name;
      assertRelativePath(rel);
      const path = join(root, rel);
      const stat = lstatSync(path);
      // Reject even symlinks whose names would otherwise be excluded; never dereference them.
      if (stat.isSymbolicLink()) fail(`Source symbolic links are not allowed: ${rel}`);
      if (!stat.isFile() && !stat.isDirectory()) fail(`Unsupported special file: ${rel}`);
      if (filter && excluded(name, stat.isDirectory(), parent)) continue;
      if (stat.isDirectory()) { directories.push(rel); walk(rel); }
      else {
        const bytes = readRegular(path, root);
        files.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
      }
    }
  };
  walk("");
  return { files: files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), directories };
}
function assertFileList(actual: FileEntry[], expected: FileEntry[]): void {
  if (actual.length !== expected.length) fail(`File count mismatch: expected ${expected.length}, found ${actual.length}`);
  const wanted = new Map<string, FileEntry>();
  for (const entry of expected) {
    assertRelativePath(entry.path);
    if (wanted.has(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
      fail(`Invalid or duplicate manifest entry: ${entry.path}`);
    }
    wanted.set(entry.path, entry);
  }
  for (const entry of actual) {
    const match = wanted.get(entry.path);
    if (!match || match.bytes !== entry.bytes || match.sha256 !== entry.sha256) fail(`File verification failed: ${entry.path}`);
  }
}

// Independently inspect standard ZIP contents, not merely the command exit code.
// Reject ZIP64 / multi-disk archives explicitly; skill bundles must stay below these limits.
function verifyZip(bytes: Buffer, files: FileEntry[]): void {
  const need = (offset: number, size: number) => {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + size > bytes.length) fail("Truncated or invalid ZIP");
  };
  const u16 = (offset: number) => { need(offset, 2); return bytes.readUInt16LE(offset); };
  const u32 = (offset: number) => { need(offset, 4); return bytes.readUInt32LE(offset); };
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === bytes.length) { end = p; break; }
  }
  if (end < 0) fail("ZIP end-of-directory record is missing");
  const count = u16(end + 10), centralSize = u32(end + 12), centralStart = u32(end + 16);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || count === 0xffff
    || centralSize === 0xffffffff || centralStart === 0xffffffff) fail("ZIP64 / multi-disk archives are not supported");
  if (centralStart + centralSize !== end) fail("Invalid ZIP central directory bounds");
  const expected = new Map(files.map((entry) => [`${SKILL}/${entry.path}`, entry]));
  const seen = new Set<string>();
  let cursor = centralStart;
  for (let i = 0; i < count; i++) {
    need(cursor, 46);
    if (u32(cursor) !== 0x02014b50) fail("Invalid ZIP central directory entry");
    const flags = u16(cursor + 8), method = u16(cursor + 10), expectedCrc = u32(cursor + 16);
    const compressed = u32(cursor + 20), size = u32(cursor + 24);
    const nameLength = u16(cursor + 28), extraLength = u16(cursor + 30), commentLength = u16(cursor + 32);
    const local = u32(cursor + 42);
    need(cursor + 46, nameLength + extraLength + commentLength);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = nameBytes.toString("utf8");
    const directory = name.endsWith("/");
    assertRelativePath(directory ? name.slice(0, -1) : name);
    if (!name.startsWith(`${SKILL}/`) || seen.has(name)) fail(`Unexpected / duplicate ZIP entry: ${name}`);
    seen.add(name);
    const unixType = (u32(cursor + 38) >>> 16) & 0xf000;
    if ((flags & 1) || ![0, 8].includes(method) || [compressed, size, local].includes(0xffffffff)
      || u16(cursor + 34) !== 0 || (unixType !== 0 && unixType !== (directory ? 0x4000 : 0x8000))) fail(`Unsupported ZIP entry: ${name}`);
    need(local, 30);
    if (u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) fail(`Invalid ZIP local header: ${name}`);
    const localNameLength = u16(local + 26), data = local + 30 + localNameLength + u16(local + 28);
    need(local + 30, localNameLength);
    if (!bytes.subarray(local + 30, local + 30 + localNameLength).equals(nameBytes)) fail(`ZIP name mismatch: ${name}`);
    need(data, compressed);
    if (data + compressed > centralStart) fail(`ZIP entry overlaps its directory: ${name}`);
    const match = expected.get(name);
    if ((!directory && !match) || size !== (match?.bytes ?? 0)) fail(`ZIP size / membership mismatch: ${name}`);
    const packed = bytes.subarray(data, data + compressed);
    const unpacked = method === 0 ? packed : inflateRawSync(packed, { maxOutputLength: Math.max(1, size + 1) });
    if (unpacked.length !== size || crc32(unpacked) !== expectedCrc || (match && sha256(unpacked) !== match.sha256)) fail(`ZIP content verification failed: ${name}`);
    expected.delete(name);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== end || expected.size) fail("ZIP is incomplete or contains an invalid directory");
}
function verifyDelivery(out: string, supplied?: DeliveryManifest): DeliveryManifest {
  assertPlainPath(out);
  if (!lstatSync(out).isDirectory()) fail("Delivery path must be a directory");
  const manifest = supplied ?? readJson(join(out, MANIFEST), out) as DeliveryManifest;
  if (manifest.schema !== 2 || manifest.skill !== SKILL || manifest.skillDirectory !== SKILL
    || manifest.hashAlgorithm !== "sha256" || !Array.isArray(manifest.files)
    || !["directory-only", "directory-and-zip"].includes(manifest.deliveryMode)) fail("Unsupported delivery manifest");
  const root = join(out, SKILL);
  const versions = readVersions(root);
  if (manifest.version !== versions.VERSION || JSON.stringify(manifest.versions) !== JSON.stringify(versions)) fail("Delivery manifest version mismatch");
  const actual = collect(root, false).files;
  assertFileList(actual, manifest.files);
  if (manifest.fileCount !== actual.length || manifest.totalBytes !== actual.reduce((n, entry) => n + entry.bytes, 0)) fail("Manifest totals do not match");
  const allowed = new Set([SKILL, MANIFEST]);
  if (manifest.deliveryMode === "directory-only") {
    if (manifest.zip !== null) fail("Directory-only delivery must not claim a ZIP");
  } else {
    const zip = manifest.zip;
    if (!zip) fail("ZIP delivery is missing ZIP metadata");
    assertRelativePath(zip.name);
    if (zip.name.includes("/") || !zip.name.endsWith(".zip")) fail("Invalid ZIP filename");
    const bytes = readRegular(join(out, zip.name), out);
    if (bytes.length === 0 || bytes.length !== zip.bytes || sha256(bytes) !== zip.sha256) fail("ZIP size / SHA256 verification failed");
    verifyZip(bytes, manifest.files);
    allowed.add(zip.name);
  }
  for (const name of readdirSync(out)) if (!allowed.has(name)) fail(`Unexpected delivery-root entry: ${name}`);
  return manifest;
}
function makeZip(out: string, zipPath: string): void {
  if (exists(zipPath)) fail("Refusing to overwrite an existing ZIP");
  if (process.platform === "win32") {
    // Constant command only. Paths travel via environment variables, so apostrophes,
    // spaces and PowerShell metacharacters in a user-supplied path are not code.
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
      "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; " +
      "[System.IO.Compression.ZipFile]::CreateFromDirectory($env:SKILL_PACKAGE_SOURCE, $env:SKILL_PACKAGE_ZIP, [System.IO.Compression.CompressionLevel]::Optimal, $true)"],
    { stdio: "inherit", env: { ...process.env, SKILL_PACKAGE_SOURCE: join(out, SKILL), SKILL_PACKAGE_ZIP: zipPath } });
  } else {
    execFileSync("zip", ["-q", "-X", "-r", zipPath, SKILL], { cwd: out, stdio: "inherit", env: { ...process.env, ZIPOPT: "" } });
  }
}
function packageSkill(out: string, noZip: boolean): void {
  assertPlainPath(SKILL_DIR);
  assertPlainPath(out);
  const source = realpathSync(SKILL_DIR);
  const target = canonicalPotentialPath(out);
  if (insideOrEqual(source, target) || insideOrEqual(target, source)) fail("Output must not be the source directory, its ancestor, or its descendant");
  if (exists(out) && (!lstatSync(out).isDirectory() || readdirSync(out).length !== 0)) fail("Output must be a new or empty directory; existing content will not be removed");
  // Finish source preflight before writing anything. Run against a stable source tree.
  const versions = readVersions(source);
  const inventory = collect(source, true);
  const root = join(out, SKILL);
  mkdirSync(out, { recursive: true });
  if (readdirSync(out).length !== 0) fail("Output became nonempty; refusing to proceed");
  mkdirSync(root); // Exclusive claim: never reuse / delete an existing skill directory.
  for (const path of inventory.directories) mkdirSync(join(root, path));
  for (const entry of inventory.files) {
    const from = join(source, entry.path);
    const bytes = readRegular(from, source);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) fail(`Source changed during packaging: ${entry.path}`);
    writeFileSync(join(root, entry.path), bytes, { flag: "wx", mode: lstatSync(from).mode & 0o777 });
  }
  const manifest: DeliveryManifest = {
    schema: 2, skill: SKILL, version: versions.VERSION, packagedAt: new Date().toISOString(),
    deliveryMode: noZip ? "directory-only" : "directory-and-zip", skillDirectory: SKILL,
    hashAlgorithm: "sha256", fileCount: inventory.files.length,
    totalBytes: inventory.files.reduce((n, entry) => n + entry.bytes, 0),
    versions, files: inventory.files, zip: null,
  };
  if (!noZip) {
    const name = `${SKILL}-v${versions.VERSION}.zip`;
    const path = join(out, name);
    makeZip(out, path); // Any failed process or missing / corrupt / incomplete output is fatal.
    const bytes = readRegular(path, out);
    verifyZip(bytes, inventory.files);
    manifest.zip = { name, bytes: bytes.length, sha256: sha256(bytes) };
  }
  verifyDelivery(out, manifest);
  // The success manifest is written last, only after directory + archive verification.
  writeFileSync(join(out, MANIFEST), JSON.stringify(manifest, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  verifyDelivery(out);
  console.log(`Delivery complete (${noZip ? "DIRECTORY ONLY; no ZIP created" : "directory + verified ZIP"}): ${out}`);
  console.log(`Version: ${manifest.version}; files: ${manifest.fileCount}; bytes: ${manifest.totalBytes}`);
  if (manifest.zip) console.log(`ZIP: ${manifest.zip.name}; bytes: ${manifest.zip.bytes}; SHA256: ${manifest.zip.sha256}`);
  console.log(`Manifest: ${MANIFEST} (relative paths, per-file sizes and SHA256)`);
}
function main(): void {
  const args = process.argv.slice(2);
  const usage = "Usage:\n  node scripts/package-skill.ts --out-dir <NEW_OR_EMPTY_DIR> [--no-zip]\n  node scripts/package-skill.ts --verify <DELIVERY_DIR>\nNo default output directory. Existing nonempty outputs and all symlinks are rejected.\n--no-zip creates a directory-only delivery, not a ZIP. Node 24+; Unix requires zip.\nWindows PowerShell/.NET path handling is implemented but has not been Windows-tested.";
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) { console.log(usage); return; }
  let out: string | undefined, verify: string | undefined, noZip = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--no-zip" && !noZip) { noZip = true; continue; }
    const key = arg.split("=", 1)[0];
    if (key !== "--out-dir" && key !== "--verify") fail(`Unknown / repeated argument: ${arg}\n${usage}`);
    const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : args[++i];
    if (!value || value.startsWith("--")) fail(`Missing value for ${key}\n${usage}`);
    if (process.platform !== "win32" && (/^[A-Za-z]:/.test(value) || value.startsWith("\\\\"))) fail("Windows output paths must be used on Windows, not interpreted as Unix relative paths");
    if (key === "--out-dir") { if (out !== undefined) fail("Repeated --out-dir"); out = resolve(value); }
    else { if (verify !== undefined) fail("Repeated --verify"); verify = resolve(value); }
  }
  if (verify !== undefined && out === undefined && !noZip) {
    const result = verifyDelivery(verify);
    console.log(`Verification passed: ${result.version}; ${result.fileCount} files; ${result.deliveryMode}`);
  } else if (out !== undefined && verify === undefined) packageSkill(out, noZip);
  else fail(`Choose exactly one of --out-dir or --verify; --no-zip applies only to --out-dir.\n${usage}`);
}
try { main(); }
catch (error) {
  console.error(`Packaging / verification failed: ${(error as Error).message}`);
  console.error("No successful delivery is claimed. Existing files were not deleted; partial outputs, if any, are retained. Choose a fresh output directory after fixing the cause.");
  process.exitCode = 1;
}
