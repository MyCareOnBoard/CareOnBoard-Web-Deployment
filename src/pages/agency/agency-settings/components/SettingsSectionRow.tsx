import { ReactNode } from "react";

interface SettingsSectionRowProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SettingsSectionRow({
  title,
  description,
  children,
  className = "",
}: SettingsSectionRowProps) {
  return (
    <div className={`grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2 ${className}`}>
      <div>
        <h2 className="font-semibold text-lg text-[#10141a]">{title}</h2>
        {description ? <p className="text-sm text-[#4f4f4f]">{description}</p> : null}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
