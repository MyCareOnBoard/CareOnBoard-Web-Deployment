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

	const [form, setForm] = useState({
		fullName: "",
		phone: "",
		address: "",
		dateOfBirth: "",
	});

	/* Seed form when modal opens / dsp changes */
	useEffect(() => {
		if (open && dsp) {
			setForm({
				fullName: dsp.fullName ?? "",
				phone: dsp.phoneNumber ?? "",
				address: dsp.address ?? "",
				dateOfBirth: dsp.dateOfBirth
					? dsp.dateOfBirth.slice(0, 10) // yyyy-mm-dd for <input type="date">
					: "",
			});
		}
	}, [open, dsp]);

	const handleChange = (field: keyof typeof form, value: string) => {
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
			<DialogContent className="w-[520px] max-w-[calc(100vw-32px)] p-0 gap-0 overflow-hidden rounded-2xl shadow-xl">
				<DialogHeader className="px-6 pt-6 pb-4 text-left items-start">
					<DialogTitle className="text-lg font-semibold text-[#10141a]">
						Edit Profile
					</DialogTitle>
					<p className="text-sm text-[var(--grey-200)] mt-0.5">
						Update {dsp.fullName}&apos;s information
					</p>
				</DialogHeader>

				<div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
					{/* Full Name */}
					<div className="space-y-1.5">
						<Label className="text-sm font-medium text-[#10141a]">
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
						<Label className="text-sm font-medium text-[#10141a]">
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
						<Label className="text-sm font-medium text-[#10141a]">
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
						<Label className="text-sm font-medium text-[#10141a]">
							Date of Birth
						</Label>
						<Input
							type="date"
							value={form.dateOfBirth}
							onChange={(e) => handleChange("dateOfBirth", e.target.value)}
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={saving}
						className="px-5 py-2 rounded-full border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 transition-colors"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={saving}
						className="px-5 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50"
					>
						{saving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
