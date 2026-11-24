import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { getAgencyClientById, type Client } from "@/lib/api/clients";
import { listGoalDocuments, SubmissionStatus, type DocumentType, type GoalDocument } from "@/lib/api/goals-and-documents";

/**
 * When a form page is opened from Goals & documents with `?clientId=`, it works on that client's
 * draft (not the agency's first draft of the type) and can prefill from the client's ISP.
 * Returns `ready` once the client and their draft (if any) have loaded.
 */
export function useClientGoalDraft(documentType: DocumentType) {
    const location = useLocation();
    const { user } = useAuth();
    const params = new URLSearchParams(location.search);
    const clientId = params.get("firebaseId") ? "" : (params.get("clientId") ?? "");
    const [state, setState] = useState<{ client: Client | null; draft: GoalDocument | null; ready: boolean; failed: boolean }>({ client: null, draft: null, ready: false, failed: false });

    useEffect(() => {
        if (!clientId) return;
        const controller = new AbortController();
        setState({ client: null, draft: null, ready: false, failed: false });
        Promise.all([
            getAgencyClientById(clientId, { signal: controller.signal, mode: "ddd" }).catch(() => null),
            listGoalDocuments({ agencyId: user?.agencyId, clientId, documentType, status: SubmissionStatus.DRAFT, limit: 1 }),
        ]).then(([client, docs]) => {
            if (!controller.signal.aborted) setState({ client, draft: docs.documents?.[0] ?? null, ready: true, failed: false });
        }).catch(() => {
            if (!controller.signal.aborted) setState({ client: null, draft: null, ready: true, failed: true });
        });
        return () => controller.abort();
    }, [clientId, documentType, user?.agencyId]);

    return { clientId, ...state };
}

export const clientDisplayName = (client: Pick<Client, "firstName" | "lastName"> | null | undefined) =>
    [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim();

/** Back link target: the client's forms on Goals & documents when the page was opened for a client. */
export function goalsBackRoute(isUserPanel: boolean, clientId: string | null | undefined) {
    if (isUserPanel) return Routes.userPanel.planOfCare;
    return clientId ? `${Routes.agency.goalsAndDocuments.index}?clientId=${encodeURIComponent(clientId)}` : Routes.agency.goalsAndDocuments.index;
}

/** Records the saved draft id in the address bar without dropping `clientId`. */
export function rememberDocumentId(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`);
}
