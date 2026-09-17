import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import type { ComplianceView } from "./workspaceScope";
export interface SourceProps {
  view: ComplianceView;
  scopeKey: string;
  agencyId: string;
  viewerId: string;
  mode: string;
  onApply: (filters: Partial<ComplianceView>) => void;
  onSelect: (selection: Partial<ComplianceView>) => void;
  onPage: (cursor?: string, staff?: boolean) => void;
  onPrevious: (staff?: boolean) => void;
}
export function sourceError(
  error: unknown,
): "restricted" | "missing" | "reset" | "retry" | null {
  if (!error) return null;
  const value = error as { status?: number | string; data?: unknown };
  if (value.status === 401 || value.status === 403) return "restricted";
  if (value.status === 404) return "missing";
  if (
    value.status === 400 ||
    (value.status === 409 &&
      String(JSON.stringify(value.data)).includes("COMPLIANCE_CURSOR_EXPIRED"))
  )
    return "reset";
  if (
    typeof value.status === "number" &&
    value.status >= 400 &&
    value.status < 500
  )
    return "reset";
  return "retry";
}
export function visibleSourceData<T>(
  data: T | undefined,
  error: unknown,
): T | undefined {
  const kind = sourceError(error);
  return kind && kind !== "retry" ? undefined : data;
}
export function SourceNotice({
  error,
  hasData,
  checked,
  retry,
  reset,
}: {
  error: unknown;
  hasData: boolean;
  checked?: string | null;
  retry: () => void;
  reset: () => void;
}) {
  const kind = sourceError(error);
  if (!kind) return null;
  return (
    <div role="alert" className="my-3 text-sm text-[#b54708]">
      {kind === "restricted"
        ? "You do not have access to these records. Ask your agency administrator."
        : kind === "missing"
          ? "This record is no longer available."
          : kind === "reset"
            ? "These filters or this page are no longer valid. Restart from the first page."
            : hasData
              ? checked
                ? `Could not refresh. Showing results checked at ${new Date(checked).toLocaleString()}.`
                : "Could not refresh. Showing previously loaded results."
              : "Could not load these records."}{" "}
      {kind === "retry" && (
        <Button variant="outline" onClick={retry}>
          Retry
        </Button>
      )}
      {(kind === "reset" || kind === "missing") && (
        <Button variant="outline" onClick={reset}>
          Reset view
        </Button>
      )}
    </div>
  );
}
export function SourcePage({
  cursor,
  next,
  loading,
  onNext,
  onPrevious,
}: {
  cursor?: string;
  next?: string | null;
  loading: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        disabled={!cursor || loading}
        onClick={onPrevious}
      >
        Previous page
      </Button>
      <Button variant="outline" disabled={!next || loading} onClick={onNext}>
        Next page
      </Button>
      {next && (
        <span className="text-sm text-[#808081]">More results available</span>
      )}
    </div>
  );
}
export function SourceFilters({
  view,
  onApply,
  children,
}: {
  view: ComplianceView;
  onApply: SourceProps["onApply"];
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState(view);
  const key = JSON.stringify(view);
  useEffect(() => {
    setDraft(view);
  }, [key]);
  const shift = view.source === "shift_notes";
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
      className="my-4 flex flex-wrap items-end gap-3"
    >
      {["training", "document_expiry", "client_documents"].includes(
        view.source || "",
      ) &&
        !view.clientId && (
          <label className="text-sm">
            Search name
            <Input
              aria-label="Search name"
              type="search"
              maxLength={100}
              value={draft.search || ""}
              onChange={(event) =>
                setDraft({ ...draft, search: event.target.value })
              }
              className="mt-1 rounded-full bg-white"
            />
          </label>
        )}
      {view.source === "document_expiry" && (
        <>
          <label className="text-sm">
            Staff status
            <select
              aria-label="Staff status"
              className="ml-2 rounded-lg border bg-white p-2"
              value={draft.employeeStatus || "all"}
              onChange={(event) =>
                setDraft({ ...draft, employeeStatus: event.target.value })
              }
            >
              <option value="all">All staff statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-sm">
            Expiry status
            <select
              aria-label="Expiry status"
              className="ml-2 rounded-lg border bg-white p-2"
              value={draft.condition || "active"}
              onChange={(event) =>
                setDraft({ ...draft, condition: event.target.value })
              }
            >
              {[
                ["active", "Needs attention"],
                ["all", "All expiry statuses"],
                ["current", "Current"],
                ["expiring", "Expiring"],
                ["due_today", "Expires today"],
                ["expired", "Expired"],
                ["needs_review", "Needs review"],
                ["not_applicable", "Not applicable"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {view.source === "client_documents" && !view.clientId && (
        <label className="text-sm">
          Client status
          <select
            aria-label="Client status"
            className="ml-2 rounded-lg border bg-white p-2"
            value={draft.status || "all"}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value })
            }
          >
            <option value="all">All client statuses</option>
            {["active", "inactive", "pending", "archived"].map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>
      )}
      {shift && (
        <>
          <label className="text-sm">
            Status
            <select
              aria-label="Shift note status filter"
              className="ml-2 rounded-lg border bg-white p-2"
              value={draft.stateGroup || "unresolved"}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  stateGroup: event.target
                    .value as ComplianceView["stateGroup"],
                })
              }
            >
              {["unresolved", "submitted", "approved", "inactive", "all"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </option>
                ),
              )}
            </select>
          </label>
          {(["startDate", "endDate"] as const).map((key) => (
            <Popover key={key}>
              <PopoverTrigger asChild>
                <Button variant="outline" type="button">
                  {key === "startDate" ? "From" : "Through"}:{" "}
                  {draft[key] || "Any date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto bg-white p-0">
                <Calendar
                  mode="single"
                  selected={
                    draft[key] ? new Date(draft[key] + "T12:00:00") : undefined
                  }
                  onSelect={(date) =>
                    setDraft({
                      ...draft,
                      [key]: date ? format(date, "yyyy-MM-dd") : undefined,
                    })
                  }
                />
              </PopoverContent>
            </Popover>
          ))}
        </>
      )}
      {view.source !== "unsigned_form485" && !view.clientId && (
        <Button
          type="submit"
          className="rounded-full bg-[#00b4b8] text-white hover:bg-[#009da1]"
        >
          Apply filters
        </Button>
      )}
      {children}
    </form>
  );
}
