import { performance } from 'node:perf_hooks';
import { startTests } from '@vitest/runner';
import { resolve } from 'pathe';
import { r as resetModules } from './vendor-index.23ac4e13.js';
import { R as RealDate, d as globalExpect, s as setupChaiConfig, v as vi } from './vendor-vi.dd6706cb.js';
import { d as distDir } from './vendor-paths.84fc7a99.js';
import { s as startCoverageInsideWorker, t as takeCoverageInsideWorker, a as stopCoverageInsideWorker } from './vendor-coverage.78040316.js';
import { createRequire } from 'node:module';
import { isatty } from 'node:tty';
import { installSourcemapsSupport } from 'vite-node/source-map';
import { setupColors, createColors, getSafeTimers } from '@vitest/utils';
import { NodeSnapshotEnvironment } from '@vitest/snapshot/environment';
import { a as rpc } from './vendor-rpc.ad5b08c7.js';
import { i as index } from './vendor-index.2af39fbb.js';
import { setupCommonEnv } from './browser.js';
import { g as getWorkerState } from './vendor-global.6795f91f.js';
import 'std-env';
import '@vitest/runner/utils';
import 'chai';
import './vendor-_commonjsHelpers.7d1333e8.js';
import '@vitest/expect';
import '@vitest/snapshot';
import '@vitest/utils/error';
import './vendor-tasks.f9d75aed.js';
import 'util';
import '@vitest/spy';
import 'node:url';
import './vendor-run-once.1fa85ba7.js';

class VitestSnapshotEnvironment extends NodeSnapshotEnvironment {
  getHeader() {
    return `// Vitest Snapshot v${this.getVersion()}, https://vitest.dev/guide/snapshot.html`;
  }
  resolvePath(filepath) {
    return rpc().resolveSnapshotPath(filepath);
  }
}

let globalSetup = false;
async function setupGlobalEnv(config) {
  await setupCommonEnv(config);
  Object.defineProperty(globalThis, "__vitest_index__", {
    value: index,
    enumerable: false
  });
  const state = getWorkerState();
  if (!state.config.snapshotOptions.snapshotEnvironment)
    state.config.snapshotOptions.snapshotEnvironment = new VitestSnapshotEnvironment();
  if (globalSetup)
    return;
  globalSetup = true;
  setupColors(createColors(isatty(1)));
  const _require = createRequire(import.meta.url);
  _require.extensions[".css"] = () => ({});
  _require.extensions[".scss"] = () => ({});
  _require.extensions[".sass"] = () => ({});
  _require.extensions[".less"] = () => ({});
  installSourcemapsSupport({
    getSourceMap: (source) => state.moduleCache.getSourceMap(source)
  });
  await setupConsoleLogSpy();
}
async function setupConsoleLogSpy() {
  const stdoutBuffer = /* @__PURE__ */ new Map();
  const stderrBuffer = /* @__PURE__ */ new Map();
  const timers = /* @__PURE__ */ new Map();
  const unknownTestId = "__vitest__unknown_test__";
  const { Writable } = await import('node:stream');
  const { Console } = await import('node:console');
  const { setTimeout, clearTimeout } = getSafeTimers();
  function schedule(taskId) {
    const timer = timers.get(taskId);
    const { stdoutTime, stderrTime } = timer;
    clearTimeout(timer.timer);
    timer.timer = setTimeout(() => {
      if (stderrTime < stdoutTime) {
        sendStderr(taskId);
        sendStdout(taskId);
      } else {
        sendStdout(taskId);
        sendStderr(taskId);
      }
    });
  }
  function sendStdout(taskId) {
    const buffer = stdoutBuffer.get(taskId);
    if (!buffer)
      return;
    const content = buffer.map((i) => String(i)).join("");
    const timer = timers.get(taskId);
    rpc().onUserConsoleLog({
      type: "stdout",
      content: content || "<empty line>",
      taskId,
      time: timer.stdoutTime || RealDate.now(),
      size: buffer.length
    });
    stdoutBuffer.set(taskId, []);
    timer.stdoutTime = 0;
  }
  function sendStderr(taskId) {
    const buffer = stderrBuffer.get(taskId);
    if (!buffer)
      return;
    const content = buffer.map((i) => String(i)).join("");
    const timer = timers.get(taskId);
    rpc().onUserConsoleLog({
      type: "stderr",
      content: content || "<empty line>",
      taskId,
      time: timer.stderrTime || RealDate.now(),
      size: buffer.length
    });
    stderrBuffer.set(taskId, []);
    timer.stderrTime = 0;
  }
  const stdout = new Writable({
    write(data, encoding, callback) {
      var _a, _b;
      const id = ((_b = (_a = getWorkerState()) == null ? void 0 : _a.current) == null ? void 0 : _b.id) ?? unknownTestId;
      let timer = timers.get(id);
      if (timer) {
        timer.stdoutTime = timer.stdoutTime || RealDate.now();
      } else {
        timer = { stdoutTime: RealDate.now(), stderrTime: RealDate.now(), timer: 0 };
        timers.set(id, timer);
      }
      let buffer = stdoutBuffer.get(id);
      if (!buffer) {
        buffer = [];
        stdoutBuffer.set(id, buffer);
      }
      buffer.push(data);
      schedule(id);
      callback();
    }
  });
  const stderr = new Writable({
    write(data, encoding, callback) {
      var _a, _b;
      const id = ((_b = (_a = getWorkerState()) == null ? void 0 : _a.current) == null ? void 0 : _b.id) ?? unknownTestId;
      let timer = timers.get(id);
      if (timer) {
        timer.stderrTime = timer.stderrTime || RealDate.now();
      } else {
        timer = { stderrTime: RealDate.now(), stdoutTime: RealDate.now(), timer: 0 };
        timers.set(id, timer);
      }
      let buffer = stderrBuffer.get(id);
      if (!buffer) {
        buffer = [];
        stderrBuffer.set(id, buffer);
      }
      buffer.push(data);
      schedule(id);
      callback();
    }
  });
  globalThis.console = new Console({
    stdout,
    stderr,
    colorMode: true,
    groupIndentation: 2
  });
}
async function withEnv({ environment, name }, options, fn) {
  globalThis.__vitest_environment__ = name;
  globalExpect.setState({
    environment: name
  });
  const env = await environment.setup(globalThis, options);
  try {
    await fn();
  } finally {
    const { setTimeout } = getSafeTimers();
    await new Promise((resolve) => setTimeout(resolve));
    await env.teardown(globalThis);
  }
}

const runnersFile = resolve(distDir, "runners.js");
async function getTestRunnerConstructor(config, executor) {
  if (!config.runner) {
    const { VitestTestRunner, NodeBenchmarkRunner } = await executor.executeFile(runnersFile);
    return config.mode === "test" ? VitestTestRunner : NodeBenchmarkRunner;
  }
  const mod = await executor.executeId(config.runner);
  if (!mod.default && typeof mod.default !== "function")
    throw new Error(`Runner must export a default function, but got ${typeof mod.default} imported from ${config.runner}`);
  return mod.default;
}
async function getTestRunner(config, executor) {
  const TestRunner = await getTestRunnerConstructor(config, executor);
  const testRunner = new TestRunner(config);
  Object.defineProperty(testRunner, "__vitest_executor", {
    value: executor,
    enumerable: false,
    configurable: false
  });
  if (!testRunner.config)
    testRunner.config = config;
  if (!testRunner.importFile)
    throw new Error('Runner must implement "importFile" method.');
  const originalOnTaskUpdate = testRunner.onTaskUpdate;
  testRunner.onTaskUpdate = async (task) => {
    const p = rpc().onTaskUpdate(task);
    await (originalOnTaskUpdate == null ? void 0 : originalOnTaskUpdate.call(testRunner, task));
    return p;
  };
  const originalOnCollected = testRunner.onCollected;
  testRunner.onCollected = async (files) => {
    const state = getWorkerState();
    files.forEach((file) => {
      file.prepareDuration = state.durations.prepare;
      file.environmentLoad = state.durations.environment;
      state.durations.prepare = 0;
      state.durations.environment = 0;
    });
    rpc().onCollected(files);
    await (originalOnCollected == null ? void 0 : originalOnCollected.call(testRunner, files));
  };
  const originalOnAfterRun = testRunner.onAfterRun;
  testRunner.onAfterRun = async (files) => {
    const coverage = await takeCoverageInsideWorker(config.coverage, executor);
    rpc().onAfterSuiteRun({ coverage });
    await (originalOnAfterRun == null ? void 0 : originalOnAfterRun.call(testRunner, files));
  };
  const originalOnAfterRunTest = testRunner.onAfterRunTest;
  testRunner.onAfterRunTest = async (test) => {
    var _a, _b;
    if (config.bail && ((_a = test.result) == null ? void 0 : _a.state) === "fail") {
      const previousFailures = await rpc().getCountOfFailedTests();
      const currentFailures = 1 + previousFailures;
      if (currentFailures >= config.bail) {
        rpc().onCancel("test-failure");
        (_b = testRunner.onCancel) == null ? void 0 : _b.call(testRunner, "test-failure");
      }
    }
    await (originalOnAfterRunTest == null ? void 0 : originalOnAfterRunTest.call(testRunner, test));
  };
  return testRunner;
}
async function run(files, config, environment, executor) {
  const workerState = getWorkerState();
  await setupGlobalEnv(config);
  await startCoverageInsideWorker(config.coverage, executor);
  if (config.chaiConfig)
    setupChaiConfig(config.chaiConfig);
  const runner = await getTestRunner(config, executor);
  workerState.onCancel.then((reason) => {
    var _a;
    return (_a = runner.onCancel) == null ? void 0 : _a.call(runner, reason);
  });
  workerState.durations.prepare = performance.now() - workerState.durations.prepare;
  globalThis.__vitest_environment__ = environment.name;
  workerState.durations.environment = performance.now();
  await withEnv(environment, environment.options || config.environmentOptions || {}, async () => {
    workerState.durations.environment = performance.now() - workerState.durations.environment;
    for (const file of files) {
      if (config.isolate) {
        workerState.mockMap.clear();
        resetModules(workerState.moduleCache, true);
      }
      workerState.filepath = file;
      await startTests([file], runner);
      vi.resetConfig();
      vi.restoreAllMocks();
    }
    await stopCoverageInsideWorker(config.coverage, executor);
  });
  workerState.environmentTeardownRun = true;
}

export { run };
