import {ChevronLeft, ChevronRight, Search} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

import type {Audience, RowItem} from "../types";
import {getInitials} from "../types";
import {AudiencePills} from "./AudiencePills";

export function GlobalNotesTotalsView({
  audience,
  onAudienceChange,
  metricTitle,
  search,
  onSearchChange,
  isAgenciesLoading,
  isUsersLoading,
  rows,
  onBack,
  safePage,
  totalPages,
  onPrevPage,
  onNextPage,
}: {
  audience: Audience;
  onAudienceChange: (next: Audience) => void;
  metricTitle: string;
  search: string;
  onSearchChange: (value: string) => void;
  isAgenciesLoading: boolean;
  isUsersLoading: boolean;
  rows: RowItem[];
  onBack: () => void;
  safePage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  const renderMetric = (value: number | null) => {
    if (typeof value !== "number") return "—";
    return value.toLocaleString();
  };

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3">
        <Button type="button" variant="ghost" className="h-10 rounded-xl bg-white/60" onClick={onBack}>
          <ChevronLeft className="size-5" />
          Back
        </Button>

        <AudiencePills value={audience} onChange={onAudienceChange} />
      </div>

      <div className="rounded-3xl bg-white/55 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-foreground">{metricTitle}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Notes Filtered By {audience === "agencies" ? "Agencies" : "Users"}
            </div>
          </div>

          <div className="relative w-full md:w-[360px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              className="rounded-3xl border-none bg-white/60 pl-11 focus:ring-[#00b4b8]"
            />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl bg-[#f7fafa]">
          <div className="grid grid-cols-[260px_120px_170px_170px_120px_140px] gap-2 px-5 py-4 text-xs font-semibold text-muted-foreground">
            <div>{audience === "agencies" ? "Agency" : "User"}</div>
            <div>Total Notes</div>
            <div>Missing Required Fields</div>
            <div>Poor Goal Documentation</div>
            <div>AI Validation</div>
            <div className="text-right">&nbsp;</div>
          </div>
          <div className="h-px w-full bg-border" />

          {audience === "agencies" && isAgenciesLoading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading agencies...</div>
          ) : null}
          {audience === "users" && isUsersLoading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : null}

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[260px_120px_170px_170px_120px_140px] items-center gap-2 px-5 py-4 text-sm"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-xl">
                  {row.imageUrl ? (
                    <AvatarImage
                      src={row.imageUrl}
                      alt={row.name}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-semibold text-[#00b4b8]">
                    {getInitials(row.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="font-semibold text-foreground">{row.name}</div>
              </div>
              <div className="font-medium text-muted-foreground">{renderMetric(row.totalNotes)}</div>
              <div className="font-medium text-muted-foreground">{renderMetric(row.missingRequiredFields)}</div>
              <div className="font-medium text-muted-foreground">{renderMetric(row.poorGoalDocumentation)}</div>
              <div className="font-medium text-muted-foreground">{renderMetric(row.aiValidation)}</div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl bg-gray-100 px-3 text-xs text-muted-foreground border-gray-400"
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div>
            {safePage}/{totalPages}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous page"
            disabled={safePage <= 1}
            onClick={onPrevPage}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next page"
            disabled={safePage >= totalPages}
            onClick={onNextPage}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
