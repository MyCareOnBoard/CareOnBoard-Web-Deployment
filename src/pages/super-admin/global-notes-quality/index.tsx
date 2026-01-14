import {useMemo, useState} from "react";
import {
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Search,
	Send,
	Sparkles,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

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
	totalNotes: number;
	missingRequiredFields: number;
	poorGoalDocumentation: number;
	aiValidation: number;
};

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

	const [aiPrompt, setAiPrompt] = useState<string>("");
	const [aiThinking, setAiThinking] = useState<boolean>(false);

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

	const agencies: RowItem[] = useMemo(
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

	const users: RowItem[] = useMemo(
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

	const rows = useMemo(() => (audience === "agencies" ? agencies : users), [audience, agencies, users]);
	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => r.name.toLowerCase().includes(q));
	}, [rows, search]);

	const handleAskAI = (promptOverride?: string) => {
		const prompt = (promptOverride ?? aiPrompt).trim();
		if (!prompt) return;

		setAiThinking(true);
		window.setTimeout(() => {
			setAiThinking(false);
			setView("list");
		}, 1100);
	};

	return (
		<div className="max-w-[1150px]">
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

							<div className="mt-4 flex items-center  bg-[#f7fafa] w-[60%] py-1.5 mx-auto rounded-full ">
								<Input
                           className="border-none w-full bg-transparent focus:ring-0 px-6 rounded-full"
									value={aiPrompt}
									onChange={(e) => setAiPrompt(e.target.value)}
									placeholder="Ask Care AI"
								/>
								<Button
									type="button"
									size="icon"
									className="shrink-0 -ml-13 "
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
					<div className="mb-4">
						<AudiencePills
							value={audience}
							onChange={(next) => {
								setAudience(next);
								setSearch("");
							}}
						/>
					</div>

					<div className="rounded-3xl bg-white/55 p-6">
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
									className="pl-11"
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
							{filteredRows.map((row) => (
								<div
									key={row.id}
									className="grid grid-cols-[260px_120px_170px_170px_120px_140px] items-center gap-2 px-5 py-4 text-sm"
								>
									<div className="flex items-center gap-3">
										<div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
											<div className="size-3 rounded-sm bg-primary"/>
										</div>
										<div className="font-semibold text-foreground">{row.name}</div>
									</div>
									<div className="font-medium text-foreground">{row.totalNotes}</div>
									<div className="font-medium text-foreground">{row.missingRequiredFields}</div>
									<div className="font-medium text-foreground">{row.poorGoalDocumentation}</div>
									<div className="font-medium text-foreground">{row.aiValidation}</div>
									<div className="flex justify-end">
										<Button type="button" variant="outline" className="h-10 rounded-xl bg-white/60">
											View Details
										</Button>
									</div>
								</div>
							))}
						</div>

						<div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<div>1/8</div>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Previous page">
								<ChevronLeft className="size-5"/>
							</Button>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Next page">
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

