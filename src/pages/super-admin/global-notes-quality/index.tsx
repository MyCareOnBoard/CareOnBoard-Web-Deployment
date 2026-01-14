import {useEffect, useMemo, useState} from "react";
import {
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Search,
	Send,
	Sparkles,
} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {useListAllAgenciesQuery} from "@/pages/super-admin/agencies/api";
import {listEmployees} from "@/lib/api/users";
import {Employee, UserType} from "@/utils/auth/types/user.types";

type MetricKey =
	| "totalNotes"
	| "requiredFields"
	| "goalDocumentation"
	| "goalProgress"
	| "aiValidation"
	| "repeatedMissingNotes";

type Audience = "agencies" | "users";

type QualityMetric = {
	key: MetricKey;
	title: string;
	value: string;
	description: string;
};

type RowItem = {
	id: string;
	name: string;
	imageUrl?: string;
	totalNotes: number;
	missingRequiredFields: number;
	poorGoalDocumentation: number;
	aiValidation: number;
};

function getInitials(label: string) {
	return label
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase())
		.join("");
}

function StatCard({
	metric,
	selected,
	onSelect,
}: {
	metric: QualityMetric;
	selected?: boolean;
	onSelect: () => void;
}) {
	return (
		<Card
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onSelect();
			}}
			className={cn(
				"cursor-pointer rounded-2xl border-0 bg-[#f7fafa] shadow-none transition-colors hover:bg-white",
				selected && "bg-[#00b4b8] text-white hover:bg-[#00b4b8]",
			)}
		>
			<CardHeader className="px-6 pt-6">
				<div className="flex items-start justify-between gap-4">
					<CardTitle className={cn("text-sm font-semibold", selected && "text-white")}>{metric.title}</CardTitle>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className={cn(
							"rounded-full bg-white/60 hover:bg-white/80",
							selected && "bg-white/20 hover:bg-white/25",
						)}
						aria-label={`${metric.title} details`}
					>
						<ArrowUpRight className={cn("size-4 text-muted-foreground", selected && "text-white")}/>
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex gap-4 px-6 pb-6">
				<div className={cn("text-3xl font-bold tracking-tight", selected && "text-white")}>{metric.value}</div>
				<CardDescription className={cn(" text-sm font-medium text-gray-500", selected && "text-white")}>{metric.description}</CardDescription>
			</CardContent>
		</Card>
	);
}

function AudiencePills({
	value,
	onChange,
}: {
	value: Audience;
	onChange: (next: Audience) => void;
}) {
	return (
		<div className="inline-flex items-center gap-2 rounded-full bg-white/60 p-1">
			<Button
				type="button"
				size="sm"
				variant={value === "agencies" ? "default" : "ghost"}
				className="h-9"
				onClick={() => onChange("agencies")}
			>
				Agencies
			</Button>
			<Button
				type="button"
				size="sm"
				variant={value === "users" ? "default" : "ghost"}
				className="h-9"
				onClick={() => onChange("users")}
			>
				Users
			</Button>
		</div>
	);
}

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

	const {
		data: agenciesData,
		isLoading: agenciesLoading,
		isError: agenciesIsError,
		error: agenciesError,
	} = useListAllAgenciesQuery(
		{},
		{
			skip: view !== "list" || audience !== "agencies",
		},
	);

	const [usersData, setUsersData] = useState<Employee[]>([]);
	const [usersLoading, setUsersLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		if (view !== "list" || audience !== "users") return;

		setUsersLoading(true);
		listEmployees({
			userType: UserType.EMPLOYEE,
			limit: 100,
			page: 1,
			sortBy: "fullName",
			sortOrder: "asc",
		})
			.then((res) => {
				if (cancelled) return;
				setUsersData(res.employees ?? []);
			})
			.catch((err) => {
				if (cancelled) return;
				console.error("[GlobalNotesQuality] Failed to load users:", err);
				setUsersData([]);
			})
			.finally(() => {
				if (cancelled) return;
				setUsersLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [view, audience]);

	const metrics: QualityMetric[] = useMemo(
		() => [
			{
				key: "totalNotes",
				title: "Total notes",
				value: "1200",
				description: "Total number of notes submitted this week",
			},
			{
				key: "requiredFields",
				title: "Required Fields",
				value: "140",
				description: "Total number of notes missing required fields",
			},
			{
				key: "goalDocumentation",
				title: "Goal documentation",
				value: "320",
				description: "Agencies with poor goal documentation",
			},
			{
				key: "goalProgress",
				title: "Goal progress",
				value: "10",
				description: "Clients without goal progress updates",
			},
			{
				key: "aiValidation",
				title: "AI Validation",
				value: "260",
				description: "Total number of notes failing AI validation",
			},
			{
				key: "repeatedMissingNotes",
				title: "Repeated missing notes",
				value: "262",
				description: "Staff with repeated missing notes",
			},
		],
		[],
	);

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

	const fallbackAgencies: RowItem[] = useMemo(
		() => [
			{
				id: "iota-digital",
				name: "IOTA Digital",
				totalNotes: 234,
				missingRequiredFields: 234,
				poorGoalDocumentation: 234,
				aiValidation: 23,
			},
		],
		[],
	);

	const fallbackUsers: RowItem[] = useMemo(
		() => [
			{
				id: "nola-hawkins",
				name: "Nola Hawkins",
				totalNotes: 234,
				missingRequiredFields: 234,
				poorGoalDocumentation: 234,
				aiValidation: 23,
			},
		],
		[],
	);

	const agencies: RowItem[] = useMemo(() => {
		if (agenciesLoading) return [];
		const list = agenciesData?.agencies ?? [];
		if (list.length === 0) {
			if (agenciesIsError) console.error("[GlobalNotesQuality] Failed to load agencies:", agenciesError);
			return agenciesIsError ? fallbackAgencies : [];
		}

		return list.map((agency) => ({
			id: agency.id,
			name: agency.name,
			imageUrl: agency.logo,
			totalNotes: 234,
			missingRequiredFields: 234,
			poorGoalDocumentation: 234,
			aiValidation: 23,
		}));
	}, [agenciesData, agenciesIsError, agenciesError, fallbackAgencies]);

	const users: RowItem[] = useMemo(() => {
		if (usersLoading) return [];
		if (!usersData.length) return fallbackUsers;

		return usersData
			.map((u) => {
				const id = u.id;
				const name = u.fullName || u.email || "Unknown";
				if (!id) return null;
				return {
					id,
					name,
					imageUrl: u.profilePicture,
					totalNotes: 234,
					missingRequiredFields: 234,
					poorGoalDocumentation: 234,
					aiValidation: 23,
				} satisfies RowItem;
			})
			.filter(Boolean) as RowItem[];
	}, [usersData, fallbackUsers]);

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
				<div className="mt-6">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{metrics.map((metric) => (
							<StatCard
								key={metric.key}
								metric={metric}
								selected={metric.key === "totalNotes"}
								onSelect={() => {
									setSelectedMetric(metric.key);
									setView("list");
								}}
							/>
						))}
					</div>

					<div className="mt-16 flex flex-col items-center text-center">
						<div className="mb-4 flex size-10 items-center justify-center rounded-full bg-transparent">
							<Sparkles fill="black" className="size-5 text-black"/>
						</div>
						<div className="text-base font-semibold text-foreground">Ask Care AI anything</div>

						<div className="mt-8 w-full max-w-[880px]">
							<div className="text-left text-xs text-muted-foreground">Suggestions on what to ask Our AI</div>
							<div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
								{suggestionPrompts.map((prompt) => (
									<Button
										key={prompt}
										type="button"
										variant="outline"
										className="h-11 justify-start rounded-xl border-none bg-[#f7fafa] font-normal"
										onClick={() => {
											setAiPrompt(prompt);
											handleAskAI(prompt);
										}}
									>
										{prompt}
									</Button>
								))}
							</div>

							<div className="mt-4 flex items-center w-[55%] mx-auto rounded-full ">
								<Input 
                           className="border-none w-full bg-[#f7fafa] focus:ring-[#00b4b8] p-7 rounded-full"
									value={aiPrompt}
									onChange={(e) => setAiPrompt(e.target.value)}
									placeholder="Ask Care AI"
								/>
								<Button
									type="button"
									size="icon"
									className="shrink-0 -ml-13"
									disabled={!canSendPrompt}
									onClick={() => handleAskAI()}
									aria-label="Send"
								>
									<Send className="size-5"/>
								</Button>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="mt-6">
					<div className="mb-4 flex items-center gap-3">
						<Button
							type="button"
							variant="ghost"
							className="h-10 rounded-xl bg-white/60"
							onClick={() => {
								setView("overview");
								setCurrentPage(1);
							}}
						>
							<ChevronLeft className="size-5"/>
							Back
						</Button>
						<AudiencePills
							value={audience}
							onChange={(next) => {
								setAudience(next);
								setSearch("");
								setCurrentPage(1);
							}}
						/>
					</div>

					<div className="rounded-3xl bg-white/55 p-6 ">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<div className="text-lg font-semibold text-foreground">{metricTitle}</div>
								<div className="mt-1 text-xs text-muted-foreground">
									Notes Filtered By {audience === "agencies" ? "Agencies" : "Users"}
								</div>
							</div>

							<div className="relative w-full md:w-[360px]">
								<Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search"
									className="pl-11 rounded-3xl border-none bg-white/60 focus:ring-[#00b4b8]"
								/>
							</div>
						</div>

						<div className="mt-5 overflow-hidden rounded-2xl bg-[#f7fafa]">
							<div className="grid grid-cols-[260px_120px_170px_170px_120px_140px] gap-2 px-5 py-4 text-xs font-semibold text-muted-foreground">
								<div>{audience === "agencies" ? "Agency" : "User"}</div>
								<div>Total Notes</div>
								<div>Missing Required Fields</div>
								<div>Poor Goal Documentation</div>
								<div>AI Validation</div>
								<div className="text-right">&nbsp;</div>
							</div>
							<div className="h-px w-full bg-border"/>
							{audience === "agencies" && agenciesLoading ? (
								<div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading agencies...</div>
							) : null}
							{audience === "users" && usersLoading ? (
								<div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading users...</div>
							) : null}
							{paginatedRows.map((row) => (
								<div
									key={row.id}
									className="grid grid-cols-[260px_120px_170px_170px_120px_140px] items-center gap-2 px-5 py-4 text-sm"
								>
									<div className="flex items-center gap-3">
										<Avatar className="size-10 rounded-xl">
											{row.imageUrl ? (
												<AvatarImage
													src={row.imageUrl}
													alt={row.name}
													className="h-full w-full rounded-xl object-cover"
												/>
											) : null}
											<AvatarFallback className="rounded-xl bg-primary/10 text-xs font-semibold text-[#00b4b8]">
												{getInitials(row.name)}
											</AvatarFallback>
										</Avatar>
										<div className="font-semibold text-foreground">{row.name}</div>
									</div>
									<div className="font-medium text-muted-foreground">{row.totalNotes}</div>
									<div className="font-medium text-muted-foreground">{row.missingRequiredFields}</div>
									<div className="font-medium text-muted-foreground">{row.poorGoalDocumentation}</div>
									<div className="font-medium text-muted-foreground">{row.aiValidation}</div>
									<div className="flex justify-end">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="h-9 rounded-xl bg-gray-100 px-3 text-xs text-muted-foreground border-gray-400"
										>
											View Details
										</Button>
									</div>
								</div>
							))}
						</div>

						<div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<div>{safePage}/{totalPages}</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Previous page"
								disabled={safePage <= 1}
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							>
								<ChevronLeft className="size-5"/>
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Next page"
								disabled={safePage >= totalPages}
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							>
								<ChevronRight className="size-5"/>
							</Button>
						</div>
					</div>

				</div>
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

