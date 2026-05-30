import { memo } from "react";
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
      <span>{line.cptHcpcs}</span>
      <span>{line.modifier}</span>
      <span>{line.diagnosisPointer}</span>
      <span>{line.totalCharges}</span>
      <span>{line.nipId}</span>
      <span>{line.providerId}</span>
    </div>
  );
});

type ClaimReportServiceTableProps = {
  serviceLines: ClaimReportServiceLine[];
};

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
        </div>
      </div>
    </div>
  );
}

export default memo(ClaimReportServiceTable);
