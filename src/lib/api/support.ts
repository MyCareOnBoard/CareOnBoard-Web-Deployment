/**
 * Support desk API (support function).
 *
 * A case is answered first by the AI assistant from the knowledge base, then by a
 * person. Field staff ask their agency's desk; agency users ask CareOnboard (the
 * corporate desk, worked by super admins with Corporate Support).
 */
import axiosClient from "../axios";

const BASE = "/support";

export type SupportDesk = "agency" | "corporate";
export type SupportStatus = "ai" | "waiting" | "pending_user" | "resolved";
export type SupportPriority = "normal" | "high" | "urgent";
export type SupportAudience = "field_staff" | "agency" | "all";

export interface SupportCase {
  id: string;
  caseNumber: string | null;
  subject: string;
  desk: SupportDesk;
  status: SupportStatus;
  priority: SupportPriority;
  category: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  aiActive: boolean;
  urgent: boolean;
  escalationReason: string | null;
  escalationLabel: string | null;
  replyDueAt: string | null;
  rating: number | null;
  lastMessage: string;
  lastMessageAt: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  unread: number;
  // Agents only
  agencyId?: string | null;
  agencyName?: string | null;
  requesterId?: string;
  requesterName?: string;
  requesterType?: string;
  escalatedAt?: string | null;
  firstResponseAt?: string | null;
  resolvedBy?: string | null;
  linkedIssue?: { url: string; label?: string } | null;
  /** Set when the agency or the assistant passed the case to CareOnboard support. */
  transferredFrom?: { byName: string | null; at: string | null } | null;
  context?: { page?: string; label?: string } | null;
  overdue?: boolean;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderType: "user" | "agent" | "ai" | "system";
  content: string;
  aiMeta: { articleIds?: string[]; sources?: SupportSource[]; confidence?: number } | null;
  feedback: "helpful" | "not_helpful" | null;
  createdAt: string | null;
}

export interface SupportNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string | null;
}

export interface SupportCaseDetail {
  case: SupportCase;
  messages: SupportMessage[];
  notes?: SupportNote[];
  requester?: { uid: string; name: string; email: string; userType: string; avatar: string | null } | null;
  relatedCases?: SupportCase[];
}

export interface SupportTeamMember {
  uid: string;
  name: string;
  email?: string;
  userType?: string;
  role: "lead" | "agent";
  categories: string[];
  receivesUrgent: boolean;
  active: boolean;
}

export interface SupportSettings {
  desk: SupportDesk;
  aiEnabled: boolean;
  assistantName: string;
  greeting: string;
  routing: "round_robin" | "team";
  team: SupportTeamMember[];
  hours: { timezone: string; days: number[]; start: string; end: string; allDay: boolean };
  replyTargetMinutes: { normal: number; high: number; urgent: number };
  autoResolveHours: number;
  urgentKeywords: string[];
  categories: string[];
  canManage: boolean;
}

export interface EligibleMember {
  uid: string;
  name: string;
  email: string;
  userType: string;
  title: string;
}

/** What an assistant answer was based on: an article, or a section of an uploaded document. */
export interface SupportSource {
  id: string;
  title: string;
  /** The document section, such as "Handbook > Sick days". */
  section?: string;
  kind?: "document";
  fileName?: string;
  /** Files attached to the article, offered for download. */
  attachments?: { id: string; name: string }[];
}

export interface SupportFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string | null;
}

export type DocumentProcessingStatus = "queued" | "processing" | "ready" | "failed";

export interface SupportArticle {
  id: string;
  /** "document": an uploaded file the assistant answers from, section by section. */
  kind: "article" | "document";
  title: string;
  body: string;
  /** Documents: the start of the text, once read. */
  preview: string | null;
  /** Documents: the uploaded file. */
  file: SupportFile | null;
  processing: {
    status: DocumentProcessingStatus;
    error: string | null;
    /** When reading was queued or started. */
    since: string | null;
    /** Queued or processing for over 15 minutes: the background job likely failed, so Retry is offered. */
    stuck: boolean;
    sectionCount: number;
    /** Only the first part of a very long document is searched. */
    truncated: boolean;
    finishedAt: string | null;
  } | null;
  /** Written articles: files offered for download (not searched). */
  attachments: SupportFile[];
  category: string | null;
  tags: string[];
  audience: SupportAudience;
  scope: "agency" | "platform";
  status: "published" | "draft" | "archived";
  builtIn: boolean;
  editable?: boolean;
  usedCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  sourceCaseId: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface SupportGap {
  id: string;
  caseId: string;
  caseNumber: string;
  question: string;
  reason: string;
  agencyId: string | null;
  createdAt: string | null;
}

export interface SupportQueue {
  cases: SupportCase[];
  counts: Record<"all" | "ai" | "waiting" | "pending_user" | "resolved" | "mine" | "unassigned" | "urgent" | "overdue", number>;
  categories: string[];
  team: { uid: string; name: string; role: string }[];
}

export interface SupportQueueQuery {
  desk: SupportDesk;
  status?: "open" | "all" | SupportStatus;
  assignee?: "me" | "unassigned" | "all";
  priority?: SupportPriority;
  category?: string;
  agencyId?: string;
  overdue?: boolean;
  search?: string;
}

export interface SupportReport {
  days: number;
  total: number;
  open: number;
  resolved: number;
  resolvedByAi: number;
  escalated: number;
  overdue: number;
  urgent: number;
  aiResolutionRate: number;
  medianFirstResponseMinutes: number | null;
  averageRating: number | null;
  ratingCount: number;
  byCategory: { category: string; count: number }[];
  byAgency: { agency: string; count: number }[];
  topArticles: { id: string; title: string; usedCount: number; helpfulCount: number; notHelpfulCount: number }[];
  openGaps: number;
}

export interface CreateCaseInput {
  content: string;
  subject?: string;
  category?: string | null;
  priority?: "normal" | "high";
  urgent?: boolean;
  /** Field staff only: "corporate" asks CareOnboard support directly. Normally the assistant decides. */
  desk?: SupportDesk;
  context?: { page?: string; label?: string } | null;
}

export type ArticleInput = Partial<Pick<SupportArticle, "title" | "body" | "category" | "tags" | "audience" | "status" | "sourceCaseId">>;

const data = <T,>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

// ----- Requester -----
export const listMyCases = () => data<SupportCase[]>(axiosClient.get(`${BASE}/cases/mine`));
export const createSupportCase = (input: CreateCaseInput) => data<SupportCaseDetail>(axiosClient.post(`${BASE}/cases`, input));
export const getMyCase = (id: string) => data<SupportCaseDetail>(axiosClient.get(`${BASE}/cases/${id}`));
export const sendCaseMessage = (id: string, content: string) => data<SupportCaseDetail>(axiosClient.post(`${BASE}/cases/${id}/messages`, { content }));
export const sendCaseFeedback = (id: string, messageId: string, helpful: boolean) =>
  data<SupportCaseDetail>(axiosClient.post(`${BASE}/cases/${id}/feedback`, { messageId, helpful }));
export const askForPerson = (id: string) => data<SupportCaseDetail>(axiosClient.post(`${BASE}/cases/${id}/escalate`));
export const closeMyCase = (id: string) => data<SupportCaseDetail>(axiosClient.post(`${BASE}/cases/${id}/close`));
export const rateCase = (id: string, rating: number, comment?: string) =>
  data<SupportCaseDetail>(axiosClient.post(`${BASE}/cases/${id}/rating`, { rating, comment }));

// ----- Agent -----
export const getSupportQueue = (query: SupportQueueQuery) => data<SupportQueue>(axiosClient.get(`${BASE}/queue`, { params: query }));
export const getAgentCase = (id: string) => data<SupportCaseDetail>(axiosClient.get(`${BASE}/queue/${id}`));
export const replyToCase = (id: string, content: string, internal = false) =>
  data<SupportCaseDetail>(axiosClient.post(`${BASE}/queue/${id}/reply`, { content, internal }));
export const updateCase = (
  id: string,
  patch: Partial<{ priority: SupportPriority; category: string | null; assigneeId: string | null; status: "resolved" | "waiting"; linkedIssue: { url: string; label?: string } | null }>,
) => data<SupportCaseDetail>(axiosClient.patch(`${BASE}/queue/${id}`, patch));
/** Pass an agency case to CareOnboard support. It leaves the agency's queue. */
export const transferCaseToCareOnboard = (id: string, note?: string) =>
  data<{ id: string; desk: SupportDesk }>(axiosClient.post(`${BASE}/queue/${id}/transfer`, { note }));
export const getSuggestedReply = (id: string) =>
  data<{ reply: string | null; articles: { id: string; title: string; used: boolean }[] }>(axiosClient.get(`${BASE}/queue/${id}/suggestion`));

export const getSupportSettings = (desk: SupportDesk) => data<SupportSettings>(axiosClient.get(`${BASE}/settings`, { params: { desk } }));
export const saveSupportSettings = (desk: SupportDesk, input: Partial<Omit<SupportSettings, "desk" | "canManage" | "team">> & { team?: Pick<SupportTeamMember, "uid" | "role" | "categories" | "receivesUrgent" | "active">[] }) =>
  data<SupportSettings>(axiosClient.put(`${BASE}/settings`, input, { params: { desk } }));
export const getEligibleMembers = (desk: SupportDesk) => data<EligibleMember[]>(axiosClient.get(`${BASE}/team/eligible`, { params: { desk } }));

export const listSupportArticles = (desk: SupportDesk) => data<SupportArticle[]>(axiosClient.get(`${BASE}/articles`, { params: { desk } }));
export const createSupportArticle = (desk: SupportDesk, input: ArticleInput) => data<SupportArticle>(axiosClient.post(`${BASE}/articles`, input, { params: { desk } }));
export const updateSupportArticle = (desk: SupportDesk, id: string, input: ArticleInput) =>
  data<SupportArticle>(axiosClient.patch(`${BASE}/articles/${id}`, input, { params: { desk } }));
export const archiveSupportArticle = (desk: SupportDesk, id: string) => data<SupportArticle>(axiosClient.delete(`${BASE}/articles/${id}`, { params: { desk } }));

/** Largest file the knowledge base takes, in bytes. */
export const MAX_SUPPORT_FILE_BYTES = 10 * 1024 * 1024;
/** Files the assistant can read. */
export const DOCUMENT_ACCEPT = ".pdf,.docx,.txt,.md";
/** Files an article can offer for download. */
export const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg";
export const MAX_ARTICLE_ATTACHMENTS = 5;

export type DocumentFields = Partial<Pick<SupportArticle, "title" | "audience" | "category" | "status">>;

const fileForm = (file: File, fields: Record<string, string | null | undefined> = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value);
  form.append("file", file);
  return form;
};
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export const uploadSupportDocument = (desk: SupportDesk, file: File, fields: DocumentFields) =>
  data<SupportArticle>(axiosClient.post(`${BASE}/documents`, fileForm(file, { title: fields.title, audience: fields.audience, category: fields.category, status: fields.status }), { ...multipart, params: { desk } }));
export const replaceSupportDocumentFile = (desk: SupportDesk, id: string, file: File) =>
  data<SupportArticle>(axiosClient.put(`${BASE}/documents/${id}/file`, fileForm(file), { ...multipart, params: { desk } }));
export const reindexSupportDocument = (desk: SupportDesk, id: string) =>
  data<SupportArticle>(axiosClient.post(`${BASE}/documents/${id}/reindex`, null, { params: { desk } }));
export const deleteSupportDocument = (desk: SupportDesk, id: string) =>
  data<{ id: string; deleted: boolean }>(axiosClient.delete(`${BASE}/documents/${id}`, { params: { desk } }));
export const addArticleAttachment = (desk: SupportDesk, id: string, file: File) =>
  data<SupportArticle>(axiosClient.post(`${BASE}/articles/${id}/attachments`, fileForm(file), { ...multipart, params: { desk } }));
export const removeArticleAttachment = (desk: SupportDesk, id: string, attachmentId: string) =>
  data<SupportArticle>(axiosClient.delete(`${BASE}/articles/${id}/attachments/${attachmentId}`, { params: { desk } }));

/**
 * Open a document's file, or an article attachment, in a new tab (PDFs, text and images)
 * or as a download. The file comes through the API so access is checked every time.
 * The tab is opened before the request so popup blockers allow it; if it was blocked,
 * the file downloads instead.
 */
export async function openSupportFile(articleId: string, fileName: string, attachmentId?: string): Promise<void> {
  const viewable = /\.(pdf|txt|png|jpe?g)$/i.test(fileName);
  const tab = viewable ? window.open("", "_blank") : null;
  try {
    const response = await axiosClient.get<Blob>(`${BASE}/files/${articleId}`, {
      params: attachmentId ? { attachment: attachmentId } : undefined,
      responseType: "blob",
    });
    const blob = response.data;
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export const listSupportGaps = (desk: SupportDesk) => data<SupportGap[]>(axiosClient.get(`${BASE}/gaps`, { params: { desk } }));
export const dismissSupportGap = (desk: SupportDesk, id: string) => data<unknown>(axiosClient.post(`${BASE}/gaps/${id}/dismiss`, null, { params: { desk } }));
export const getSupportReport = (desk: SupportDesk, days = 30) => data<SupportReport>(axiosClient.get(`${BASE}/reports`, { params: { desk, days } }));

/** The API's message for a failed request, or a fallback. */
export function supportErrorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  const response = (error as { response?: { data?: { message?: string; error?: string } } })?.response;
  return response?.data?.message || response?.data?.error || fallback;
}
export const supportErrorCode = (error: unknown): string | undefined =>
  (error as { response?: { data?: { code?: string } } })?.response?.data?.code;

export const STATUS_LABELS: Record<SupportStatus, string> = {
  ai: "Assistant answering",
  waiting: "Waiting on support",
  pending_user: "Waiting on you",
  resolved: "Resolved",
};
export const AGENT_STATUS_LABELS: Record<SupportStatus, string> = {
  ai: "With assistant",
  waiting: "Needs reply",
  pending_user: "Waiting on person",
  resolved: "Resolved",
};
