import {useEffect, useMemo, useState} from "react";

import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {listEmployees} from "@/lib/api/users";
import {
	getGlobalNotesQualityStats,
	listGlobalNotesQualityAgencies,
	listGlobalNotesQualityUsers,
	type GlobalNotesQualityAgency,
	type GlobalNotesQualityStatsResponse,
} from "@/lib/api/global-notes-quality";
import {Employee, UserType} from "@/utils/auth/types/user.types";

import type {Audience, MetricKey, QualityMetric, RowItem} from "./types";
import {GlobalNotesAiView} from "./components/GlobalNotesAiView";
import {GlobalNotesTotalsView} from "./components/GlobalNotesTotalsView";

export default function GlobalNotesQualityPage() {
	const [view, setView] = useState<"overview" | "list">("overview");
	const [audience, setAudience] = useState<Audience>("agencies");
	const [selectedMetric, setSelectedMetric] = useState<MetricKey>("totalNotes");
	const [search, setSearch] = useState<string>("");
	const [currentPage, setCurrentPage] = useState<number>(1);
	const pageSize = 10;

	const [aiPrompt, setAiPrompt] = useState<string>("");
	const [aiThinking, setAiThinking] = useState<boolean>(false);
	const canSendPrompt = aiPrompt.trim().length > 0;

	const [statsData, setStatsData] = useState<GlobalNotesQualityStatsResponse | null>(null);
	const [statsLoading, setStatsLoading] = useState(false);

	const [agenciesData, setAgenciesData] = useState<GlobalNotesQualityAgency[]>([]);
	const [agenciesLoading, setAgenciesLoading] = useState(false);

	const [usersData, setUsersData] = useState<RowItem[]>([]);
	const [usersLoading, setUsersLoading] = useState(false);
	const [isUsersApiAvailable, setIsUsersApiAvailable] = useState<boolean | null>(null);

	useEffect(() => {
		let cancelled = false;
		setStatsLoading(true);
		getGlobalNotesQualityStats()
			.then((res) => {
				if (cancelled) return;
				setStatsData(res);
			})
			.catch((err) => {
				if (cancelled) return;
				console.error("[GlobalNotesQuality] Failed to load global stats:", err);
				setStatsData(null);
			})
			.finally(() => {
				if (cancelled) return;
				setStatsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		setAgenciesLoading(true);
		listGlobalNotesQualityAgencies()
			.then((res) => {
				if (cancelled) return;
				setAgenciesData(res.agencies ?? []);
			})
			.catch((err) => {
				if (cancelled) return;
				console.error("[GlobalNotesQuality] Failed to load agencies:", err);
				setAgenciesData([]);
			})
			.finally(() => {
				if (cancelled) return;
				setAgenciesLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		if (view !== "list" || audience !== "users") return;

		setUsersLoading(true);
		listGlobalNotesQualityUsers()
			.then((res) => {
				if (cancelled) return;
				setIsUsersApiAvailable(true);
				const list = res.employees ?? [];
				setUsersData(
					list
						.map((u) => {
							const name = u.fullName || "Unknown";
							return {
								id: u.id,
								name,
								imageUrl: u.profilePictureUrl,
								totalNotes: Number(u.notesCount) || 0,
								missingRequiredFields: Number(u.missingRequiredFields) || 0,
								poorGoalDocumentation: Number(u.poorGoalDocumentation) || 0,
								aiValidation: Number(u.aiValidation) || 0,
							} satisfies RowItem;
						})
						.filter((row) => Boolean(row.id)),
				);
			})
			.catch((err) => {
				if (cancelled) return;
				setIsUsersApiAvailable(false);
				console.warn("[GlobalNotesQuality] Users endpoint failed; falling back to /employees", err);
				return listEmployees({
					userType: UserType.EMPLOYEE,
					limit: 100,
					page: 1,
					sortBy: "fullName",
					sortOrder: "asc",
				})
					.then((res) => {
						if (cancelled) return;
						setUsersData(
							(res.employees ?? [])
								.map((u: Employee) => {
									const id = u.id;
									if (!id) return null;
									return {
										id,
										name: u.fullName || u.email || "Unknown",
										imageUrl: u.profilePicture,
										totalNotes: null,
										missingRequiredFields: null,
										poorGoalDocumentation: null,
										aiValidation: null,
									} satisfies RowItem;
								})
								.filter(Boolean) as RowItem[],
						);
					})
					.catch((fallbackErr) => {
						if (cancelled) return;
						console.error("[GlobalNotesQuality] Failed to load employees fallback:", fallbackErr);
						setUsersData([]);
					});
			})
			.finally(() => {
				if (cancelled) return;
				setUsersLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [view, audience]);

	const goalDocumentationTotal = useMemo(() => {
		if (!agenciesData?.length) return null;
		return agenciesData.reduce((sum, a) => sum + (Number(a.poorGoalDocumentation) || 0), 0);
	}, [agenciesData]);

	const metrics: QualityMetric[] = useMemo(() => {
		const formatValue = (value: number | null | undefined) => {
			if (typeof value !== "number" || Number.isNaN(value)) return "—";
			return value.toLocaleString();
		};

		const totalNotes = statsData?.totalNotes ?? null;
		const requiredFields = statsData?.requiredField ?? null;
		const goalProgress = statsData?.goalProgress ?? null;
		const aiValidation = statsData?.aiValidation ?? null;
		const repeatedMissingNotes = statsData?.repeatedMissingNotes ?? null;

		return [
			{
				key: "totalNotes",
				title: "Total notes",
				value: statsLoading ? "—" : formatValue(totalNotes),
				description: "Total number of notes submitted this week",
			},
			{
				key: "requiredFields",
				title: "Required Fields",
				value: statsLoading ? "—" : formatValue(requiredFields),
				description: "Total number of notes missing required fields",
			},
			{
				key: "goalDocumentation",
				title: "Goal documentation",
				value: agenciesLoading ? "—" : formatValue(goalDocumentationTotal),
				description: "Agencies with poor goal documentation",
			},
			{
				key: "goalProgress",
				title: "Goal progress",
				value: statsLoading ? "—" : formatValue(goalProgress),
				description: "Clients without goal progress updates",
			},
			{
				key: "aiValidation",
				title: "AI Validation",
				value: statsLoading ? "—" : formatValue(aiValidation),
				description: "Total number of notes failing AI validation",
			},
			{
				key: "repeatedMissingNotes",
				title: "Repeated missing notes",
				value: statsLoading ? "—" : formatValue(repeatedMissingNotes),
				description: "Staff with repeated missing notes",
			},
		];
	}, [agenciesLoading, goalDocumentationTotal, statsData, statsLoading]);

	const metricTitle = useMemo(() => {
		const metric = metrics.find((m) => m.key === selectedMetric);
		return metric?.title ?? "Total notes";
	}, [metrics, selectedMetric]);

	const suggestionPrompts = useMemo(
		() => [
			"Generate quality score per agency",
			"Suggest which staff require retraining",
			"Predict documentation deficiencies",
		],
		[],
	);

	const agencies: RowItem[] = useMemo(() => {
		if (agenciesLoading) return [];
		return (agenciesData ?? []).map((agency) => ({
			id: agency.id,
			name: agency.name,
			imageUrl: agency.logo,
			totalNotes: Number(agency.notesCount) || 0,
			missingRequiredFields: Number(agency.missingRequiredFields) || 0,
			poorGoalDocumentation: Number(agency.poorGoalDocumentation) || 0,
			aiValidation: Number(agency.aiValidation) || 0,
		}));
	}, [agenciesData, agenciesLoading]);

	const users: RowItem[] = useMemo(() => {
		if (usersLoading) return [];
		return usersData;
	}, [usersData, usersLoading]);

	const rows = useMemo(() => (audience === "agencies" ? agencies : users), [audience, agencies, users]);
	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => r.name.toLowerCase().includes(q));
	}, [rows, search]);

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(filteredRows.length / pageSize));
	}, [filteredRows.length, pageSize]);

	const safePage = Math.min(currentPage, totalPages);
	const paginatedRows = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return filteredRows.slice(start, start + pageSize);
	}, [filteredRows, safePage, pageSize]);

	useEffect(() => {
		setCurrentPage(1);
	}, [view, audience, search, selectedMetric]);

	const handleAskAI = (promptOverride?: string) => {
		const prompt = (promptOverride ?? aiPrompt).trim();
		if (!prompt) return;

		setAiThinking(true);
		window.setTimeout(() => {
			setAiThinking(false);
			setView("list");
			setCurrentPage(1);
		}, 1100);
	};

	return (
		<div className="">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight text-foreground">Global Notes Quality</h1>
			</div>

			{view === "overview" ? (
				<GlobalNotesAiView
					metrics={metrics}
					selectedMetric={selectedMetric}
					onSelectMetric={(metric) => {
						setSelectedMetric(metric);
						setView("list");
						setCurrentPage(1);
					}}
					suggestionPrompts={suggestionPrompts}
					aiPrompt={aiPrompt}
					onAiPromptChange={(value) => setAiPrompt(value)}
					canSend={canSendPrompt}
					onAskAi={(promptOverride) => {
						if (typeof promptOverride === "string") setAiPrompt(promptOverride);
						handleAskAI(promptOverride);
					}}
				/>
			) : (
				<GlobalNotesTotalsView
					audience={audience}
					onAudienceChange={(next) => {
						setAudience(next);
						setSearch("");
						setCurrentPage(1);
					}}
					metricTitle={metricTitle}
					search={search}
					onSearchChange={(value) => setSearch(value)}
					isAgenciesLoading={agenciesLoading}
					isUsersLoading={usersLoading}
					rows={paginatedRows}
					onBack={() => {
						setView("overview");
						setCurrentPage(1);
					}}
					safePage={safePage}
					totalPages={totalPages}
					onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
					onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
				/>
			)}

			<Dialog
				open={aiThinking}
				onOpenChange={(next) => {
					if (!next) return;
					setAiThinking(true);
				}}
			>
				<DialogContent showCloseButton={false} className="w-[520px] max-w-[calc(100vw-32px)] p-0">
					<div className="p-8">
						<DialogHeader>
							<DialogTitle className="text-xl">Care AI is thinking...</DialogTitle>
							<DialogDescription className="text-sm">
								Please wait so that the AI can give you best result according to your prompt
							</DialogDescription>
						</DialogHeader>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

