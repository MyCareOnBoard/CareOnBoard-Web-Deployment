import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("provider startup boundaries", () => {
  it("keeps payroll startup free of the full messaging and Google Maps implementations", () => {
    const main = source("../main.tsx");
    expect(main).not.toContain("MessagingProvider");
    expect(main.match(/<GlobalPresenceManager/g)).toHaveLength(1);

    const mapsProvider = source("./GoogleMapsProvider.tsx");
    expect(mapsProvider).not.toContain(
      "@react-google-maps/api",
    );
    expect(mapsProvider).toContain("lazy(");
    expect(mapsProvider).toContain("<Suspense fallback={null}>");
    expect(source("./GoogleMapsLoader.tsx")).toContain(
      "@react-google-maps/api",
    );
  });

  it("scopes messaging to every current useMessaging consumer", () => {
    for (const relativePath of [
      "../components/chat/MessagingPage.tsx",
      "../pages/agency/applicant-directory/ApplicantProfilePage.tsx",
      "../pages/agency/dsp-management/DSPProfile.tsx",
    ]) {
      expect(source(relativePath)).toContain("withMessagingProvider");
    }

    const messagingContext = source("../contexts/MessagingContext.tsx");
    expect(messagingContext).not.toContain("usePresenceManager");
  });
});
