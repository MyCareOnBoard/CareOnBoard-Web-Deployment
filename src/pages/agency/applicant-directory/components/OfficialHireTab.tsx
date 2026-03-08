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
                <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] px-4 py-4 md:px-6 md:py-5 space-y-4">
                    <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
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
                        <div className="py-8 text-center text-sm text-[#808081]">
                            Loading status...
                        </div>
                    ) : hasSigned ? (
                        <div className="flex items-center justify-between gap-4 rounded-[8px] bg-[rgba(14,175,82,0.1)] px-4 py-3">
                            <div className="flex items-start gap-3">
                                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full bg-[#0eaf52]">
                                    <CheckCircle className="h-3 w-3 text-white" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-semibold text-[#10141a]">
                                        Official Hire Letter Signed
                                    </p>
                                    <p className="mt-0.5 text-[13px] font-medium text-[#808081]">
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
                                className="flex items-center gap-2 rounded-[60px] border-[#525253] bg-[rgba(128,128,129,0.1)] px-4 py-[6px] text-[11px] font-semibold text-[#525253] hover:bg-[rgba(128,128,129,0.15)]"
                                onClick={() => setShowSignatureModal(true)}
                                disabled={!signatureData}
                            >
                                <Eye className="h-4 w-4" />
                                View Signature
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-[20px] bg-[rgba(255,255,255,0.8)] px-4 py-4">
                            <p className="mb-3 text-[14px] text-[#808081]">
                                Official hire letter not yet signed.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
