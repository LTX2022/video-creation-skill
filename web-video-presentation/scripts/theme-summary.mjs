#!/usr/bin/env node
// Read-only metadata selector. No packages, network, environment reads or token CSS.
import {constants, lstatSync, openSync, closeSync, fstatSync, readFileSync, readdirSync, realpathSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const usage = 'Usage: node scripts/theme-summary.mjs --query="关键词" [--limit=3] | --id=exact-id | --all\nKeyword matches are metadata hints, not aesthetic scores. --all explicitly lists the inventory.';
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fail = (message) => { throw new Error(message); };
const normalize = (value) => value.normalize('NFKC').toLowerCase();

function parseArgs(args) {
  const options = {};
  for (const arg of args) {
    const match = /^(--query|--id|--limit)=(.*)$/s.exec(arg);
    const key = match ? match[1].slice(2) : arg === '--all' ? 'all' : arg === '--help' ? 'help' : null;
    if (!key) fail(`Unknown argument: ${arg}`);
    if (Object.hasOwn(options, key)) fail(`Duplicate argument: --${key}`);
    options[key] = match ? match[2] : true;
  }
  if (!args.length || options.help) {
    if (args.length > 1) fail('--help cannot be combined with other arguments');
    return {help: true};
  }
  if (['query', 'id', 'all'].filter((key) => Object.hasOwn(options, key)).length !== 1) fail('Choose exactly one of --query, --id or --all');
  if (options.id !== undefined && !idPattern.test(options.id)) fail('Use an exact lowercase theme ID, not a path');
  if (options.query !== undefined && (!options.query.trim() || options.query.length > 256)) fail('--query must contain 1–256 characters');
  if (options.limit !== undefined && options.query === undefined) fail('--limit applies only to --query');
  if (options.limit !== undefined && (!/^[1-9]\d*$/.test(options.limit) || Number(options.limit) > 10)) fail('--limit must be an integer from 1 to 10');
  return {...options, limit: Number(options.limit ?? 3)};
}

function assertPlainDirectory(path, label) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a real directory, not a symlink`);
  if (realpathSync(path) !== path) fail(`${label} must stay inside this skill`);
}

function readTheme(root, id) {
  if (!idPattern.test(id)) fail('Invalid theme directory ID');
  const directory = join(root, id);
  assertPlainDirectory(directory, `Theme ${id}`);
  const path = join(directory, 'theme.json');
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`Theme ${id}: theme.json must be a regular file`);
  // O_NOFOLLOW also protects the final file against a symlink replacement.
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const actual = fstatSync(fd);
    if (!actual.isFile() || actual.size > 64 * 1024) fail(`Theme ${id}: invalid metadata file`);
    const theme = JSON.parse(readFileSync(fd, 'utf8'));
    if (theme.id !== id) fail(`Theme ${id}: metadata ID does not match its directory`);
    const stringList = (value, field) => {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) fail(`Theme ${id}: invalid ${field}`);
      return value;
    };
    if (typeof theme.name !== 'string' || !theme.name) fail(`Theme ${id}: missing name`);
    if (theme.nameZh !== undefined && typeof theme.nameZh !== 'string') fail(`Theme ${id}: invalid nameZh`);
    const bestFor = stringList(theme.bestFor, 'bestFor');
    const mood = typeof theme.mood === 'string' ? [theme.mood] : stringList(theme.mood, 'mood');
    const name = theme.nameZh ? `${theme.nameZh} / ${theme.name}` : theme.name;
    const searchable = normalize([id, name, ...bestFor, ...mood, theme.description, theme.descriptionZh].filter((item) => typeof item === 'string').join(' '));
    return {summary: {id, name, bestFor, mood}, searchable};
  } finally {
    closeSync(fd);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage}\n`);
  } else {
    const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const root = join(skillRoot, 'themes');
    assertPlainDirectory(root, 'Themes root');
    let ids;
    if (options.id !== undefined) {
      ids = [options.id]; // Exact selection never loads unrelated theme metadata.
    } else {
      ids = readdirSync(root, {withFileTypes: true}).filter((entry) => {
        if (entry.isSymbolicLink()) fail('Symlink entries are not allowed in the themes directory');
        return entry.isDirectory();
      }).map((entry) => entry.name).sort();
    }
    const terms = options.query === undefined ? [] : [...new Set(normalize(options.query).match(/[\p{L}\p{N}]+/gu) ?? [])];
    if (options.query !== undefined && !terms.length) fail('--query must include a letter or number');
    let results = ids.map((id) => {
      const {summary, searchable} = readTheme(root, id);
      return {...summary, matchedTerms: terms.filter((term) => searchable.includes(term))};
    });
    if (options.query !== undefined) {
      results = results.filter((item) => item.matchedTerms.length > 0).sort((a, b) => b.matchedTerms.length - a.matchedTerms.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, options.limit);
    }
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  }
} catch (error) {
  const message = error?.code === 'ENOENT' ? 'Theme ID or local theme metadata does not exist' : error instanceof Error ? error.message : 'Theme metadata could not be read';
  process.stderr.write(`theme-summary: ${message}\n`);
  process.exitCode = 1;
}
