export interface PendingComment {
  readonly id: string;
  readonly pageUrl: string;
  readonly pageTitle: string | null;
  readonly comment: string;
  readonly element: PickedElementWire | null;
  readonly screenshotBlob: Blob | null;
  readonly screenshotPart: string | null;
}

export interface PickedElementWire {
  readonly pageUrl: string;
  readonly pageTitle: string | null;
  readonly tagName: string;
  readonly selector: string | null;
  readonly htmlPreview: string;
  readonly componentName: string | null;
  readonly styles: string;
  readonly stack: ReadonlyArray<{
    readonly functionName: string | null;
    readonly fileName: string | null;
    readonly lineNumber: number | null;
    readonly columnNumber: number | null;
  }>;
  readonly pickedAt: string;
}