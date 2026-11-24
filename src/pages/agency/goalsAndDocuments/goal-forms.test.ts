import { describe, expect, it } from "vitest";
import { DocumentType, SubmissionStatus, type GoalDocument } from "@/lib/api/goals-and-documents";
import type { Client } from "@/lib/api/clients";
import { buildGoalFormCards, CARD_FILTERS, GOAL_FORMS, ispOutcomesForForm } from "./goal-forms";

const now = new Date("2026-11-24T12:00:00Z");

const client = {
    ispPeriod: { startDate: "2026-11-01", endDate: "2027-01-10" },
    services: [
        { id: "s1", name: "Community Inclusion Services", code: "H2015-CI" },
        { id: "s2", name: "Day Habilitation", code: "H2015" },
    ],
    outcomes: [
        { id: "o1", statement: "Asahel will visit the library weekly.", services: [{ id: "s1", name: "Community Inclusion Services", code: "H2015-CI" }] },
        { id: "o2", statement: "Asahel will practise cooking.", services: [{ id: "s2", name: "Day Habilitation", code: "H2015" }] },
    ],
} as unknown as Client;

const doc = (over: Partial<GoalDocument>): GoalDocument => ({
    id: "d", agencyId: "a", clientId: "c1", documentType: DocumentType.COMMUNITY_INCLUSION_INDIVIDUALIZED_GOALS,
    status: SubmissionStatus.DRAFT, metadata: {} as never, createdBy: "u", createdAt: "2026-11-02T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z", ...over,
});

const cardFor = (cards: ReturnType<typeof buildGoalFormCards>, key: string) => cards.find((c) => c.form.key === key)!;

describe("goal form cards", () => {
    it("marks forms the client's services call for as due, and the rest as not started", () => {
        const cards = buildGoalFormCards({ client, clientId: "c1", documents: [], now });
        expect(cardFor(cards, "ci_goals")).toMatchObject({ state: "due", detail: "Due 1 Dec 2026", action: "fill", href: expect.stringContaining("clientId=c1") });
        expect(cardFor(cards, "prevoc_goals")).toMatchObject({ state: "not_started", applies: false });
        // Plan year ends 10 Jan, inside the 60-day window.
        expect(cardFor(cards, "ci_annual")).toMatchObject({ state: "due", detail: "Due 10 Jan 2027" });
        expect(cards).toHaveLength(GOAL_FORMS.length);
    });

    it("shows submitted CI goals as needing approval until approved, then completed", () => {
        const submitted = doc({ id: "g1", status: SubmissionStatus.SUBMITTED, submittedAt: "2026-11-10T00:00:00Z" });
        const review = cardFor(buildGoalFormCards({ client, clientId: "c1", documents: [submitted], now }), "ci_goals");
        expect(review).toMatchObject({ state: "review", action: "view", href: expect.stringContaining("firebaseId=g1") });
        const approved = cardFor(buildGoalFormCards({ client, clientId: "c1", documents: [{ ...submitted, approval: { status: "approved", version: 1 } }], now }), "ci_goals");
        expect(approved).toMatchObject({ state: "completed", detail: "Completed 10 Nov 2026" });
    });

    it("treats goals submitted before this plan year as last year's", () => {
        const old = doc({ status: SubmissionStatus.SUBMITTED, submittedAt: "2025-11-10T00:00:00Z", approval: { status: "approved", version: 1 } });
        expect(cardFor(buildGoalFormCards({ client, clientId: "c1", documents: [old], now }), "ci_goals").state).toBe("due");
    });

    it("flags an overdue annual update and keeps a draft visible", () => {
        const late = { ...client, ispPeriod: { startDate: "2025-11-16", endDate: "2026-11-15" } } as Client;
        const cards = buildGoalFormCards({ client: late, clientId: "c1", documents: [doc({ documentType: DocumentType.DAY_HABILITATION_SERVICES })], now });
        expect(cardFor(cards, "day_annual")).toMatchObject({ state: "overdue", detail: "Draft · Overdue since 15 Nov" });
        expect(cards.filter(CARD_FILTERS.due).map((c) => c.form.key)).toContain("day_annual");
    });

    it("prefills goals from the ISP outcomes nested over the program's services", () => {
        const ci = GOAL_FORMS.find((f) => f.key === "ci_goals")!;
        const day = GOAL_FORMS.find((f) => f.key === "day_goals")!;
        expect(ispOutcomesForForm(client, ci)).toEqual(["Asahel will visit the library weekly."]);
        expect(ispOutcomesForForm(client, day)).toEqual(["Asahel will practise cooking."]);
    });
});
