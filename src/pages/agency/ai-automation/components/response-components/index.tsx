import React from "react";
import type { ResponseComponent } from "../../types";
import ShiftListCard from "./ShiftListCard";

const REGISTRY: Record<string, React.FC<{ data: unknown }>> = {
  "shift-list": ShiftListCard,
};

export function ComponentRenderer({ component }: { component: ResponseComponent }) {
  const Comp = REGISTRY[component.type];
  if (!Comp) return null;
  return <Comp data={component.data} />;
}
