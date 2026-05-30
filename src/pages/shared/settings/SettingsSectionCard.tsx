import { memo, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  settingsCardBodyClass,
  settingsCardHeaderClass,
  settingsCardShellClass,
  settingsCardSubtitleClass,
  settingsCardTitleClass,
} from "./settingsCardStyles";

export type SettingsSectionCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export const SettingsSectionCard = memo(function SettingsSectionCard({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
}: SettingsSectionCardProps) {
  return (
    <section className={cn(settingsCardShellClass, className)}>
      <header className={settingsCardHeaderClass}>
        <h2 className={settingsCardTitleClass}>{title}</h2>
        {subtitle ? <p className={settingsCardSubtitleClass}>{subtitle}</p> : null}
      </header>
      <div className={cn(settingsCardBodyClass, bodyClassName)}>{children}</div>
    </section>
  );
});

export default SettingsSectionCard;
