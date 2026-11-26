import { addDays, differenceInCalendarDays, format, isValid, parseISO, subDays } from "date-fns";
import { Routes } from "@/routes/constants";
import { CI_PROGRAMS } from "@/lib/api/ci-tracker";
import { DocumentType, SubmissionStatus, type GoalDocument } from "@/lib/api/goals-and-documents";
import type { CareerPlanSummary } from "@/lib/api/career-planning";
import type { Client, ClientService } from "@/lib/api/clients";
import { findOutcomeStatementsForServiceCode } from "@/pages/shared/client-management/utils/outcomeServices";

/**
 * The DDD forms a client can owe on Goals & documents, and how each card's state is worked out
 * from the client's services, ISP plan year and saved documents.
 *
 * Due dates (agency rules of thumb, not DDD deadlines):
 * - goals and training plans are due GOALS_DUE_DAYS after the plan year (or service) starts;
 * - annual updates are due by the end of the plan year and show as due ANNUAL_DUE_WINDOW_DAYS before.
 */
export const GOALS_DUE_DAYS = 30;
export const ANNUAL_DUE_WINDOW_DAYS = 60;

export type GoalFormKey =
    | "career_planning"
    | "ci_goals"
    | "day_goals"
    | "natural_supports"
    | "prevoc_goals"
    | "ci_annual"
    | "day_annual"
    | "prevoc_annual";

export type GoalFormIcon = "briefcase" | "flag" | "sparkle" | "people" | "cap" | "cycle";

export interface GoalFormDef {
    key: GoalFormKey;
    title: string;
    description: string;
    icon: GoalFormIcon;
    kind: "goals" | "annual" | "career";
    documentType?: DocumentType;
    route: string;
    /** Whether one of the client's services calls for this form. */
    matches: (service: ClientService) => boolean;
}

const codeIn = (codes: string[]) => (s: ClientService) => codes.includes((s.code ?? "").trim().toUpperCase());
const nameHas = (...words: string[]) => (s: ClientService) => {
    const name = `${s.name ?? ""} ${s.procedureName ?? ""}`.toLowerCase();
    return words.some((w) => name.includes(w));
};
const either = (...tests: ((s: ClientService) => boolean)[]) => (s: ClientService) => tests.some((t) => t(s));

const isCi = either(codeIn(CI_PROGRAMS.ci.serviceCodes), nameHas("community inclusion"));
const isDay = (s: ClientService) => !isCi(s) && either(codeIn(CI_PROGRAMS.day.serviceCodes), nameHas("day habilitation", "day hab"))(s);
const isPrevoc = nameHas("prevocational", "pre-vocational", "prevoc");
const isCareer = nameHas("career planning");
const isNaturalSupports = nameHas("natural support");

const goals = Routes.agency.goalsAndDocuments;

export const GOAL_FORMS: GoalFormDef[] = [
    { key: "career_planning", title: "Career planning", description: "Annual plan for job interests and steps.", icon: "briefcase", kind: "career", route: goals.careerPlanning, matches: isCareer },
    { key: "ci_goals", title: "CI individualized goals", description: "Community inclusion goals per client.", icon: "flag", kind: "goals", documentType: DocumentType.COMMUNITY_INCLUSION_INDIVIDUALIZED_GOALS, route: goals.communityInclusionIndividualizedGoals, matches: isCi },
    { key: "day_goals", title: "Day hab goals", description: "Outcomes tracked in day habilitation notes.", icon: "sparkle", kind: "goals", documentType: DocumentType.DAY_HABILITATION_INDIVIDUALIZED_GOALS, route: goals.dayHabilitationIndividualizedGoals, matches: isDay },
    { key: "natural_supports", title: "Natural supports training", description: "Training plan for family and friends.", icon: "people", kind: "goals", documentType: DocumentType.NATURAL_SUPPORTS_TRAINING, route: goals.naturalSupportsTraining, matches: isNaturalSupports },
    { key: "prevoc_goals", title: "Prevocational goals", description: "Skills that lead toward work.", icon: "cap", kind: "goals", documentType: DocumentType.PREVOCATIONAL_TRAINING_INDIVIDUALIZED_GOALS, route: goals.prevocationalTrainingIndividualizedGoals, matches: isPrevoc },
    { key: "ci_annual", title: "CI annual update", description: "Yearly review of community inclusion.", icon: "cycle", kind: "annual", documentType: DocumentType.COMMUNITY_INCLUSION_SERVICES, route: goals.communityInclusionServices, matches: isCi },
    { key: "day_annual", title: "Day hab annual update", description: "Yearly review of day habilitation.", icon: "cycle", kind: "annual", documentType: DocumentType.DAY_HABILITATION_SERVICES, route: goals.dayHabilitationServices, matches: isDay },
    { key: "prevoc_annual", title: "Prevoc annual update", description: "Yearly review of prevocational goals.", icon: "cycle", kind: "annual", documentType: DocumentType.PREVOCATIONAL_TRAINING_SERVICES, route: goals.prevocationalTrainingServices, matches: isPrevoc },
];

export function goalFormForDocumentType(documentType: string): GoalFormDef | undefined {
    return GOAL_FORMS.find((f) => f.documentType === documentType);
}

export type GoalCardState = "completed" | "review" | "due" | "overdue" | "not_started";

export interface GoalFormCard {
    form: GoalFormDef;
    state: GoalCardState;
    /** Footer line under the card, e.g. "Due 30 Nov 2026". */
    detail: string;
    /** Where "Fill now" / "View" goes. */
    href: string;
    action: "fill" | "view";
}

function parseDay(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = parseISO(value);
    return isValid(date) ? date : null;
}

const formatDay = (date: Date) => format(date, "d MMM yyyy");

/** The client's flat service list (the server derives `services` from `outcomes`; fall back to the outcomes). */
export function clientServices(client: Pick<Client, "services" | "outcomes"> | null | undefined): ClientService[] {
    if (!client) return [];
    if (client.services?.length) return client.services;
    return (client.outcomes ?? []).flatMap((o) => o.services ?? []);
}

/** Start and end of the client's plan year for a form: the ISP period, else the matching service authorization. */
export function planYearFor(client: Pick<Client, "ispPeriod"> | null | undefined, services: ClientService[]): { start: Date | null; end: Date | null } {
    const start = parseDay(client?.ispPeriod?.startDate);
    const end = parseDay(client?.ispPeriod?.endDate);
    if (start || end) return { start, end };
    const service = services[0];
    return {
        start: parseDay(service?.startAuthDate) ?? parseDay(service?.ispEffectiveDate),
        end: parseDay(service?.endAuthDate),
    };
}

/** The plan year a form covers for this client, as yyyy-MM-dd strings for the forms' date inputs. */
export function planYearDatesForDocument(client: Pick<Client, "ispPeriod" | "services" | "outcomes"> | null | undefined, documentType: string): { start: string; end: string } {
    const form = goalFormForDocumentType(documentType);
    const { start, end } = planYearFor(client, form ? clientServices(client).filter(form.matches) : []);
    return { start: start ? format(start, "yyyy-MM-dd") : "", end: end ? format(end, "yyyy-MM-dd") : "" };
}

/** ISP outcome statements nested over the services this form is for, in plan order. */
export function ispOutcomesForForm(client: Pick<Client, "outcomes" | "services"> | null | undefined, form: GoalFormDef): string[] {
    const services = clientServices(client).filter(form.matches);
    const codes = [...new Set(services.map((s) => (s.code ?? "").trim()).filter(Boolean))];
    const statements = codes.flatMap((code) => findOutcomeStatementsForServiceCode(client?.outcomes, code));
    const own = services.flatMap((s) => s.outcomes ?? []);
    return [...new Set([...statements, ...own].map((s) => s.trim()).filter(Boolean))];
}

const submittedAt = (d: GoalDocument) => parseDay(d.submittedAt) ?? parseDay(d.updatedAt);
const isCiGoals = (form: GoalFormDef) => form.documentType === DocumentType.COMMUNITY_INCLUSION_INDIVIDUALIZED_GOALS || form.documentType === DocumentType.DAY_HABILITATION_INDIVIDUALIZED_GOALS;

function withQuery(route: string, params: Record<string, string | undefined>) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) query.set(k, v);
    const qs = query.toString();
    return qs ? `${route}?${qs}` : route;
}

function dueState(due: Date | null, now: Date, windowDays: number): { state: GoalCardState; detail: string } {
    if (!due) return { state: "due", detail: "Needed this plan year" };
    const days = differenceInCalendarDays(due, now);
    if (days < 0) return { state: "overdue", detail: `Overdue since ${format(due, "d MMM")}` };
    if (days <= windowDays) return { state: "due", detail: `Due ${formatDay(due)}` };
    return { state: "not_started", detail: `Due ${formatDay(due)}` };
}

/**
 * One card per form the picked client's services call for (no Community Inclusion service, no CI cards).
 * `documents` are the client's goal documents (drafts and submitted).
 */
export function buildGoalFormCards({ client, clientId, documents, careerPlans, now = new Date() }: {
    client: Pick<Client, "services" | "outcomes" | "ispPeriod"> | null;
    clientId: string;
    documents: GoalDocument[];
    careerPlans?: CareerPlanSummary[];
    now?: Date;
}): GoalFormCard[] {
    function buildCard(form: GoalFormDef, matching: ClientService[]): GoalFormCard {
        const plan = planYearFor(client, matching);
        const fillHref = withQuery(form.route, { clientId });

        if (form.kind === "career") {
            const plans = (careerPlans ?? []).filter((p) => p.clientId === clientId);
            const published = plans.filter((p) => p.publishedSummary).sort((a, b) => (b.publishedSummary!.publishedAt).localeCompare(a.publishedSummary!.publishedAt))[0];
            if (published?.publishedSummary && !plans.some((p) => p.hasDraft && !p.publishedSummary)) {
                return { form, state: "completed", detail: `Completed ${formatDay(parseDay(published.publishedSummary.publishedAt) ?? now)}`, href: fillHref, action: "view" };
            }
            const due = plan.start ? addDays(plan.start, GOALS_DUE_DAYS) : null;
            return { form, ...dueState(due, now, Number.POSITIVE_INFINITY), href: fillHref, action: "fill" };
        }

        const ofType = documents.filter((d) => d.documentType === form.documentType);
        const submitted = ofType.filter((d) => d.status === SubmissionStatus.SUBMITTED).sort((a, b) => (submittedAt(b)?.getTime() ?? 0) - (submittedAt(a)?.getTime() ?? 0));
        const draft = ofType.find((d) => d.status === SubmissionStatus.DRAFT);
        const latest = submitted[0];
        const latestAt = latest ? submittedAt(latest) : null;

        if (form.kind === "annual") {
            // Done for this plan year once an update was submitted after the plan year started.
            const due = plan.end;
            const yearStart = plan.start ?? (due ? subDays(due, 365) : null);
            if (latest && latestAt && !draft && (!yearStart || latestAt >= yearStart)) {
                return { form, state: "completed", detail: `Completed ${formatDay(latestAt)}`, href: withQuery(form.route, { firebaseId: latest.id, clientId }), action: "view" };
            }
            const status = dueState(due, now, ANNUAL_DUE_WINDOW_DAYS);
            return { form, ...(draft ? { state: status.state === "not_started" ? "due" as const : status.state, detail: `Draft · ${status.detail}` } : status), href: fillHref, action: "fill" };
        }

        // Goals and training plans: one per plan year. A submission from before the plan year is last year's.
        const current = latest && latestAt && (!plan.start || latestAt >= subDays(plan.start, ANNUAL_DUE_WINDOW_DAYS)) ? latest : null;
        if (current && latestAt && !draft) {
            const href = withQuery(form.route, { firebaseId: current.id, clientId });
            if (isCiGoals(form) && current.approval?.status !== "approved") {
                return { form, state: "review", detail: `Submitted ${formatDay(latestAt)}`, href, action: "view" };
            }
            return { form, state: "completed", detail: `Completed ${formatDay(latestAt)}`, href, action: "view" };
        }
        const due = plan.start ? addDays(plan.start, GOALS_DUE_DAYS) : null;
        const status = dueState(due, now, Number.POSITIVE_INFINITY);
        return { form, state: status.state, detail: draft ? `Draft · ${status.detail}` : status.detail, href: fillHref, action: "fill" };
    }

    const services = clientServices(client);
    return GOAL_FORMS.flatMap((form) => {
        const matching = services.filter(form.matches);
        return matching.length ? [buildCard(form, matching)] : [];
    });
}

export const CARD_FILTERS = {
    all: () => true,
    due: (c: GoalFormCard) => c.state === "due" || c.state === "overdue" || c.state === "review",
    completed: (c: GoalFormCard) => c.state === "completed",
} as const;
export type GoalCardFilter = keyof typeof CARD_FILTERS;
