import { useCallback, useMemo, useState } from "react";
import type { DuePayrollEntry } from "../data/mockPayrollDashboardData";
import { DUE_PAYROLL_ENTRIES } from "../data/mockPayrollDashboardData";
import DuePayrollRow from "./DuePayrollRow";
import PayrollStaffSearch from "./PayrollStaffSearch";
import { TABLE_HEADER_CLASS, TABLE_MIN_WIDTH, TABLE_ROW_CLASS } from "./tableColumns";

export default function DuePayrollTable() {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return DUE_PAYROLL_ENTRIES;

    return DUE_PAYROLL_ENTRIES.filter((entry) =>
      entry.staffName.toLowerCase().includes(query),
    );
  }, [filterQuery]);

  const handleGenerateInvoice = useCallback((_entry: DuePayrollEntry) => undefined, []);

  const emptyMessage = useMemo(() => {
    if (DUE_PAYROLL_ENTRIES.length === 0) return "No payroll entries found.";
    return "No entries match your search.";
  }, []);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Due Payroll</h2>
        <PayrollStaffSearch onFilterChange={setFilterQuery} />
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div className={TABLE_MIN_WIDTH}>
            <div className={TABLE_HEADER_CLASS}>
              <span>Staff name</span>
              <span>Staff ID</span>
              <span>Hours worked</span>
              <span>Date range</span>
              <span>Payment details</span>
              <span>PA Rate</span>
              <span className="text-right">Action</span>
            </div>

            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => (
                <DuePayrollRow
                  key={entry.id}
                  variant="desktop"
                  entry={entry}
                  onGenerateInvoice={handleGenerateInvoice}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <DuePayrollRow
              key={entry.id}
              variant="mobile"
              entry={entry}
              onGenerateInvoice={handleGenerateInvoice}
            />
          ))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}
