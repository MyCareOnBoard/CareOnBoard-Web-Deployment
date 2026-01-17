import { Agency } from "@/lib/api/clients";

export type ClientFormConfig = {
    showAgencySelection: boolean;
    userAgencyId?: string;
    agencies?: Agency[];
    loadingAgencies?: boolean;
    onSuccessNavigate: (clientId?: string) => string;
    successMessage?: string;
    pageTitle?: string;
};
