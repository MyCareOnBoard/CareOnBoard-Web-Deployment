import React from "react";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/components/ui/loader";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import CustomDatePicker from "@/components/ui/datePicker";
import type { BillingMonitorAgency } from "@/pages/super-admin/agency-billing-monitor/api";
import {
	PLAN_OPTIONS,
	type PlanName,
} from "@/pages/super-admin/agency-billing-monitor/utils/billingPlan";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agencies: BillingMonitorAgency[];
	editingBillingId: string | null;
	formAgencyId: string;
	setFormAgencyId: (value: string) => void;
	formPlan: PlanName | "";
	setFormPlan: (value: PlanName) => void;
	formStart: Date | null;
	setFormStart: (value: Date | null) => void;
	formEnds: Date | null;
	setFormEnds: (value: Date | null) => void;
	formNotify: boolean;
	setFormNotify: (value: boolean) => void;
	isSaving: boolean;
	onSave: () => void;
	onCancelPlan: () => void;
	isCancelling: boolean;
};

export function BillingPlanDialog({
	open,
	onOpenChange,
	agencies,
	editingBillingId,
	formAgencyId,
	setFormAgencyId,
	formPlan,
	setFormPlan,
	formStart,
	setFormStart,
	formEnds,
	setFormEnds,
	formNotify,
	setFormNotify,
	isSaving,
	onSave,
	onCancelPlan,
	isCancelling,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="top-4 right-4 left-auto h-[calc(100vh-2rem)] w-[520px] max-w-[92vw] translate-x-0 translate-y-0 rounded-[30px] p-0 overflow-hidden shadow-2xl"
			>
				<div className="h-full flex flex-col">
					<div className="px-6 pt-6 pb-4 border-b border-[#e5e5e6]">
						<div className="flex items-center justify-between">
							<DialogTitle className="text-[20px] font-semibold text-[#10141a]">
								{editingBillingId ? "Edit billing" : "Add new billing"}
							</DialogTitle>
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="h-10 w-10 rounded-full grid place-items-center hover:bg-black/5"
								aria-label="Close"
							>
								<span className="text-[#808081] text-[18px]">×</span>
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-auto px-6 py-6">
						<div className="space-y-5">
							<div>
								<p className="text-[12px] font-medium text-[#808081] mb-2">
									Agency
								</p>
								<Select
									value={formAgencyId}
									onValueChange={setFormAgencyId}
									disabled={Boolean(editingBillingId)}
								>
									<SelectTrigger className="h-11 rounded-xl border border-[#cccccd] bg-white px-4">
										<SelectValue placeholder="Select agency" />
									</SelectTrigger>
									<SelectContent>
										{agencies.map((a) => (
											<SelectItem key={a.agencyId} value={a.agencyId}>
												{a.agencyName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<p className="text-[12px] font-medium text-[#808081] mb-2">Plan</p>
								<Select
									value={formPlan}
									onValueChange={(v) => setFormPlan(v as PlanName)}
								>
									<SelectTrigger className="h-11 rounded-xl border border-[#cccccd] bg-white px-4">
										<SelectValue placeholder="Select Plan" />
									</SelectTrigger>
									<SelectContent>
										{PLAN_OPTIONS.map((p) => (
											<SelectItem key={p.label} value={p.label}>
												{p.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<p className="text-[12px] font-medium text-[#808081] mb-2">
									Subscription Start
								</p>
								<CustomDatePicker
									date={formStart}
									setDate={setFormStart}
									placeholder="Select date"
									endMonth={new Date(new Date().getFullYear() + 10, 11, 1)}
									className=""
								/>
							</div>

							<div>
								<p className="text-[12px] font-medium text-[#808081] mb-2">
									Subscription Ends
								</p>
								<CustomDatePicker
									date={formEnds}
									setDate={setFormEnds}
									placeholder="Select date"
									endMonth={new Date(new Date().getFullYear() + 10, 11, 1)}
									className=""
								/>
							</div>

							<div className="flex items-center justify-between pt-2">
								<div>
									<p className="text-[14px] font-medium text-[#10141a]">
										Send notification about plan
									</p>
									<p className="text-[12px] font-medium text-[#808081]">Optional</p>
								</div>
								<Switch
									checked={formNotify}
									onCheckedChange={(v) => setFormNotify(Boolean(v))}
								/>
							</div>
						</div>
					</div>

					<div className="px-6 py-5 border-t border-[#e5e5e6]">
						<div className="flex items-center justify-between gap-3">
							{editingBillingId ? (
								<Button
									variant="outline"
									className="w-40 border-black text-black hover:bg-[#ff4d4d] hover:text-white hover:border-[#ff4d4d]"
									onClick={onCancelPlan}
									disabled={isSaving || isCancelling}
								>
									{isCancelling ? (
										<span className="flex items-center gap-2">
											<ButtonLoader />
											Canceling...
										</span>
									) : (
										"Cancel Plan"
									)}
								</Button>
							) : null}
							<Button
								onClick={onSave}
								className="w-[180px] bg-[#00b5b8] hover:bg-[#00a7aa] active:bg-[#00979a]"
								disabled={isSaving}
							>
								{isSaving ? (
									<span className="flex items-center gap-2">
										<ButtonLoader />
										Saving...
									</span>
								) : (
									"Add Plan"
								)}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
