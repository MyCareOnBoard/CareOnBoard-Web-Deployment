import React from "react";
import type { ResponseComponent } from "../../types";
import ShiftListCard from "./ShiftListCard";
import RiskSummaryCard from "./RiskSummaryCard";
import NoCaregiversCard from "./NoCaregiversCard";
import QuickQuestionCard from "./QuickQuestionCard";
import QuickCheckCard from "./QuickCheckCard";
import TextContentCard from "./TextContentCard";

const REGISTRY: Record<string, React.FC<{ data: unknown }>> = {
  "shift-list": ShiftListCard,
  "risk-summary": RiskSummaryCard,
  "no-caregivers": NoCaregiversCard,
  "quick-question": QuickQuestionCard,
  "quick-check": QuickCheckCard,
  "text-content": TextContentCard,
};

export function ComponentRenderer({ component }: { component: ResponseComponent }) {
  const Comp = REGISTRY[component.type];
  if (!Comp) return null;
  return <Comp data={component.data} />;
}
