import React from "react";
import type { ResponseComponent } from "../../types";
import ShiftListCard from "./ShiftListCard";
import RiskSummaryCard from "./RiskSummaryCard";
import NoCaregiversCard from "./NoCaregiversCard";
import QuickQuestionCard from "./QuickQuestionCard";
import QuickCheckCard from "./QuickCheckCard";
import TextContentCard from "./TextContentCard";

const STATIC_REGISTRY: Record<string, React.FC<{ data: unknown }>> = {
  "shift-list": ShiftListCard,
  "risk-summary": RiskSummaryCard,
  "no-caregivers": NoCaregiversCard,
  "text-content": TextContentCard,
};

const INTERACTIVE_REGISTRY = {
  "quick-question": QuickQuestionCard,
  "quick-check": QuickCheckCard,
} as const;

export function ComponentRenderer({
  component,
  onSendMessage,
}: {
  component: ResponseComponent;
  onSendMessage?: (text: string) => void;
}) {
  const StaticComp = STATIC_REGISTRY[component.type];
  if (StaticComp) return <StaticComp data={component.data} />;

  const InteractiveComp = INTERACTIVE_REGISTRY[component.type as keyof typeof INTERACTIVE_REGISTRY];
  if (InteractiveComp) return <InteractiveComp data={component.data} onSendMessage={onSendMessage} />;

  return null;
}
