import {Button} from "@/components/ui/button";
import DigitalSignatureModal from "@/pages/application/components/DigitalSignature";
import {useState} from "react";
import EmployeeUserPanelLoginDetailsModal from "@/pages/application/components/EmployeeUserPanelLoginDetailsModal";

interface OrientationStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function OrientationStep({ onBack, onNext }: OrientationStepProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);

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
          Congratulations! You are hired officially!
        </h1>
        <p className={"text-[#B2B2B3] mb-8 text-lg"}>Sign digitally & take your employee ID & Email!</p>
        <Button
          variant="ghost"
          className="font-normal  border border-[#B2B2B3] text-[#B2B2B3] text-lg px-8"
          onClick={() => setIsModalOpen(true)
        }
        >
          Open Signature Module
        </Button>
      </div>
      <DigitalSignatureModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        proceed={() => setIsEmployeeModalOpen(true)}
      />
      <EmployeeUserPanelLoginDetailsModal
         isOpen={isEmployeeModalOpen}
         setIsOpen={setIsEmployeeModalOpen}
      />
    </div>
  );
}

