import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, UserPen, X } from "lucide-react";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { format, parseISO } from "date-fns";
import { updateEmployee, type UpdateEmployeeRequest } from "@/lib/api/employees";
import { useToast } from "@/hooks/use-toast";
import type { DSP } from "../types";

interface EditProfileModalProps {
	open: boolean;
	onClose: () => void;
	dsp: DSP;
	onUpdated: (updated: Partial<DSP>) => void;
}

export function EditProfileModal({
	open,
	onClose,
	dsp,
	onUpdated,
}: EditProfileModalProps) {
	const { toast } = useToast();
	const [saving, setSaving] = useState(false);
	const [hireDateOpen, setHireDateOpen] = useState(false);

	const [form, setForm] = useState({
		fullName: "",
		phone: "",
		address: "",
		dateOfBirth: "",
		hireDate: "",
		// Agency Compliance (MSRT) "Agency Employee" sheet columns.
		alternateLastName: "",
		ssnLast4: "",
		serviceStartDate: "",
		drivesIndividuals: false,
		administersMedications: false,
	});

	/* Seed form when modal opens / dsp changes */
	useEffect(() => {
		if (open && dsp) {
			setHireDateOpen(false);
			setForm({
				fullName: dsp.fullName ?? "",
				phone: dsp.phoneNumber ?? "",
				address: dsp.address ?? "",
				hireDate: dsp.hireDate?.slice(0, 10) ?? "",
				dateOfBirth: dsp.dateOfBirth
					? dsp.dateOfBirth.slice(0, 10) // yyyy-mm-dd for <input type="date">
					: "",
				alternateLastName: dsp.alternateLastName ?? "",
				ssnLast4: dsp.ssnLast4 ?? "",
				serviceStartDate: dsp.serviceStartDate ? dsp.serviceStartDate.slice(0, 10) : "",
				drivesIndividuals: dsp.drivesIndividuals ?? false,
				administersMedications: dsp.administersMedications ?? false,
			});
		}
	}, [open, dsp]);

	const handleChange = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const payload: UpdateEmployeeRequest = {};
			if (form.fullName && form.fullName !== dsp.fullName) payload.fullName = form.fullName;
			if (form.phone && form.phone !== dsp.phoneNumber) payload.phoneNumber = form.phone;
			if (form.address && form.address !== dsp.address) payload.address = form.address;
			if (form.dateOfBirth && form.dateOfBirth !== dsp.dateOfBirth?.slice(0, 10))
				payload.dateOfBirth = form.dateOfBirth;
			if (form.hireDate && form.hireDate !== dsp.hireDate?.slice(0, 10))
				payload.hireDate = form.hireDate;

			// MSRT fields. Compared with !== rather than truthiness: clearing a value or
			// setting a boolean to false must still be sent, and "" is a legitimate clear.
			if (form.alternateLastName !== (dsp.alternateLastName ?? ""))
				payload.alternateLastName = form.alternateLastName;
			if (form.ssnLast4 !== (dsp.ssnLast4 ?? ""))
				payload.ssnLast4 = form.ssnLast4;
			if (form.serviceStartDate !== (dsp.serviceStartDate?.slice(0, 10) ?? ""))
				payload.serviceStartDate = form.serviceStartDate;
			if (form.drivesIndividuals !== (dsp.drivesIndividuals ?? false))
				payload.drivesIndividuals = form.drivesIndividuals;
			if (form.administersMedications !== (dsp.administersMedications ?? false))
				payload.administersMedications = form.administersMedications;

			if (Object.keys(payload).length === 0) {
				toast({ title: "No changes", description: "Nothing to update." });
				onClose();
				return;
			}

			await updateEmployee(dsp.id, payload);

			toast({
				title: "Profile Updated",
				description: `${dsp.fullName}'s profile has been updated.`,
			});

			onUpdated({
				fullName: form.fullName || dsp.fullName,
				phoneNumber: form.phone || dsp.phoneNumber,
				address: form.address || dsp.address,
				dateOfBirth: form.dateOfBirth || dsp.dateOfBirth,
				hireDate: form.hireDate || dsp.hireDate,
				alternateLastName: form.alternateLastName,
				ssnLast4: form.ssnLast4,
				serviceStartDate: form.serviceStartDate,
				drivesIndividuals: form.drivesIndividuals,
				administersMedications: form.administersMedications,
			});

			onClose();
		} catch (error) {
			console.error("Failed to update profile:", error);
			toast({
				title: "Error",
				description: "Failed to update profile. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent showCloseButton={false} className="w-[calc(100vw-32px)] max-w-[560px] gap-0 overflow-hidden rounded-[20px] p-0">
				<DialogHeader className="flex-row items-start gap-3.5 border-b border-[#eceef0] px-5 py-4 text-left dark:border-white/10"><span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#007679] dark:border-white/15 dark:text-[#7fd3d3]"><UserPen className="h-5 w-5" /></span><div className="min-w-0 flex-1">
					<DialogTitle className="text-[22px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
						Edit Profile
					</DialogTitle>
					<p className="mt-0.5 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
						Update {dsp.fullName}&apos;s information
					</p>
				</div><button type="button" onClick={onClose} aria-label="Close" disabled={saving} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-50 dark:border-white/15 dark:text-[#c9d1d4]"><X aria-hidden="true" className="h-4 w-4" /></button></DialogHeader>

				<div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-5">
					{/* Full Name */}
					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Full Name
						</Label>
						<Input
							value={form.fullName}
							onChange={(e) => handleChange("fullName", e.target.value)}
							placeholder="Enter full name"
						/>
					</div>

					{/* Phone */}
					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Phone Number
						</Label>
						<Input
							type="tel"
							value={form.phone}
							onChange={(e) => handleChange("phone", e.target.value)}
							placeholder="Enter phone number"
						/>
					</div>

					{/* Address */}
					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Address
						</Label>
						<Input
							value={form.address}
							onChange={(e) => handleChange("address", e.target.value)}
							placeholder="Enter address"
						/>
					</div>

					{/* Date of Birth */}
					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Date of Birth
						</Label>
						<Input
							type="date"
							value={form.dateOfBirth}
							onChange={(e) => handleChange("dateOfBirth", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-hire-date" className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">Hire Date</Label>
						<Popover open={hireDateOpen} onOpenChange={setHireDateOpen}>
							<PopoverTrigger asChild>
								<Button id="edit-hire-date" type="button" variant="outline" disabled={saving} className="h-10 w-full justify-between rounded-[10px] border-[#dcdfe2] bg-white px-3.5 text-[14px] font-normal text-[#10141a] dark:border-white/15 dark:bg-[#151c22] dark:text-[#f4f6f7]">
									{form.hireDate || "Select hire date"}<CalendarDays className="h-4 w-4 text-[#007679]" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-auto p-0">
								<Calendar mode="single" captionLayout="dropdown" startMonth={new Date(1924, 0)} endMonth={new Date(new Date().getFullYear() + 10, 11)}
									selected={form.hireDate ? parseISO(form.hireDate) : undefined}
									defaultMonth={form.hireDate ? parseISO(form.hireDate) : new Date()}
									onSelect={(date) => {
										if (!date) return;
										handleChange("hireDate", format(date, "yyyy-MM-dd"));
										setHireDateOpen(false);
									}} />
							</PopoverContent>
						</Popover>
					</div>

					{/* Agency Compliance (MSRT) report fields */}
					<div className="border-t border-[#eceef0] pt-3 dark:border-white/10">
						<p className="text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">Compliance reporting</p>
						<p className="text-xs text-[#4b535b] dark:text-[#9aa4a8] mt-0.5">
							Columns on the Agency Compliance report.
						</p>
					</div>

					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Alternate last name
						</Label>
						<Input
							value={form.alternateLastName}
							placeholder="If applicable"
							onChange={(e) => handleChange("alternateLastName", e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Last 4 digits of SSN
						</Label>
						<Input
							value={form.ssnLast4}
							inputMode="numeric"
							maxLength={4}
							placeholder="1234"
							onChange={(e) =>
								handleChange("ssnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))
							}
						/>
						<p className="text-xs text-[#4b535b] dark:text-[#9aa4a8]">
							Last four digits only. The full number is never stored.
						</p>
					</div>

					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Start date (if different from hire date)
						</Label>
						<Input
							type="date"
							value={form.serviceStartDate}
							onChange={(e) => handleChange("serviceStartDate", e.target.value)}
						/>
					</div>

					<label className="flex items-center gap-2.5 cursor-pointer">
						<input
							type="checkbox"
							className="h-4 w-4 accent-[#007679]"
							checked={form.drivesIndividuals}
							onChange={(e) => handleChange("drivesIndividuals", e.target.checked)}
						/>
						<span className="text-sm text-[#10141a] dark:text-[#f4f6f7]">Drives individuals</span>
					</label>

					<label className="flex items-center gap-2.5 cursor-pointer">
						<input
							type="checkbox"
							className="h-4 w-4 accent-[#007679]"
							checked={form.administersMedications}
							onChange={(e) => handleChange("administersMedications", e.target.checked)}
						/>
						<span className="text-sm text-[#10141a] dark:text-[#f4f6f7]">Administers medications</span>
					</label>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-2.5 border-t border-[#eceef0] px-5 py-4 dark:border-white/10">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={saving}
						className={agencyOutlineButton}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={saving}
						className={`${agencyPrimaryButton} active:bg-[#003839]`}
					>
						{saving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
