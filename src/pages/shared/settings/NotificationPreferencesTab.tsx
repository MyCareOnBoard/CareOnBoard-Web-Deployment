import { useCallback, useEffect, useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { NOTIFICATION_TOGGLE_ROWS } from "./notificationPreferences.config";

type LoadState = "loading" | "error" | "ready";

export default function NotificationPreferencesTab() {
  const { toast } = useToast();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
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

  const loadSettings = useCallback(async () => {
    setLoadState("loading");
    setLoadError("");
    try {
      const data = await getNotificationSettings();
      setSettings(data);
      setInitialSettings(data);
      setLoadState("ready");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to load notification settings.";
      setLoadError(message);
      setLoadState("error");
      toast({
        title: "Couldn't load settings",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

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

  if (loadState === "loading") {
    return <SettingsTabSkeleton variant="form" cardCount={1} />;
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-col gap-4">
        <div className={settingsAlertErrorClass}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadSettings()}>
          Retry
        </Button>
      </div>
    );
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
          {NOTIFICATION_TOGGLE_ROWS.map((row) => (
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
