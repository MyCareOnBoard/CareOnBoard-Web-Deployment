import { useEffect, useState, useCallback } from "react";
import {
	FileText,
	AlertCircle,
	User,
	Building2,
	Calendar,
	Clock,
	Hash,
	CheckCircle2,
	ClipboardList,
} from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { InlineLoader } from "@/components/ui/loader";
import {
	getAgencyNotes,
	type AgencyNoteDetail,
} from "@/lib/api/global-notes-quality";
import { getEmployeeById } from "@/lib/api/employees";
import { getAgencyById } from "@/lib/api/agencies";

import type { RowItem } from "../types";
import { getInitials } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* ────────────────────────────────────────────── */
/*  Helpers                                       */
/* ────────────────────────────────────────────── */

/** Fields that hold employee/user IDs whose names we want to resolve */
const EMPLOYEE_ID_KEYS = new Set(["employeeId", "submittedBy", "approvedBy"]);
/** Fields that hold agency IDs */
const AGENCY_ID_KEYS = new Set(["agencyId"]);
/** Fields that contain ISO date strings */
const isISODate = (v: unknown): v is string =>
	typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
/** Keys we skip entirely (shown in header or not useful raw) */
const HIDDEN_KEYS = new Set(["id"]);
/** Keys containing arrays of IDs – shown as count badge */
const ARRAY_ID_KEYS = new Set(["submittedLogNoteIds"]);

const DATE_KEYS = new Set([
	"submittedAt",
	"approvedAt",
	"createdAt",
	"updatedAt",
]);

const formatLabel = (key: string): string =>
	key
		.replace(/([A-Z])/g, " $1")
		.replace(/[_-]/g, " ")
		.replace(/\bId\b/gi, "")
		.replace(/^./, (c) => c.toUpperCase())
		.trim();

const formatDate = (iso: string) => {
	try {
		const d = new Date(iso);
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return iso;
	}
};

const formatTime = (iso: string) => {
	try {
		const d = new Date(iso);
		return d.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	} catch {
		return "";
	}
};

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

interface AgencyNotesDetailModalProps {
	open: boolean;
	onClose: () => void;
	agency: RowItem | null;
}

export function AgencyNotesDetailModal({
	open,
	onClose,
	agency,
}: AgencyNotesDetailModalProps) {
	const [notes, setNotes] = useState<AgencyNoteDetail[]>([]);
	const [totalNotes, setTotalNotes] = useState<number>(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/** Cache of resolved names  id → display name */
	const [nameCache, setNameCache] = useState<Record<string, string>>({});

	/* ── Fetch notes ─────────────────────────── */
	useEffect(() => {
		if (!open || !agency?.id) {
			setNotes([]);
			setTotalNotes(0);
			setError(null);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		getAgencyNotes(agency.id)
			.then((res) => {
				if (cancelled) return;
				setNotes(res.notes ?? []);
				setTotalNotes(res.totalNotes ?? 0);
			})
			.catch((err) => {
				if (cancelled) return;
				console.error("[AgencyNotesDetail] Failed to load notes:", err);
				setError("Failed to load notes. Please try again.");
				setNotes([]);
			})
			.finally(() => {
				if (cancelled) return;
				setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [open, agency?.id]);

	/* ── Resolve IDs → names ─────────────────── */
	const resolveNames = useCallback(async (notesList: AgencyNoteDetail[]) => {
		const employeeIds = new Set<string>();
		const agencyIds = new Set<string>();

		for (const note of notesList) {
			for (const [key, value] of Object.entries(note)) {
				if (typeof value !== "string" || !value) continue;
				if (EMPLOYEE_ID_KEYS.has(key)) employeeIds.add(value);
				if (AGENCY_ID_KEYS.has(key)) agencyIds.add(value);
			}
		}

		const updates: Record<string, string> = {};

		await Promise.allSettled(
			[...employeeIds].map(async (id) => {
				try {
					const emp = await getEmployeeById(id);
					if (emp.fullName) updates[id] = emp.fullName;
				} catch {
					/* leave as ID */
				}
			}),
		);

		await Promise.allSettled(
			[...agencyIds].map(async (id) => {
				try {
					const ag = await getAgencyById(id);
					if (ag.name) updates[id] = ag.name;
				} catch {
					/* leave as ID */
				}
			}),
		);

		if (Object.keys(updates).length > 0) {
			setNameCache((prev) => ({ ...prev, ...updates }));
		}
	}, []);

	useEffect(() => {
		if (notes.length > 0) resolveNames(notes);
	}, [notes, resolveNames]);

	/* ── Render helpers ──────────────────────── */
	const displayValue = (key: string, value: unknown): string => {
		if (value == null || value === "") return "—";
		if (typeof value === "string" && (EMPLOYEE_ID_KEYS.has(key) || AGENCY_ID_KEYS.has(key))) {
			return nameCache[value] ?? value;
		}
		if (typeof value === "number") return value.toLocaleString();
		if (typeof value === "boolean") return value ? "Yes" : "No";
		if (Array.isArray(value)) return `${value.length} item${value.length !== 1 ? "s" : ""}`;
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	};

	const iconForKey = (key: string) => {
		if (EMPLOYEE_ID_KEYS.has(key))
			return <User className="size-3.5 text-[#00b4b8] shrink-0" />;
		if (AGENCY_ID_KEYS.has(key))
			return <Building2 className="size-3.5 text-indigo-500 shrink-0" />;
		if (DATE_KEYS.has(key))
			return <Calendar className="size-3.5 text-amber-500 shrink-0" />;
		if (key === "noteCount")
			return <Hash className="size-3.5 text-blue-500 shrink-0" />;
		if (ARRAY_ID_KEYS.has(key))
			return <ClipboardList className="size-3.5 text-purple-500 shrink-0" />;
		return null;
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="w-[760px] max-w-[calc(100vw-32px)] max-h-[85vh] overflow-hidden flex flex-col p-0">
				{/* ── Header ─────────────────────────── */}
				<DialogHeader className="px-6 pt-6 pb-4 border-b">
					<div className="flex items-center gap-3">
						{agency && (
							<Avatar className="size-10 rounded-xl">
								{agency.imageUrl ? (
									<AvatarImage
										src={agency.imageUrl}
										alt={agency.name}
										className="h-full w-full rounded-xl object-cover"
									/>
								) : null}
								<AvatarFallback className="rounded-xl bg-primary/10 text-xs font-semibold text-[#00b4b8]">
									{getInitials(agency?.name ?? "")}
								</AvatarFallback>
							</Avatar>
						)}
						<div>
							<DialogTitle className="text-lg font-semibold">
								{agency?.name ?? "Agency"} — Notes
							</DialogTitle>
							<p className="text-xs text-muted-foreground mt-0.5">
								{loading ? "Loading..." : `${totalNotes} total notes`}
							</p>
						</div>
					</div>
				</DialogHeader>

				{/* ── Summary chips ───────────────────── */}
				{agency && (
					<div className="flex flex-wrap gap-3 px-6 py-3 border-b bg-[#f7fafa]">
						<SummaryChip label="Total Notes" value={agency.totalNotes} />
						<SummaryChip label="Missing Fields" value={agency.missingRequiredFields} warn />
						<SummaryChip label="Poor Goal Doc" value={agency.poorGoalDocumentation} warn />
						<SummaryChip label="AI Validation" value={agency.aiValidation} />
					</div>
				)}

				{/* ── Notes list ──────────────────────── */}
				<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
					{loading && (
						<div className="py-10">
							<InlineLoader text="Loading notes..." />
						</div>
					)}

					{!loading && error && (
						<div className="flex flex-col items-center gap-2 py-10 text-sm text-red-600">
							<AlertCircle className="size-6" />
							{error}
						</div>
					)}

					{!loading && !error && notes.length === 0 && (
						<div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
							<FileText className="size-8 opacity-40" />
							No notes found for this agency.
						</div>
					)}

					{!loading &&
						!error &&
						notes.map((note) => {
							const keys = Object.keys(note).filter((k) => !HIDDEN_KEYS.has(k));

							/* Categorise fields */
							const personFields = keys.filter(
								(k) => EMPLOYEE_ID_KEYS.has(k) || AGENCY_ID_KEYS.has(k),
							);
							const dateFields = keys.filter((k) => DATE_KEYS.has(k) || isISODate(note[k]));
							const metaFields = keys.filter(
								(k) =>
									!personFields.includes(k) &&
									!dateFields.includes(k),
							);

							return (
								<div
									key={note.id}
									className="rounded-2xl border bg-white shadow-sm overflow-hidden"
								>
									{/* Card header */}
									<div className="flex items-center gap-2 bg-linear-to-r from-[#f0fafa] to-white px-5 py-3 border-b">
										<FileText className="size-4 text-[#00b4b8]" />
										<span className="text-sm font-semibold text-foreground truncate">
											{note.id as string}
										</span>
										{typeof note.noteCount === "number" && (
											<span className="ml-auto shrink-0 rounded-full bg-[#00b4b8]/10 text-[#00b4b8] px-2.5 py-0.5 text-[11px] font-semibold">
												{note.noteCount} note{(note.noteCount as number) !== 1 ? "s" : ""}
											</span>
										)}
									</div>

									<div className="px-5 py-4 space-y-4">
										{/* People section */}
										{personFields.length > 0 && (
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
												{personFields.map((key) => (
													<FieldRow
														key={key}
														icon={iconForKey(key)}
														label={formatLabel(key)}
														value={displayValue(key, note[key])}
														isResolved={
															typeof note[key] === "string" &&
															!!nameCache[note[key] as string]
														}
													/>
												))}
											</div>
										)}

										{/* Date / time section */}
										{dateFields.length > 0 && (
											<>
												{personFields.length > 0 && (
													<div className="border-t border-dashed" />
												)}
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
													{dateFields.map((key) => {
														const raw = note[key];
														if (!isISODate(raw))
															return (
																<FieldRow
																	key={key}
																	icon={<Calendar className="size-3.5 text-amber-500 shrink-0" />}
																	label={formatLabel(key)}
																	value="—"
																/>
															);
														return (
															<div key={key} className="flex items-start gap-2">
																<Calendar className="mt-0.5 size-3.5 text-amber-500 shrink-0" />
																<div>
																	<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
																		{formatLabel(key)}
																	</p>
																	<p className="text-sm font-medium text-foreground">
																		{formatDate(raw)}
																		<span className="ml-2 text-xs text-muted-foreground">
																			<Clock className="inline size-3 mr-0.5 -mt-px" />
																			{formatTime(raw)}
																		</span>
																	</p>
																</div>
															</div>
														);
													})}
												</div>
											</>
										)}

										{/* Other fields */}
										{metaFields.length > 0 && (
											<>
												{(personFields.length > 0 || dateFields.length > 0) && (
													<div className="border-t border-dashed" />
												)}
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
													{metaFields.map((key) => (
														<FieldRow
															key={key}
															icon={iconForKey(key)}
															label={formatLabel(key)}
															value={displayValue(key, note[key])}
														/>
													))}
												</div>
											</>
										)}
									</div>
								</div>
							);
						})}
				</div>
			</DialogContent>
		</Dialog>
	);
}

/* ────────────────────────────────────────────── */
/*  Sub-components                                */
/* ────────────────────────────────────────────── */

function FieldRow({
	icon,
	label,
	value,
	isResolved,
}: {
	icon?: React.ReactNode;
	label: string;
	value: string;
	isResolved?: boolean;
}) {
	return (
		<div className="flex items-start gap-2 min-w-0">
			{icon && <span className="mt-0.5">{icon}</span>}
			<div className="min-w-0">
				<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
					{label}
				</p>
				<p
					className={`text-sm font-medium break-all ${
						isResolved ? "text-[#00b4b8]" : "text-foreground"
					}`}
				>
					{value}
				</p>
			</div>
		</div>
	);
}

function SummaryChip({
	label,
	value,
	warn,
}: {
	label: string;
	value: number | null;
	warn?: boolean;
}) {
	const display = typeof value === "number" ? value.toLocaleString() : "—";
	return (
		<div className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm border">
			<span className="text-muted-foreground">{label}:</span>
			<span
				className={`font-semibold ${
					warn && typeof value === "number" && value > 0
						? "text-red-600"
						: "text-foreground"
				}`}
			>
				{display}
			</span>
		</div>
	);
}
