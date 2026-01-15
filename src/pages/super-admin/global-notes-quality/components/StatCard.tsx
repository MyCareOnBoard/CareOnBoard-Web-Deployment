import {ArrowUpRight} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import type {QualityMetric} from "../types";

export function StatCard({
  metric,
  selected,
  onSelect,
}: {
  metric: QualityMetric;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={cn(
        "cursor-pointer rounded-2xl border-0 bg-[#f7fafa] shadow-none transition-colors hover:bg-white",
        selected && "bg-[#00b4b8] text-white hover:bg-[#00b4b8]",
      )}
    >
      <CardHeader className="px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className={cn("text-sm font-semibold", selected && "text-white")}>{metric.title}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "rounded-full bg-white/60 hover:bg-white/80",
              selected && "bg-white/20 hover:bg-white/25",
            )}
            aria-label={`${metric.title} details`}
          >
            <ArrowUpRight className={cn("size-4 text-muted-foreground", selected && "text-white")}/>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex gap-4 px-6 pb-6">
        <div className={cn("text-3xl font-bold tracking-tight", selected && "text-white")}>{metric.value}</div>
        <CardDescription
          className={cn("text-sm font-medium text-gray-500", selected && "text-white")}
        >
          {metric.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
