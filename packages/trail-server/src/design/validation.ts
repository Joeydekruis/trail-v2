import { TRAIL_DESIGN_MAX_PAGE_BYTES } from "@t3tools/trail-contracts";

const HTML_ROOT = /<\s*html[\s>]/i;
const HTML_DOCTYPE = /<!DOCTYPE\s+html/i;

export type DesignValidationError = { readonly field: string; readonly message: string };

export const validateDesignHtml = (html: string): DesignValidationError | null => {
  const bytes = new TextEncoder().encode(html);
  if (bytes.byteLength > TRAIL_DESIGN_MAX_PAGE_BYTES) {
    return {
      field: "html",
      message: `HTML exceeds ${TRAIL_DESIGN_MAX_PAGE_BYTES} bytes.`,
    };
  }
  if (!HTML_ROOT.test(html) && !HTML_DOCTYPE.test(html)) {
    return {
      field: "html",
      message: "HTML must include a root <html> element or <!DOCTYPE html>.",
    };
  }
  return null;
};