import axiosClient, { axiosClientWithoutAuth } from "@/lib/axios";

export type CareCapability =
  | "view"
  | "manage"
  | "review"
  | "send"
  | "submit"
  | "invite";
export type CareRole = "dsp" | "caregiver" | "support_coordinator" | "support_supervisor" | "agency_contact";
export type CareAccess = {
  capabilities?: string[];
  permissionRevision?: string | number;
};
export type CarePage<T> = { items: T[]; nextCursor: string | null };
export type CareDashboardClient = {
  networkId: string;
  clientName: string;
  lifecycle: string;
  pendingDocuments: number;
  pendingUpdates: number;
  publicationActionCount: number | null;
};
export type CareRequestOptions = {
  signal?: AbortSignal;
  agencyKey?: string;
  cursor?: string;
  query?: string;
  kind?: string;
  status?: string;
  limit?: number;
  clientId?: string;
  program?: string;
  afterSequence?: number;
  event?: string;
  message?: string;
  version?: string;
};
export type CareOrganization = {
  agencyKey: string;
  id: string;
  name: string;
  kind: "internal" | "external";
  role: string;
};
export type CareMe = {
  uid?: string;
  user?: { uid: string; name?: string };
  restrictedPortal: boolean;
  organizations: CareOrganization[];
  permissionRevision: string | number;
};
export type CareNetwork = CareAccess & {
  id: string;
  sourceClient: { clientId: string; agencyId: string; program: "sc" };
  client: { id: string; name: string };
  lifecycle: string;
  revision: number;
  reviewer: boolean;
  isSourceCoordinator?: boolean;
};
export type CareOverview = {
  unreadScope?: string;
  network?: CareNetwork;
  counts: {
    agencies?: number;
    unreadConversations?: number;
    pendingDocuments?: number;
    pendingUpdates?: number;
  };
  pendingActions: Array<{
    id: string;
    title: string;
    kind: string;
    submissionId?: string;
    conversationId?: string;
    description?: string;
  }>;
  activity?: CareEvent[];
  monitoring?: {
    lastContactAt?: string;
    openFollowUpCount?: number;
    nextMonitoringDueDate?: string;
    url?: string;
  };
};
export type CareAgency = {
  agencyKey: string;
  id: string;
  name: string;
  kind: "internal" | "external";
  verificationStatus?: string;
  serviceTypes?: string[];
  contact?: string;
  city?: string;
  state?: string;
};
export type CareMember = CareAccess & {
  uid: string;
  agencyKey: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
  lastAdministrator?: boolean;
  revision?: number;
  grantRevision?: number;
  allowedCapabilities?: string[];
  employeeId?: string;
  membershipId?: string;
  jobRole?: string | null;
  eligibleCareRoles?: CareRole[];
  careRole?: CareRole | null;
  isPrimaryContact?: boolean;
  isSourceCoordinator?: boolean;
  canMessage?: boolean;
  assignment?: CareGrant | null;
};
export type CareStaffRoster = CarePage<CareMember> & {
  relationshipRevision: number;
  acceptanceId?: string;
  primaryContactUid: string | null;
  allowedCapabilities: string[];
};
export type CareSourceLink = {
  clientId: string;
  agencyId: string;
  agencyKey: string;
  clientName?: string;
  programs: string[];
  state: "pending" | "confirmed" | "withdrawn";
  revision: number;
  confirmationId?: string;
  acceptanceId?: string;
  confirmedBy?: string[];
  confirmedAt?: string;
};
export type CareRelationship = CareAccess & {
  allowedActions?: Array<"suspend" | "resume" | "revoke" | "expire">;
  agencyKey: string;
  name: string;
  kind?: string;
  state: string;
  acceptanceId?: string;
  revision: number;
  expiresAt?: string;
  members?: CareMember[];
  primaryContactUid?: string | null;
  sourceLinks?: CareSourceLink[];
};
export type CareGrant = {
  uid: string;
  name?: string;
  agencyKey: string;
  capabilities: string[];
  revision: number;
  state?: string;
  acceptanceId?: string;
  employeeId?: string;
  membershipId?: string;
  jobRole?: string | null;
  eligibleCareRoles?: CareRole[];
  allowedCapabilities?: string[];
  careRole?: CareRole | null;
  protectedAuthority?: boolean;
  effective?: boolean;
  grantId?: string;
  isPrimaryContact?: boolean;
  relationshipRevision?: number;
};
export type CareInvitation = {
  id: string;
  purpose: "client_connection" | "organization_member";
  status: string;
  recipientEmail?: string;
  recipientMode?: "agency_administrators";
  agencyName?: string;
  createdAt?: string;
  expiresAt?: string;
  revision?: number;
  networkId?: string;
  delivery?: {
    status:
      | "pending"
      | "processing"
      | "succeeded"
      | "failed"
      | "cancelled"
      | "unavailable";
    reason?: string | null;
    nextAttemptAt?: string | null;
  };
};
export type CareInvitationPreview = {
  valid?: boolean;
  status: string;
  purpose?: CareInvitation["purpose"];
  verified?: boolean;
  networkId?: string;
  client?: { name: string };
  organization?: { name: string; agencyKey?: string };
  recipientEmailMasked?: string;
  recipientMode?: "agency_administrators";
  canAccept?: boolean;
  agencyKey?: string;
  requiresOrganizationRegistration?: boolean;
};
export type CareConversation = CareAccess & {
  id: string;
  networkId: string;
  title: string;
  type: "direct" | "group";
  members: Array<{
    uid: string;
    agencyKey: string;
    acceptanceId?: string;
    name?: string;
    careRole?: CareRole;
  }>;
  latestSequence: number;
  unreadCount?: number;
  updatedAt?: string;
  sourceContext?: { url: string; label: string };
};
export type CareMessage = {
  id: string;
  sequence: number;
  text: string;
  senderUid: string;
  senderAgencyKey: string;
  senderName?: string;
  senderCareRole?: CareRole;
  createdAt: string;
  attachmentVersionIds?: string[];
  inReplyToMessageId?: string;
  attachments?: Array<{
    submissionId: string;
    versionId: string;
    fileName: string;
    title: string;
    kind?: "document" | "care_update";
  }>;
};
export type CareAttachmentCandidate = {
  submissionId: string;
  versionId: string;
  title: string;
  fileName: string;
  versionNumber: number;
};
export type CareVersion = {
  id: string;
  number: number;
  body?: {
    kind: "service_update";
    serviceDate: string;
    summary: string;
    serviceReference?: string;
  };
  file?: { fileName: string; mimeType: string; sizeBytes: number };
  createdAt: string;
  submittedAt?: string;
  review?: {
    decision: string;
    comment: string;
    reviewerUid: string;
    reviewedAt: string;
  };
};
export type CarePublicationOperation = {
  id: string;
  destinationClientId?: string;
  destinationName?: string;
  program?: string;
  status: string;
  reason?: string;
  publicationId?: string;
  supersedesOperationId?: string;
  capabilities?: string[];
};
export type CareSubmission = CareAccess & {
  id: string;
  networkId: string;
  kind: "document" | "care_update";
  title: string;
  category: string;
  audience: Array<{ agencyKey: string; acceptanceId?: string }>;
  submitterAgencyKey: string;
  reviewStatus: string;
  syncStatus: string;
  currentVersionId: string | null;
  draftVersionId: string | null;
  revision: number;
  versions?: CareVersion[];
  currentVersion?: CareVersion;
  draftVersion?: CareVersion;
  publicationOperations?: CarePublicationOperation[];
  supersedesSubmissionId?: string;
  createdAt?: string;
  reviewComment?: string;
};
export type CareEvent = {
  id: string;
  action: string;
  title?: string;
  createdAt: string;
  actorName?: string;
  description?: string;
  submissionId?: string;
  networkId?: string;
};
export type CareExternalProfile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contactName?: string;
  address?: string;
  services?: string;
  serviceTypes?: string[];
  website?: string;
  verificationStatus: string;
  revision: number;
  capabilities?: string[];
};
export type CareEvidenceCandidate = {
  publicationId: string;
  submissionId: string;
  versionId: string;
  versionNumber: number;
  title: string;
  fileName?: string;
  approvedAt?: string;
  sourceClientId: string;
  sourceAgencyId?: string;
  state?: string;
  eligible?: boolean;
};
export type CareMonitoringLink = {
  id: string;
  revision: number;
  kind: "evidence" | "conversation";
  state: string;
  publicationId?: string;
  submissionId?: string;
  versionId?: string;
  versionNumber?: number;
  title?: string;
  fileName?: string;
  conversationId?: string;
  requestMessageId?: string;
  createdAt: string;
  actorName?: string;
  reason?: string;
  supersedesLinkId?: string;
  capabilities?: string[];
  unavailable?: boolean;
  responses?: Array<{ messageId: string; sequence: number; createdAt: string }>;
  correctionMarker?: string;
  events?: Array<{
    action: string;
    createdAt: string;
    reason?: string;
    actorName?: string;
  }>;
};
export type CareMonitoringTarget = {
  clientId: string;
  recordKind: "contact" | "follow_up";
  recordId: string;
};
export type CareSourcePublication = {
  id: string;
  publicationId?: string;
  title: string;
  kind: "document" | "care_update";
  versionId: string;
  versionNumber?: number;
  fileName?: string;
  file?: { fileName: string };
  publishedAt: string;
  state?: string;
  revision?: number;
  networkId?: string;
  submissionId?: string;
  supersedesSubmissionId?: string;
  allowedActions?: Array<"retract" | "mark_corrected">;
  correctionMarker?: string;
  unavailable?: boolean;
  body?: CareVersion["body"];
};
export type CareNotification = {
  id: string;
  title: string;
  message: string;
  status: "unread" | "read" | "archived" | "deleted";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  actionUrl?: string;
};
type Envelope<T> = {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
};
type Command = {
  operationId: string;
  expectedRevision?: number;
  reason?: string;
};
const base = "/agencyCare";
const id = encodeURIComponent;
const networkPath = (networkId: string) => `/networks/${id(networkId)}`;
const submissionPath = (submissionId: string) =>
  `/submissions/${id(submissionId)}`;
const monitoringPath = (target: CareMonitoringTarget) =>
  `/source-clients/${id(target.clientId)}/monitoring/${target.recordKind}/${id(target.recordId)}`;

function params(options?: CareRequestOptions) {
  if (!options) return undefined;
  const { signal: _signal, ...values } = options;
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}
async function request<T>(
  method: "get" | "post" | "patch" | "put" | "delete",
  path: string,
  data?: unknown,
  options?: CareRequestOptions,
  publicOnly = false,
): Promise<T> {
  const response = await (
    publicOnly ? axiosClientWithoutAuth : axiosClient
  ).request<Envelope<T>>({
    method,
    url: base + path,
    data,
    params: params(options),
    signal: options?.signal,
  });
  if (response.data?.success !== true || response.data.data === undefined)
    throw new Error(
      response.data?.message ||
        response.data?.error ||
        "Agency Care is unavailable.",
    );
  return response.data.data;
}
async function content(
  path: string,
  options?: CareRequestOptions,
): Promise<Blob> {
  const response = await axiosClient.get<Blob>(base + path, {
    params: params(options),
    signal: options?.signal,
    responseType: "blob",
  });
  const blob = response.data;
  if (
    !(blob instanceof Blob) ||
    ![
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ].includes(blob.type.split(";")[0])
  )
    throw new Error("This document cannot be previewed here.");
  return blob;
}

export const agencyCareApi = {
  notifications: async (
    options: CareRequestOptions & { agencyKey: string },
  ) => {
    const response = await axiosClient.get<{
      notifications: CareNotification[];
      nextCursor?: string | null;
    }>("/notifications", {
      params: {
        ...params(options),
        surface: "care_on_board",
        sourceKind: "agency_care",
        cleared: false,
        limit: 50,
      },
      signal: options.signal,
    });
    return response.data;
  },
  readNotification: async (
    notificationId: string,
    options: CareRequestOptions & { agencyKey: string },
  ) => {
    await axiosClient.patch(
      `/notifications/${id(notificationId)}/read`,
      {},
      {
        params: {
          ...params(options),
          surface: "care_on_board",
          sourceKind: "agency_care",
        },
        signal: options.signal,
      },
    );
  },
  me: (options?: CareRequestOptions) =>
    request<CareMe>("get", "/me", undefined, options),
  networks: (options?: CareRequestOptions) =>
    request<CarePage<CareNetwork>>("get", "/networks", undefined, options),
  network: (networkId: string, options?: CareRequestOptions) =>
    request<CareNetwork>("get", networkPath(networkId), undefined, options),
  networkForClient: (
    clientId: string,
    program: string,
    options?: CareRequestOptions,
  ) =>
    request<{ networkId: string | null }>(
      "get",
      "/network-for-client",
      undefined,
      { ...options, clientId, program },
    ),
  createNetwork: (
    sourceClientId: string,
    operationId: string,
    options?: CareRequestOptions,
  ) =>
    request<{ networkId: string; revision?: number }>(
      "post",
      "/networks",
      { sourceClientId, operationId },
      options,
    ),
  overview: (networkId: string, options?: CareRequestOptions) =>
    request<CareOverview>(
      "get",
      `${networkPath(networkId)}/overview`,
      undefined,
      options,
    ),
  directory: (options?: CareRequestOptions) =>
    request<CarePage<CareAgency>>("get", "/directory", undefined, options),
  relationships: (networkId: string, options?: CareRequestOptions) =>
    request<CarePage<CareRelationship>>(
      "get",
      `${networkPath(networkId)}/relationships`,
      undefined,
      options,
    ),
  relationship: (
    networkId: string,
    agencyKey: string,
    input: Command & {
      action: "suspend" | "resume" | "revoke" | "expire";
      expiresAt?: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareRelationship>(
      "patch",
      `${networkPath(networkId)}/relationships/${id(agencyKey)}`,
      input,
      options,
    ),
  invitations: (networkId: string, options?: CareRequestOptions) =>
    request<CarePage<CareInvitation>>(
      "get",
      `${networkPath(networkId)}/invitations`,
      undefined,
      options,
    ),
  invite: (
    networkId: string,
    input: {
      agencyKey?: string;
      recipientEmail?: string;
      recipientName?: string;
      agencyName?: string;
      operationId: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareInvitation>(
      "post",
      `${networkPath(networkId)}/invitations`,
      input,
      options,
    ),
  invitationPreview: (
    token: string,
    options?: CareRequestOptions,
    publicOnly = false,
  ) =>
    request<CareInvitationPreview>(
      "get",
      `/invitations/${id(token)}/preview`,
      undefined,
      options,
      publicOnly,
    ),
  invitationAccept: (
    token: string,
    operationId: string,
    options?: CareRequestOptions,
  ) =>
    request<{
      networkId?: string;
      agencyKey?: string;
      externalAgencyId?: string;
      status?: string;
    }>("post", `/invitations/${id(token)}/accept`, { operationId }, options),
  invitationDecline: (
    token: string,
    operationId: string,
    options?: CareRequestOptions,
  ) =>
    request<{ status: string }>(
      "post",
      `/invitations/${id(token)}/decline`,
      { operationId },
      options,
    ),
  invitationAction: (
    invitationId: string,
    action: "resend" | "revoke",
    input: Command,
    options?: CareRequestOptions,
  ) =>
    request<CareInvitation>(
      "post",
      `/invitations/${id(invitationId)}/${action}`,
      input,
      options,
    ),
  grants: (networkId: string, options?: CareRequestOptions) =>
    request<CarePage<CareGrant>>(
      "get",
      `${networkPath(networkId)}/user-grants`,
      undefined,
      options,
    ),
  grant: (
    networkId: string,
    uid: string,
    input: Command & {
      agencyKey: string;
      capabilities: string[];
      careRole?: CareRole;
      employeeId?: string;
      isPrimaryContact?: boolean;
      expectedRelationshipRevision?: number;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareGrant>(
      "put",
      `${networkPath(networkId)}/user-grants/${id(uid)}`,
      input,
      options,
    ),
  sourceLinks: (networkId: string, options?: CareRequestOptions) =>
    request<CarePage<CareSourceLink>>(
      "get",
      `${networkPath(networkId)}/source-links`,
      undefined,
      options,
    ),
  sourceDocuments: (networkId: string, options?: CareRequestOptions) =>
    request<
      CarePage<{
        id: string;
        title: string;
        fileName: string;
        category: string;
      }>
    >("get", `${networkPath(networkId)}/source-documents`, undefined, options),
  sourceLink: (
    networkId: string,
    input: Command & {
      clientId: string;
      programs: string[];
      action: "propose" | "confirm";
    },
    options?: CareRequestOptions,
  ) =>
    request<CareSourceLink>(
      "post",
      `${networkPath(networkId)}/source-links`,
      input,
      options,
    ),
  withdrawSourceLink: (
    networkId: string,
    clientId: string,
    input: Command & { programs?: string[] },
    options?: CareRequestOptions,
  ) =>
    request<CareSourceLink>(
      "post",
      `${networkPath(networkId)}/source-links/${id(clientId)}/withdraw`,
      input,
      options,
    ),
  conversations: (networkId: string, options?: CareRequestOptions) =>
    request<CarePage<CareConversation>>(
      "get",
      `${networkPath(networkId)}/conversations`,
      undefined,
      options,
    ),
  conversation: (conversationId: string, options?: CareRequestOptions) =>
    request<CareConversation>(
      "get",
      `/conversations/${id(conversationId)}`,
      undefined,
      options,
    ),
  attachmentCandidates: (
    conversationId: string,
    options?: CareRequestOptions,
  ) =>
    request<CarePage<CareAttachmentCandidate>>(
      "get",
      `/conversations/${id(conversationId)}/attachment-candidates`,
      undefined,
      options,
    ),
  createConversation: (
    networkId: string,
    input: {
      type: "direct" | "group";
      title: string;
      members: Array<{ uid: string; agencyKey: string }>;
      operationId: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareConversation>(
      "post",
      `${networkPath(networkId)}/conversations`,
      input,
      options,
    ),
  messages: (conversationId: string, options?: CareRequestOptions) =>
    request<CarePage<CareMessage>>(
      "get",
      `/conversations/${id(conversationId)}/messages`,
      undefined,
      options,
    ),
  sendMessage: (
    conversationId: string,
    input: {
      text: string;
      operationId: string;
      inReplyToMessageId?: string;
      attachmentVersionIds?: string[];
    },
    options?: CareRequestOptions,
  ) =>
    request<CareMessage>(
      "post",
      `/conversations/${id(conversationId)}/messages`,
      input,
      options,
    ),
  readConversation: (
    conversationId: string,
    sequence: number,
    options?: CareRequestOptions,
  ) =>
    request<{ lastReadSequence: number }>(
      "post",
      `/conversations/${id(conversationId)}/read`,
      { sequence },
      options,
    ),
  submissions: (networkId: string, options?: CareRequestOptions) =>
    request<CarePage<CareSubmission>>(
      "get",
      `${networkPath(networkId)}/submissions`,
      undefined,
      options,
    ),
  createSubmission: (
    networkId: string,
    input: {
      kind: "document" | "care_update";
      title: string;
      category: string;
      audience: string[];
      operationId: string;
      supersedesSubmissionId?: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareSubmission>(
      "post",
      `${networkPath(networkId)}/submissions`,
      input,
      options,
    ),
  submission: (submissionId: string, options?: CareRequestOptions) =>
    request<CareSubmission>(
      "get",
      submissionPath(submissionId),
      undefined,
      options,
    ),
  versions: (submissionId: string, options?: CareRequestOptions) =>
    request<CarePage<CareVersion>>(
      "get",
      `${submissionPath(submissionId)}/versions`,
      undefined,
      options,
    ),
  addVersion: (
    submissionId: string,
    input:
      | FormData
      | {
          expectedRevision: number;
          body: NonNullable<CareVersion["body"]>;
          operationId: string;
        },
    options?: CareRequestOptions,
  ) =>
    request<CareSubmission>(
      "post",
      `${submissionPath(submissionId)}/versions`,
      input,
      options,
    ),
  submit: (
    submissionId: string,
    input: Command & { versionId: string },
    options?: CareRequestOptions,
  ) =>
    request<CareSubmission>(
      "post",
      `${submissionPath(submissionId)}/submit`,
      input,
      options,
    ),
  review: (
    submissionId: string,
    input: Command & {
      versionId: string;
      decision: "approve" | "reject" | "request_revision";
      comment: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareSubmission>(
      "post",
      `${submissionPath(submissionId)}/reviews`,
      input,
      options,
    ),
  publicationOperation: (
    submissionId: string,
    input: Command & {
      action: "retry" | "reauthorize";
      destinationOperationId?: string;
      program?: string;
      destinationClientId?: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareSubmission>(
      "post",
      `${submissionPath(submissionId)}/publication-operations`,
      input,
      options,
    ),
  archive: (
    submissionId: string,
    input: Command,
    options?: CareRequestOptions,
  ) =>
    request<CareSubmission>(
      "post",
      `${submissionPath(submissionId)}/archive`,
      input,
      options,
    ),
  shareSourceDocument: (
    networkId: string,
    input: {
      sourceDocumentId: string;
      title: string;
      audience: string[];
      operationId: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareSubmission>(
      "post",
      `${networkPath(networkId)}/source-shares`,
      input,
      options,
    ),
  versionContent: (
    submissionId: string,
    versionId: string,
    options?: CareRequestOptions,
  ) =>
    content(
      `${submissionPath(submissionId)}/versions/${id(versionId)}/content`,
      options,
    ),
  publicationContent: (
    clientId: string,
    publicationId: string,
    options?: CareRequestOptions,
  ) =>
    content(
      `/source-clients/${id(clientId)}/publications/${id(publicationId)}/content`,
      options,
    ),
  sourcePublications: (clientId: string, options?: CareRequestOptions) =>
    request<CarePage<CareSourcePublication>>(
      "get",
      `/source-clients/${id(clientId)}/publications`,
      undefined,
      options,
    ),
  correctSourcePublication: (
    clientId: string,
    publicationId: string,
    input: Command & {
      action: "retract" | "mark_corrected";
      supersedingPublicationId?: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<{ publicationId: string; state: string; revision: number }>(
      "post",
      `/source-clients/${id(clientId)}/publications/${id(publicationId)}/corrections`,
      input,
      options,
    ),
  reviewQueue: (options?: CareRequestOptions) =>
    request<CarePage<CareSubmission>>(
      "get",
      "/review-queue",
      undefined,
      options,
    ),
  activity: (networkId: string, options?: CareRequestOptions) =>
    request<CarePage<CareEvent>>(
      "get",
      `${networkPath(networkId)}/activity`,
      undefined,
      options,
    ),
  dashboard: (options?: CareRequestOptions) =>
    request<CarePage<CareDashboardClient>>("get", "/dashboard", undefined, options),
  reports: (options?: CareRequestOptions) =>
    request<
      CarePage<{
        networkId: string;
        clientName: string;
        pendingReviewCount: number;
        publicationActionCount: number | null;
        activeAgencies: number;
        revisionCount?: number;
        rejectionCount?: number;
        invitationAcceptance?: {
          issued: number;
          accepted: number;
          scope: string;
        } | null;
        reviewTurnaround?: {
          averageHours: number | null;
          sampleSize: number;
          scope: string;
        } | null;
        unresolvedMonitoringActions?: number | null;
      }>
    >("get", "/reports", undefined, options),
  recovery: (options?: CareRequestOptions) =>
    request<CarePage<CareSubmission>>("get", "/recovery", undefined, options),
  externalProfile: (agencyId: string, options?: CareRequestOptions) =>
    request<CareExternalProfile>(
      "get",
      `/external-agencies/${id(agencyId)}`,
      undefined,
      options,
    ),
  updateExternalProfile: (
    agencyId: string,
    input: Partial<
      Pick<
        CareExternalProfile,
        "name" | "email" | "phone" | "contactName" | "serviceTypes"
      >
    > &
      Command,
    options?: CareRequestOptions,
  ) =>
    request<CareExternalProfile>(
      "patch",
      `/external-agencies/${id(agencyId)}`,
      input,
      options,
    ),
  members: (agencyId: string, options?: CareRequestOptions) =>
    request<CarePage<CareMember>>(
      "get",
      `/external-agencies/${id(agencyId)}/members`,
      undefined,
      options,
    ),
  networkMembers: (networkId: string, options?: CareRequestOptions) =>
    request<CareStaffRoster>(
      "get",
      `${networkPath(networkId)}/members`,
      undefined,
      options,
    ),
  memberInvitations: (agencyId: string, options?: CareRequestOptions) =>
    request<CarePage<CareInvitation>>(
      "get",
      `/external-agencies/${id(agencyId)}/member-invitations`,
      undefined,
      options,
    ),
  inviteMember: (
    agencyId: string,
    input: {
      email: string;
      name: string;
      role: "member" | "administrator";
      operationId: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareInvitation>(
      "post",
      `/external-agencies/${id(agencyId)}/member-invitations`,
      input,
      options,
    ),
  removeMember: (
    agencyId: string,
    uid: string,
    input: Command,
    options?: CareRequestOptions,
  ) =>
    request<{ status: string }>(
      "delete",
      `/external-agencies/${id(agencyId)}/members/${id(uid)}`,
      input,
      options,
    ),
  monitoringLinks: (
    target: CareMonitoringTarget,
    options?: CareRequestOptions,
  ) =>
    request<CarePage<CareMonitoringLink>>(
      "get",
      `${monitoringPath(target)}/care-links`,
      undefined,
      options,
    ),
  evidenceCandidates: (
    clientId: string,
    target?: CareMonitoringTarget,
    options?: CareRequestOptions,
  ) =>
    request<CarePage<CareEvidenceCandidate>>(
      "get",
      target
        ? `${monitoringPath(target)}/evidence-candidates`
        : `/source-clients/${id(clientId)}/monitoring/evidence-candidates`,
      undefined,
      options,
    ),
  linkEvidence: (
    target: CareMonitoringTarget,
    input: Command & { publicationId: string; supersedesLinkId?: string },
    options?: CareRequestOptions,
  ) =>
    request<CareMonitoringLink>(
      "post",
      `${monitoringPath(target)}/care-links`,
      input,
      options,
    ),
  removeMonitoringLink: (
    target: CareMonitoringTarget,
    linkId: string,
    input: Command,
    options?: CareRequestOptions,
  ) =>
    request<CareMonitoringLink>(
      "post",
      `${monitoringPath(target)}/care-links/${id(linkId)}/remove`,
      input,
      options,
    ),
  partnerRequest: (
    target: CareMonitoringTarget,
    input: {
      conversationId: string;
      recipientAgencyKey: string;
      recipientUid: string;
      summary: string;
      replyBy?: string;
      operationId: string;
    },
    options?: CareRequestOptions,
  ) =>
    request<CareMonitoringLink>(
      "post",
      `${monitoringPath(target)}/partner-requests`,
      input,
      options,
    ),
};
