import { DSPSuggestion } from "./api";

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  actions?: Array<{ type: string; outcome: string }>;
  suggestions?: DSPSuggestion[];
}
