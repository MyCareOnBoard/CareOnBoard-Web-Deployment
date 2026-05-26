import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClaimReportServiceLine } from "../../data/mockClaimReportData";
import {
  CLAIM_REPORT_TABLE_COLUMNS,
  CLAIM_REPORT_TABLE_GRID,
} from "../../data/mockClaimReportData";

const TABLE_MIN_WIDTH = "min-w-[920px]";

type ServiceTableRowProps = {
  line: ClaimReportServiceLine;
};

const ServiceTableRow = memo(function ServiceTableRow({ line }: ServiceTableRowProps) {
  return (
    <div className={`claim-report-print-table-row ${CLAIM_REPORT_TABLE_GRID} border-b border-[#e5e5e6] px-2 py-3 text-[12px] text-[#10141a] last:border-b-0`}>
      <span className="sticky left-0 bg-white pr-2">{line.duration}</span>
      <span>{line.placeOfService}</span>
      <span>{line.emg}</span>
      <span>{line.cptHcpcs}</span>
      <span>{line.modifier}</span>
      <span>{line.diagnosisPointer}</span>
      <span>{line.charges}</span>
      <span>{line.epsotFamilyPlan}</span>
      <span>{line.idQual1}</span>
      <span>{line.idQual2}</span>
    </div>
  );
});

type ClaimReportServiceTableProps = {
  serviceLines: ClaimReportServiceLine[];
};

const PAGINATION_BUTTON_CLASS =
  "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md transition-colors";

function ClaimReportServiceTable({ serviceLines }: ClaimReportServiceTableProps) {
  return (
    <div className="claim-report-print-section mt-6 border-t border-[#e5e5e6] pt-6">
      <div className="overflow-x-auto overscroll-x-contain rounded-[10px] border border-[#e5e5e6]">
        <div className={TABLE_MIN_WIDTH}>
          <div
            className={`${CLAIM_REPORT_TABLE_GRID} border-b border-[#e5e5e6] bg-[#fafafa] px-2 py-3 text-[11px] font-semibold text-[#808081]`}
          >
            {CLAIM_REPORT_TABLE_COLUMNS.map((column, index) => (
              <span
                key={`${column}-${index}`}
                className={index === 0 ? "sticky left-0 bg-[#fafafa] pr-2" : undefined}
              >
                {column}
              </span>
            ))}
          </div>

          {serviceLines.map((line, index) => (
            <ServiceTableRow key={`${line.duration}-${index}`} line={line} />
          ))}

          <div className="claim-report-no-print flex items-center justify-between gap-4 border-t border-[#e5e5e6] px-4 py-3">
            <span className="text-[13px] text-[#808081]">Page 1 of 1</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                className={`${PAGINATION_BUTTON_CLASS} text-[#808081] hover:bg-[#eef4f5]`}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  type="button"
                  aria-label={`Page ${page}`}
                  aria-current={page === 1 ? "page" : undefined}
                  className={`${PAGINATION_BUTTON_CLASS} text-[13px] font-medium ${
                    page === 1
                      ? "bg-[#00b4b8] text-white hover:bg-[#009da1]"
                      : "text-[#10141a] hover:bg-[#eef4f5]"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                className={`${PAGINATION_BUTTON_CLASS} text-[#808081] hover:bg-[#eef4f5]`}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ClaimReportServiceTable);
