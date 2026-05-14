import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import { countUniqueAssignedDspsForClient } from "@/lib/countUniqueAssignedDsps";
import {
  deriveFlatClientServicesFromWizardOutcomes,
  findOutcomeStatementsForServiceCode,
} from "./outcomeServices";
import { createEmptyServiceAuthorization } from "../types/formData";
import { clientToFormData } from "./clientToFormData";
import { formDataToApiPayload } from "./formDataToApiPayload";

describe("outcomeServices", () => {
  it("deriveFlatClientServicesFromWizardOutcomes dedupes by code and merges DSPs", () => {
    const s1 = { ...createEmptyServiceAuthorization(), code: "A", name: "A svc", assignedDsps: [{ id: "1", name: "D1" }] };
    const s2 = { ...createEmptyServiceAuthorization(), code: "A", name: "A svc", assignedDsps: [{ id: "2", name: "D2" }] };
    const flat = deriveFlatClientServicesFromWizardOutcomes([
      { id: "o1", statement: "G1", services: [s1] },
      { id: "o2", statement: "G2", services: [s2] },
    ]);
    expect(flat.length).toBe(1);
    expect(flat[0].assignedDsps?.length).toBe(2);
    expect(flat[0].outcomes?.sort()).toEqual(["G1", "G2"].sort());
  });

  it("findOutcomeStatementsForServiceCode returns all owning statements", () => {
    const stmts = findOutcomeStatementsForServiceCode(
      [
        { id: "1", statement: "Alpha", services: [{ id: "s1", name: "", code: "X" }] },
        { id: "2", statement: "Beta", services: [{ id: "s2", name: "", code: "X" }] },
      ],
      "x",
    );
    expect(stmts.sort()).toEqual(["Alpha", "Beta"].sort());
  });

  it("countUniqueAssignedDspsForClient counts DSPs from nested outcomes", () => {
    const client = {
      id: "c1",
      outcomes: [
        {
          id: "o1",
          statement: "",
          services: [
            { id: "a", name: "", code: "1", assignedDsps: [{ id: "d1", name: "A" }] },
            { id: "b", name: "", code: "2", assignedDsps: [{ id: "d1", name: "A" }, { id: "d2", name: "B" }] },
          ],
        },
      ],
    } as unknown as Client;
    expect(countUniqueAssignedDspsForClient(client)).toBe(2);
  });
});

describe("clientToFormData outcome migration", () => {
  it("maps nested API outcomes into wizard outcome groups", () => {
    const client = {
      id: "c1",
      outcomes: [
        {
          id: "o1",
          statement: "Increase community participation",
          services: [{ id: "s1", name: "Inclusion", code: "CI01" }],
        },
      ],
    } as unknown as Client;
    const fd = clientToFormData(client);
    const og = fd.stage2.outcomes.find((o) => o.statement === "Increase community participation");
    expect(og?.services.some((s) => s.code === "CI01")).toBe(true);
  });
});

describe("formDataToApiPayload outcomes", () => {
  it("sends outcomes and derived flat services", () => {
    const base = clientToFormData({
      id: "c1",
      firstName: "A",
      lastName: "B",
      services: [],
    } as unknown as Client);
    base.stage1.location = { lat: "1", lon: "2" };
    base.stage1.address = "Addr";
    base.stage2.outcomes = [
      {
        id: "o1",
        statement: "Goal one",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            name: "Day Hab",
            code: "DH1",
          },
        ],
      },
    ];
    const payload = formDataToApiPayload(base, false, false, false);
    expect(payload.outcomes?.length).toBe(1);
    expect(payload.outcomes?.[0].statement).toBe("Goal one");
    expect((payload as Record<string, unknown>).services).toBeUndefined();
    expect(payload.outcomes?.[0].services?.[0]?.code).toBe("DH1");
  });
});
