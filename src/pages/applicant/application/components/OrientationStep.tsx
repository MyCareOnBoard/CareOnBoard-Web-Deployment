import {Button} from "@/components/ui/button";
import DigitalSignatureModal from "@/pages/applicant/application/components/DigitalSignature";
import {useState} from "react";
import EmployeeUserPanelLoginDetailsModal from "@/pages/applicant/application/components/EmployeeUserPanelLoginDetailsModal";
import {
    useCheckSignatureStatusQuery,
    useGetOfficialHireStatusQuery,
    useSubmitOfficialHireMutation
} from "@/pages/applicant/application/api";
import {useNavigate} from "react-router";
import {useAuth} from "@/utils/auth";
import {getUser} from "@/lib/api/users";
import {UserType} from "@/utils/auth/types/user.types";
import {Routes} from "@/routes/constants";

export default function OrientationStep() {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);

    const navigate = useNavigate();
    const {user, refreshProfile, getToken} = useAuth();

    const {
        data,
        isLoading: isLoadingSignatureStatus,
        isFetching: isFetchingSignatureStatus,
        refetch: refetchSignatureStatus,
    } = useCheckSignatureStatusQuery("official-hire");
    const {
        data: officialHireStatus,
        isLoading: isLoadingOfficialHireStatus,
        isFetching: isFetchingOfficialHireStatus,
        refetch: refetchOfficialHireStatus,
    } = useGetOfficialHireStatusQuery(undefined);
    const [submitOfficialHire] = useSubmitOfficialHireMutation();

    const openStaffPortal = async () => {
        await getToken(true);
        const user = await refreshProfile();
        if (user?.userType === UserType.AGENCY_STAFF) {
            navigate(Routes.agency.dashboard, {replace: true});
        } else {
            throw new Error("Agency staff access is not ready yet.");
        }
    };

    const handleModalOpen = async () => {
        if (officialHireStatus?.status?.overall?.status === "completed") {
            try {
                const user = await getUser();
                if (user.userType === UserType.AGENCY_STAFF) await handleSubmitOfficialHire();
                else setIsEmployeeModalOpen(true);
            } catch (error) { reportSubmitError(error); }
        } else if (data?.data?.signatureId) {
            try { await handleSubmitOfficialHire(); }
            catch (error) { reportSubmitError(error); }
        } else {
            setIsModalOpen(true);
        }
    }

    const reportSubmitError = (error: unknown) => {
        console.error(error);
        alert("Official hire could not be completed. Please try again.");
    }

    const handleSubmitOfficialHire = async () => {
        const result = await submitOfficialHire().unwrap().finally(() => {
            refetchSignatureStatus();
            refetchOfficialHireStatus();
        });
        if (result.data.userType === UserType.AGENCY_STAFF) await openStaffPortal();
        else setIsEmployeeModalOpen(true);
    }

    const buttonText = () => {
        if (officialHireStatus?.status?.overall?.status === "completed") {
            return user?.userType === UserType.AGENCY_STAFF ? "Open agency dashboard" : "Login to user panel";
        } else if (data?.data?.signatureId) {
            return "Complete Official Hire";
        } else {
            return "Click here to Open Signature Module";
        }
    }

    const isLoading = isLoadingSignatureStatus || isLoadingOfficialHireStatus
        || isFetchingSignatureStatus || isFetchingOfficialHireStatus;
    const isCompleted = officialHireStatus?.status?.overall?.status === "completed";

    return (
        <div className={"flex items-center justify-center"}>
            <div className={"flex flex-col items-center"}>
                <svg width="71" height="71" viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="35.5" cy="35.5" r="35.5" fill="#F0FAF4"/>
                    <rect x="10.2949" y="9.94043" width="51.12" height="51.12" rx="25.56" fill="#0EAF52"/>
                    <path fill-rule="evenodd" clip-rule="evenodd"
                          d="M41.5754 27.5728C42.2475 26.8335 43.4012 26.806 44.1077 27.5126L46.159 29.5639C46.8424 30.2473 46.8424 31.3553 46.159 32.0388L34.0732 44.1246C33.3898 44.808 32.2818 44.808 31.5983 44.1246L26.5126 39.0388C25.8291 38.3554 25.8291 37.2473 26.5126 36.5639L28.0983 34.9781C28.7818 34.2947 29.8898 34.2947 30.5732 34.9781L32.8099 37.2148L41.5754 27.5728Z"
                          fill="white"/>
                </svg>
                <h1 className={"font-bold text-2xl mt-6 mb-3"}>
                    {isCompleted ? "Congratulations! You are hired officially!" : "Complete your official hire"}
                </h1>
                <p className={" mb-8 text-lg"}>{isCompleted
                    ? "Your official hire letter has been signed."
                    : "Sign the official hire letter to finish your application."}</p>
                <Button
                    variant="ghost"
                    className="font-normal  border hover:border-[#B2B2B3] text-white fill-[#00b4b8] bg-[#00b4b8] hover:bg-[#028c8f] hover:text-white text-lg px-8"
                    onClick={handleModalOpen}
                    disabled={isLoading}
                >
                    {isLoading ? "Loading..." : buttonText()}
                </Button>
            </div>
            <DigitalSignatureModal
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                proceed={handleSubmitOfficialHire}
                useCase={"official-hire"}
            />
            <EmployeeUserPanelLoginDetailsModal
                isOpen={isEmployeeModalOpen}
                setIsOpen={setIsEmployeeModalOpen}
            />
        </div>
    );
}

