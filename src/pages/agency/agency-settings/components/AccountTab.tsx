import { useEffect, useState, useCallback, ChangeEvent } from "react";
import { getAccountInfo, updateAccountInfo } from "@/lib/api/settings";
import { deleteAccount } from "@/lib/api/profile";
import { useForm, useFormState } from "react-hook-form";
import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import SettingsTabActions from "./SettingsTabActions";
import SettingsSectionCard from "./SettingsSectionCard";
import SettingsFormFieldRow from "./SettingsFormFieldRow";
import SettingsTabSkeleton from "./SettingsTabSkeleton";
import { getAuth } from "firebase/auth";
import { Trash2, User, AlertCircle, MapPin } from "lucide-react";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  settingsActionBtnClass,
  settingsAlertErrorClass,
  settingsCardShellClass,
} from "./settingsCardStyles";

const LOCATION_STORAGE_KEY = "user_location_access";

type LocationStatus = {
  message: string;
  tone: "success" | "error" | "info";
};

interface AccountFormValues {
  fullName: string;
  email: string;
}

export default function AccountTab() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<{ email: string; fullName: string } | null>(null);
  const [initialFullName, setInitialFullName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationPending, setLocationPending] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus | null>(null);

  const form = useForm<AccountFormValues>({
    mode: "onChange",
    defaultValues: { fullName: "", email: "" },
  });

  const { isDirty } = useFormState({ control: form.control });
  const hasChanges = isDirty || !!imageFile;

  useEffect(() => {
    let cancelled = false;

    async function syncLocationPermission() {
      if (typeof navigator === "undefined") return;

      if (!navigator.permissions?.query) {
        const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (stored === "granted") setLocationEnabled(true);
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        if (cancelled) return;

        if (result.state === "granted") {
          setLocationEnabled(true);
          localStorage.setItem(LOCATION_STORAGE_KEY, "granted");
        } else if (result.state === "denied") {
          setLocationEnabled(false);
          localStorage.setItem(LOCATION_STORAGE_KEY, "off");
        } else {
          setLocationEnabled(false);
        }

        result.onchange = () => {
          if (result.state === "granted") {
            setLocationEnabled(true);
            localStorage.setItem(LOCATION_STORAGE_KEY, "granted");
          } else if (result.state === "denied") {
            setLocationEnabled(false);
            localStorage.setItem(LOCATION_STORAGE_KEY, "off");
          }
        };
      } catch {
        // Permissions API may not support geolocation in this browser
      }
    }

    void syncLocationPermission();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAccountInfo();

      let fullName = data.fullName || "";
      let email = data.email || "";
      const auth = getAuth();
      await auth.authStateReady?.();
      const current = auth.currentUser;

      if (!fullName && current?.displayName) {
        fullName = current.displayName;
      }
      if (!email && current?.email) {
        email = current.email;
      }

      const merged = { email, fullName, profilePicture: data.profilePicture };

      setInfo({ email: merged.email, fullName: merged.fullName });
      setInitialFullName(merged.fullName);

      form.reset({ fullName: merged.fullName, email: merged.email }, { keepDefaultValues: false });

      if (merged.profilePicture) {
        setSelectedImage(merged.profilePicture);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load account info";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    load();
  }, [load]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      setTempImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (data: AccountFormValues) => {
    if (!hasChanges) {
      setError("No changes to save");
      return;
    }

    if (!data.fullName.trim()) {
      setError("Full name is required");
      return;
    }

    const nameChanged = data.fullName.trim() !== initialFullName.trim();
    const imageChanged = !!imageFile;

    setSaving(true);
    setError("");

    try {
      const result = await updateAccountInfo({
        fullName: nameChanged ? data.fullName.trim() : undefined,
        profilePictureFile: imageChanged ? imageFile! : undefined,
      });

      setInfo({ email: result.email, fullName: result.fullName });
      setInitialFullName(result.fullName);

      if (result.profilePicture) {
        setSelectedImage(result.profilePicture);
      }

      setTempImage(null);
      setImageFile(null);

      form.reset({ fullName: result.fullName, email: result.email }, { keepDefaultValues: false });

      toast({
        title: "Account updated",
        description: imageChanged
          ? "Your account information and profile picture have been saved."
          : "Your account information has been saved.",
      });
    } catch (e: unknown) {
      let errorMessage = e instanceof Error ? e.message : "Failed to save changes";

      if (errorMessage.includes("Image upload requires server connection")) {
        errorMessage = "Cannot upload image - server is unavailable. Please try again when connected.";
      } else if (errorMessage.includes("Failed to upload profile picture")) {
        errorMessage = "Profile picture upload failed. Please check the file and try again.";
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setError("");

    try {
      await deleteAccount();
      localStorage.clear();
      sessionStorage.clear();
      navigate(Routes.auth.login, { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete account. Please try again or contact support.",
      );
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
      },
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

  const handleCancel = () => {
    setTempImage(null);
    setImageFile(null);
    setError("");

    if (info) {
      form.reset(
        { fullName: initialFullName, email: info.email },
        { keepDefaultValues: false },
      );
    }
  };

  if (loading) {
    return <SettingsTabSkeleton variant="form" cardCount={2} />;
  }

  const displayImage = tempImage || selectedImage;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className={settingsAlertErrorClass}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col gap-4">
          <SettingsSectionCard
            title="Profile picture"
            subtitle="Upload a photo so your team can recognize you."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#eef0f2] ring-offset-2">
                {displayImage ? (
                  <img src={displayImage} alt="Profile" className="h-14 w-14 object-cover" />
                ) : (
                  <User className="h-6 w-6 text-[#a3a3a4]" />
                )}
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <label
                  className={cn(
                    settingsActionBtnClass,
                    "inline-flex cursor-pointer items-center border border-[#00b4b8] bg-[#00b4b8] px-4 text-white hover:bg-[#00a0a4]",
                  )}
                >
                  {saving ? "Uploading..." : displayImage ? "Change image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload Image"
                    data-testid="profile-image-input"
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
                <p className="text-[13px] text-[#808081]">JPG/PNG, max 2MB</p>
              </div>
            </div>
          </SettingsSectionCard>

          <SettingsSectionCard
            title="Personal information"
            subtitle="Manage your personal details and login email."
          >
            <SettingsFormFieldRow
              title={
                <>
                  Full name <span className="text-red-500">*</span>
                </>
              }
              description="This name will appear in your profile."
            >
              <FormField
                control={form.control}
                name="fullName"
                rules={{ required: "Full name is required" }}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} disabled={saving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsFormFieldRow>

            <SettingsFormFieldRow
              title="Email"
              description="Used for login and receiving notifications."
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        disabled
                        readOnly
                        className="cursor-not-allowed bg-[#fafbfc]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsFormFieldRow>
          </SettingsSectionCard>

          <SettingsSectionCard
            title="Location access"
            subtitle="The device will use GPS in the background."
          >
            <SettingsFormFieldRow
              switchRow
              title={
                <span className="inline-flex items-center gap-2 normal-case">
                  <MapPin className="h-4 w-4 text-[#00b4b8]" />
                  Enable location
                </span>
              }
              description={
                locationStatus ? (
                  <span
                    className={
                      locationStatus.tone === "success"
                        ? "text-emerald-700"
                        : locationStatus.tone === "error"
                          ? "text-red-700"
                          : undefined
                    }
                  >
                    {locationStatus.message}
                  </span>
                ) : (
                  "Allow the app to access your location when needed."
                )
              }
            >
              <Switch
                aria-label="Location access"
                checked={locationEnabled}
                disabled={locationPending}
                onCheckedChange={handleLocationToggle}
              />
            </SettingsFormFieldRow>
          </SettingsSectionCard>

          <section
            className={cn(
              settingsCardShellClass,
              "border-red-200/80 bg-red-50/30",
            )}
          >
            <header className="border-b border-red-100 px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-[17px] font-semibold text-red-600">
                <AlertCircle className="h-5 w-5" />
                Danger zone
              </h2>
              <p className="mt-0.5 text-[13px] text-[#808081]">
                Permanently delete your account and all associated data.
              </p>
            </header>
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <p className="text-[14px] text-[#525253]">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                disabled={deleting}
                className={cn(settingsActionBtnClass, "gap-1.5 bg-[#d93c24] hover:bg-[#c52d16]")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting..." : "Delete account"}
              </Button>
            </div>
          </section>

          <SettingsTabActions hasChanges={hasChanges} saving={saving} onCancel={handleCancel} />
        </form>
      </Form>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
        title="Delete Account?"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
