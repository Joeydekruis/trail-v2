import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { IssueTemplate, IssueTrackerKind } from "@t3tools/contracts";
import { msg, T, useGT } from "gt-react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import type { IssuesSearch } from "~/components/issue/IssuesPage";
import { readableFailure } from "~/components/pullRequest/pullRequestDetail.logic";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { m } from "~/i18n/messages";
import { issueEnvironment } from "~/state/issues";
import { useEnvironmentQuery } from "~/state/query";
import { useAtomCommand } from "~/state/use-atom-command";

import { mergeIssueLabelsForColumn } from "~/trail/board/boardColumns.logic";
import type { TrailIssueWorkActions } from "~/trail/board/useTrailIssueWork";

import {
  type TrailIssueCreateTarget,
  resolveTrailIssueCreateTarget,
} from "./trailIssueCreateScope.logic";

const BLANK_TEMPLATE_KEY = "";

function labelsForNewBoardIssue(templateLabels: ReadonlyArray<string>): ReadonlyArray<string> {
  const status = mergeIssueLabelsForColumn([], "todo");
  const extra = templateLabels.filter((name) => !name.toLowerCase().startsWith("status:"));
  return [...new Set([...status, ...extra])];
}

function entryFromCreate(
  target: TrailIssueCreateTarget,
  fields: {
    readonly title: string;
    readonly body: string;
    readonly labels: ReadonlyArray<string>;
    readonly key: string;
    readonly displayKey: string;
    readonly url: string;
  },
): EnvironmentIssueEntry {
  const { scope } = target;
  const host = scope.host ?? "";
  return {
    environmentId: target.environmentId,
    projectId: scope.projectId,
    tracker: scope.tracker,
    host,
    scope: scope.scope,
    key: fields.key,
    displayKey: fields.displayKey,
    title: fields.title,
    url: fields.url,
    author: null,
    state: { category: "open", name: "open" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
    assignees: [],
    labels: fields.labels.map((name) => ({ name, color: null })),
    commentCount: 0,
    projectTitle: "",
  };
}

function fieldsFromTemplate(template: IssueTemplate): {
  readonly title: string;
  readonly body: string;
  readonly labels: ReadonlyArray<string>;
} {
  return {
    title: template.title,
    body: template.body,
    labels: [...template.labels],
  };
}

function useNewIssueFormState(open: boolean) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [extraLabels, setExtraLabels] = useState<ReadonlyArray<string>>([]);
  const [templateKey, setTemplateKey] = useState(BLANK_TEMPLATE_KEY);
  const [startAfterCreate, setStartAfterCreate] = useState(false);
  const [openSeen, setOpenSeen] = useState(open);

  if (openSeen !== open) {
    setOpenSeen(open);
    if (open) {
      setTitle("");
      setBody("");
      setExtraLabels([]);
      setTemplateKey(BLANK_TEMPLATE_KEY);
      setStartAfterCreate(false);
    }
  }

  return {
    title,
    setTitle,
    body,
    setBody,
    extraLabels,
    setExtraLabels,
    templateKey,
    setTemplateKey,
    startAfterCreate,
    setStartAfterCreate,
  };
}

export function TrailNewIssueButton(props: {
  readonly project: { readonly environmentId: TrailIssueCreateTarget["environmentId"]; readonly projectId: TrailIssueCreateTarget["scope"]["projectId"] } | null;
  readonly scopes: ReadonlyArray<{ readonly environmentId: TrailIssueCreateTarget["environmentId"]; readonly input: TrailIssueCreateTarget["scope"] }>;
  readonly trackers: ReadonlyArray<import("@t3tools/contracts").IssueTrackerSummary>;
  readonly host?: string | undefined;
  readonly onListRefresh: () => void;
  readonly updateSearch: (patch: Partial<IssuesSearch>) => void;
  readonly startIssueWork?: TrailIssueWorkActions["startIssueWork"];
}) {
  const target = resolveTrailIssueCreateTarget({
    project: props.project,
    scopes: props.scopes,
    trackers: props.trackers,
    host: props.host,
  });
  if (target === null) return null;
  return <TrailNewIssueDialog {...props} target={target} />;
}

function TrailNewIssueDialog({
  target,
  onListRefresh,
  updateSearch,
  startIssueWork,
}: {
  readonly target: TrailIssueCreateTarget;
  readonly onListRefresh: () => void;
  readonly updateSearch: (patch: Partial<IssuesSearch>) => void;
  readonly startIssueWork?: TrailIssueWorkActions["startIssueWork"];
}) {
  const gt = useGT();
  const [open, setOpen] = useState(false);
  const form = useNewIssueFormState(open);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const templatesQuery = useEnvironmentQuery(
    open
      ? issueEnvironment.templates({ environmentId: target.environmentId, input: target.scope })
      : null,
  );
  const create = useAtomCommand(issueEnvironment.create, { reportFailure: false });

  const templates = templatesQuery.data?.templates ?? [];
  const blankAllowed = templatesQuery.data?.blankIssuesEnabled !== false;

  const onTemplateChange = (key: string | null) => {
    if (key === null) return;
    form.setTemplateKey(key);
    if (key === BLANK_TEMPLATE_KEY) {
      form.setExtraLabels([]);
      return;
    }
    const template = templates.find((row) => row.key === key);
    if (template === undefined) return;
    const applied = fieldsFromTemplate(template);
    form.setTitle(applied.title);
    form.setBody(applied.body);
    form.setExtraLabels(applied.labels);
  };

  const submit = async () => {
    const title = form.title.trim();
    if (title.length === 0) {
      setSubmitError(gt("Title is required."));
      return;
    }
    setSubmitError(null);
    setPending(true);
    const labels = labelsForNewBoardIssue(form.extraLabels);
    const result = await create({
      environmentId: target.environmentId,
      input: {
        ...target.scope,
        title,
        body: form.body,
        labels: [...labels],
        assignees: [],
      },
    });
    setPending(false);
    if (result._tag === "Failure") {
      setSubmitError(
        readableFailure(
          squashAtomCommandFailure(result),
          m(msg("The tracker refused the new issue.")),
        ),
      );
      return;
    }

    const { scope } = target;
    const host = scope.host ?? "";
    updateSearch({
      selectedEnvironmentId: target.environmentId,
      selectedProjectId: scope.projectId,
      selectedHost: host || undefined,
      tracker: scope.tracker as IssueTrackerKind,
      scope: scope.scope,
      key: result.value.key,
    });
    onListRefresh();
    setOpen(false);
    toastManager.add({
      type: "success",
      title: m(msg("Issue created")),
      description: result.value.displayKey,
    });

    if (startIssueWork && form.startAfterCreate) {
      const created = result.value;
      const entry = entryFromCreate(target, {
        title,
        body: form.body,
        labels,
        key: created.key,
        displayKey: created.displayKey,
        url: created.url,
      });
      void startIssueWork(entry, { body: form.body });
    }
  };

  return (
  <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
      <PlusIcon aria-hidden className="size-4" />
      <T context="create issue on board">New issue</T>
    </Button>
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : setOpen(next))}>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <T context="create issue on board">New issue</T>
          </DialogTitle>
          <DialogDescription>
            <T>File an issue on the tracker for this project. It appears on the board with status Todo.</T>
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-3">
          {templates.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trail-new-issue-template">
                <T>Template</T>
              </Label>
              <Select value={form.templateKey} onValueChange={onTemplateChange}>
                <SelectTrigger id="trail-new-issue-template" className="w-full">
                  <SelectValue placeholder={gt("Choose a template")} />
                </SelectTrigger>
                <SelectPopup>
                  {blankAllowed ? (
                    <SelectItem value={BLANK_TEMPLATE_KEY}>
                      <T>Blank issue</T>
                    </SelectItem>
                  ) : null}
                  {templates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trail-new-issue-title">
              <T>Title</T>
            </Label>
            <Input
              id="trail-new-issue-title"
              data-slot="dialog-action"
              value={form.title}
              onChange={(event) => form.setTitle(event.target.value)}
              placeholder={gt("Short summary")}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.metaKey || event.ctrlKey) return;
                event.preventDefault();
                void submit();
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trail-new-issue-body">
              <T>Description</T>
            </Label>
            <Textarea
              id="trail-new-issue-body"
              rows={6}
              value={form.body}
              onChange={(event) => form.setBody(event.target.value)}
              placeholder={gt("Optional details")}
            />
          </div>
          {startIssueWork ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.startAfterCreate}
                onCheckedChange={(checked) => form.setStartAfterCreate(checked === true)}
              />
              <span>
                <T context="start agent on issue">Start task</T>
                <span className="text-muted-foreground"> — </span>
                <T context="after creating issue">after creating</T>
              </span>
            </label>
          ) : null}
          {submitError ? <p className="text-destructive text-xs">{submitError}</p> : null}
        </DialogPanel>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            <T>Cancel</T>
          </Button>
          <Button type="button" size="sm" onClick={() => void submit()} disabled={pending || form.title.trim().length === 0}>
            {pending ? gt("Creating…") : gt("Create", { $context: "verb, button" })}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  </>
  );
}