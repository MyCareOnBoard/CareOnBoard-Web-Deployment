import { lazy, Suspense, useState } from "react";
import { isValid, parseISO } from "date-fns";
import { DSP } from "../types";
import { CalendarCheck, CalendarDays, FileText, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { canManageEmployeePayroll } from "@/lib/agency/agency-billing-permissions";
import { useAuth } from "@/utils/auth";

const EmployeePrimaryWorkplaceCard = lazy(() => import("./EmployeePrimaryWorkplaceCard"));

function DetailRow({ icon: Icon, label, children, stacked = false }: { icon: LucideIcon; label: string; children: React.ReactNode; stacked?: boolean }) {
  return (
    <div className={cn("flex gap-3 border-b border-[#eceef0] px-5 py-4 last:border-b-0 dark:border-white/10", stacked ? "items-start" : "flex-col sm:flex-row sm:items-center sm:justify-between")}>
      <div className={cn("flex gap-3", stacked ? "items-start" : "items-center")}>
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f5f6] text-[#007679] dark:bg-white/5 dark:text-[#7fd3d3]">
          <Icon className="h-4 w-4" />
        </span>
        {stacked ? (
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">{label}</p>
            {children}
          </div>
        ) : (
          <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">{label}</p>
        )}
      </div>
      {!stacked && children}
    </div>
  );
}

const valueClass = "text-[14px] text-[#10141a] sm:text-right dark:text-[#f4f6f7]";

interface ProfileTabProps {
  dsp: DSP;
  onDeactivate: () => void | Promise<void>;
  onActivate: () => void | Promise<void>;
}

export function ProfileTab({ dsp, onDeactivate, onActivate }: ProfileTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"deactivate" | "activate" | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const handleDeactivateClick = () => {
    setPendingAction("deactivate");
    setShowStatusDialog(true);
  };

  const handleActivateClick = () => {
    setPendingAction("activate");
    setShowStatusDialog(true);
  };

  const handleConfirmStatusChange = async () => {
    setIsStatusLoading(true);
    try {
      if (pendingAction === "deactivate") {
        await Promise.resolve(onDeactivate());
        toast({
          title: "User Deactivated",
          description: `${dsp.fullName} has been deactivated.`,
        });
      } else if (pendingAction === "activate") {
        await Promise.resolve(onActivate());
        toast({
          title: "User Activated",
          description: `${dsp.fullName} has been activated.`,
        });
      }
      setShowStatusDialog(false);
      setPendingAction(null);
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${pendingAction === "deactivate" ? "deactivate" : "activate"} user. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handleCancelStatusChange = () => {
    if (isStatusLoading) return;
    setShowStatusDialog(false);
    setPendingAction(null);
  };

  const isDeactivating = pendingAction === "deactivate";
  const hireDate = parseISO(dsp.hireDate?.slice(0, 10) || "");
  const canManagePrimaryWorkplace = canManageEmployeePayroll(user?.userType, user?.profile?.accessList)
    && Boolean(user?.uid && user.agencyId && dsp.id);

  return (<>
    <div className="space-y-5">
      <section aria-label="Personal details" className="min-w-0 rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
        <DetailRow icon={CalendarDays} label="Date of Birth">
          <p className={valueClass}>{dsp.dateOfBirth ? new Date(dsp.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
        </DetailRow>
        <DetailRow icon={Mail} label="Email">
          <p className={cn(valueClass, "break-all")}>{dsp.email}</p>
        </DetailRow>
        <DetailRow icon={Phone} label="Phone number">
          <p className={valueClass}>{dsp.phoneNumber || 'N/A'}</p>
        </DetailRow>
        <DetailRow icon={MapPin} label="Address">
          <p className={valueClass}>
            {typeof dsp.address === "object" && dsp.address !== null
              ? [(dsp.address as any).address, (dsp.address as any).city, (dsp.address as any).zipCode].filter(Boolean).join(", ") || "N/A"
              : dsp.address || "N/A"}
          </p>
        </DetailRow>
        <DetailRow icon={CalendarCheck} label="Hire date">
          <p className={valueClass}>
            {isValid(hireDate) ? hireDate.toLocaleDateString() : 'Not set'}
          </p>
        </DetailRow>
        <DetailRow icon={FileText} label="Professional summary" stacked>
          <p className="mt-1 text-[14px] leading-relaxed text-[#10141a] dark:text-[#f4f6f7]">
           {dsp.bio || "No professional summary provided."}
          </p>
        </DetailRow>
      </section>

      {canManagePrimaryWorkplace && <Suspense fallback={<section aria-label="Loading primary work location" aria-busy="true" role="status" className="h-32 animate-pulse rounded-[16px] bg-[#f4f5f6] dark:bg-white/5" />}><EmployeePrimaryWorkplaceCard scope={{ audience: "agency", actorUid: user!.uid, agencyId: user!.agencyId!, employmentId: dsp.id }} /></Suspense>}

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" className={agencyOutlineButton}>
          Report
        </button>
        {dsp.status === "active" ? (
          <button
            type="button"
            onClick={handleDeactivateClick}
            className={cn(agencyOutlineButton, "border-[#f0c8c4] text-[#b42318] hover:bg-[#fdf2f1] dark:border-[#ff6b5e]/30 dark:text-[#f8a1a1] dark:hover:bg-[#ff6b5e]/10")}
          >
            Deactivate User
          </button>
        ) : (
          <button
            type="button"
            onClick={handleActivateClick}
            className={agencyPrimaryButton}
          >
            Activate User
          </button>
        )}
      </div>
    </div>

      <ConfirmDialog open={showStatusDialog} onOpenChange={(open) => !open && !isStatusLoading && handleCancelStatusChange()}>
        <ConfirmDialogContent
          title={isDeactivating ? "Deactivate User?" : "Activate User?"}
          description={isDeactivating
            ? `Are you sure you want to deactivate ${dsp.fullName}? They will no longer be able to access their user dashboard.`
            : `Are you sure you want to activate ${dsp.fullName}? They will be able to access their user dashboard again.`}
          confirmText={isDeactivating ? "Yes, Deactivate" : "Yes, Activate"}
          cancelText="Cancel"
          onConfirm={handleConfirmStatusChange}
          onCancel={handleCancelStatusChange}
          isLoading={isStatusLoading}
          loadingText={isDeactivating ? "Deactivating..." : "Activating..."}
        />
      </ConfirmDialog>
  </>
  );
}
