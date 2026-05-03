import React, {useState, useCallback, useEffect} from "react";
import {useNavigate} from "react-router";
import {Plus, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {auth} from "@/lib/firebase";
import {Toggle} from "@/components/ui/toggle";
import {ChevronLeft, ChevronRight} from "lucide-react";
import UserPanelDocumentUpload from "@/pages/userPanel/dashboard/components/uploadDocumentModal";
import {AnimatePresence, motion} from "framer-motion";
import {
    useCompleteTrainingMutation,
    useGetEmployeeDocumentsQuery,
    useGetEmployeeTrainingsQuery,
    useUpdateEmployeeInfoMutation
} from "@/pages/userPanel/dashboard/api";
import {userPanelDocumentTypes} from "@/pages/userPanel/dashboard/constants";
import {Routes} from "@/routes/constants";
import {setUser, useAuth} from "@/utils/auth";
import {getUser} from "@/lib/api/users";
import {useDispatch} from "react-redux";
import {toast} from "sonner";


export default function UserPanelDashboardPage() {
    const {user} = useAuth();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<boolean>(false);
    const [locationError, setLocationError] = useState<boolean>(false);
    const [loggedOut, setLoggedOut] = useState<boolean>(false);
    const [askLocationPerm, setAskLocationPerm] = useState<boolean>(false);
    const [isDocumentUploadModalOpen, setIsDocumentUploadModalOpen] = useState<boolean>(false);
    const [workAvailability, setWorkAvailability] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [approvalStates, setApprovalStates] = useState<Record<string, boolean>>({});
    const itemsPerPage = 5;

    const {data: employeeDocuments = []} = useGetEmployeeDocumentsQuery();
    const {data: trainings = [], isLoading: isTrainingLoading, refetch} = useGetEmployeeTrainingsQuery(undefined, {
        
    });
    const [updateEmployeeInfo] = useUpdateEmployeeInfoMutation();
    const [completeTraining] = useCompleteTrainingMutation();

    const employeeInfo = user;

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const currentUser = auth.currentUser;

    const formatDate = (value?: any) => {
        if (!value) return "N/A";

        let date: Date;

        // Handle Firestore/Firebase Timestamp-like object: { _seconds, _nanoseconds }
        if (typeof value === "object" && typeof value._seconds === "number") {
            const millis = value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
            date = new Date(millis);
        } else if (value instanceof Date) {
            date = value;
        } else if (typeof value === "string" || typeof value === "number") {
            date = new Date(value);
        } else {
            return "N/A";
        }

        if (Number.isNaN(date.getTime())) return "N/A";

        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const getDocument = useCallback((documentType: string) => {
        const employeeDocument = employeeDocuments?.find(doc => doc.documentType === documentType) || {
            status: "",
            fileUrl: "",
            expiryDate: null
        };

        let status = employeeDocument.status

        // get days until expiry
        const daysUntilExpiry = employeeDocument.expiryDate ? Math.floor((new Date(employeeDocument.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
        if (employeeDocument.expiryDate && (daysUntilExpiry || 0) <= 7 && (daysUntilExpiry || 0) > 0) {
            status = "expiring"
        } else if (employeeDocument.expiryDate && (daysUntilExpiry || 0) <= 0) {
            status = "expired"
        }

        return {
            ...employeeDocument,
            status
        }

    }, [employeeDocuments]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "available":
                return "bg-[#d4f4dd] text-[#0e6027] border-[#0e6027]/20";
            case "expired":
                return "bg-[#ffd4cc] text-[#d53411] border-[#d53411]/20";
            case "pending soon":
                return "bg-[#ffe8cc] text-[#cc6600] border-[#cc6600]/20";
            case "new training":
                return "bg-[#e5f7f7] text-[#00b4b8] border-[#00b4b8]/20";
            case "assigned":
                return "bg-[#0EAF521A] text-[#0EAF52] border-[#0EAF52]";
            case "expiring":
                return "bg-[#FF6C1017] text-[#FF6C10] border-[#FF6C10]"
            default:
                return "bg-gray-100 text-gray-600 border-gray-300/20";
        }
    };

    const calculateAge = (dateOfBirth: string) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    const handleDocumentUploaded = () => {
        setIsDocumentUploadModalOpen(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    }

    const handleDocumentUploadError = () => {
        setIsDocumentUploadModalOpen(false);
        setError(true);
        setTimeout(() => setError(false), 3000);
    }

    const handleWorkAvailabilityChange = async (pressed: boolean) => {
        setWorkAvailability(pressed);
        try {
            await updateEmployeeInfo({
                workAvailability: pressed,
            }).unwrap();
            const user = await getUser();
            dispatch(setUser(user));
        } catch (error) {
            console.error("Error updating work availability:", error);
            setWorkAvailability(!pressed);
        }
    };

    const goToProfile = () => {
        navigate(Routes.userPanel.profile);
    }

    const handleOpenDocument = (url: string | null) => {
        if (!url) return;
        window.open(url, "_blank");
    }

    const handleToggle = async (trainingId: string) => {
        const newState = !approvalStates[trainingId];
        setApprovalStates(prev => ({...prev, [trainingId]: newState}));
        try {
            const training = trainings.find(t => t.id === trainingId);
            await completeTraining({
                trainingId,
                isCompleted: newState
            }).unwrap();
            toast.success(`Training ${training?.name} ${newState ? "completed" : "not completed"} marked as`);
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (employeeInfo) {
            setWorkAvailability(employeeInfo.profile?.workAvailability ?? false);
        }
    }, [employeeInfo])

    useEffect(() => {
        if (trainings) {
            setApprovalStates(
                trainings.reduce((acc, training) => ({
                    ...acc, [training?.id as any]: !!training.completedAt
                }), {})
            );
        }
    }, [trainings]);

    return (
        <div className="min-h-[calc(100vh-200px)]">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
                    Dashboard
                </h1>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">
                {/* Left Column - Profile Card */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="bg-[#FFFFFF4D] rounded-[20px] p-6 shadow-sm flex justify-start">
                        <div className="flex items-start justify-between mb-4 w-full">
                            <div className="flex items-center gap-4 h-full">
                                {/* Profile Image */}
                                {currentUser?.photoURL ? (
                                    <div>
                                        <img
                                            src={currentUser?.photoURL}
                                            alt={employeeInfo?.fullName}
                                            className="w-[180px] h-full rounded-xl object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="w-[180px] h-full rounded-xl bg-gradient-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-6xl font-bold">
                                        {employeeInfo?.fullName?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={"w-full"}>
                            {/* User Info */}
                            {/* ID Badge */}
                            <div className={"flex justify-between items-center mb-6"}>
                                <div
                                    className="bg-[#F0FAF4] border border-[#0EAF52] text-[#0EAF52] text-sm font-semibold px-2 py-1 rounded-full">
                                    ID-{employeeInfo?.profile?.tagId}
                                </div>
                                <svg onClick={goToProfile} className={"cursor-pointer"} width="40" height="40"
                                     viewBox="0 0 40 40"
                                     fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <rect width="40" height="40" rx="20" fill="white" fill-opacity="0.5"/>
                                    <rect x="0.5" y="0.5" width="39" height="39" rx="19.5" stroke="white"
                                          stroke-opacity="0.3"/>
                                    <path
                                        d="M22.6692 18.2761L16.9315 24.0139L15.9886 23.0711L21.7264 17.3333H16.6692V16H24.0025V23.3333H22.6692V18.2761Z"
                                        fill="#10141A"/>
                                </svg>

                            </div>
                            <div className="space-y-2 mb-4">
                                <h2 className="text-[24px] font-bold text-[#10141a]">
                                    {employeeInfo?.fullName || "User Name"}
                                </h2>
                                <p className="text-[14px] text-[#808081]">
                                    {employeeInfo?.role?.toUpperCase() || "No role assigned"} • {employeeInfo?.dateOfBirth ? calculateAge(employeeInfo?.dateOfBirth) + ' yrs old' : ''}
                                </p>
                                <p className="text-[14px] text-[#808081]">
                                    {employeeInfo?.hireDate
                                        ? `Hiring Date: ${formatDate(employeeInfo?.hireDate)}`
                                        : ""
                                    }
                                </p>
                            </div>

                            {/* Work Availability Badge */}
                            <div className={"flex items-center justify-between mb-4"}>
                                <span className="text-[#808081]">Work Availability</span>
                                <Toggle
                                    className={"h-8 w-14"}
                                    pressed={workAvailability}
                                    onPressedChange={handleWorkAvailabilityChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Trainings Section */}
                    <div className="bg-[#FFFFFF4D] rounded-[20px] p-6 shadow-sm">
                        <div className="flex flex-col mb-4">
                            <h3 className="text-[20px] font-bold text-[#10141a]">Trainings</h3>
                            <p className="text-[14px] text-[#808081] mt-1">Here are your trainings</p>
                        </div>

                        {/* Training Items */}
                        <div className="space-y-3">
                            {!isTrainingLoading && (
                                trainings?.length > 0
                                ? (
                                    trainings.map((training) => (
                                        <div
                                            key={training.id}
                                            className="flex items-center justify-between p-3 rounded-xl transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                        <span className="text-[14px] font-semibold text-[#10141a]">
                          {training.name}
                        </span>
                                            </div>
                                            <span
                                                className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                                                    "assigned"
                                                )}`}
                                            >
                        {"Take Training"}
                      </span>
                                            <span
                                                className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                                                    "assigned"
                                                )}`}
                                            >
                        {"Assigned"}
                      </span>
                                            <button
                                                onClick={() => handleToggle(training?.id || "")}
                                                className={`relative w-[42px] h-[26px] rounded-full transition-colors ${
                                                    approvalStates[training?.id as any] ? 'bg-[#0EAF52]' : 'bg-[#E0E0E0]'
                                                }`}
                                            >
                                                <div
                                                    className={`absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform ${
                                                        approvalStates[training?.id as any] ? 'translate-x-[19px]' : 'translate-x-[3px]'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[14px] text-[#808081]">No trainings available</p>
                                )
                            )}
                            {isTrainingLoading && (
                                <div>
                                    <p className="text-[14px] text-[#808081]">Loading...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Documents */}
                <div className="bg-[#FFFFFF4D] rounded-[20px] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-[20px] font-bold text-[#10141a]">Documents</h3>
                            <p className="text-[14px] text-[#808081] mt-1">
                                Here are all your uploaded documents
                            </p>
                        </div>
                        <Button
                            type={"button"}
                            onClick={() => setIsDocumentUploadModalOpen(true)}
                            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-2 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200"
                        >
                            <Plus size={16}/>
                            Upload new document
                        </Button>
                    </div>

                    {/* Documents List */}
                    <div className="space-y-3">
                        {userPanelDocumentTypes
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((document) => {
                                const documentData = getDocument(document.value);
                                const excludedTexts: Record<string, string> = {
                                    expiring: `Expiring Soon ${documentData?.expiryDate ? ('on ' + new Date(documentData?.expiryDate).toDateString()) : ''}`
                                }
                                const statusText = Object.keys(excludedTexts).includes(documentData?.status) ? excludedTexts[documentData?.status] : documentData?.status;
                                return (
                                    <div
                                        key={document.value}
                                        onClick={() => handleOpenDocument(getDocument(document.value)?.fileUrl)}
                                        className="cursor-pointer flex items-center justify-between p-4 rounded-xl border border-[#e5e5e6] hover:border-[#00b4b8]/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={"/document-image.png"}
                                                alt={"document"}
                                                className="w-12 h-12 text-[#808081] scale-x-[-1]"
                                            />
                                            <span className="text-[14px] font-medium text-[#10141a]">
                    {document.label}
                  </span>
                                        </div>
                                        <span
                                            className={`capitalize text-[12px] font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                                                documentData?.status || "pending"
                                            )}`}
                                        >
                  {statusText || "Unavailable"}
                </span>
                                    </div>
                                )
                            })}
                    </div>

                    {/* Pagination */}
                    {userPanelDocumentTypes.length > itemsPerPage && (
                        <div className="flex items-center justify-center gap-2 mt-6">
              <span className={"text-[18px]"}>
                {currentPage}/<span className={"text-[#808081]"}>
                  {Math.ceil(userPanelDocumentTypes.length / itemsPerPage)}
                </span>
              </span>
                            <div
                                className={`rounded-full p-2 cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white'}`}
                                onClick={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
                            >
                                <ChevronLeft size={14} className={currentPage === 1 ? 'text-gray-400' : ''}/>
                            </div>
                            <div
                                className={`rounded-full p-2 cursor-pointer ${currentPage * itemsPerPage >= userPanelDocumentTypes.length ? 'opacity-50 cursor-not-allowed' : 'bg-white'}`}
                                onClick={() => currentPage * itemsPerPage < userPanelDocumentTypes.length && setCurrentPage(prev => prev + 1)}
                            >
                                <ChevronRight size={14}
                                              className={currentPage * itemsPerPage >= userPanelDocumentTypes.length ? 'text-gray-400' : ''}/>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <UserPanelDocumentUpload
                isOpen={isDocumentUploadModalOpen}
                setIsOpen={setIsDocumentUploadModalOpen}
                onComplete={handleDocumentUploaded}
                onError={handleDocumentUploadError}
            />
            <AnimatePresence>
                {error && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-start justify-center bg-black/30"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    >
                        <motion.div
                            initial={{scale: 0.9, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            exit={{scale: 0.9, opacity: 0}}
                            transition={{duration: 0.25}}
                            className="bg-white shadow-lg rounded-xl max-w-md mt-6"
                        >
                            <div className={"flex space-x-4 px-6 py-6"}>
                                <div className={"flex justify-center items-center bg-[#FFDCD4] rounded-sm px-3 py-2"}>
                                    <svg width="22" height="20" viewBox="0 0 22 20" fill="none"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M12.7481 19.5C15.0031 19.5 16.7832 19.5 18.1016 19.3037C19.4404 19.1043 20.5264 18.6717 21.126 17.6133L21.2296 17.4141C21.7009 16.4111 21.508 15.3214 21.0264 14.1445C20.6428 13.2069 20.0271 12.0983 19.2491 10.7695L18.419 9.3662L16.4942 6.12109L16.4483 6.04297C15.3456 4.1838 14.473 2.71328 13.6612 1.71484C12.8329 0.69615 11.9345 0 10.7501 0C9.56562 4e-05 8.66723 0.69615 7.83895 1.71484C7.22167 2.47408 6.5688 3.5061 5.80672 4.77441L5.00594 6.12109L3.08114 9.3662L3.03329 9.4463C1.88464 11.3828 0.97828 12.9114 0.47372 14.1445C-0.0398795 15.3998 -0.22484 16.5558 0.374111 17.6133L0.49227 17.8047C1.11056 18.7249 2.14351 19.1168 3.39852 19.3037C4.71697 19.5 6.49707 19.5 8.75202 19.5H12.7481ZM10.7501 12.25C10.1978 12.2499 9.75012 11.8022 9.75012 11.25V6.75C9.75012 6.19776 10.1978 5.75007 10.7501 5.75C11.3023 5.75 11.7501 6.19771 11.7501 6.75V11.25C11.7501 11.8023 11.3023 12.25 10.7501 12.25ZM10.7501 15.752C10.1978 15.7519 9.75012 15.3042 9.75012 14.752V14.7422C9.75012 14.1899 10.1978 13.7423 10.7501 13.7422C11.3023 13.7422 11.7501 14.1899 11.7501 14.7422V14.752C11.7501 15.3042 11.3023 15.752 10.7501 15.752Z"
                                            fill="#D53411"/>
                                    </svg>
                                </div>
                                <div>
                                    <div className={"flex items-center justify-between mb-1"}>
                                        <h4 className="text-lg font-semibold">Document not supported</h4>
                                        <button
                                            onClick={() => setError(false)}
                                            className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            <X className="w-5 h-5"/>
                                        </button>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Document file not supported. Please upload a good file.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {success && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    >
                        <motion.div
                            initial={{scale: 0.9, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            exit={{scale: 0.9, opacity: 0}}
                            transition={{duration: 0.25}}
                            className="px-10 py-4 text-center bg-white shadow-lg rounded-xl max-w-sm flex flex-col justify-center"
                        >
                            <div className={"flex justify-center mb-3"}>
                                <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="50" fill="#F0FAF4"/>
                                    <rect x="14.5" y="14" width="72" height="72" rx="36" fill="#0EAF52"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd"
                                          d="M56.0754 41.5727C56.7475 40.8334 57.9012 40.8059 58.6077 41.5124L60.659 43.5638C61.3424 44.2472 61.3424 45.3552 60.659 46.0386L48.5732 58.1245C47.8898 58.8079 46.7818 58.8079 46.0983 58.1245L41.0126 53.0387C40.3291 52.3553 40.3291 51.2472 41.0126 50.5638L42.5983 48.978C43.2818 48.2946 44.3898 48.2946 45.0732 48.978L47.3099 51.2147L56.0754 41.5727Z"
                                          fill="white"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold">Document Uploaded</h4>
                            <p className="mt-1 text-sm text-gray-500">
                                Your documents have been uploaded, this will be reviewed by the HR and will be
                                available on your profile.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {locationError && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    >
                        <motion.div
                            initial={{scale: 0.9, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            exit={{scale: 0.9, opacity: 0}}
                            transition={{duration: 0.25}}
                            className="px-10 py-4 text-center bg-white shadow-lg rounded-xl max-w-sm flex flex-col justify-center"
                        >
                            <div className={"flex justify-center mb-3"}>
                                <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <circle opacity="0.1" cx="50" cy="50" r="50" fill="#D53411"/>
                                    <g opacity="0.3">
                                        <rect x="14.5" y="14" width="72" height="72" rx="36" fill="#D53411"/>
                                    </g>
                                    <path
                                        d="M52.9981 59.75C55.2531 59.75 57.0332 59.75 58.3516 59.5537C59.6904 59.3543 60.7764 58.9217 61.376 57.8633L61.4796 57.6641C61.9509 56.6611 61.758 55.5714 61.2764 54.3945C60.8928 53.4569 60.2771 52.3483 59.4991 51.0195L58.669 49.6162L56.7442 46.3711L56.6983 46.293C55.5956 44.4338 54.723 42.9633 53.9112 41.9648C53.0829 40.9461 52.1845 40.25 51.0001 40.25C49.8156 40.25 48.9172 40.9461 48.089 41.9648C47.4717 42.7241 46.8188 43.7561 46.0567 45.0244L45.2559 46.3711L43.3311 49.6162L43.2833 49.6963C42.1346 51.6328 41.2283 53.1614 40.7237 54.3945C40.2101 55.6498 40.0252 56.8058 40.6241 57.8633L40.7423 58.0547C41.3606 58.9749 42.3935 59.3668 43.6485 59.5537C44.967 59.75 46.7471 59.75 49.002 59.75H52.9981ZM51.0001 52.5C50.4478 52.4999 50.0001 52.0522 50.0001 51.5V47C50.0001 46.4478 50.4478 46.0001 51.0001 46C51.5523 46 52.0001 46.4477 52.0001 47V51.5C52.0001 52.0523 51.5523 52.5 51.0001 52.5ZM51.0001 56.002C50.4478 56.0019 50.0001 55.5542 50.0001 55.002V54.9922C50.0001 54.4399 50.4478 53.9923 51.0001 53.9922C51.5523 53.9922 52.0001 54.4399 52.0001 54.9922V55.002C52.0001 55.5542 51.5523 56.002 51.0001 56.002Z"
                                        fill="#D53411"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold">Location issue</h4>
                            <p className="mt-1 text-sm text-gray-500">
                                Your location is not live. Please fix your location service to make the best use of the
                                app.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {loggedOut && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    >
                        <motion.div
                            initial={{scale: 0.9, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            exit={{scale: 0.9, opacity: 0}}
                            transition={{duration: 0.25}}
                            className="px-10 py-4 text-center bg-white shadow-lg rounded-xl max-w-sm flex flex-col justify-center"
                        >
                            <div className={"flex justify-center mb-3"}>
                                <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <circle opacity="0.1" cx="50" cy="50" r="50" fill="#D53411"/>
                                    <g opacity="0.3">
                                        <rect x="14.5" y="14" width="72" height="72" rx="36" fill="#D53411"/>
                                    </g>
                                    <path
                                        d="M52.9981 59.75C55.2531 59.75 57.0332 59.75 58.3516 59.5537C59.6904 59.3543 60.7764 58.9217 61.376 57.8633L61.4796 57.6641C61.9509 56.6611 61.758 55.5714 61.2764 54.3945C60.8928 53.4569 60.2771 52.3483 59.4991 51.0195L58.669 49.6162L56.7442 46.3711L56.6983 46.293C55.5956 44.4338 54.723 42.9633 53.9112 41.9648C53.0829 40.9461 52.1845 40.25 51.0001 40.25C49.8156 40.25 48.9172 40.9461 48.089 41.9648C47.4717 42.7241 46.8188 43.7561 46.0567 45.0244L45.2559 46.3711L43.3311 49.6162L43.2833 49.6963C42.1346 51.6328 41.2283 53.1614 40.7237 54.3945C40.2101 55.6498 40.0252 56.8058 40.6241 57.8633L40.7423 58.0547C41.3606 58.9749 42.3935 59.3668 43.6485 59.5537C44.967 59.75 46.7471 59.75 49.002 59.75H52.9981ZM51.0001 52.5C50.4478 52.4999 50.0001 52.0522 50.0001 51.5V47C50.0001 46.4478 50.4478 46.0001 51.0001 46C51.5523 46 52.0001 46.4477 52.0001 47V51.5C52.0001 52.0523 51.5523 52.5 51.0001 52.5ZM51.0001 56.002C50.4478 56.0019 50.0001 55.5542 50.0001 55.002V54.9922C50.0001 54.4399 50.4478 53.9923 51.0001 53.9922C51.5523 53.9922 52.0001 54.4399 52.0001 54.9922V55.002C52.0001 55.5542 51.5523 56.002 51.0001 56.002Z"
                                        fill="#D53411"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold">You have been logged out</h4>
                            <p className="mt-1 text-sm text-gray-500">
                                You have been logged out. Please log in to make sure your activity is tracked.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {askLocationPerm && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    >
                        <motion.div
                            initial={{scale: 0.9, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            exit={{scale: 0.9, opacity: 0}}
                            transition={{duration: 0.25}}
                            className="px-10 py-4 text-center bg-white shadow-lg rounded-xl max-w-sm flex flex-col justify-center"
                        >
                            <h4 className="text-2xl font-semibold">
                                Care on Board would like to access your location
                            </h4>
                            <p className="mt-1 text-sm text-gray-500">
                                The device will use location in the background
                            </p>
                            <div className="flex items-center px-3 mt-6 mb-3 w-full">
                                <Button
                                    className="w-full px-6 text-white font-medium bg-teal-500 hover:bg-teal-600 rounded-full transition-colors"
                                >
                                    Okay
                                </Button>
                            </div>
                            <div className="flex items-center px-3 w-full">
                                <Button
                                    className="w-full px-6 text-white font-medium bg-[#B2B2B3] hover:bg-[#B2B2B3] rounded-full transition-colors"
                                >
                                    No
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

