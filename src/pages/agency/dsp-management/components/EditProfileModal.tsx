import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateEmployee, type UpdateEmployeeRequest } from "@/lib/api/employees";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux/store";
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
	const user = useSelector((state: RootState) => state.auth.user);
	const agencyId = user?.agencyId;

	const [form, setForm] = useState({
		fullName: "",
		phone: "",
		address: "",
		dateOfBirth: "",
		bio: "",
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
				bio: dsp.bio ?? "",
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
			if (form.bio && form.bio !== dsp.bio) payload.bio = form.bio;

			if (Object.keys(payload).length === 0) {
				toast({ title: "No changes", description: "Nothing to update." });
				onClose();
				return;
			}

			await updateEmployee(dsp.id, payload, agencyId);

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
			<DialogContent className="w-[520px] max-w-[calc(100vw-32px)] p-0 gap-0">
				<DialogHeader className="px-6 pt-6 pb-4 border-b">
					<div className="flex items-center justify-between">
						<DialogTitle className="text-lg font-semibold">
							Edit Profile
						</DialogTitle>
					</div>
					<DialogDescription className="text-sm text-muted-foreground mt-0.5">
						Update {dsp.fullName}&apos;s information
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
					{/* Full Name */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">
							Full Name
						</label>
						<Input
							value={form.fullName}
							onChange={(e) => handleChange("fullName", e.target.value)}
							placeholder="Enter full name"
						/>
					</div>

					{/* Phone */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">
							Phone Number
						</label>
						<Input
							type="tel"
							value={form.phone}
							onChange={(e) => handleChange("phone", e.target.value)}
							placeholder="Enter phone number"
						/>
					</div>

					{/* Address */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">
							Address
						</label>
						<Input
							value={form.address}
							onChange={(e) => handleChange("address", e.target.value)}
							placeholder="Enter address"
						/>
					</div>

					{/* Date of Birth */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">
							Date of Birth
						</label>
						<Input
							type="date"
							value={form.dateOfBirth}
							onChange={(e) => handleChange("dateOfBirth", e.target.value)}
						/>
					</div>

					{/* Bio */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">
							Bio
						</label>
						<textarea
							value={form.bio}
							onChange={(e) => handleChange("bio", e.target.value)}
							placeholder="Enter bio"
							rows={3}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
					<button
						onClick={onClose}
						disabled={saving}
						className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						disabled={saving}
						className="px-5 py-2 text-sm font-medium text-white bg-[#00B4B8] rounded-full hover:bg-[#00A0A4] transition-colors disabled:opacity-50"
					>
						{saving ? "Saving..." : "Save Changes"}
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
