import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { StartThreadTurnInput } from "@t3tools/client-runtime/operations";
import { deriveThreadTitleSeed } from "@t3tools/client-runtime/operations";
import { isScratchProject } from "@t3tools/client-runtime/state/projects";
import type { AtomCommandResult } from "@t3tools/client-runtime/state/runtime";
import type { ScopedProjectRef } from "@t3tools/contracts";
import type { EnvironmentId, ModelSelection, ThreadId } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";

import { planComposerTurn, withMessageContext } from "~/components/ChatView.logic";
import {
  markPromotedDraftThreadByRef,
  useComposerDraftStore,
  type ComposerThreadDraftState,
  type DraftId,
} from "~/composerDraftStore";
import { newMessageId } from "~/lib/utils";
import { resolveProjectDefaultProviderModelSelection } from "~/providerInstances";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { readProject } from "~/state/entities";
import { readEnvironment, readEnvironmentProviders } from "~/state/environments";
import { environmentServerConfigsAtom } from "~/state/server";
import { DEFAULT_INTERACTION_MODE } from "~/types";
import { readWorktreeBaseBranch } from "~/worktreeRepositoryChoiceStore";

export type TrailIssueStartThreadTurn = (request: {
  readonly environmentId: EnvironmentId;
  readonly input: StartThreadTurnInput;
}) => Promise<AtomCommandResult<unknown, unknown>>;

function resolveDraftModelSelection(
  composerDraft: ComposerThreadDraftState,
  projectRef: ScopedProjectRef,
  projectDefault: ModelSelection | null,
): ModelSelection | null {
  const activeProvider = composerDraft.activeProvider;
  if (activeProvider !== null && composerDraft.modelSelectionByProvider[activeProvider]) {
    return composerDraft.modelSelectionByProvider[activeProvider] ?? null;
  }
  if (projectDefault) {
    return projectDefault;
  }
  const settings = readEnvironment(projectRef.environmentId)?.serverConfig?.settings;
  const providers = readEnvironmentProviders(projectRef.environmentId) ?? [];
  if (!settings) {
    return null;
  }
  return resolveProjectDefaultProviderModelSelection(providers, settings, projectRef.projectId);
}

export async function trailSendIssueDraftTurn(input: {
  readonly projectRef: ScopedProjectRef;
  readonly draftId: DraftId;
  readonly threadId: ThreadId;
  readonly prompt: string;
  readonly startThreadTurn: TrailIssueStartThreadTurn;
}): Promise<boolean> {
  const store = useComposerDraftStore.getState();
  const draftSession = store.getDraftSession(input.draftId);
  const composerDraft = store.getComposerDraft(input.draftId);
  const project = readProject(input.projectRef);
  const settings = readEnvironment(input.projectRef.environmentId)?.serverConfig?.settings;
  if (
    draftSession === null ||
    project === null ||
    composerDraft === null ||
    settings === undefined
  ) {
    return false;
  }

  const projectDefault = resolveProjectSettings(settings, input.projectRef.projectId, project)
    .settings.defaultModelSelection;
  const modelSelection = resolveDraftModelSelection(
    composerDraft,
    input.projectRef,
    projectDefault,
  );
  if (modelSelection === null) {
    return false;
  }

  const runtimeMode = composerDraft.runtimeMode ?? draftSession.runtimeMode;
  const serverConfig = appAtomRegistry
    .get(environmentServerConfigsAtom)
    .get(input.projectRef.environmentId);
  const scratchRoot = serverConfig?.scratchWorkspaceRoot;
  const projectIsGitRepo = project.repositoryIdentity !== undefined;
  const { baseBranchForWorktree, missingWorktreeBaseBranch, turnDispatchMode } = planComposerTurn({
    messageText: input.prompt,
    sendQueuesBehindSetup: false,
    isServerThread: false,
    activeMessageCount: 0,
    sendEnvMode: draftSession.envMode,
    worktreePath: draftSession.worktreePath,
    activeThreadBranch: draftSession.branch,
    projectIsGitRepo,
    plainProjectBaseBranch: readWorktreeBaseBranch(project),
    isScratchProject: scratchRoot !== undefined && isScratchProject(project, scratchRoot),
    resumeCompactionTokens: null,
    keepFullHistory: false,
    phase: "ready",
    dispatchMode: "auto",
    freshContext: false,
  });
  if (missingWorktreeBaseBranch) {
    return false;
  }

  const environmentId = input.projectRef.environmentId;
  const threadRef = scopeThreadRef(environmentId, input.threadId);
  markPromotedDraftThreadByRef(threadRef);
  store.clearComposerContent(input.draftId);

  const title = deriveThreadTitleSeed({ text: input.prompt, attachments: [] });
  const messageIdForSend = newMessageId();
  const createdAt = new Date().toISOString();
  const threadCreateModelSelection = createModelSelection(
    modelSelection.instanceId,
    modelSelection.model,
    modelSelection.options,
  );

  const createThread = {
    projectId: project.id,
    title,
    modelSelection: threadCreateModelSelection,
    runtimeMode,
    interactionMode: DEFAULT_INTERACTION_MODE,
    branch: draftSession.branch,
    worktreePath: draftSession.worktreePath,
    createdAt: draftSession.createdAt,
  };

  const bootstrap: NonNullable<StartThreadTurnInput["bootstrap"]> =
    baseBranchForWorktree === null
      ? { createThread }
      : {
          createThread,
          prepareWorktree: {
            projectCwd: project.workspaceRoot,
            baseBranch: baseBranchForWorktree,
            ...(draftSession.startFromOrigin ? { startFromOrigin: true } : {}),
            ...(draftSession.worktreeRepositories
              ? {
                  repositories: draftSession.worktreeRepositories.map((path) => ({ path })),
                }
              : {}),
          },
          runSetupScript: true,
        };

  const messageBody = withMessageContext({
    text: input.prompt,
    context: undefined,
  });

  const turnInput = {
    threadId: input.threadId,
    message: {
      messageId: messageIdForSend,
      role: "user" as const,
      attachments: [] as const,
      text: messageBody.text,
    },
    modelSelection,
    titleSeed: title,
    runtimeMode,
    interactionMode: DEFAULT_INTERACTION_MODE,
    dispatchMode: turnDispatchMode,
    bootstrap,
    createdAt,
  } satisfies StartThreadTurnInput;

  const startResult = await input.startThreadTurn({
    environmentId,
    input: turnInput,
  });

  return startResult._tag === "Success";
}
