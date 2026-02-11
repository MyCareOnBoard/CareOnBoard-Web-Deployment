import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InlineLoader } from "@/components/ui/loader";
import { X } from "lucide-react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";
import type { PlanOfCare } from "../types";
import { getInitials } from "../utils";
import type {
  GoalDocument,
  NaturalSupportsTrainingDocument,
  AnnualUpdateDocument,
  IndividualizedGoalsDocument,
} from "@/lib/api/goals-and-documents";

const documentTypeLabels: Record<string, string> = {
  natural_supports_training: "Natural Supports Training",
  community_inclusion_services: "Community Inclusion Services – Annual Update",
  community_inclusion_individualized_goals:
    "Community Inclusion – Individualized Goals",
  day_habilitation_services: "Day Habilitation Services – Annual Update",
  day_habilitation_individualized_goals:
    "Day Habilitation – Individualized Goals",
  prevocational_training_services:
    "Prevocational Training Services – Annual Update",
  prevocational_training_individualized_goals:
    "Prevocational Training – Individualized Goals",
};

interface GoalsModalProps {
  open: boolean;
  isLoading: boolean;
  plan: PlanOfCare | null;
  goalDocument: GoalDocument | null;
  onClose: () => void;
}

function NaturalSupportsTrainingView({
  metadata,
}: {
  metadata: NaturalSupportsTrainingDocument;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Name</p>
          <p className="text-sm text-gray-900">{metadata.name || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Date of Birth</p>
          <p className="text-sm text-gray-900">{metadata.birthDate || "—"}</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-0.5">ISP Outcome</p>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">
          {metadata.ispOutcome || "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Name of Trainer</p>
          <p className="text-sm text-gray-900">
            {metadata.nameOfTrainer || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Completed By</p>
          <p className="text-sm text-gray-900">
            {metadata.completedBy || "—"}
          </p>
        </div>
      </div>

      {metadata.trainingParticipants &&
        metadata.trainingParticipants.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Training Participants
            </p>
            <div className="space-y-2">
              {metadata.trainingParticipants.map((participant, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-lg p-3 text-sm text-gray-900"
                >
                  <span className="font-medium">{participant.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {metadata.trainings && metadata.trainings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Training Sessions
          </p>
          <div className="space-y-2">
            {metadata.trainings.map((session, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">
                    {session.type || `Session ${idx + 1}`}
                  </span>
                  <span className="text-gray-500">{session.date}</span>
                </div>
                <p className="text-gray-600">
                  {session.startTime} – {session.endTime}
                </p>
                {session.description && (
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {session.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnnualUpdateView({
  metadata,
}: {
  metadata: AnnualUpdateDocument;
}) {
  const fields = [
    { label: "Name", value: metadata.name },
    { label: "ISP Start Date", value: metadata.ispStartDate },
    { label: "ISP End Date", value: metadata.ispEndDate },
    { label: "Activities Description", value: metadata.activitiesDescription },
    { label: "Changes Needed", value: metadata.changesNeeded },
    { label: "Outstanding Issues", value: metadata.outstandingIssues },
    { label: "Planning Examples", value: metadata.planningExamples },
    { label: "Connections Examples", value: metadata.connectionsExamples },
    {
      label: "Employment Opportunities",
      value: metadata.employmentOpportunities,
    },
    { label: "Employment Pursuits", value: metadata.employmentPursuits },
    {
      label: "Health & Safety Changes",
      value: metadata.healthSafetyChanges,
    },
    { label: "Completed By", value: metadata.completedBy },
    { label: "Completion Date", value: metadata.completionDate },
  ];

  return (
    <div className="space-y-3">
      {fields.map(
        (field) =>
          field.value && (
            <div key={field.label}>
              <p className="text-xs text-gray-500 mb-0.5">{field.label}</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {field.value}
              </p>
            </div>
          )
      )}
    </div>
  );
}

function IndividualizedGoalsView({
  metadata,
}: {
  metadata: IndividualizedGoalsDocument;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Name</p>
          <p className="text-sm text-gray-900">{metadata.name || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">ISP Date</p>
          <p className="text-sm text-gray-900">{metadata.ispDate || "—"}</p>
        </div>
      </div>

      {metadata.outcomes && metadata.outcomes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Outcomes</p>
          <div className="space-y-2">
            {metadata.outcomes.map((outcome, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="font-medium text-gray-900">
                  Outcome {outcome.outcomeNumber || idx + 1}
                </span>
                <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                  {outcome.outcomeDescription || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {metadata.involvedPersons &&
        metadata.involvedPersons.filter(Boolean).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Involved Persons
            </p>
            <div className="flex flex-wrap gap-2">
              {metadata.involvedPersons
                .filter(Boolean)
                .map((person, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                  >
                    {person}
                  </span>
                ))}
            </div>
          </div>
        )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Completed By</p>
          <p className="text-sm text-gray-900">
            {metadata.completedBy || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Completion Date</p>
          <p className="text-sm text-gray-900">
            {metadata.completionDate || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoalDocumentContent({
  goalDocument,
}: {
  goalDocument: GoalDocument;
}) {
  const { documentType, metadata } = goalDocument;

  if (!metadata) {
    return (
      <p className="text-sm text-gray-600">No goals data available.</p>
    );
  }

  const isIndividualizedGoals =
    documentType.includes("individualized_goals");
  const isNaturalSupports =
    documentType === "natural_supports_training";

  if (isNaturalSupports) {
    return (
      <NaturalSupportsTrainingView
        metadata={metadata as NaturalSupportsTrainingDocument}
      />
    );
  }

  if (isIndividualizedGoals) {
    return (
      <IndividualizedGoalsView
        metadata={metadata as IndividualizedGoalsDocument}
      />
    );
  }

  // Default: Annual Update style documents
  return (
    <AnnualUpdateView metadata={metadata as AnnualUpdateDocument} />
  );
}

export function GoalsModal({
  open,
  isLoading,
  plan,
  goalDocument,
  onClose,
}: GoalsModalProps) {
  if (!open) {
    return null;
  }

  const displayName = plan?.clientName || "Client";
  const docTypeLabel = goalDocument
    ? documentTypeLabels[goalDocument.documentType] ||
      goalDocument.documentType
    : "Goals";

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">Goals</h3>
            <p className="text-sm text-gray-600 mt-0.5">{docTypeLabel}</p>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <div className="flex items-center text-right gap-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500">Client</p>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarImage src={ServicesAvatar} alt={displayName} />
                <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading && <InlineLoader text="Loading goals..." />}

          {!isLoading && goalDocument && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    goalDocument.status === "submitted"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {goalDocument.status === "submitted" ? "Submitted" : "Draft"}
                </span>
                {goalDocument.submittedAt && (
                  <span className="text-xs text-gray-500">
                    Submitted:{" "}
                    {new Date(goalDocument.submittedAt).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </div>

              {/* Goal document details */}
              <GoalDocumentContent goalDocument={goalDocument} />
            </div>
          )}

          {!isLoading && !goalDocument && (
            <p className="text-sm text-gray-600">
              No goals details available.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 bg-gray-400 text-white text-sm rounded-full hover:bg-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
