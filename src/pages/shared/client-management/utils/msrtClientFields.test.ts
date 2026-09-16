import { describe, expect, it } from "vitest";
import { createInitialAddClientFormData } from "../types/formData";
import { formDataToApiPayload } from "./formDataToApiPayload";
import { clientToFormData } from "./clientToFormData";
import type { Client } from "@/lib/api/clients";

/** formDataToApiPayload rejects an address with no captured coordinates. */
function seedRequiredAddress(data: ReturnType<typeof createInitialAddClientFormData>) {
  data.stage1.firstName = "Jane";
  data.stage1.lastName = "Client";
  data.stage1.address = "10 Main St";
  data.stage1.location = { lat: "40.7", lon: "-74.0" };
  data.stage1.countyState = "Essex / NJ";
  data.stage1.zipCode = "07001";
}

/**
 * Admission date and acuity are Agency Compliance (MSRT) roster columns added to the
 * client wizard. The property that matters here is the date: the backend stores a
 * civil date (YYYY-MM-DD) and rejects a timestamp, so the form mapper must emit one.
 * A timestamp would also render a day early once formatted in the agency timezone.
 */
describe("MSRT client fields", () => {
  it("emits admissionDate as a civil date, not an ISO timestamp", () => {
    const data = createInitialAddClientFormData();
    seedRequiredAddress(data);
    data.stage1.admissionDate = new Date("2026-02-01T00:00:00.000Z");

    const payload = formDataToApiPayload(data) as Record<string, unknown>;
    expect(payload.admissionDate).toBe("2026-02-01");
  });

  it("passes acuity through, and omits it when unset", () => {
    const data = createInitialAddClientFormData();
    seedRequiredAddress(data);

    expect((formDataToApiPayload(data) as Record<string, unknown>).acuity).toBeUndefined();

    data.stage1.acuity = "behavioral";
    expect((formDataToApiPayload(data) as Record<string, unknown>).acuity).toBe("behavioral");
  });

  it("round-trips both fields back into the form", () => {
    const client = {
      id: "c1",
      type: "ddd",
      firstName: "Jane",
      lastName: "Client",
      admissionDate: "2026-02-01",
      acuity: "both",
    } as unknown as Client;

    const form = clientToFormData(client);
    expect(form.stage1.acuity).toBe("both");
    expect(form.stage1.admissionDate).toBeInstanceOf(Date);

    // Re-emitting must land on the same calendar day it came from.
    seedRequiredAddress(form);
    expect(
      (formDataToApiPayload(form) as Record<string, unknown>).admissionDate,
    ).toBe("2026-02-01");
  });

  it("leaves both fields undefined on a blank form", () => {
    const data = createInitialAddClientFormData();
    expect(data.stage1.admissionDate).toBeUndefined();
    expect(data.stage1.acuity).toBe("");
  });
});
