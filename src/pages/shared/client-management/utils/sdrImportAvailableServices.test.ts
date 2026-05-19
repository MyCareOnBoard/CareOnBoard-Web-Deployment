import { describe, expect, it } from "vitest";
import { createEmptyServiceAuthorization } from "../types/formData";
import {
  buildCompactSdrAvailableServicesContext,
  serializeSdrAvailableServicesContext,
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
});
