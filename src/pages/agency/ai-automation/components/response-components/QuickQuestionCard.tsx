import { useState } from "react";

interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  message?: string;
}

interface QuickQuestionData {
  question: string;
  options: QuestionOption[];
  onSelectOption?: (optionId: string) => void;
  helpText?: string;
}

export default function QuickQuestionCard({
  data,
  onSendMessage,
}: {
  data: unknown;
  onSendMessage?: (text: string) => void;
}) {
  const cardData = data as QuickQuestionData;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelect = (option: QuestionOption) => {
    setSelectedOption(option.id);
    if (option.message && onSendMessage) {
      onSendMessage(option.message);
    } else {
      cardData.onSelectOption?.(option.id);
    }
  };

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Header with question */}
      <div className="px-4 py-3.5 border-b border-[#e5e7eb] bg-white">
        <p className="text-[13px] font-semibold text-[#10141a]">{cardData.question}</p>
        {cardData.helpText && (
          <p className="text-[12px] text-[#6b7280] mt-1">{cardData.helpText}</p>
        )}
      </div>

      {/* Options */}
      <div className="divide-y divide-[#f3f4f6]">
        {cardData.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option)}
            className="w-full px-4 py-3 hover:bg-[#f9fafb] transition text-left flex items-start gap-3"
          >
            {/* Radio button */}
            <div className="mt-1">
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
                  selectedOption === option.id
                    ? "border-[#00b4b8] bg-[#e0f7f7]"
                    : "border-[#d1d5db] hover:border-[#9ca3af]"
                }`}
              >
                {selectedOption === option.id && (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#00b4b8]" />
                )}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 text-left">
              <p className="text-[13px] font-medium text-[#10141a]">{option.label}</p>
              {option.description && (
                <p className="text-[12px] text-[#6b7280] mt-0.5">{option.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
