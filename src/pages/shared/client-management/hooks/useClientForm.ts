import { useState, useEffect, useCallback } from "react";
import { AddClientFormData, createInitialAddClientFormData } from "../types/formData";

const TOTAL_STAGES = 7;

export function useClientForm(initialFormData?: AddClientFormData) {
  const [formData, setFormData] = useState<AddClientFormData>(
    () => initialFormData || createInitialAddClientFormData()
  );
  const [stage, setStage] = useState<number>(1);
  const [declared, setDeclared] = useState(false);

  useEffect(() => {
    setDeclared(false);
  }, [stage]);

  const isFirst = stage === 1;
  const isLast = stage === TOTAL_STAGES;

  const goToNext = useCallback(
    () => setStage((s) => Math.min(TOTAL_STAGES, s + 1)),
    []
  );
  const goToPrev = useCallback(
    () => setStage((s) => Math.max(1, s - 1)),
    []
  );

  return {
    formData,
    setFormData,
    stage,
    setStage,
    declared,
    setDeclared,
    isFirst,
    isLast,
    totalStages: TOTAL_STAGES,
    goToNext,
    goToPrev,
  };
}
