import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import SuccessModal from "./SuccessModal";
import {
  getNotificationSettings,
  updateNotificationSettings,
  NotificationSettings,
} from "@/lib/api/settings";

interface NotificationTabProps {
  onSave: () => void;
}

export default function NotificationTab({ onSave }: NotificationTabProps) {
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [apptChanges, setApptChanges] = useState(false);
  const [sysWarnings, setSysWarnings] = useState(false);

  const [initial, setInitial] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const prefs = await getNotificationSettings();
        setEmailNotif(prefs.emailNotifications);
        setInAppNotif(prefs.inAppNotifications);
        setApptChanges(prefs.appointmentChanges);
        setSysWarnings(prefs.systemWarnings);
        setInitial(prefs);
      } catch (e: any) {
        setError(e.message || "Failed to load notification settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggles = [
    {
      label: "Email Notifications",
      desc: "Stay informed via email about important activities and updates.",
      state: emailNotif,
      setter: setEmailNotif,
    },
    {
      label: "In-App Notifications",
      desc: "Instant alerts within the app to help you stay on top of things.",
      state: inAppNotif,
      setter: setInAppNotif,
    },
    {
      label: "Appointment Changes",
      desc: "Be alerted if an appointment is updated or cancelled.",
      state: apptChanges,
      setter: setApptChanges,
    },
    {
      label: "System Warnings",
      desc: "Important system-related alerts that may need your attention.",
      state: sysWarnings,
      setter: setSysWarnings,
    },
  ];

  const hasChanges =
    initial &&
    (emailNotif !== initial.emailNotifications ||
      inAppNotif !== initial.inAppNotifications ||
      apptChanges !== initial.appointmentChanges ||
      sysWarnings !== initial.systemWarnings);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const prefs: NotificationSettings = {
        emailNotifications: emailNotif,
        inAppNotifications: inAppNotif,
        appointmentChanges: apptChanges,
        systemWarnings: sysWarnings,
      };
      await updateNotificationSettings(prefs);
      setInitial(prefs);
      onSave();
      setShowModal(true);
    } catch (e: any) {
      setError(e.message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!initial) return;
    setEmailNotif(initial.emailNotifications);
    setInAppNotif(initial.inAppNotifications);
    setApptChanges(initial.appointmentChanges);
    setSysWarnings(initial.systemWarnings);
    setError("");
  };

  if (loading)
    return (
      <p className="text-sm text-gray-500">
        Loading notification settings...
      </p>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-[#E5E5E6] pb-4">
        <h2 role="heading" aria-level={2} className="text-lg font-semibold">
          Notification
        </h2>
        <p className="text-sm text-gray-500">
          Control how and when you receive updates from the platform.
        </p>
      </div>

      {/* Error Message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Notification Toggles */}
      {toggles.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-[#E5E5E6] pb-4"
        >
          <div>
            <p className="font-semibold">{item.label}</p>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={item.state}
              onChange={() => item.setter(!item.state)}
              className="sr-only"
              aria-checked={item.state}
              disabled={saving}
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                item.state ? "bg-[#00B4B8]" : "bg-gray-300"
              } ${saving ? "opacity-50" : ""}`}
            >
              <div
                className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                  item.state ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </label>
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          className="border-[#00b3ad] text-[#00b3ad] hover:bg-[#00b3ad]/10 rounded-full px-8 py-2"
          onClick={handleCancel}
          disabled={saving || !hasChanges}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="px-6 py-2 bg-[#00b3ad] text-white font-medium rounded-full hover:bg-[#00a39f] transition"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isVisible={showModal}
        onClose={() => setShowModal(false)}
        title="Notification Preferences Updated"
        message="Your notification settings have been successfully saved."
      />
    </div>
  );
}
