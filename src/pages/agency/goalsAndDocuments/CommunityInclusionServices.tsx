import React from "react";
import AnnualUpdateTemplate from "@/pages/agency/goalsAndDocuments/components/AnnualUpdateTemplate";
import {DocumentType} from "@/lib/api/goals-and-documents";

export default function CommunityInclusionServices() {
    return (
        <AnnualUpdateTemplate
            pageTitle={"Community Inclusion Services – Annual Update"}
            documentType={DocumentType.COMMUNITY_INCLUSION_SERVICES}
        />
    );
}
