import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle } from "lucide-react";
import DigitalSignatureModal from "@/pages/applicant/application/components/DigitalSignature";

interface SignatureData {
    signatureType: string;
    signatureData: string;
}

interface OfficialHireTabProps {
    isLoading: boolean;
    hasSigned: boolean;
    signedAt?: string;
    signatureData?: SignatureData | null;
    actionLoading: string | null;
    onSendOfferLetter: () => void;
    onRequestSignature: () => void;
    onConfirmHire: () => void;
}

export function OfficialHireTab({
    isLoading,
    hasSigned,
    signedAt,
    signatureData,
    actionLoading,
    onSendOfferLetter,
    onRequestSignature,
    onConfirmHire,
}: OfficialHireTabProps) {
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const isSendingOffer = actionLoading === "offer-letter";
    const isRequestingSignature = actionLoading === "signature";
    const isConfirmingHire = actionLoading === "confirm-hire";

    return (
        <>
            <DigitalSignatureModal
                isOpen={showSignatureModal}
                setIsOpen={setShowSignatureModal}
                mode="view"
                existingSignature={signatureData}
            />
            <div className="space-y-4">
                {/* Official Hire Section */}
                <div className="rounded-[16px] border border-[#e4e7ea] bg-white p-4 md:p-5 dark:border-white/10 dark:bg-[#1b232b] space-y-4">
                    <h3 className="text-[18px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
                        Official Hire
                    </h3>
                    {/* <div className="rounded-[20px] bg-[rgba(255,255,255,0.8)] px-4 py-4 space-y-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-[15px] font-semibold text-[#10141a]">
                                    Agency actions
                                </p>
                                <p className="mt-1 text-[13px] text-[#808081]">
                                    Send the offer packet, request the signature, then confirm the hire once the letter is signed.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={onSendOfferLetter}
                                    disabled={isLoading || isSendingOffer}
                                    className="rounded-[60px] bg-[#10141a] px-4 py-[6px] text-[12px] font-semibold text-white hover:bg-[#1d2430]"
                                >
                                    {isSendingOffer ? "Sending..." : "Send Offer Letter"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onRequestSignature}
                                    disabled={isLoading || isRequestingSignature}
                                    className="rounded-[60px] border-[#2563eb] px-4 py-[6px] text-[12px] font-semibold text-[#2563eb] hover:bg-[rgba(37,99,235,0.08)]"
                                >
                                    {isRequestingSignature ? "Requesting..." : "Request Signature"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onConfirmHire}
                                    disabled={isLoading || !hasSigned || isConfirmingHire}
                                    className="rounded-[60px] border-[#0eaf52] px-4 py-[6px] text-[12px] font-semibold text-[#0eaf52] hover:bg-[rgba(14,175,82,0.08)] disabled:opacity-60"
                                >
                                    {isConfirmingHire ? "Confirming..." : "Confirm Hire"}
                                </Button>
                            </div>
                        </div>
                    </div> */}
                    {isLoading ? (
                        <div className="py-8 text-center text-sm text-[#4b535b] dark:text-[#9aa4a8]">
                            Loading status...
                        </div>
                    ) : hasSigned ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] bg-[#e6f6ec] px-4 py-3 dark:bg-[#30a46c]/10">
                            <div className="flex items-start gap-3">
                                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full bg-[#30a46c]">
                                    <CheckCircle className="h-3 w-3 text-white" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">
                                        Official Hire Letter Signed
                                    </p>
                                    <p className="mt-0.5 text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
                                        {signedAt
                                            ? `Signed on ${new Date(signedAt).toLocaleDateString("en-US", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}`
                                            : "Signature received"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="flex items-center gap-2 h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
                                onClick={() => setShowSignatureModal(true)}
                                disabled={!signatureData}
                            >
                                <Eye className="h-4 w-4" />
                                View Signature
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-[12px] bg-[#f4f5f6] dark:bg-white/5 px-4 py-4">
                            <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
                                Official hire letter not yet signed.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
