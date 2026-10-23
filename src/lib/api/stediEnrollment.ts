import axiosClient from "../axios";
import type { OperationalBillingRequestContext } from "@/lib/operational-agency/types";
import { operationalAgencyId } from "@/lib/operational-agency/request";

/** Stedi transaction enrollment: links the agency to NJ Medicaid for 837P claims and 835 ERAs. */

export type StediTransactionKey = "professionalClaimSubmission" | "claimPayment";

export type StediEnrollmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "STEDI_ACTION_REQUIRED"
  | "PROVIDER_ACTION_REQUIRED"
  | "PROVISIONING"
  | "LIVE"
  | "REJECTED"
  | "CANCELED";

/** One status for the agency across its enrollments. */
export type StediEnrollmentOverallStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "action_required"
  | "rejected"
  | "live";

export type StediContact = {
  organizationName: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone: string;
};

export type StediEnrollmentTask = {
  id: string;
  rank: number;
  isComplete: boolean;
  responsibleParty: "PROVIDER" | "STEDI";
  completedAt: string | null;
  instructions: string;
  fields: Array<{ key: string; label: string; fieldType: "TEXT" | "DOCUMENT" }>;
  links: Array<{ label: string; url: string }>;
  values: Array<{ key: string; text: string }>;
};

export type StediEnrollmentTransaction = {
  key: StediTransactionKey;
  label: string;
  njForm: string;
  enrollmentId: string;
  status: StediEnrollmentStatus | null;
  reason: string;
  submittedAt: string | null;
  statusLastUpdatedAt: string | null;
  lastEraReceivedAt: string | null;
  payerName: string;
  tasks: StediEnrollmentTask[];
  error: { code: string; message: string; fieldErrors: Array<{ path: string; message: string }> } | null;
};

export type StediEnrollment = {
  status: StediEnrollmentOverallStatus;
  payerId: string;
  provider: { name: string; npi: string; taxIdLast4: string; medicaidProviderId: string } | null;
  contact: StediContact | null;
  userEmail: string;
  transactions: StediEnrollmentTransaction[];
  createdAt: string | null;
  updatedAt: string | null;
  lastSyncedAt: string | null;
};

export type StediEnrollmentDefaults = {
  providerName: string;
  npi: string;
  taxIdLast4: string;
  taxIdSource: "billing_settings" | "payroll" | "";
  medicaidProviderId: string;
  payerId: string;
  contact: StediContact;
  userEmail: string;
};

export type StediEnrollmentOverview = {
  /** False when the server has no Stedi API key. */
  configured: boolean;
  enrollment: StediEnrollment;
  defaults: StediEnrollmentDefaults;
  payer: { id: string; name: string };
  transactionTypes: Array<{ key: StediTransactionKey; label: string; njForm: string }>;
};

export type StediEnrollmentInput = {
  providerName: string;
  npi: string;
  /** Blank uses the saved EIN. */
  taxId?: string;
  medicaidProviderId: string;
  contact: StediContact;
  userEmail: string;
  payerId: string;
  transactions: StediTransactionKey[];
  submit: boolean;
};

export type StediEnrollmentResult = {
  enrollment: StediEnrollment;
  failed?: StediTransactionKey[];
  skipped?: StediTransactionKey[];
};

type ApiEnvelope<T> = { success: boolean; data?: T; message?: string; error?: string };

const BASE = "/billing/clearinghouse/stedi/enrollment";

function unwrap<T>(envelope: ApiEnvelope<T>, fallback: string): T {
  if (!envelope.success || !envelope.data) throw new Error(envelope.message || fallback);
  return envelope.data;
}

export async function getStediEnrollment(input: {
  context: OperationalBillingRequestContext;
  refresh?: boolean;
  signal?: AbortSignal;
}): Promise<StediEnrollmentOverview> {
  const { context, refresh, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<StediEnrollmentOverview>>(BASE, {
    params: { agencyId: operationalAgencyId(context), ...(refresh ? { refresh: "1" } : {}) },
    ...(signal ? { signal } : {}),
  });
  return unwrap(response.data, "Failed to load the Stedi enrollment");
}

/** Just the agency's status, for prompts such as the claims page banner. */
export async function getStediEnrollmentStatus(input: {
  context: OperationalBillingRequestContext;
  signal?: AbortSignal;
}): Promise<Pick<StediEnrollmentOverview, "configured" | "enrollment">> {
  const { context, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<Pick<StediEnrollmentOverview, "configured" | "enrollment">>>(BASE, {
    params: { agencyId: operationalAgencyId(context), summary: "1" },
    ...(signal ? { signal } : {}),
  });
  return unwrap(response.data, "Failed to load the Stedi enrollment");
}

export async function startStediEnrollment(input: {
  context: OperationalBillingRequestContext;
  enrollment: StediEnrollmentInput;
}): Promise<StediEnrollmentResult> {
  const response = await axiosClient.post<ApiEnvelope<StediEnrollmentResult>>(BASE, input.enrollment, {
    params: { agencyId: operationalAgencyId(input.context) },
  });
  return unwrap(response.data, "Failed to save the Stedi enrollment");
}

export async function submitStediEnrollmentDrafts(input: {
  context: OperationalBillingRequestContext;
}): Promise<StediEnrollmentResult> {
  const response = await axiosClient.post<ApiEnvelope<StediEnrollmentResult>>(`${BASE}/submit`, {}, {
    params: { agencyId: operationalAgencyId(input.context) },
  });
  return unwrap(response.data, "Failed to submit the Stedi enrollment");
}

export async function refreshStediEnrollment(input: {
  context: OperationalBillingRequestContext;
}): Promise<StediEnrollmentResult> {
  const response = await axiosClient.post<ApiEnvelope<StediEnrollmentResult>>(`${BASE}/refresh`, {}, {
    params: { agencyId: operationalAgencyId(input.context) },
  });
  return unwrap(response.data, "Failed to refresh the Stedi enrollment");
}

export async function answerStediEnrollmentTask(input: {
  context: OperationalBillingRequestContext;
  taskId: string;
  values: Array<{ key: string; text: string }>;
  completed: boolean;
}): Promise<StediEnrollmentResult> {
  const { context, taskId, values, completed } = input;
  const response = await axiosClient.post<ApiEnvelope<StediEnrollmentResult>>(
    `${BASE}/tasks/${encodeURIComponent(taskId)}`,
    { values, completed },
    { params: { agencyId: operationalAgencyId(context) } },
  );
  return unwrap(response.data, "Failed to save the task answer");
}
