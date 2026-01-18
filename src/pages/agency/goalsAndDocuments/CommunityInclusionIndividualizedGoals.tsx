import React from "react";
import IndividualizedGoalsTemplate from "@/pages/agency/goalsAndDocuments/components/IndividualizedGoalsTemplate";
import {DocumentType} from "@/lib/api/goals-and-documents";

export default function CommunityInclusionIndividualizedGoals() {

    const pageTitle = "Community Inclusion Services – Individualized Goals";

    return (
        <IndividualizedGoalsTemplate 
            pageTitle={pageTitle} 
            documentType={DocumentType.COMMUNITY_INCLUSION_INDIVIDUALIZED_GOALS}
        />
    );
}
