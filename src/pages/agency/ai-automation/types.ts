import { DSPSuggestion } from "./api";

export interface Attachment {
  type: "image" | "file";
  url: string;
  name: string;
  fileSize?: number;
  fileType?: string;
}

export interface ResponseComponent {
  type: string;
  data: unknown;
  /** Paging totals for list cards whose data is a bare array (shift-list, task-list). */
  meta?: unknown;
}

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  actions?: Array<{ type: string; outcome: string }>;
  suggestions?: DSPSuggestion[];
  attachments?: Attachment[];
  components?: ResponseComponent[];
}
