import { useState, useEffect, useMemo } from "react";
import { AddClientFormData, createInitialAddClientFormData } from "../types/formData";

export function useClientForm(initialFormData?: AddClientFormData) {
  const [formData, setFormData] = useState<AddClientFormData>(
    () => initialFormData || createInitialAddClientFormData()
  );
  const [stage, setStage] = useState<number>(1);
  const [declared, setDeclared] = useState(false);

  const totalStages = 7;

  useEffect(() => {
    setDeclared(false);
  }, [stage]);

  const isFirst = stage === 1;
  const isLast = stage === totalStages;

  const goToNext = () => setStage((s) => Math.min(totalStages, s + 1));
  const goToPrev = () => setStage((s) => Math.max(1, s - 1));

  return {
    formData,
    setFormData,
    stage,
    setStage,
    declared,
    setDeclared,
    isFirst,
    isLast,
    totalStages,
    goToNext,
    goToPrev,
  };
}
