import {Send, Sparkles} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import type {MetricKey, QualityMetric} from "../types";
import {StatCard} from "./StatCard";

export function GlobalNotesAiView({
  metrics,
  selectedMetric,
  onSelectMetric,
  suggestionPrompts,
  aiPrompt,
  onAiPromptChange,
  canSend,
  onAskAi,
}: {
  metrics: QualityMetric[];
  selectedMetric: MetricKey;
  onSelectMetric: (metric: MetricKey) => void;
  suggestionPrompts: string[];
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  canSend: boolean;
  onAskAi: (promptOverride?: string) => void;
}) {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <StatCard
            key={metric.key}
            metric={metric}
            selected={metric.key === selectedMetric}
            onSelect={() => onSelectMetric(metric.key)}
          />
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center text-center">
        <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-transparent">
          <Sparkles fill="black" className="size-5 text-black" />
        </div>
        <div className="text-base font-semibold text-foreground">Ask Care AI anything</div>

        <div className="mt-8 w-full max-w-[880px]">
          <div className="text-left text-xs text-muted-foreground">Suggestions on what to ask Our AI</div>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            {suggestionPrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                className="h-11 justify-start rounded-xl border-none bg-[#f7fafa] font-normal"
                onClick={() => onAskAi(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>

          <div className="mt-4 flex w-[55%] items-center rounded-full mx-auto">
            <Input
              className="w-full rounded-full border-none bg-[#f7fafa] p-7 focus:ring-[#00b4b8]"
              value={aiPrompt}
              onChange={(e) => onAiPromptChange(e.target.value)}
              placeholder="Ask Care AI"
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0 -ml-13"
              disabled={!canSend}
              onClick={() => onAskAi()}
              aria-label="Send"
            >
              <Send className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
