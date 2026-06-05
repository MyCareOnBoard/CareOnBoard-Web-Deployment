import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader } from "@/components/ui/loader";

export function getClaimsActionLoadingCopy(claimNumber: string): {
  title: string;
  description: string;
} {
  return {
    title: "Opening claim report",
    description: `Loading report for claim ${claimNumber}…`,
  };
}

type ClaimsActionLoadingOverlayProps = {
  title: string;
  description?: string;
};

export default function ClaimsActionLoadingOverlay({
  title,
  description,
}: ClaimsActionLoadingOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    rootRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm motion-reduce:backdrop-blur-none contain-[layout_paint]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-modal="true"
      aria-label={title}
    >
      <div className="rounded-[20px] border border-[#e5e5e6] bg-white px-8 py-10 shadow-lg">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader size="md" />
          <div className="space-y-1">
            <p className="text-[16px] font-semibold text-[#10141a]">{title}</p>
            {description ? (
              <p className="text-[14px] text-[#808081]">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
