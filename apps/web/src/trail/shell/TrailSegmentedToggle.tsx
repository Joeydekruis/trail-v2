import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import { ToggleGroup } from "../../components/ui/toggle-group";

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroup>;

/**
 * Option B segmented control: full-width track, border, active pill on #0e0e0e / active-row fill.
 */
export function TrailSegmentedToggle({
  className,
  children,
  layout = "full",
  ...props
}: ToggleGroupProps & {
  readonly children: ReactNode;
  readonly layout?: "full" | "fit";
}) {
  const fit = layout === "fit";
  return (
    <div
      className={cn(fit ? "w-fit max-w-full" : "w-full min-w-0", className)}
      data-trail-segmented=""
      data-trail-segmented-layout={layout}
    >
      <ToggleGroup
        className={cn(
          fit ? "w-fit max-w-full" : "w-full min-w-0",
          "border-[color:var(--trail-border)] [&_[data-slot=toggle]]:min-w-0 [&_[data-slot=toggle]]:justify-center [&_[data-slot=toggle]]:gap-1.5",
          fit ? "[&_[data-slot=toggle]]:px-3" : "[&_[data-slot=toggle]]:flex-1",
        )}
        variant="segmented"
        {...props}
      >
        {children}
      </ToggleGroup>
    </div>
  );
}

export { ToggleGroupItem as TrailSegmentedToggleItem } from "../../components/ui/toggle-group";
