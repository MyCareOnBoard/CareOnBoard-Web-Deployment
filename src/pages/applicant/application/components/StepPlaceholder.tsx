import { Button } from "@/components/ui/button";

interface StepPlaceholderProps {
  title: string;
  description: string;
  bulletPoints?: string[];
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
}

export default function StepPlaceholder({
  title,
  description,
  bulletPoints,
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Mark Step Complete",
}: StepPlaceholderProps) {
  return (
    <section className="space-y-6 rounded-[24px] border border-dashed border-[#00b4b8]/40 bg-[#f6ffff] p-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-[#10141a]">{title}</h2>
        <p className="max-w-[620px] text-sm leading-[1.6] text-[#4a5056]">{description}</p>
      </header>

      {bulletPoints && bulletPoints.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-[1.6] text-[#10141a]">
          {bulletPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            {backLabel}
          </Button>
        ) : null}
        {onNext ? (
          <Button type="button" onClick={onNext}>
            {nextLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

