import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import CustomDatePicker from "@/components/ui/datePicker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requestEmployeeDocument, type EmployeeDocument, isExpiringSoon } from "@/lib/api/employee-documents";
import { useToast } from "@/hooks/use-toast";

const DOCUMENT_TYPES = [
	{ value: "id", label: "Photo ID (Driver's License, State ID, Passport)" },
	{ value: "social-security", label: "Social Security Card" },
	{ value: "vaccination", label: "Hepatitis B vaccination series documents" },
	{ value: "immunity", label: "Hepatitis B immunity (titer result)" },
	{ value: "test", label: "Tb test result" },
	{ value: "form", label: "I-9 Form" },
	{ value: "tax", label: "W-4 Form" },
	{ value: "background-check", label: "Background Check" },
	{ value: "certification", label: "Certification / License" },
	{ value: "general", label: "Other" },
] as const;

interface RequestDocumentModalProps {
	open: boolean;
	onClose: () => void;
	employeeId: string;
	employeeName: string;
	documents?: EmployeeDocument[];
	onRequested?: () => void;
}

export function RequestDocumentModal({
	open,
	onClose,
	employeeId,
	employeeName,
	documents = [],
	onRequested,
}: RequestDocumentModalProps) {
	const { toast } = useToast();
	const [sending, setSending] = useState(false);
	const [documentType, setDocumentType] = useState("");
	const [expiryDate, setExpiryDate] = useState<Date | null>(null);

	/** Find existing document for selected type to surface expiry info */
	const existingDoc = documentType
		? documents.find((d) => d.documentType === documentType)
		: null;

	const expiringSoon = existingDoc ? isExpiringSoon(existingDoc.expiryDate) : false;
	const isExpired = existingDoc?.status === "expired";

	const handleSend = async () => {
		if (!documentType) {
			toast({
				title: "Select a document type",
				description: "Please choose the type of document to request.",
				variant: "destructive",
			});
			return;
		}

		setSending(true);
		try {
			await requestEmployeeDocument(
				employeeId,
				documentType,
				expiryDate ? expiryDate.toISOString().slice(0, 10) : undefined,
			);

			toast({
				title: "Document Request Sent",
				description: `A request for "${DOCUMENT_TYPES.find((d) => d.value === documentType)?.label}" has been sent to ${employeeName}.`,
			});

			onRequested?.();
			resetAndClose();
		} catch (error) {
			console.error("Failed to request document:", error);
			toast({
				title: "Error",
				description: "Failed to send document request. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSending(false);
		}
	};

	const resetAndClose = () => {
		setDocumentType("");
		setExpiryDate(null);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
			<DialogContent className="w-[480px] max-w-[calc(100vw-32px)] p-0 gap-0 overflow-hidden rounded-2xl shadow-xl">
				<DialogHeader className="px-6 pt-6 pb-4 text-left items-start">
					<DialogTitle className="text-lg font-semibold text-[#10141a]">
						Request Document
					</DialogTitle>
				</DialogHeader>

				<div className="px-6 pb-6 space-y-4">
					{/* Document Type */}
					<div className="space-y-1.5">
						<Label className="text-sm font-medium text-[#10141a]">
							Document Type <span className="text-red-500">*</span>
						</Label>
						<Select value={documentType || undefined} onValueChange={setDocumentType}>
							<SelectTrigger className="w-full h-10 rounded-lg border-[var(--input-border)] bg-[var(--input-bg)]">
								<SelectValue placeholder="Select document type" />
							</SelectTrigger>
							<SelectContent>
								{DOCUMENT_TYPES.map((dt) => (
									<SelectItem key={dt.value} value={dt.value}>
										{dt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Expiry Date (kept per user request) */}
					<div className="space-y-1.5">
						<Label className="text-sm font-medium text-[#10141a]">
							Requested Expiry Date{" "}
							<span className="text-[var(--grey-200)] font-normal">(optional)</span>
						</Label>
						<CustomDatePicker
							date={expiryDate}
							setDate={setExpiryDate}
							placeholder="Select expiry date"
							startMonth={new Date()}
							endMonth={new Date(new Date().getFullYear() + 10, 11)}
						/>
					</div>

					{/* Expiry status banner */}
					{existingDoc && (isExpired || expiringSoon) && (
						<div
							className={`rounded-lg px-4 py-2 text-sm font-medium ${
								isExpired
									? "bg-red-50 text-red-700 border border-red-200"
									: "bg-amber-50 text-amber-700 border border-amber-200"
							}`}
						>
							{isExpired
								? `This document expired on ${new Date(existingDoc.expiryDate!).toLocaleDateString()}.`
								: `This document is expiring soon (${new Date(existingDoc.expiryDate!).toLocaleDateString()}).`}
						</div>
					)}

					<p className="text-sm text-[var(--grey-200)]">
						This will send a notification to the user.
					</p>

					{/* Primary action - Figma: single teal pill button */}
					<div className="pt-2">
						<Button
							onClick={handleSend}
							disabled={sending || !documentType}
							className="w-full px-6 py-2.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium"
						>
							{sending ? "Sending..." : "Send Request"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
