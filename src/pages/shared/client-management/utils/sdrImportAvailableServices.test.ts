import { describe, expect, it } from "vitest";
import { createEmptyServiceAuthorization } from "../types/formData";
import {
  buildCompactSdrAvailableServicesContext,
  buildSdrExtractionContext,
  serializeSdrAvailableServicesContext,
  wizardHasAnchorServices,
} from "./sdrImportAvailableServices";

describe("sdrImportAvailableServices", () => {
  it("serializes outcome and service rows with stable indices", () => {
    const ctx = buildCompactSdrAvailableServicesContext([
      {
        id: "o1",
        statement: "Goal one",
        services: [
          { ...createEmptyServiceAuthorization(), id: "s1", code: "X", name: "A svc" },
        ],
      },
    ]);
    expect(ctx).toHaveLength(1);
    expect(ctx[0].outcomeId).toBe("o1");
    expect(ctx[0].services[0].serviceId).toBe("s1");
    expect(ctx[0].services[0].serviceCode).toBe("X");
    const json = serializeSdrAvailableServicesContext(ctx);
    expect(JSON.parse(json)).toEqual(ctx);
  });

  it("wizardHasAnchorServices is false when no service ids", () => {
    expect(wizardHasAnchorServices([{ id: "o1", statement: "G", services: [] }])).toBe(false);
    expect(
      wizardHasAnchorServices([
        {
          id: "o1",
          statement: "G",
          services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "X" }],
        },
      ]),
    ).toBe(true);
  });

  it("buildSdrExtractionContext returns empty without anchors", () => {
    expect(buildSdrExtractionContext([])).toBe("");
    expect(
      buildSdrExtractionContext([{ id: "o1", statement: "G", services: [] }]),
    ).toBe("");
  });
});
