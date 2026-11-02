import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';

const source = fs.readFileSync(new URL('./run-studio.cjs', import.meta.url), 'utf8');
/** All sockets, file checks and subprocesses are mocked; never starts a browser/server. */
function harness({files = {}, env = {}, busy = [], spawnError, exitCode = 0} = {}) {
  const calls = {spawn: [], ports: [], reads: [], errors: [], logs: []};
  const fakeFs = {
    constants: {X_OK: 1},
    statSync(file) {
      calls.reads.push(file);
      if (!files[file]) throw new Error('ENOENT');
      return {isFile: () => files[file] !== 'directory'};
    },
    accessSync(file) { if (files[file] !== 'executable') throw new Error('EACCES'); },
  };
  const fakeNet = {createServer() {
    const server = new EventEmitter();
    server.unref = () => {};
    server.listen = (port, callback) => {
      calls.ports.push(port);
      if (busy.includes(port)) queueMicrotask(() => server.emit('error', new Error('EADDRINUSE')));
      else queueMicrotask(callback);
    };
    server.close = (callback) => callback();
    return server;
  }};
  const fakeChild = {spawn(...args) {
    calls.spawn.push(args);
    const child = new EventEmitter();
    queueMicrotask(() => spawnError ? child.emit('error', new Error(spawnError)) : child.emit('exit', exitCode));
    return child;
  }};
  const fakeRequire = (name) => {
    if (name === 'node:fs') return fakeFs;
    if (name === 'node:net') return fakeNet;
    if (name === 'node:child_process') return fakeChild;
    if (name === 'node:path') return path;
    throw new Error(`Unexpected module: ${name}`);
  };
  fakeRequire.resolve = (name) => {
    assert.equal(name, '@remotion/cli/package.json');
    return '/customer/project/node_modules/@remotion/cli/package.json';
  };
  const module = {exports: {}};
  const fakeProcess = {cwd: () => '/customer/project', argv: ['node', 'run-studio.cjs'], env,
    platform: 'linux', execPath: '/installed/node'};
  vm.runInNewContext(source, {require: fakeRequire, module, process: fakeProcess,
    console: {error: (message) => calls.errors.push(message), log: (message) => calls.logs.push(message)}}, {filename: 'run-studio.cjs'});
  return {api: module.exports, calls};
}

test('explicit renderer/UI browser and no-open flags reach CLI unchanged with shell disabled', async () => {
  const browser = '/customer/tools/Chrome With Spaces';
  const {api, calls} = harness({files: {[browser]: 'executable'}});
  assert.equal(await api.main(['--browser-executable', browser, '--browser=custom-browser', '--browser-args=--guest --incognito', '--no-open']), 0);
  assert.equal(calls.spawn.length, 1);
  const [command, args, options] = calls.spawn[0];
  assert.equal(command, '/installed/node');
  assert(args.includes(`--browser-executable=${browser}`));
  assert(args.includes('--browser=custom-browser'));
  assert(args.includes('--browser-args=--guest --incognito'));
  assert(args.includes('--no-open'));
  assert(!args.includes('--no-open=true'));
  assert(args.includes('--port=3000'));
  assert.equal(options.shell, false);
});
test('environment browser is converted to explicit renderer and UI CLI flags', async () => {
  const browser = '/customer/tools/approved-chromium';
  const {api, calls} = harness({files: {[browser]: 'executable'}, env: {REMOTION_BROWSER_EXECUTABLE: browser}});
  await api.main(['--no-open=false']);
  assert(calls.spawn[0][1].includes(`--browser-executable=${browser}`));
  assert(calls.spawn[0][1].includes(`--browser=${browser}`));
  assert(!calls.spawn[0][1].some((arg) => arg.startsWith('--no-open')));
});
test('CLI browser wins over environment; invalid explicit browser never falls back', async () => {
  const good = '/customer/tools/good';
  const pass = harness({files: {[good]: 'executable'}, env: {REMOTION_BROWSER_EXECUTABLE: '/missing/env'}});
  await pass.api.main([`--browser-executable=${good}`]);
  assert(pass.calls.spawn[0][1].includes(`--browser-executable=${good}`));
  const fail = harness({files: {'/usr/bin/chromium': 'executable', [good]: 'executable'}, env: {REMOTION_BROWSER_EXECUTABLE: good}});
  await assert.rejects(fail.api.main(['--browser-executable=/missing/selected']), /Selected browser/);
  assert.equal(fail.calls.spawn.length, 0);
  assert.equal(fail.calls.ports.length, 0);
});
test('missing browser, directories and non-executable files block before sockets/subprocesses', async () => {
  for (const kind of [undefined, 'directory', 'not-executable']) {
    const browser = '/customer/tools/browser';
    const {api, calls} = harness({files: kind ? {[browser]: kind} : {}, env: kind ? {REMOTION_BROWSER_EXECUTABLE: browser} : {}});
    await assert.rejects(api.main(), /browser|Chrome/);
    assert.equal(calls.ports.length, 0);
    assert.equal(calls.spawn.length, 0);
  }
});
test('local browser discovery is pinned explicitly, including approved PATH tools', async () => {
  for (const [browser, env] of [['/usr/bin/chromium', {}], ['/customer/tools/chromium', {PATH: '/customer/tools'}]]) {
    const {api, calls} = harness({files: {[browser]: 'executable'}, env});
    await api.main();
    assert(calls.spawn[0][1].includes(`--browser-executable=${browser}`));
  }
});
test('default ports still try 3000 to 3010; exhaustion never launches', async () => {
  const files = {'/usr/bin/chromium': 'executable'};
  const first = harness({files, busy: [3000, 3001]});
  await first.api.main();
  assert.deepEqual(first.calls.ports, [3000, 3001, 3002]);
  assert(first.calls.spawn[0][1].includes('--port=3002'));
  const full = harness({files, busy: Array.from({length: 11}, (_, i) => 3000 + i)});
  await assert.rejects(full.api.main(), /no free port/);
  assert.equal(full.calls.ports.length, 11);
  assert.equal(full.calls.spawn.length, 0);
});
test('explicit port is validated and not silently replaced when occupied', async () => {
  const files = {'/usr/bin/chromium': 'executable'};
  const pass = harness({files});
  await pass.api.main(['--port', '4040']);
  assert.deepEqual(pass.calls.ports, [4040]);
  assert(pass.calls.spawn[0][1].includes('--port=4040'));
  const occupied = harness({files, busy: [4040]});
  await assert.rejects(occupied.api.main(['--port=4040']), /EADDRINUSE/);
  assert.deepEqual(occupied.calls.ports, [4040]);
  assert.equal(occupied.calls.spawn.length, 0);
});
test('help is read-only; malformed, duplicate and unsupported arguments fail before launch', async () => {
  const help = harness();
  assert.equal(await help.api.main(['--help']), 0);
  assert.equal(help.calls.reads.length, 0);
  assert.equal(help.calls.ports.length, 0);
  assert.equal(help.calls.spawn.length, 0);
  for (const args of [['--browser-executable'], ['--browser='], ['--no-open=maybe'], ['--port=0'], ['--port=70000'], ['--port=not-a-port'], ['--port=3000', '--port=3001'], ['--browser=x', '--browser=y'], ['--unknown']]) {
    const {api, calls} = harness();
    await assert.rejects(api.main(args));
    assert.equal(calls.ports.length, 0);
    assert.equal(calls.spawn.length, 0);
  }
});
test('spawn failures and abnormal termination are not reported as success', async () => {
  const files = {'/usr/bin/chromium': 'executable'};
  const failure = harness({files, spawnError: 'mock spawn error'});
  await assert.rejects(failure.api.main(), /mock spawn error/);
  for (const [exitCode, expected] of [[7, 7], [null, 1]]) {
    const {api} = harness({files, exitCode});
    assert.equal(await api.main(), expected);
  }
});
