import React from "react";
import AnnualUpdateTemplate from "@/pages/agency/goalsAndDocuments/components/AnnualUpdateTemplate";
import {DocumentType} from "@/lib/api/goals-and-documents";

export default function PrevocationalTrainingServices() {

  return (
      <AnnualUpdateTemplate
          pageTitle={"Prevocational Training Services – Annual Update"}
          documentType={DocumentType.PREVOCATIONAL_TRAINING_SERVICES}
      />
  );
}
