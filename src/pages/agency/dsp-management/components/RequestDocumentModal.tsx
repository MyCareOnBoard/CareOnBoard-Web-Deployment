import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { requestEmployeeDocument } from "@/lib/api/employee-documents";
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
	onRequested?: () => void;
}

export function RequestDocumentModal({
	open,
	onClose,
	employeeId,
	employeeName,
	onRequested,
}: RequestDocumentModalProps) {
	const { toast } = useToast();
	const [sending, setSending] = useState(false);
	const [documentType, setDocumentType] = useState("");
	const [message, setMessage] = useState("");

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
			await requestEmployeeDocument(employeeId, documentType, message || undefined);

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
		setMessage("");
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
			<DialogContent className="w-[480px] max-w-[calc(100vw-32px)] p-0 gap-0">
				<DialogHeader className="px-6 pt-6 pb-4 border-b">
					<DialogTitle className="text-lg font-semibold">
						Request New Document
					</DialogTitle>
					<DialogDescription className="text-sm text-muted-foreground mt-0.5">
						Send a document request to {employeeName}
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 py-5 space-y-4">
					{/* Document Type */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">
							Document Type <span className="text-red-500">*</span>
						</label>
						<select
							value={documentType}
							onChange={(e) => setDocumentType(e.target.value)}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<option value="">Select document type</option>
							{DOCUMENT_TYPES.map((dt) => (
								<option key={dt.value} value={dt.value}>
									{dt.label}
								</option>
							))}
						</select>
					</div>

					{/* Message */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">
							Message <span className="text-muted-foreground font-normal">(optional)</span>
						</label>
						<textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Add a note for the employee..."
							rows={3}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
					<button
						onClick={resetAndClose}
						disabled={sending}
						className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleSend}
						disabled={sending || !documentType}
						className="px-5 py-2 text-sm font-medium text-white bg-[#00B4B8] rounded-full hover:bg-[#00A0A4] transition-colors disabled:opacity-50"
					>
						{sending ? "Sending..." : "Send Request"}
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
