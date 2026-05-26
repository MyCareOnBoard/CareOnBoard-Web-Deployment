import { memo, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClaimSignaturePayload } from "../../data/mockClaimReportData";

type ClaimReportSignatureFieldProps = {
  id: string;
  value: ClaimSignaturePayload | null;
  onOpen: () => void;
  onClear?: () => void;
};

function isRasterSignatureData(data: string) {
  return data.startsWith("data:image");
}

function ClaimReportSignatureField({
  id,
  value,
  onOpen,
  onClear,
}: ClaimReportSignatureFieldProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      id={id}
      role="button"
      tabIndex={0}
      aria-label={value ? "Edit signature" : "Click to sign"}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        "cr-signature-field cr-signature-preview",
        !value && "cr-signature-field--empty"
      )}
    >
      {value ? (
        <>
          {isRasterSignatureData(value.signatureData) ? (
            <img
              src={value.signatureData}
              alt="Signature"
              loading="lazy"
              decoding="async"
              className="cr-signature-preview-image"
            />
          ) : (
            <span className="cr-signature-preview--typed">{value.signatureData}</span>
          )}
          {onClear ? (
            <button
              type="button"
              aria-label="Clear signature"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              className="claim-report-no-print absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#808081] transition-colors hover:bg-[#eef4f5] hover:text-[#10141a]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </>
      ) : (
        <span className="cr-signature-placeholder">Click to sign</span>
      )}
      <div className="cr-signature-line" aria-hidden="true" />
    </div>
  );
}

export default memo(ClaimReportSignatureField);
