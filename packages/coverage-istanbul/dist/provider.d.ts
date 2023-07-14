import { CoverageProvider, Vitest, AfterSuiteRunMeta, ReportContext, ResolvedCoverageOptions } from 'vitest';
import { BaseCoverageProvider } from 'vitest/coverage';
import { CoverageMap } from 'istanbul-lib-coverage';
import { Instrumenter } from 'istanbul-lib-instrument';

type Options = ResolvedCoverageOptions<'istanbul'>;
interface TestExclude {
    new (opts: {
        cwd?: string | string[];
        include?: string | string[];
        exclude?: string | string[];
        extension?: string | string[];
        excludeNodeModules?: boolean;
    }): {
        shouldInstrument(filePath: string): boolean;
        glob(cwd: string): Promise<string[]>;
    };
}
declare class IstanbulCoverageProvider extends BaseCoverageProvider implements CoverageProvider {
    name: string;
    ctx: Vitest;
    options: Options;
    instrumenter: Instrumenter;
    testExclude: InstanceType<TestExclude>;
    /**
     * Coverage objects collected from workers.
     * Some istanbul utilizers write these into file system instead of storing in memory.
     * If storing in memory causes issues, we can simply write these into fs in `onAfterSuiteRun`
     * and read them back when merging coverage objects in `onAfterAllFilesRun`.
     */
    coverages: any[];
    initialize(ctx: Vitest): void;
    resolveOptions(): Options;
    onFileTransform(sourceCode: string, id: string, pluginCtx: any): {
        code: string;
        map: any;
    } | undefined;
    onAfterSuiteRun({ coverage }: AfterSuiteRunMeta): void;
    clean(clean?: boolean): Promise<void>;
    reportCoverage({ allTestsRun }?: ReportContext): Promise<void>;
    includeUntestedFiles(coverageMap: CoverageMap): Promise<void>;
}

export { IstanbulCoverageProvider };
