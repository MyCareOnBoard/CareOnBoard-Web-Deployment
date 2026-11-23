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
  aiMeta: { articleIds?: string[]; sources?: { id: string; title: string }[]; confidence?: number } | null;
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

export interface SupportArticle {
  id: string;
  title: string;
  body: string;
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
