import { ArrowLeft, Building2, Home } from "lucide-react";
import type { ClientType } from "../types/formData";

type ClientTypePickerProps = {
  pageTitle: string;
  onSelect: (type: ClientType) => void;
  onBack?: () => void;
};

export function ClientTypePicker({ pageTitle, onSelect, onBack }: ClientTypePickerProps) {
  const options: Array<{
    type: ClientType;
    title: string;
    description: string;
    icon: typeof Building2;
  }> = [
    {
      type: "ddd",
      title: "DDD client",
      description: "Use ISP, PCPT, SDR, outcomes, and DDD service authorizations.",
      icon: Building2,
    },
    {
      type: "hha",
      title: "HHA client",
      description: "Use referral, insurance, physician, ADL assessment, and HHA authorizations.",
      icon: Home,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10 flex items-center gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-[rgba(255,255,255,0.7)]"
          >
            <ArrowLeft className="h-5 w-5 text-[#10141a]" />
          </button>
        ) : null}
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.3] text-[#10141a] md:text-[40px]">
            {pageTitle}
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-[1.4] text-[#808081]">
            Choose the client program before entering onboarding details.
          </p>
        </div>
      </div>

      <div className="grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelect(option.type)}
              className="flex min-h-[220px] cursor-pointer flex-col items-start rounded-[24px] border border-[#e5e5e6] bg-white/70 p-6 text-left shadow-sm transition hover:border-[#00b4b8] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 active:border-[#00b4b8] active:bg-white"
            >
              <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#e6fafa] text-[#00b4b8]">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[22px] font-semibold text-[#10141a]">{option.title}</span>
              <span className="mt-3 text-[14px] font-medium leading-[1.5] text-[#808081]">
                {option.description}
              </span>
              <span className="mt-auto inline-flex h-11 cursor-pointer items-center justify-center rounded-[60px] bg-[#00b4b8] px-6 text-[14px] font-semibold text-white">
                Start {option.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
