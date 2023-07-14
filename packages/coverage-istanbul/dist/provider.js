import { existsSync, promises } from 'fs';
import { coverageConfigDefaults, defaultExclude, defaultInclude } from 'vitest/config';
import { BaseCoverageProvider } from 'vitest/coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import libCoverage from 'istanbul-lib-coverage';
import libSourceMaps from 'istanbul-lib-source-maps';
import { createInstrumenter } from 'istanbul-lib-instrument';
import _TestExclude from 'test-exclude';
import { C as COVERAGE_STORE_KEY } from './constants-758a8358.js';

function normalizeWindowsPath(input = "") {
  if (!input || !input.includes("\\")) {
    return input;
  }
  return input.replace(/\\/g, "/");
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
function cwd() {
  if (typeof process !== "undefined") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};

class IstanbulCoverageProvider extends BaseCoverageProvider {
  name = "istanbul";
  ctx;
  options;
  instrumenter;
  testExclude;
  /**
   * Coverage objects collected from workers.
   * Some istanbul utilizers write these into file system instead of storing in memory.
   * If storing in memory causes issues, we can simply write these into fs in `onAfterSuiteRun`
   * and read them back when merging coverage objects in `onAfterAllFilesRun`.
   */
  coverages = [];
  initialize(ctx) {
    const config = ctx.config.coverage;
    this.ctx = ctx;
    this.options = {
      ...coverageConfigDefaults,
      // User's options
      ...config,
      // Resolved fields
      provider: "istanbul",
      reportsDirectory: resolve(ctx.config.root, config.reportsDirectory || coverageConfigDefaults.reportsDirectory),
      reporter: this.resolveReporters(config.reporter || coverageConfigDefaults.reporter)
    };
    this.instrumenter = createInstrumenter({
      produceSourceMap: true,
      autoWrap: false,
      esModules: true,
      compact: false,
      coverageVariable: COVERAGE_STORE_KEY,
      // @ts-expect-error missing type
      coverageGlobalScope: "globalThis",
      coverageGlobalScopeFunc: false,
      ignoreClassMethods: this.options.ignoreClassMethods
    });
    this.testExclude = new _TestExclude({
      cwd: ctx.config.root,
      include: typeof this.options.include === "undefined" ? void 0 : [...this.options.include],
      exclude: [...defaultExclude, ...defaultInclude, ...this.options.exclude],
      excludeNodeModules: true,
      extension: this.options.extension
    });
  }
  resolveOptions() {
    return this.options;
  }
  onFileTransform(sourceCode, id, pluginCtx) {
    if (!this.testExclude.shouldInstrument(id))
      return;
    const sourceMap = pluginCtx.getCombinedSourcemap();
    sourceMap.sources = sourceMap.sources.map(removeQueryParameters);
    const code = this.instrumenter.instrumentSync(sourceCode, id, sourceMap);
    const map = this.instrumenter.lastSourceMap();
    return { code, map };
  }
  onAfterSuiteRun({ coverage }) {
    this.coverages.push(coverage);
  }
  async clean(clean = true) {
    if (clean && existsSync(this.options.reportsDirectory))
      await promises.rm(this.options.reportsDirectory, { recursive: true, force: true, maxRetries: 10 });
    this.coverages = [];
  }
  async reportCoverage({ allTestsRun } = {}) {
    const mergedCoverage = this.coverages.reduce((coverage, previousCoverageMap) => {
      const map = libCoverage.createCoverageMap(coverage);
      map.merge(previousCoverageMap);
      return map;
    }, libCoverage.createCoverageMap({}));
    if (this.options.all && allTestsRun)
      await this.includeUntestedFiles(mergedCoverage);
    includeImplicitElseBranches(mergedCoverage);
    const sourceMapStore = libSourceMaps.createSourceMapStore();
    const coverageMap = await sourceMapStore.transformCoverage(mergedCoverage);
    const context = libReport.createContext({
      dir: this.options.reportsDirectory,
      coverageMap,
      sourceFinder: sourceMapStore.sourceFinder,
      watermarks: this.options.watermarks
    });
    for (const reporter of this.options.reporter) {
      reports.create(reporter[0], {
        skipFull: this.options.skipFull,
        projectRoot: this.ctx.config.root,
        ...reporter[1]
      }).execute(context);
    }
    if (this.options.branches || this.options.functions || this.options.lines || this.options.statements) {
      this.checkThresholds({
        coverageMap,
        thresholds: {
          branches: this.options.branches,
          functions: this.options.functions,
          lines: this.options.lines,
          statements: this.options.statements
        },
        perFile: this.options.perFile
      });
    }
    if (this.options.thresholdAutoUpdate && allTestsRun) {
      this.updateThresholds({
        coverageMap,
        thresholds: {
          branches: this.options.branches,
          functions: this.options.functions,
          lines: this.options.lines,
          statements: this.options.statements
        },
        perFile: this.options.perFile,
        configurationFile: this.ctx.server.config.configFile
      });
    }
  }
  async includeUntestedFiles(coverageMap) {
    const includedFiles = await this.testExclude.glob(this.ctx.config.root);
    const uncoveredFiles = includedFiles.map((file) => resolve(this.ctx.config.root, file)).filter((file) => !coverageMap.data[file]);
    const transformResults = await Promise.all(uncoveredFiles.map(async (filename) => {
      const transformResult = await this.ctx.vitenode.transformRequest(filename);
      return { transformResult, filename };
    }));
    for (const { transformResult, filename } of transformResults) {
      const sourceMap = transformResult == null ? void 0 : transformResult.map;
      if (sourceMap) {
        this.instrumenter.instrumentSync(
          transformResult.code,
          filename,
          sourceMap
        );
        const lastCoverage = this.instrumenter.lastFileCoverage();
        if (lastCoverage)
          coverageMap.addFileCoverage(lastCoverage);
      }
    }
  }
}
function removeQueryParameters(filename) {
  return filename.split("?")[0];
}
function includeImplicitElseBranches(coverageMap) {
  for (const file of coverageMap.files()) {
    const fileCoverage = coverageMap.fileCoverageFor(file);
    for (const branchMap of Object.values(fileCoverage.branchMap)) {
      if (branchMap.type === "if") {
        const lastIndex = branchMap.locations.length - 1;
        if (lastIndex > 0) {
          const elseLocation = branchMap.locations[lastIndex];
          if (elseLocation && isEmptyCoverageRange(elseLocation)) {
            const ifLocation = branchMap.locations[0];
            elseLocation.start = { ...ifLocation.start };
            elseLocation.end = { ...ifLocation.end };
          }
        }
      }
    }
  }
}
function isEmptyCoverageRange(range) {
  return range.start === void 0 || range.start.line === void 0 || range.start.column === void 0 || range.end === void 0 || range.end.line === void 0 || range.end.column === void 0;
}

export { IstanbulCoverageProvider };
