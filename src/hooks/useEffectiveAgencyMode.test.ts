import { describe, expect, it, vi } from "vitest";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

vi.mock("@/utils/auth", () => ({ useAuth: vi.fn() }));
vi.mock("react-redux", () => ({ useSelector: vi.fn() }));

import { resolveEffectiveAgencyMode } from "./useEffectiveAgencyMode";

describe("resolveEffectiveAgencyMode", () => {
  const cases: Array<{
    label: string;
    supportedTypes: readonly ("ddd" | "hha")[];
    storedMode: AgencyMode | null;
    expected: AgencyMode | null;
  }> = [
    { label: "DDD-only", supportedTypes: ["ddd"] as const, storedMode: "hha", expected: "ddd" },
    { label: "HHA-only", supportedTypes: ["hha"] as const, storedMode: "ddd", expected: "hha" },
    { label: "dual with stored mode", supportedTypes: ["ddd", "hha"] as const, storedMode: "hha", expected: "hha" },
    { label: "dual without a stored mode", supportedTypes: ["ddd", "hha"] as const, storedMode: null, expected: null },
    { label: "unsupported-type fallback", supportedTypes: [] as const, storedMode: null, expected: "ddd" },
  ];

  it.each(cases)("returns $expected for $label agencies", ({ supportedTypes, storedMode, expected }) => {
    expect(resolveEffectiveAgencyMode(supportedTypes, storedMode)).toBe(expected);
  });
});
