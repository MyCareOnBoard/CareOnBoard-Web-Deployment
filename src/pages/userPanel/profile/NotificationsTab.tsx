import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { getNotificationSettings, updateNotificationSettings, type NotificationSettings } from "@/lib/api/settings";
import { NOTIFICATION_TOGGLE_ROWS } from "@/pages/shared/settings/notificationPreferences.config";

export function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    let live = true;
    // Never throws: falls back to the saved copy or the defaults.
    void getNotificationSettings().then((data) => { if (live) setSettings(data); });
    return () => { live = false; };
  }, []);

  // Each switch saves on its own, as in the design (no Save button).
  // Quick taps can overlap, so only the newest answer is kept.
  const toggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    const request = ++latest.current;
    const saved = await updateNotificationSettings(next);
    if (request === latest.current) setSettings(saved);
  };

  return <section aria-labelledby="notification-heading" className="flex max-w-[760px] flex-col">
    <h2 id="notification-heading" className="text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Notifications</h2>
    <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Choose how you hear about shifts, changes and alerts.</p>
    <ul className="mt-3">
      {NOTIFICATION_TOGGLE_ROWS.map((row) => <li key={row.key} className="flex items-center justify-between gap-4 border-b border-[#edf1f2] py-4 last:border-b-0 dark:border-white/10">
        <div className="min-w-0">
          <p id={`notify-${row.key}`} className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{row.title}</p>
          <p id={`notify-${row.key}-hint`} className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{row.description}</p>
        </div>
        {settings ? <Switch checked={settings[row.key]} onCheckedChange={(value) => void toggle(row.key, value)}
          aria-labelledby={`notify-${row.key}`} aria-describedby={`notify-${row.key}-hint`}
          className="data-[state=checked]:bg-[#20a35c] dark:data-[state=unchecked]:bg-white/20" />
          : <Skeleton className="h-6 w-11 rounded-full motion-reduce:animate-none" />}
      </li>)}
    </ul>
  </section>;
}
