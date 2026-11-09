import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronRight, LogOut, MapPin, Moon, Sun, SunMoon, UserRound } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { careConnectDashboardUrl } from "@/components/dashboardHeaderRoutes";
import { getProfileInfo, type ProfileInfo } from "@/lib/api/profile";
import { getUser } from "@/lib/api/users";
import { useTheme } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { setUser } from "@/utils/auth/store/authSlice";
import { UserType } from "@/utils/auth/types/user.types";
import type { AppDispatch } from "@/store/redux/store";
import { useUpdateEmployeeInfoMutation } from "@/pages/userPanel/dashboard/api";

function MenuSwitch({ on, className }: { on: boolean; className?: string }) {
  return <span aria-hidden="true" className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors", className)}>
    <span className={cn("absolute h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
  </span>;
}

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const ITEM = "flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[15px] text-[#10141a] outline-none focus:bg-[#f3f5f6] data-[highlighted]:bg-[#f3f5f6] dark:text-[#f4f6f7] dark:focus:bg-white/5 dark:data-[highlighted]:bg-white/5";

export function formatAddress(info: Pick<ProfileInfo, "address" | "city" | "state" | "zipCode">) {
  const street = (typeof info.address === "object" ? info.address?.address : info.address)?.trim();
  const stateZip = [info.state?.trim(), info.zipCode?.trim()].filter(Boolean).join(" ");
  return [street, info.city?.trim(), stateZip].filter(Boolean).join(", ");
}

// Last address seen, so reopening the menu doesn't flash without it while it refreshes.
let lastAddress: { uid: string; address: string } | null = null;

/** The account menu content for field staff, opened from the avatar in the header. */
export function UserPanelAccountMenu({ roleLabel, onLogout }: { roleLabel: string; onLogout: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const [updateEmployeeInfo] = useUpdateEmployeeInfoMutation();
  const [address, setAddress] = useState(() => (lastAddress && lastAddress.uid === user?.uid ? lastAddress.address : ""));
  const [saving, setSaving] = useState(false);
  const available = Boolean(user?.profile?.workAvailability ?? user?.workAvailability);
  const agencyName = user?.agency?.name?.replace(/\s+/g, " ").trim();
  const careConnectUrl = careConnectDashboardUrl(UserType.EMPLOYEE);
  const onProfile = location.pathname === Routes.userPanel.profile;
  const { theme, toggleTheme } = useTheme();

  // The menu content only mounts while open, so this refreshes the address each time it opens.
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    getProfileInfo().then((info) => {
      const next = formatAddress(info);
      lastAddress = { uid, address: next };
      if (live) setAddress(next);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [uid]);

  const toggleAvailability = async () => {
    if (saving || !user) return;
    setSaving(true);
    const next = !available;
    // Show the change straight away; put it back if the save fails.
    dispatch(setUser({ ...user, profile: { ...user.profile, workAvailability: next } }));
    try {
      await updateEmployeeInfo({ workAvailability: next }).unwrap();
    } catch {
      dispatch(setUser(user));
      toast.error("Could not save work availability. Please try again.");
      setSaving(false);
      return;
    }
    try { dispatch(setUser(await getUser())); } catch { /* The saved value is already showing. */ }
    setSaving(false);
  };

  return <>
    <div className="rounded-[12px] bg-[#003839] p-4 text-white">
      <p className="truncate text-[18px] leading-tight">{user?.fullName || "User"}</p>
      <p className="mt-1.5 text-[14px] text-white/90"><span className="font-semibold text-white">{roleLabel}</span>{agencyName && <> at {agencyName}</>}</p>
      {address && <p className="mt-3 flex items-start gap-2 text-[13px] text-white/85">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{address}</span>
      </p>}
      <DropdownMenuItem role="menuitemcheckbox" aria-checked={available} disabled={saving}
        onSelect={(event) => { event.preventDefault(); void toggleAvailability(); }}
        className="-mx-2 mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 text-[15px] font-semibold text-white outline-none focus:bg-white/10 data-[highlighted]:bg-white/10 data-[disabled]:opacity-70">
        Available for work?
        <MenuSwitch on={available} className={available ? "bg-[#20c05c]" : "bg-white/25"} />
      </DropdownMenuItem>
    </div>

    <div className="mt-2 flex flex-col gap-0.5">
      <DropdownMenuItem className={cn(ITEM, onProfile && "bg-[#f3f5f6] font-semibold dark:bg-white/5")} aria-current={onProfile ? "page" : undefined}
        onSelect={() => navigate(Routes.userPanel.profile)}>
        <UserRound className="h-5 w-5 shrink-0" strokeWidth={1.7} aria-hidden="true" />
        Profile &amp; Settings
      </DropdownMenuItem>
      <div className="flex min-h-11 items-center gap-3 px-3 text-[15px] text-[#10141a] dark:text-[#f4f6f7]">
        <SunMoon className="h-5 w-5 shrink-0" strokeWidth={1.7} aria-hidden="true" />
        <span id="account-menu-theme" className="flex-1">Theme</span>
        <DropdownMenuPrimitive.RadioGroup value={theme} aria-labelledby="account-menu-theme"
          onValueChange={(value) => { if (value !== theme) toggleTheme(); }}
          className="flex rounded-full bg-[#f3f5f6] p-[3px] dark:bg-white/5">
          {THEMES.map(({ value, label, icon: Icon }) => <DropdownMenuPrimitive.RadioItem key={value} value={value}
            onSelect={(event) => event.preventDefault()}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-[#5d6b73] outline-none transition-colors data-[highlighted]:text-[#10141a] data-[highlighted]:ring-2 data-[highlighted]:ring-[#007679]/35 data-[state=checked]:bg-white data-[state=checked]:text-[#10141a] data-[state=checked]:shadow-[0_1px_2px_rgba(16,40,44,0.14)] dark:text-[#9aa4a8] dark:data-[highlighted]:text-[#f4f6f7] dark:data-[state=checked]:bg-[#2b3741] dark:data-[state=checked]:text-[#f4f6f7]">
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {label}
          </DropdownMenuPrimitive.RadioItem>)}
        </DropdownMenuPrimitive.RadioGroup>
      </div>
      <DropdownMenuItem className={cn(ITEM, "font-semibold text-[#d0202b] dark:text-[#f38b8f]")} onSelect={onLogout}>
        <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        Log out
      </DropdownMenuItem>
    </div>

    {careConnectUrl && <>
      <DropdownMenuSeparator className="my-2 bg-[#edf1f2] dark:bg-white/10" />
      <DropdownMenuItem asChild className={cn(ITEM, "justify-between text-[#34434c] dark:text-[#c9d3d6]")}>
        <a href={careConnectUrl} target="_blank" rel="noopener noreferrer">
          Switch to careonboardconnect
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </DropdownMenuItem>
    </>}
  </>;
}
