import { useCallback } from "react";
import { useSearchParams } from "react-router";
import type { CiProgram } from "@/lib/api/ci-tracker";

/**
 * The Care & support attendance panels open over the current page, driven by
 * `?care=<program>&careDate=YYYY-MM-DD&careView=week` so the sidebar, the shift
 * details, the dashboard and the Notes banner can all open them without leaving the page.
 */
const SLUGS: Record<CiProgram, string> = { ci: "community-inclusion", day: "day-program" };

export const CARE_PARAM = "care";
export const CARE_DATE_PARAM = "careDate";
export const CARE_VIEW_PARAM = "careView";
export type CareView = "attendance" | "week";

/** Search string that opens a panel, for links that go to another page first. */
export function careSearch(program: CiProgram, options: { date?: string; view?: CareView } = {}): string {
  const params = new URLSearchParams({ [CARE_PARAM]: SLUGS[program] });
  if (options.date) params.set(CARE_DATE_PARAM, options.date);
  if (options.view === "week") params.set(CARE_VIEW_PARAM, "week");
  return `?${params.toString()}`;
}

export function careProgramFromSlug(slug: string | null): CiProgram | null {
  return (Object.keys(SLUGS) as CiProgram[]).find((p) => SLUGS[p] === slug) ?? null;
}

export function useCarePanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const program = careProgramFromSlug(searchParams.get(CARE_PARAM));
  const requested = searchParams.get(CARE_DATE_PARAM);
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : null;
  const view: CareView = searchParams.get(CARE_VIEW_PARAM) === "week" ? "week" : "attendance";

  const open = useCallback((next: CiProgram, options: { date?: string; view?: CareView } = {}) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set(CARE_PARAM, SLUGS[next]);
      if (options.date) params.set(CARE_DATE_PARAM, options.date); else params.delete(CARE_DATE_PARAM);
      if (options.view === "week") params.set(CARE_VIEW_PARAM, "week"); else params.delete(CARE_VIEW_PARAM);
      return params;
    });
  }, [setSearchParams]);

  const close = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete(CARE_PARAM);
      params.delete(CARE_DATE_PARAM);
      params.delete(CARE_VIEW_PARAM);
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  return { program, date, view, open, close };
}
