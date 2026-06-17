import React from "react";
import type { ResponseComponent } from "../../types";
import ShiftListCard from "./ShiftListCard";
import RiskSummaryCard from "./RiskSummaryCard";
import NoCaregiversCard from "./NoCaregiversCard";
import QuickQuestionCard from "./QuickQuestionCard";
import QuickCheckCard from "./QuickCheckCard";
import TextContentCard from "./TextContentCard";
import GenericListCard from "./GenericListCard";
import GenericDetailCard from "./GenericDetailCard";
import GenericActionCard from "./GenericActionCard";
import TaskListCard from "./TaskListCard";
import PdfDownloadCard from "./PdfDownloadCard";

const STATIC_REGISTRY: Record<string, React.FC<{ data: unknown }>> = {
  "shift-list": ShiftListCard,
  "risk-summary": RiskSummaryCard,
  "no-caregivers": NoCaregiversCard,
  "text-content": TextContentCard,
  "task-list": TaskListCard,
  "generic-list": GenericListCard,
  "generic-detail": GenericDetailCard,
  "generic-action": GenericActionCard,
  "pdf-download": PdfDownloadCard,
  "excel-download": PdfDownloadCard,
  "word-download": PdfDownloadCard,
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

  return <TextContentCard data={{ title: "Result", content: `\`\`\`json\n${JSON.stringify(component.data, null, 2)}\n\`\`\`` }} />;
}
