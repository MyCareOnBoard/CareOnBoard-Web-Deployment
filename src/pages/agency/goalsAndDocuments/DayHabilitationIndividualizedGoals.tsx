import React from "react";
import IndividualizedGoalsTemplate from "@/pages/agency/goalsAndDocuments/components/IndividualizedGoalsTemplate";
import {DocumentType} from "@/lib/api/goals-and-documents";

export default function DayHabilitationIndividualizedGoals() {

    const pageTitle = "Day Habilitation – Individualized Goals";

    return (
        <IndividualizedGoalsTemplate 
            pageTitle={pageTitle} 
            documentType={DocumentType.DAY_HABILITATION_INDIVIDUALIZED_GOALS}
        />
    );
}
