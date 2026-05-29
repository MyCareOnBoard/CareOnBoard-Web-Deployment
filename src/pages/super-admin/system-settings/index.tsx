import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import NotificationPreferencesTab from "@/pages/shared/settings/NotificationPreferencesTab";
import { getAccountInfo, updateAccountInfo } from "@/lib/api/settings";
import { deleteAccount } from "@/lib/api/profile";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { Loader2, CheckCircle2, AlertCircle, MapPin, User } from "lucide-react";
import { Routes } from "@/routes/constants";

const LOCATION_STORAGE_KEY = "super_admin_location_access";

type LocationStatus = {
  message: string;
  tone: "success" | "error" | "info";
};

type TabKey = "account" | "notification";

export default function SuperAdminSystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("account");

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h1 className="text-[36px] font-bold leading-tight text-[#10141a]">System Settings</h1>
        <p className="text-[#4f4f4f]">Manage personal details, notifications, and location access.</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`rounded-full px-5 py-2 font-medium shadow-sm transition ${
            activeTab === "account"
              ? "bg-[#00b3ad] text-white"
              : "bg-white text-[#4f4f4f] border border-gray-200 hover:border-gray-300"
          }`}
        >
          Account
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notification")}
          className={`rounded-full px-5 py-2 font-medium shadow-sm transition ${
            activeTab === "notification"
              ? "bg-[#00b3ad] text-white"
              : "bg-white text-[#4f4f4f] border border-gray-200 hover:border-gray-300"
          }`}
        >
          Notification
        </button>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm p-5 md:p-7 lg:p-8">
        {activeTab === "account" ? <AccountSettingsPanel /> : <NotificationPanel />}
      </div>
    </div>
  );
}

function AccountSettingsPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profileImage, setProfileImage] = useState("");
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationPending, setLocationPending] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored === "granted") {
      setLocationEnabled(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getAccountInfo();
        if (!mounted) return;
        setFullName(data.fullName || "");
        setInitialName(data.fullName || "");
        setEmail(data.email || "");
        setProfileImage(data.profilePicture || "");
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load account info");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    return fullName.trim() !== initialName.trim() || !!imageFile;
  }, [fullName, initialName, imageFile]);

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!hasChanges) {
      setError("No changes to save");
      return;
    }

    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAccountInfo({
        fullName: fullName.trim() !== initialName.trim() ? fullName.trim() : undefined,
        profilePictureFile: imageFile || undefined,
      });
      setInitialName(updated.fullName);
      setProfileImage(updated.profilePicture || "");
      setTempImage(null);
      setImageFile(null);
      setSuccess("Changes saved successfully");
    } catch (err: any) {
      setError(err?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(initialName);
    setTempImage(null);
    setImageFile(null);
    setError("");
    setSuccess("");
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      localStorage.clear();
      sessionStorage.clear();
      navigate(Routes.auth.login, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image must be under 2MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Only JPG and PNG images are supported");
        return;
      }
      setError("");
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setTempImage(preview);
      };
      reader.readAsDataURL(file);
    }
  };

  const displayImage = tempImage || profileImage;

  const requestLocation = () => {
    setLocationStatus({ message: "Requesting location access...", tone: "info" });
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationEnabled(false);
      setLocationStatus({ message: "Geolocation is not supported in this browser.", tone: "error" });
      return;
    }

    setLocationPending(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPending(false);
        setLocationEnabled(true);
        localStorage.setItem(LOCATION_STORAGE_KEY, "granted");
        setLocationStatus({ message: "Location access enabled.", tone: "success" });
      },
      (err) => {
        setLocationPending(false);
        setLocationEnabled(false);
        localStorage.setItem(LOCATION_STORAGE_KEY, "off");
        setLocationStatus({ message: err?.message || "Location permission denied.", tone: "error" });
      }
    );
  };

  const handleLocationToggle = (next: boolean) => {
    if (next) {
      requestLocation();
      return;
    }
    setLocationEnabled(false);
    localStorage.setItem(LOCATION_STORAGE_KEY, "off");
    setLocationStatus({ message: "Location access disabled.", tone: "info" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white border rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00b3ad]" />
          <p className="text-sm text-gray-600">Loading account information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 p-3 text-sm text-red-700 border border-red-200 rounded-xl bg-red-50">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 text-sm border text-emerald-700 rounded-xl bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <section className="space-y-1">
        <h2 className="text-[22px] font-semibold text-[#10141a]">Account Info</h2>
        <p className="text-sm text-[#4f4f4f]">Manage your personal details and secure your login credentials.</p>
      </section>

      <div className="grid gap-6 py-4 border-t border-gray-200 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-[#10141a]">Profile Picture</h3>
          <p className="text-sm text-[#4f4f4f]">Upload a photo so your team can recognize you.</p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {displayImage ? (
            <img
              src={displayImage}
              alt="Profile"
              className="object-cover rounded-full w-14 h-14 ring-2 ring-offset-2 ring-gray-200"
            />
          ) : (
            <div className="flex items-center justify-center bg-gray-100 border border-gray-200 rounded-full w-14 h-14 ring-2 ring-offset-2 ring-gray-300">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center">
            <label className="bg-[#00b3ad] hover:bg-[#00a39f] text-white font-medium px-5 py-2 rounded-full transition cursor-pointer disabled:opacity-60">
              {saving ? "Uploading..." : displayImage ? "Change Image" : "Upload Image"}
              <input
                type="file"
                accept="image/*"
                aria-label="Upload Image"
                onChange={handleImageChange}
                className="hidden"
                disabled={saving}
              />
            </label>
            {tempImage && (
              <button
                type="button"
                onClick={() => {
                  setTempImage(null);
                  setImageFile(null);
                }}
                disabled={saving}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
            <p className="text-sm text-[#4f4f4f]">JPG/PNG, max 2MB</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 py-4 border-t border-gray-200 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-[#10141a]">Full Name</h3>
          <p className="text-sm text-[#4f4f4f]">This name will appear in your profile.</p>
        </div>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter full name"
          disabled={saving}
          className="bg-white"
        />
      </div>

      <div className="grid gap-6 py-4 border-t border-gray-200 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-[#10141a]">Email</h3>
          <p className="text-sm text-[#4f4f4f]">Used for login and receiving notifications.</p>
        </div>
        <Input value={email} disabled readOnly className="text-gray-600 bg-gray-100" />
      </div>

      <div className="grid gap-6 py-4 border-t border-gray-200 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-[#10141a]">
            <MapPin className="w-5 h-5 text-[#00b3ad]" />
            <span>Location Access</span>
          </div>
          <p className="text-sm text-[#4f4f4f]">The device will use GPS in the background</p>
          {locationStatus && (
            <p className={`mt-2 text-sm ${
              locationStatus.tone === "success"
                ? "text-emerald-700"
                : locationStatus.tone === "error"
                ? "text-red-700"
                : "text-[#4f4f4f]"
            }`}>
              {locationStatus.message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end">
          <Switch
            aria-label="Location access"
            checked={locationEnabled}
            disabled={locationPending}
            onCheckedChange={handleLocationToggle}
          />
        </div>
      </div>

      <div className="grid gap-6 px-6 pt-6 pb-6 -mx-6 border-t-2 border-red-200 bg-red-50/40 lg:grid-cols-2 rounded-2xl">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-red-700">
            <AlertCircle className="w-5 h-5" />
            Delete My Account
          </h3>
          <p className="text-sm text-[#4f4f4f] mt-2">Permanently delete the account.</p>
        </div>
        <div className="flex items-start justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-2 rounded-full bg-[#d93c24] hover:bg-[#c52d16]"
          >
            {deleting ? "Deleting..." : "Delete Account"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col justify-end gap-3 pt-6 border-t border-gray-200 lg:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={saving || !hasChanges}
          className="rounded-full border-[#00b3ad] text-[#00b3ad] hover:bg-[#00b3ad]/10"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="rounded-full bg-[#00b3ad] text-white hover:bg-[#00a39f] disabled:opacity-60"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
        title="Delete Account?"
        message="Are you sure you want to permanently delete your account? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

function NotificationPanel() {
  return (
    <div className="space-y-4">
      <NotificationPreferencesTab />
    </div>
  );
}
