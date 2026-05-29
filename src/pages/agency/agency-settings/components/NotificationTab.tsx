import { useEffect, useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  getNotificationSettings,
  updateNotificationSettings,
  NotificationSettings,
} from "@/lib/api/settings";
import SettingsTabActions from "./SettingsTabActions";
import SettingsSectionCard from "./SettingsSectionCard";
import SettingsFormFieldRow from "./SettingsFormFieldRow";
import SettingsTabSkeleton from "./SettingsTabSkeleton";
import { useToast } from "@/hooks/use-toast";
import { settingsAlertErrorClass } from "./settingsCardStyles";

const TOGGLE_ROWS: {
  key: keyof NotificationSettings;
  title: string;
  description: string;
}[] = [
  {
    key: "emailNotifications",
    title: "Email notifications",
    description: "Stay informed via email about important activities and updates.",
  },
  {
    key: "inAppNotifications",
    title: "In-app notifications",
    description: "Instant alerts within the app to help you stay on top of things.",
  },
  {
    key: "appointmentChanges",
    title: "Appointment changes",
    description: "Be alerted if an appointment is updated or canceled.",
  },
  {
    key: "systemWarnings",
    title: "System warnings",
    description: "Important system-related alerts that may need your attention.",
  },
];

export default function NotificationsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    inAppNotifications: true,
    appointmentChanges: false,
    systemWarnings: false,
  });

  const [initialSettings, setInitialSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    inAppNotifications: true,
    appointmentChanges: false,
    systemWarnings: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getNotificationSettings();
        if (!mounted) return;
        setSettings(data);
        setInitialSettings(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    return (
      settings.emailNotifications !== initialSettings.emailNotifications ||
      settings.inAppNotifications !== initialSettings.inAppNotifications ||
      settings.appointmentChanges !== initialSettings.appointmentChanges ||
      settings.systemWarnings !== initialSettings.systemWarnings
    );
  }, [settings, initialSettings]);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await updateNotificationSettings(settings);
      setSettings(result);
      setInitialSettings(result);
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save notification settings.";
      setError(message);
      toast({
        title: "Couldn't save settings",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setSettings(initialSettings);
    setError("");
  };

  if (loading) {
    return <SettingsTabSkeleton variant="form" cardCount={1} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className={settingsAlertErrorClass}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <SettingsSectionCard
          title="Notification preferences"
          subtitle="Choose how you want to receive updates and alerts."
        >
          {TOGGLE_ROWS.map((row) => (
            <SettingsFormFieldRow
              key={row.key}
              title={row.title}
              description={row.description}
              switchRow
            >
              <Switch
                checked={settings[row.key]}
                onCheckedChange={() => handleToggle(row.key)}
                disabled={saving}
              />
            </SettingsFormFieldRow>
          ))}

          <SettingsTabActions
            hasChanges={hasChanges}
            saving={saving}
            onCancel={handleCancel}
            className="mt-2 border-t-0 pt-2"
          />
        </SettingsSectionCard>
      </form>
    </div>
  );
}
