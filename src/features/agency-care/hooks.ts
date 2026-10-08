import { useCallback, useEffect, useRef, useState } from "react";
import type { CareAccess } from "@/lib/api/agencyCare";
import { useToast, type Toast } from "@/hooks/use-toast";

export function hasCapability(
  resource: CareAccess | null | undefined,
  capability: string,
): boolean {
  return resource?.capabilities?.includes(capability) === true;
}
export function careError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 401) return "Sign in again to continue.";
  if (status === 403 || status === 404)
    return "This item is unavailable with your current access.";
  if (status === 409)
    return "This record changed. Refresh it before trying again.";
  if (status === 413) return "The selected file is too large.";
  if (status === 429) return "Please wait before trying again.";
  return "Agency Care could not load this request. Please try again.";
}
export function useScopedRequest<T>(
  scope: string,
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    scope: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ scope, loading: enabled });
  useEffect(() => {
    const controller = new AbortController();
    setState({ scope, loading: enabled });
    if (enabled)
      loadRef
        .current(controller.signal)
        .then((data) => {
          if (!controller.signal.aborted)
            setState({ scope, data, loading: false });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({ scope, error: careError(error), loading: false });
        });
    return () => controller.abort();
  }, [scope, enabled, revision]);
  const reload = useCallback(() => {
    setState({ scope, loading: enabled });
    setRevision((value) => value + 1);
  }, [scope, enabled]);
  return {
    data: state.scope === scope && enabled ? state.data : undefined,
    error: state.scope === scope ? state.error : undefined,
    loading: enabled && (state.scope !== scope || state.loading),
    reload,
  };
}

export function useScopedMutation(scope: string) {
  const { toast } = useToast();
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const active = useRef<AbortController | null>(null);
  const operation = useRef<{ scope: string; id: string } | null>(null);
  const [state, setState] = useState({
    scope,
    saving: false,
    error: "",
    uncertain: false,
  });
  useEffect(() => {
    operation.current = null;
    setState({ scope, saving: false, error: "", uncertain: false });
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [scope]);
  const run = useCallback(
    async <T>(
      action: (operationId: string, signal: AbortSignal) => Promise<T>,
      success?: Pick<Toast, "title" | "description">,
    ): Promise<T | undefined> => {
      if (
        active.current ||
        currentScope.current !== scope ||
        (state.scope === scope && state.uncertain)
      )
        return undefined;
      const controller = new AbortController();
      active.current = controller;
      if (operation.current?.scope !== scope)
        operation.current = { scope, id: crypto.randomUUID() };
      setState({ scope, saving: true, error: "", uncertain: false });
      try {
        const data = await action(operation.current.id, controller.signal);
        if (controller.signal.aborted || currentScope.current !== scope)
          return undefined;
        operation.current = null;
        setState({ scope, saving: false, error: "", uncertain: false });
        if (success) toast({ ...success, variant: "success" });
        return data;
      } catch (error) {
        if (!controller.signal.aborted && currentScope.current === scope) {
          const status = (error as { response?: { status?: number } })?.response
            ?.status;
          const uncertain = status === undefined || status >= 500;
          if (!uncertain) operation.current = null;
          const message = uncertain
            ? "The result of this action is unknown. Refresh the record and check its history before attempting another action."
            : careError(error);
          setState({
            scope,
            saving: false,
            uncertain,
            error: message,
          });
          toast({
            title: uncertain ? "Check the action's status" : "Action could not be completed",
            description: message,
            variant: uncertain ? "warning" : "destructive",
          });
        }
        return undefined;
      } finally {
        if (active.current === controller) active.current = null;
      }
    },
    [scope, state.scope, state.uncertain, toast],
  );
  const reset = useCallback(() => {
    if (!active.current) {
      // An unknown outcome must retry the same server command receipt.
      if (!(state.scope === scope && state.uncertain)) operation.current = null;
      setState({ scope, saving: false, error: "", uncertain: false });
    }
  }, [scope, state.scope, state.uncertain]);
  return {
    run,
    reset,
    saving: state.scope === scope && state.saving,
    error: state.scope === scope ? state.error : "",
    uncertain: state.scope === scope && state.uncertain,
  };
}
