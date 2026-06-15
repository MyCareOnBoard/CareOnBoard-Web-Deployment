import { Agency } from "@/lib/api/clients";
import type { ClientType } from "./formData";

export type ClientFormConfig = {
    showAgencySelection: boolean;
    userAgencyId?: string;
    agencies?: Agency[];
    loadingAgencies?: boolean;
    onSuccessNavigate: (clientId?: string) => string;
    successMessage?: string;
    pageTitle?: string;
    backNavigate?: string;
    clientId?: string;
    isEditMode?: boolean;
    /**
     * Client types the agency supports (DDD / HHA). Missing or empty => treated
     * as both (["ddd","hha"]) by the wizard for backward compatibility.
     */
    supportedClientTypes?: ClientType[];
};
