import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { format } from "date-fns";
import { useDispatch } from "react-redux";
import { updateProfile } from "firebase/auth";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { getProfileInfo, updateProfileInfo, type ProfileInfo } from "@/lib/api/profile";
import { updateAccountInfo } from "@/lib/api/settings";
import { useAuth } from "@/utils/auth";
import { setUser, updateUserProfile } from "@/utils/auth/store/authSlice";
import type { AppDispatch } from "@/store/redux/store";
import { FIELD, LABEL, TEXTAREA } from "@/pages/userPanel/records/RecordsKit";
import { removeProfilePicture } from "./profileApi";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const SMALL_PRIMARY = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#00494a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#19b5b8]";
export const SMALL_SECONDARY = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#e3e8ea] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";

type Gender = "" | "Male" | "Female";
interface Details { fullName: string; phone: string; dateOfBirth: string; street: string; city: string; state: string; zipCode: string; gender: Gender; summary: string }
interface Saved extends Details { email: string; photo: string; address: ProfileInfo["address"] }
type PhotoAction = "upload" | "remove" | null;

const SUMMARY_MAX = 500;
const EMPTY: Saved = { fullName: "", email: "", phone: "", photo: "", dateOfBirth: "", street: "", address: "", city: "", state: "", zipCode: "", gender: "", summary: "" };
const DETAIL_KEYS: (keyof Details)[] = ["fullName", "phone", "dateOfBirth", "street", "city", "state", "zipCode", "gender", "summary"];
const todayIso = () => format(new Date(), "yyyy-MM-dd");

const errorText = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;
const trimDetails = (form: Details): Details => ({ ...form, ...Object.fromEntries(DETAIL_KEYS.map((key) => [key, form[key].trim()])) } as Details);

export function PersonalInfoTab() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [form, setForm] = useState<Details>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [saving, setSaving] = useState(false);
  const [photoAction, setPhotoAction] = useState<PhotoAction>(null);
  const [photoBroken, setPhotoBroken] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [data] = await Promise.all([getProfileInfo(), auth.authStateReady?.()]);
      const current = auth.currentUser;
      const next: Saved = {
        fullName: data.fullName || current?.displayName || "",
        email: data.email || current?.email || "",
        phone: data.phone || "",
        photo: data.profilePicture || current?.photoURL || "",
        dateOfBirth: data.dateOfBirth || "",
        address: data.address || "",
        street: (typeof data.address === "object" ? data.address?.address : data.address) || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        gender: data.gender === "Male" || data.gender === "Female" ? data.gender : "",
        summary: data.summary || "",
      };
      setSaved(next);
      setForm(next);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPhotoBroken(false); }, [saved.photo]);

  // Keep the header avatar and name in step with what was saved.
  const syncUser = (patch: { fullName?: string; photoURL?: string }) => {
    if (user) dispatch(setUser({ ...user, ...patch }));
    dispatch(updateUserProfile({ ...(patch.fullName !== undefined && { fullName: patch.fullName }), ...(patch.photoURL !== undefined && { profilePicture: patch.photoURL }) }));
  };

  const pickPhoto = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image file (JPG or PNG)."); return; }
    if (file.size > MAX_PHOTO_BYTES) { toast.error("Choose an image under 2MB."); return; }
    setPhotoAction("upload");
    try {
      const result = await updateAccountInfo({ profilePictureFile: file });
      const photo = result.profilePicture ?? "";
      setSaved((prev) => ({ ...prev, photo }));
      syncUser({ photoURL: photo });
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(errorText(error, "We couldn't upload your photo. Try again."));
    } finally {
      setPhotoAction(null);
    }
  };

  const deletePhoto = async () => {
    setPhotoAction("remove");
    try {
      await removeProfilePicture();
      setSaved((prev) => ({ ...prev, photo: "" }));
      syncUser({ photoURL: "" });
      toast.success("Profile photo removed.");
    } catch {
      toast.error("We couldn't remove your photo. Try again.");
    } finally {
      setPhotoAction(null);
    }
  };

  const trimmed = trimDetails(form);
  const changed = DETAIL_KEYS.filter((key) => trimmed[key] !== saved[key]);
  const dirty = changed.length > 0;
  const setField = <K extends keyof Details>(key: K, value: Details[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!trimmed.fullName) nextErrors.fullName = "Enter your full name.";
    if (trimmed.dateOfBirth && trimmed.dateOfBirth > todayIso()) nextErrors.dateOfBirth = "Date of birth can't be in the future.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !dirty || saving) return;
    setSaving(true);
    // Send only what changed, so untouched fields (like an unset gender) stay as they are.
    const update: Partial<ProfileInfo> = {};
    for (const key of changed) {
      if (key === "street") update.address = typeof saved.address === "object" && saved.address ? { ...saved.address, address: trimmed.street } : trimmed.street;
      else if (key === "gender") { if (trimmed.gender) update.gender = trimmed.gender; }
      else update[key] = trimmed[key];
    }
    try {
      await updateProfileInfo(update);
      const current = auth.currentUser;
      if (update.fullName && current && current.displayName !== update.fullName) await updateProfile(current, { displayName: update.fullName }).catch(() => undefined);
      setSaved((prev) => ({ ...prev, ...trimmed, address: update.address ?? prev.address }));
      setForm(trimmed);
      if (update.fullName) syncUser({ fullName: update.fullName });
      dispatch(updateUserProfile({
        phoneNumber: trimmed.phone, address: update.address ?? saved.address, city: trimmed.city, state: trimmed.state, zipCode: trimmed.zipCode,
        dateOfBirth: trimmed.dateOfBirth, professionalSummary: trimmed.summary, ...(trimmed.gender && { gender: trimmed.gender }),
      }));
      toast.success("Your details are saved.");
    } catch (error) {
      toast.error(errorText(error, "We couldn't save your details. Try again."));
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") return <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your profile">
    <div className="flex items-center gap-5"><Skeleton className="h-24 w-24 rounded-full motion-reduce:animate-none" /><Skeleton className="h-10 w-48 motion-reduce:animate-none" /></div>
    <div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] motion-reduce:animate-none" />)}</div>
  </div>;

  if (state === "error") return <p role="alert" className="py-16 text-center text-sm text-[#b3371c] dark:text-[#f3a08c]">
    We couldn&apos;t load your profile.{" "}
    <button type="button" onClick={() => void load()} className="cursor-pointer font-semibold underline">Try again</button>
  </p>;

  const busyPhoto = photoAction !== null;
  const showPhoto = saved.photo && !photoBroken;

  return <form onSubmit={save} noValidate className="flex flex-col gap-6">
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e3f6f6] text-[#007679] dark:bg-[#007679]/25 dark:text-[#9fe0e1]">
        {showPhoto ? <img src={saved.photo} alt="Your profile photo" className="h-full w-full object-cover" onError={() => setPhotoBroken(true)} />
          : <UserRound className="h-11 w-11" strokeWidth={1.5} aria-hidden="true" />}
        {busyPhoto && <span className="absolute inset-0 grid place-items-center bg-black/35"><Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" /></span>}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={SMALL_PRIMARY} disabled={busyPhoto} onClick={() => fileRef.current?.click()}>
            {photoAction === "upload" ? "Uploading…" : "Change profile"}
          </button>
          <button type="button" className={SMALL_SECONDARY} disabled={busyPhoto || !saved.photo} onClick={() => void deletePhoto()}>
            {photoAction === "remove" ? "Removing…" : "Delete"}
          </button>
        </div>
        <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">JPG or PNG, under 2MB.</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Choose a profile photo" onChange={(event) => void pickPhoto(event.target.files?.[0])} />
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="profile-full-name" label="Full name" error={errors.fullName}>
        {(props) => <input {...props} className={cn(FIELD, errors.fullName && "border-[#d64545]")} value={form.fullName} autoComplete="name" maxLength={120}
          onChange={(event) => setField("fullName", event.target.value)} />}
      </Field>
      <Field id="profile-email" label="Email" hint="Ask your agency to change your email.">
        {(props) => <input {...props} className={FIELD} value={saved.email} readOnly disabled />}
      </Field>
      <Field id="profile-phone" label="Phone number">
        {(props) => <input {...props} type="tel" className={FIELD} value={form.phone} autoComplete="tel" maxLength={30} placeholder="Enter your phone number"
          onChange={(event) => setField("phone", event.target.value)} />}
      </Field>
      <Field id="profile-dob" label="Date of birth" error={errors.dateOfBirth}>
        {(props) => <input {...props} type="date" className={cn(FIELD, errors.dateOfBirth && "border-[#d64545]")} value={form.dateOfBirth} max={todayIso()} autoComplete="bday"
          onChange={(event) => setField("dateOfBirth", event.target.value)} />}
      </Field>
      <Field id="profile-street" label="Street address" className="sm:col-span-2">
        {(props) => <input {...props} className={FIELD} value={form.street} autoComplete="street-address" maxLength={200} placeholder="123 Main Street"
          onChange={(event) => setField("street", event.target.value)} />}
      </Field>
      <Field id="profile-city" label="City">
        {(props) => <input {...props} className={FIELD} value={form.city} autoComplete="address-level2" maxLength={80}
          onChange={(event) => setField("city", event.target.value)} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="profile-state" label="State">
          {(props) => <input {...props} className={FIELD} value={form.state} autoComplete="address-level1" maxLength={40}
            onChange={(event) => setField("state", event.target.value)} />}
        </Field>
        <Field id="profile-zip" label="Zip code">
          {(props) => <input {...props} className={FIELD} value={form.zipCode} autoComplete="postal-code" inputMode="numeric" maxLength={10}
            onChange={(event) => setField("zipCode", event.target.value)} />}
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(LABEL, "mb-2")}>Gender</legend>
        <div className="flex h-11 items-center gap-6">
          {(["Male", "Female"] as const).map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 text-[14px] text-[#10141a] dark:text-[#f4f6f7]">
            <input type="radio" name="profile-gender" value={option} checked={form.gender === option} onChange={() => setField("gender", option)}
              className="h-4 w-4 cursor-pointer accent-[#007679]" />
            {option}
          </label>)}
        </div>
      </fieldset>
      <Field id="profile-summary" label="Professional summary" className="sm:col-span-2" hint={`${form.summary.length}/${SUMMARY_MAX} characters`}>
        {(props) => <textarea {...props} className={TEXTAREA} value={form.summary} maxLength={SUMMARY_MAX} rows={4}
          placeholder="Tell us about your experience, skills and the care you give."
          onChange={(event) => setField("summary", event.target.value.slice(0, SUMMARY_MAX))} />}
      </Field>
    </div>

    <div className="flex flex-wrap gap-2">
      <button type="submit" className={SMALL_PRIMARY} disabled={!dirty || saving}>{saving ? "Saving…" : "Save changes"}</button>
      {dirty && !saving && <button type="button" className={SMALL_SECONDARY} onClick={() => { setForm(saved); setErrors({}); }}>Cancel</button>}
    </div>
  </form>;
}

interface FieldProps { id: string; label: string; error?: string; hint?: string; className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode }

function Field({ id, label, error, hint, className, children }: FieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return <div className={cn("flex flex-col gap-2", className)}>
    <label htmlFor={id} className={LABEL}>{label}</label>
    {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
    {error && <p id={`${id}-error`} className="text-[13px] text-[#b3371c] dark:text-[#f3a08c]">{error}</p>}
    {hint && <p id={`${id}-hint`} className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{hint}</p>}
  </div>;
}
