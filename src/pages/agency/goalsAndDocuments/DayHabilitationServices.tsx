import React from "react";
import AnnualUpdateTemplate from "@/pages/agency/goalsAndDocuments/components/AnnualUpdateTemplate";
import {DocumentType} from "@/lib/api/goals-and-documents";

export default function DayHabilitationServices() {

  return (
      <AnnualUpdateTemplate
          pageTitle={"Day Habilitation Services – Annual Update"}
          documentType={DocumentType.DAY_HABILITATION_SERVICES}
      />
  );
}
