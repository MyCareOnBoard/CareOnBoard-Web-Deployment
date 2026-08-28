import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLazyListPayrollRunEmployeesQuery } from "../api/payrollRunEndpoints";
import type {
  AgencyPayrollRunScope,
  PayrollEmployeeFilter,
  PayrollEmployeePage,
  PayrollEmployeeSort,
  PayrollEmployeeSummary,
} from "../model/types";

export type PayrollCursorIdentity = AgencyPayrollRunScope & {
  kind: "run";
  runId: string;
  activeRevisionId: string;
  revisionNumber: number;
};

export type UsePayrollCursorPageArgs = {
  identity: PayrollCursorIdentity;
  initialPage: PayrollEmployeePage;
  filter: PayrollEmployeeFilter;
  sort: PayrollEmployeeSort;
  onCursorStale?: () => void;
};

export type PayrollCursorPageState = {
  items: PayrollEmployeeSummary[];
  canNext: boolean;
  canPrevious: boolean;
  isFetching: boolean;
  errorCode: string | null;
  next: () => Promise<void>;
  previous: () => void;
};

type PageEntry = {
  inputCursor: string | null;
  page: PayrollEmployeePage;
};

type NavigationState = {
  key: string;
  pages: PageEntry[];
  index: number;
  errorCode: string | null;
};

function visiblePage(page: PayrollEmployeePage): PayrollEmployeePage {
  return { ...page, items: page.items.slice(0, 50) };
}

function errorCodeOf(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; data?: { code?: unknown } };
  const code = candidate.data?.code ?? candidate.code;
  return typeof code === "string" ? code : null;
}

export function usePayrollCursorPage({
  identity,
  initialPage,
  filter,
  sort,
  onCursorStale,
}: UsePayrollCursorPageArgs): PayrollCursorPageState {
  const [trigger, request] = useLazyListPayrollRunEmployeesQuery();
  const key = useMemo(() => JSON.stringify([
    identity.audience,
    identity.actorUid,
    identity.agencyId,
    identity.mode,
    identity.runId,
    identity.activeRevisionId,
    filter,
    sort,
  ]), [filter, identity, sort]);
  const initialPageFingerprint = JSON.stringify([
    initialPage.runId,
    initialPage.activeRevisionId,
    initialPage.revisionNumber,
    initialPage.nextCursor,
    initialPage.hasMore,
    initialPage.items,
  ]);
  const preparedInitialPage = useMemo(
    () => visiblePage(initialPage),
    // The bounded fingerprint represents every list field this hook renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialPageFingerprint],
  );
  const initialState = useCallback((): NavigationState => ({
    key,
    pages: [{ inputCursor: null, page: preparedInitialPage }],
    index: 0,
    errorCode: null,
  }), [key, preparedInitialPage]);
  const [navigation, setNavigation] = useState<NavigationState>(initialState);
  const [locallyFetching, setLocallyFetching] = useState(false);
  const activeKey = useRef(key);
  const activeRequest = useRef<{ abort?: () => void } | null>(null);

  useEffect(() => {
    activeKey.current = key;
    activeRequest.current?.abort?.();
    activeRequest.current = null;
    setLocallyFetching(false);
    setNavigation(initialState());
  }, [initialState, key]);

  useEffect(() => () => activeRequest.current?.abort?.(), []);

  const state = navigation.key === key ? navigation : initialState();
  const entry = state.pages[state.index] ?? state.pages[0];

  const next = useCallback(async () => {
    const current = state.pages[state.index];
    const cursor = current?.page.nextCursor;
    if (!cursor || locallyFetching) return;

    activeRequest.current?.abort?.();
    const requestKey = key;
    const pending = trigger({
      audience: identity.audience,
      actorUid: identity.actorUid,
      agencyId: identity.agencyId,
      mode: identity.mode,
      runId: identity.runId,
      activeRevisionId: identity.activeRevisionId,
      filter,
      sort,
      cursor,
    }, false);
    activeRequest.current = pending;
    setLocallyFetching(true);
    try {
      const page = await pending.unwrap();
      if (activeKey.current !== requestKey) return;
      setNavigation((currentState) => {
        if (currentState.key !== requestKey) return currentState;
        const pages = currentState.pages.slice(0, currentState.index + 1);
        pages.push({ inputCursor: cursor, page: visiblePage(page) });
        return { ...currentState, pages, index: pages.length - 1, errorCode: null };
      });
    } catch (error) {
      if (activeKey.current !== requestKey) return;
      const errorCode = errorCodeOf(error);
      setNavigation((currentState) => currentState.key === requestKey
        ? { ...currentState, errorCode }
        : currentState);
      if (errorCode === "CURSOR_STALE") onCursorStale?.();
    } finally {
      if (activeKey.current === requestKey) setLocallyFetching(false);
      if (activeRequest.current === pending) activeRequest.current = null;
    }
  }, [filter, identity, key, locallyFetching, onCursorStale, sort, state.index, state.pages, trigger]);

  const previous = useCallback(() => {
    activeRequest.current?.abort?.();
    activeRequest.current = null;
    setLocallyFetching(false);
    setNavigation((currentState) => currentState.key === key && currentState.index > 0
      ? { ...currentState, index: currentState.index - 1, errorCode: null }
      : currentState);
  }, [key]);

  return {
    items: entry?.page.items ?? [],
    canNext: Boolean(entry?.page.nextCursor),
    canPrevious: state.index > 0,
    isFetching: locallyFetching || request.isFetching,
    errorCode: state.errorCode,
    next,
    previous,
  };
}
