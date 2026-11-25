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
import { FileText, X } from "lucide-react";
import { agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { requestEmployeeDocument, type EmployeeDocument, isExpiringSoon } from "@/lib/api/employee-documents";
import { canonicalDocumentType, DOCUMENT_TYPE_LABELS } from "@/lib/documentTypes";
import { useToast } from "@/hooks/use-toast";

const DOCUMENT_TYPES = [
	{ value: "photo-id", label: "Photo ID (State ID, Passport)" },
	{ value: "driver-license", label: "Driver's License" },
	{ value: "social-security-card", label: "Social Security Card" },
	{ value: "hepatitis-b-vaccination", label: "Hepatitis B vaccination series documents" },
	{ value: "hepatitis-b-immunity", label: "Hepatitis B immunity (titer result)" },
	{ value: "tb-test", label: "Tb test result" },
	{ value: "chha-certificate", label: DOCUMENT_TYPE_LABELS["chha-certificate"] },
	{ value: "cpr-certification", label: DOCUMENT_TYPE_LABELS["cpr-certification"] },
	{ value: "cna-hha-license", label: DOCUMENT_TYPE_LABELS["cna-hha-license"] },
	{ value: "mmr-record", label: DOCUMENT_TYPE_LABELS["mmr-record"] },
	{ value: "physical-exam", label: DOCUMENT_TYPE_LABELS["physical-exam"] },
	{ value: "additional-vaccination", label: DOCUMENT_TYPE_LABELS["additional-vaccination"] },
	{ value: "diploma", label: "High School Diploma / GED" },
	{ value: "i9-form", label: "I-9 Form" },
	{ value: "w4-form", label: "W-4 Form" },
	{ value: "background-check", label: "Background Check" },
	{ value: "certifications", label: "Certification / License" },
	{ value: "other", label: "Other" },
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
		? documents.find((d) => canonicalDocumentType(d.documentType) === documentType)
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
			<DialogContent showCloseButton={false} className="w-[calc(100vw-32px)] max-w-[480px] gap-0 overflow-hidden rounded-[20px] p-0">
				<DialogHeader className="flex-row items-start gap-3.5 border-b border-[#eceef0] px-5 py-4 text-left dark:border-white/10"><span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#007679] dark:border-white/15 dark:text-[#7fd3d3]"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1">
					<DialogTitle className="text-[22px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
						Request Document
					</DialogTitle>
				</div><button type="button" onClick={resetAndClose} aria-label="Close" disabled={sending} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-50 dark:border-white/15 dark:text-[#c9d1d4]"><X aria-hidden="true" className="h-4 w-4" /></button></DialogHeader>

				<div className="space-y-4 px-5 py-5">
					{/* Document Type */}
					<div className="space-y-1.5">
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Document Type <span className="text-[#b42318] dark:text-[#f8a1a1]">*</span>
						</Label>
						<Select value={documentType || undefined} onValueChange={setDocumentType}>
							<SelectTrigger className="h-10 w-full rounded-[10px] border-[#dcdfe2] bg-white dark:border-white/15 dark:bg-[#151c22]">
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
						<Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
							Requested Expiry Date{" "}
							<span className="font-normal text-[#4b535b] dark:text-[#9aa4a8]">(optional)</span>
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
							className={`rounded-[10px] border px-3.5 py-2.5 text-[13px] font-medium ${
								isExpired
									? "border-[#f0c8c4] bg-[#fdf3f2] text-[#b42318] dark:border-[#ff6b5e]/30 dark:bg-[#ff6b5e]/10 dark:text-[#f8a1a1]"
									: "border-[#f0dfa0] bg-[#fcf5dc] text-[#7a5800] dark:border-[#e0b400]/30 dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]"
							}`}
						>
							{isExpired
								? `This document expired on ${new Date(existingDoc.expiryDate!).toLocaleDateString()}.`
								: `This document is expiring soon (${new Date(existingDoc.expiryDate!).toLocaleDateString()}).`}
						</div>
					)}

					<p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
						This will send a notification to the user.
					</p>

					{/* Primary action - Figma: single teal pill button */}
					<div className="pt-2">
						<Button
							onClick={handleSend}
							disabled={sending || !documentType}
							className={`${agencyPrimaryButton} w-full active:bg-[#003839]`}
						>
							{sending ? "Sending..." : "Send Request"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
