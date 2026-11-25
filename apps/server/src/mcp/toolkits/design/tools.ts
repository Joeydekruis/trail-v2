import {
  DesignFailure,
  DesignForIssueInput,
  DesignForIssueResult,
  DesignGetInput,
  DesignGetResult,
  DesignListResult,
  DesignRenameInput,
  DesignRenameResult,
  DesignSaveInput,
  DesignSaveResult,
} from "@t3tools/trail-contracts";
import { ProjectId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { McpSchema, Tool, Toolkit } from "effect/ai";

import * as DesignService from "../../../trail/design/DesignService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";

const dependencies = [McpInvocationContext.McpInvocationContext, DesignService.DesignService];

const DesignSaveInputMcp = Schema.Struct({
  ...DesignSaveInput.fields,
  projectId: Schema.optional(ProjectId),
});

const DesignProjectInput = Schema.Struct({
  projectId: Schema.optional(ProjectId),
});

const DesignSaveTool = Tool.make("trail_save_design", {
  description:
    "Save Claude Design HTML into the product repo under docs/design/. Split an export into one page per screen, template, or component sheet. Call trail_list_designs first and reuse existing folder and page slugs; send only changed pages; put shared components in the components/ folder. Trail commits and pushes — do not write design files or run git yourself.",
  parameters: DesignSaveInputMcp,
  success: DesignSaveResult,
  failure: DesignFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Save design pages")
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, false)
  .annotate(Tool.OpenWorld, true)
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromOutsideClients);

const DesignListTool = Tool.make("trail_list_designs", {
  description: "List design folders and pages stored in docs/design/ with current version metadata.",
  parameters: DesignProjectInput,
  success: DesignListResult,
  failure: DesignFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "List designs")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false);

const DesignGetTool = Tool.make("trail_get_design", {
  description: "Read a design page's HTML at the current version or a specific version number.",
  parameters: Schema.Struct({
    ...DesignGetInput.fields,
    projectId: Schema.optional(ProjectId),
  }),
  success: DesignGetResult,
  failure: DesignFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Get design page")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false);

const DesignForIssueTool = Tool.make("trail_get_design_for_issue", {
  description:
    "Return design pages linked to an issue plus component pages they cover. Use this when implementing work for a board issue.",
  parameters: Schema.Struct({
    ...DesignForIssueInput.fields,
    projectId: Schema.optional(ProjectId),
  }),
  success: DesignForIssueResult,
  failure: DesignFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Get designs for issue")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false);

const DesignRenameTool = Tool.make("trail_rename_design", {
  description:
    "Rename a design page slug deliberately. Updates covers in other manifests on the next save; this only moves files inside the folder.",
  parameters: Schema.Struct({
    ...DesignRenameInput.fields,
    projectId: Schema.optional(ProjectId),
  }),
  success: DesignRenameResult,
  failure: DesignFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Rename design page")
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, true)
  .annotate(Tool.Idempotent, false)
  .annotate(Tool.OpenWorld, true)
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromOutsideClients);

export const DesignToolkit = Toolkit.make(
  DesignSaveTool,
  DesignListTool,
  DesignGetTool,
  DesignForIssueTool,
  DesignRenameTool,
);