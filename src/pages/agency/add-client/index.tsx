import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { Stage1ClientIdentityAndContact } from "@/pages/agency/add-client/stages/Stage1ClientIdentityAndContact";
import { Stage2GuardianAndFunding } from "@/pages/agency/add-client/stages/Stage2GuardianAndFunding";
import { Stage3HealthcareAndDocuments } from "@/pages/agency/add-client/stages/Stage3HealthcareAndDocuments";
import { Stage4EvvAndVisitConfig } from "@/pages/agency/add-client/stages/Stage4EvvAndVisitConfig";
import { Stage5StaffAssignmentAndRestrictions } from "@/pages/agency/add-client/stages/Stage5StaffAssignmentAndRestrictions";
import { Stage6GoalsAndEmergency } from "@/pages/agency/add-client/stages/Stage6GoalsAndEmergency";
import { Stage7SystemAiAndAudit } from "@/pages/agency/add-client/stages/Stage7SystemAiAndAudit";

export default function AddClientPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<number>(1);

  if (stage === 1) {
    return (
      <Stage1ClientIdentityAndContact
        onCancel={() => navigate(Routes.agency.clients)}
        onNext={() => setStage(2)}
      />
    );
  }

  if (stage === 2) {
    return (
      <Stage2GuardianAndFunding
        onCancel={() => navigate(Routes.agency.clients)}
        onNext={() => setStage(3)}
      />
    );
  }

  if (stage === 3) {
    return (
      <Stage3HealthcareAndDocuments
        onCancel={() => navigate(Routes.agency.clients)}
        onNext={() => setStage(4)}
      />
    );
  }

  if (stage === 4) {
    return (
      <Stage4EvvAndVisitConfig
        onCancel={() => navigate(Routes.agency.clients)}
        onNext={() => setStage(5)}
      />
    );
  }

  if (stage === 5) {
    return (
      <Stage5StaffAssignmentAndRestrictions
        onCancel={() => navigate(Routes.agency.clients)}
        onNext={() => setStage(6)}
      />
    );
  }

  if (stage === 6) {
    return (
      <Stage6GoalsAndEmergency
        onCancel={() => navigate(Routes.agency.clients)}
        onNext={() => setStage(7)}
      />
    );
  }

  if (stage === 7) {
    return (
      <Stage7SystemAiAndAudit
        onCancel={() => navigate(Routes.agency.clients)}
        onNext={() => navigate(Routes.agency.clients)}
      />
    );
  }

  if (
    stage !== 1 &&
    stage !== 2 &&
    stage !== 3 &&
    stage !== 4 &&
    stage !== 5 &&
    stage !== 6 &&
    stage !== 7
  ) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="mb-10">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Add client
          </h1>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081] mt-2">
            Stage {stage}/7 coming soon.
          </p>
        </div>
      </div>
    );
  }

  return null;
}


