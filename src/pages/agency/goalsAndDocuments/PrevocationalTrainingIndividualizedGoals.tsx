import React from "react";
import IndividualizedGoalsTemplate from "@/pages/agency/goalsAndDocuments/components/IndividualizedGoalsTemplate";
import {DocumentType} from "@/lib/api/goals-and-documents";

export default function PrevocationalTrainingIndividualizedGoals() {

    const pageTitle = "Prevocational Training – Individualized Goals";

    return (
        <IndividualizedGoalsTemplate 
            pageTitle={pageTitle} 
            documentType={DocumentType.PREVOCATIONAL_TRAINING_INDIVIDUALIZED_GOALS}
        />
    );
}
