import * as Schema from "effect/Schema";

import {
  readIssueListPreferences,
  type IssueListPreferences,
} from "~/components/issue/issueListPreferences";

export type IssuesIm = "list" | "board";

const STORAGE_KEY = "trail:issues-im:v1";
const IssuesImSchema = Schema.Literals(["list", "board"]);

export function readStoredIssuesIm(): IssuesIm {
  if (typeof window === "undefined") {
    return "list";
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return "list";
    }
    const decoded = Schema.decodeUnknownOption(IssuesImSchema)(JSON.parse(raw));
    return decoded._tag === "Some" ? decoded.value : "list";
  } catch {
    return "list";
  }
}

export function writeStoredIssuesIm(im: IssuesIm): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(im));
  } catch {
    // Storage can be unavailable in private mode.
  }
}

export function resolveIssuesIm(search: {
  readonly im?: IssuesIm | undefined;
  /** @deprecated use `im` */
  readonly view?: "board" | undefined;
}): IssuesIm {
  if (search.im === "list" || search.im === "board") {
    return search.im;
  }
  if (search.view === "board") {
    return "board";
  }
  return readStoredIssuesIm();
}

type IssuesNavSearchPatch = IssueListPreferences & {
  readonly im?: IssuesIm | undefined;
  /** @deprecated use `im` */
  readonly view?: "board" | undefined;
};

/** List preferences plus the remembered list/board mode for sidebar and palette links. */
export function issuesNavSearch(
  patch: Partial<IssuesNavSearchPatch> = {},
): IssueListPreferences & { readonly im: IssuesIm } {
  const im = resolveIssuesIm(patch);
  const { view: _view, ...rest } = patch;
  return {
    ...readIssueListPreferences(),
    ...rest,
    im,
  };
}

/** Apply the effective mode to localStorage when it came from the URL or a legacy redirect. */
export function syncStoredIssuesIm(im: IssuesIm): void {
  if (im === readStoredIssuesIm()) return;
  writeStoredIssuesIm(im);
}
