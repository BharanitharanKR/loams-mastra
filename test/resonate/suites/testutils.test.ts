// Mastra's workflow test utilities (vendored from @mastra/inngest@1.10.6) on the
// Resonate engine, driven the way workflows/inngest/src/index.test.ts drives them.

import { init } from '@loams/mastra-resonate';
import type {
  ResumeWorkflowOptions,
  WorkflowRegistry,
  WorkflowResult,
} from '@loams-internal/upstream-inngest-workflow-test-utils';
import { createWorkflowTestSuite } from '@loams-internal/upstream-inngest-workflow-test-utils';
import { Mastra } from '@mastra/core/mastra';
import type { MastraStorage } from '@mastra/core/storage';
import { LibSQLStore } from '@mastra/libsql';
import { Resonate } from '@resonatehq/sdk/async';
import { hasServer, RESONATE_BACKEND, RESONATE_URL, uniqueId } from '../helpers';
import { skip, skipTests } from './expected';

let resonate: Resonate | undefined;
let storage: MastraStorage | undefined;

if (hasServer) {
  createWorkflowTestSuite({
    name: `Workflow (Resonate engine, ${RESONATE_BACKEND})`,

    getWorkflowFactory: () => {
      resonate ??= new Resonate({ url: RESONATE_URL, group: uniqueId('testutils'), ttl: 5_000 });
      return init(resonate);
    },

    registerWorkflows: async (registry: WorkflowRegistry) => {
      const workflows: Record<string, any> = {};
      const agents: Record<string, any> = {};
      const tools: Record<string, any> = {};
      for (const [id, entry] of Object.entries(registry)) {
        workflows[id] = entry.workflow;
        Object.assign(agents, entry.mastraAgents ?? {});
        Object.assign(tools, entry.mastraTools ?? {});
      }
      storage = new LibSQLStore({ id: uniqueId('testutils-store'), url: ':memory:' });
      new Mastra({
        storage,
        workflows,
        agents: Object.keys(agents).length ? agents : undefined,
        tools: Object.keys(tools).length ? tools : undefined,
        logger: false,
      });
    },

    getStorage: () => storage,

    afterAll: async () => {
      await resonate?.stop();
    },

    skip,
    skipTests,

    executeWorkflow: async (workflow, inputData, options = {}): Promise<WorkflowResult> => {
      const run = await workflow.createRun({
        runId: options.runId,
        resourceId: options.resourceId,
      });
      const result = await run.start({
        inputData,
        initialState: options.initialState,
        perStep: options.perStep,
        requestContext: options.requestContext as any,
        outputOptions: options.outputOptions,
      });
      return result as WorkflowResult;
    },

    resumeWorkflow: async (workflow, options: ResumeWorkflowOptions): Promise<WorkflowResult> => {
      // A workflow built again to simulate a restart is registered with Mastra, on the
      // same storage, before it resumes, as a restarted server registers it: a resume
      // reads the run's snapshot from the storage of the workflow's Mastra instance, on
      // this engine as on the default one (whose own run of the suite skips that test,
      // resumeMapBranchCondition, for want of this registration). Mastra's addWorkflow
      // ignores a second workflow under a known id, so the rebuilt one gets its own
      // instance, as in Mastra's restart tests (mapping-id-determinism.test.ts).
      if (!workflow.mastra) {
        new Mastra({ storage, workflows: { [workflow.id]: workflow }, logger: false });
      }
      const run = await workflow.createRun({ runId: options.runId });
      const result = await run.resume({
        step: options.step,
        label: options.label,
        resumeData: options.resumeData,
        // Passed as the default engine's driver (packages/core/src/workflows/workflow.test.ts)
        // passes it; @mastra/inngest's drops it and skips the foreach index tests.
        forEachIndex: options.forEachIndex,
      } as any);
      return result as WorkflowResult;
    },
  });
}
