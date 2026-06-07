import React from 'react';
import {X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {useAuth} from "@/utils/auth";

const EmployeeUserPanelLoginDetailsModal = (
  {isOpen, setIsOpen}: { isOpen: boolean; setIsOpen: (value: boolean) => void }
) => {

  const {user} = useAuth();

  const navigate = useNavigate();

  const handleCancel = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;


  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-transparent bg-opacity-40 backdrop-blur"
        onClick={() => setIsOpen(false)}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl p-6 bg-white rounded-lg shadow-2xl animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between mb-3">
            <div><h2 className="mb-2 text-xl font-semibold text-gray-900">Congratulations, you have been officially hired.</h2></div>
            <button
              onClick={handleCancel}
              className="text-gray-400 transition-colors cursor-pointer hover:text-gray-600"
              aria-label="Close modal"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>
          <div className={"mb-4"}>
              <p className={"text-sm"}>Continue with the same login details you used to start the application process to access your staff portal.</p>
              <p className={"text-sm"}>Click on the <span className="text-[#00b4b8]">"Login to user panel button below"</span> to access your portal.</p>
          </div>
          <div className={"mb-6"}>
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Email Address</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={user?.email}
                  value={user?.email}
                  className="w-full pr-10"
                  disabled={true}
                />
                {/*<button*/}
                {/*  type="button"*/}
                {/*  className="absolute text-gray-500 -translate-y-1/2 cursor-pointer right-3 top-1/2 hover:text-gray-700"*/}
                {/*  onClick={() => copyToClipboard("nurnabi@torq.agency")}*/}
                {/*>*/}
                {/*  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">*/}
                {/*    <path*/}
                {/*      d="M7.5 12.5C7.5 10.143 7.5 8.9645 8.23223 8.23223C8.9645 7.5 10.143 7.5 12.5 7.5H13.3333C15.6903 7.5 16.8688 7.5 17.6011 8.23223C18.3333 8.9645 18.3333 10.143 18.3333 12.5V13.3333C18.3333 15.6903 18.3333 16.8688 17.6011 17.6011C16.8688 18.3333 15.6903 18.3333 13.3333 18.3333H12.5C10.143 18.3333 8.9645 18.3333 8.23223 17.6011C7.5 16.8688 7.5 15.6903 7.5 13.3333V12.5Z"*/}
                {/*      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>*/}
                {/*    <path*/}
                {/*      d="M14.1665 7.50033C14.1645 5.03608 14.1273 3.75967 13.41 2.88568C13.2715 2.7169 13.1167 2.56214 12.948 2.42363C12.026 1.66699 10.6562 1.66699 7.91663 1.66699C5.17706 1.66699 3.80728 1.66699 2.88532 2.42363C2.71653 2.56213 2.56178 2.7169 2.42326 2.88568C1.66663 3.80764 1.66663 5.17743 1.66663 7.91699C1.66663 10.6566 1.66663 12.0263 2.42326 12.9483C2.56177 13.1171 2.71653 13.2718 2.88532 13.4103C3.7593 14.1277 5.03572 14.1649 7.49996 14.1669"*/}
                {/*      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>*/}
                {/*  </svg>*/}
                {/*</button>*/}
              </div>
            </div>
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Password</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={"**********"}
                  value={"**********"}
                  className="w-full pr-10"
                  disabled={true}
                />
                {/*<button*/}
                {/*  type="button"*/}
                {/*  className="absolute text-gray-500 -translate-y-1/2 cursor-pointer right-3 top-1/2 hover:text-gray-700"*/}
                {/*  onClick={() => copyToClipboard("Nurnabi123")}*/}
                {/*>*/}
                {/*  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">*/}
                {/*    <path*/}
                {/*      d="M7.5 12.5C7.5 10.143 7.5 8.9645 8.23223 8.23223C8.9645 7.5 10.143 7.5 12.5 7.5H13.3333C15.6903 7.5 16.8688 7.5 17.6011 8.23223C18.3333 8.9645 18.3333 10.143 18.3333 12.5V13.3333C18.3333 15.6903 18.3333 16.8688 17.6011 17.6011C16.8688 18.3333 15.6903 18.3333 13.3333 18.3333H12.5C10.143 18.3333 8.9645 18.3333 8.23223 17.6011C7.5 16.8688 7.5 15.6903 7.5 13.3333V12.5Z"*/}
                {/*      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>*/}
                {/*    <path*/}
                {/*      d="M14.1665 7.50033C14.1645 5.03608 14.1273 3.75967 13.41 2.88568C13.2715 2.7169 13.1167 2.56214 12.948 2.42363C12.026 1.66699 10.6562 1.66699 7.91663 1.66699C5.17706 1.66699 3.80728 1.66699 2.88532 2.42363C2.71653 2.56213 2.56178 2.7169 2.42326 2.88568C1.66663 3.80764 1.66663 5.17743 1.66663 7.91699C1.66663 10.6566 1.66663 12.0263 2.42326 12.9483C2.56177 13.1171 2.71653 13.2718 2.88532 13.4103C3.7593 14.1277 5.03572 14.1649 7.49996 14.1669"*/}
                {/*      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>*/}
                {/*  </svg>*/}
                {/*</button>*/}
              </div>
            </div>
            <p className={"text-sm"}>Your Staff profile has been automatically created using the same credentials you used during the registration process</p>
          </div>

          {/* Footer */}
          <div className="flex items-center p-3 space-x-3">
            <Button
              onClick={handleCancel}
              className="px-6 text-white font-medium bg-[#B2B2B3] hover:bg-gray-300 rounded-full transition-colors"
            >
              Back to dashboard
            </Button>
            <Button
              onClick={() => navigate(Routes.userPanel.dashboard)}
              className="px-6 font-medium text-white transition-colors bg-teal-500 rounded-full hover:bg-teal-600"
            >
              Login to  user panel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeUserPanelLoginDetailsModal;