import React from 'react';
import {X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {toast} from "sonner";

const EmployeeUserPanelLoginDetailsModal = (
  {isOpen, setIsOpen}: { isOpen: boolean; setIsOpen: (value: boolean) => void }
) => {

  const handleNext = () => {
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const copyToClipboard = async (
    text: string
  ) => {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not supported');
    }

    await navigator.clipboard.writeText(text);

    toast.success("Copied to clipboard");

    return true;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-40 backdrop-blur z-40"
        onClick={() => setIsOpen(false)}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl relative animate-fadeIn p-6">
          {/* Header */}
          <div className="flex justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Employee Details</h2>
              <p className={"text-sm"}>Congratulations! Here is your employee details. Login to your new user panel soon.</p>
            </div>
            <button
              onClick={handleCancel}
              className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>
          <div className={"mb-6"}>
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Email Address</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={"nurnabi@torq.agency"}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => copyToClipboard("nurnabi@torq.agency")}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M7.5 12.5C7.5 10.143 7.5 8.9645 8.23223 8.23223C8.9645 7.5 10.143 7.5 12.5 7.5H13.3333C15.6903 7.5 16.8688 7.5 17.6011 8.23223C18.3333 8.9645 18.3333 10.143 18.3333 12.5V13.3333C18.3333 15.6903 18.3333 16.8688 17.6011 17.6011C16.8688 18.3333 15.6903 18.3333 13.3333 18.3333H12.5C10.143 18.3333 8.9645 18.3333 8.23223 17.6011C7.5 16.8688 7.5 15.6903 7.5 13.3333V12.5Z"
                      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path
                      d="M14.1665 7.50033C14.1645 5.03608 14.1273 3.75967 13.41 2.88568C13.2715 2.7169 13.1167 2.56214 12.948 2.42363C12.026 1.66699 10.6562 1.66699 7.91663 1.66699C5.17706 1.66699 3.80728 1.66699 2.88532 2.42363C2.71653 2.56213 2.56178 2.7169 2.42326 2.88568C1.66663 3.80764 1.66663 5.17743 1.66663 7.91699C1.66663 10.6566 1.66663 12.0263 2.42326 12.9483C2.56177 13.1171 2.71653 13.2718 2.88532 13.4103C3.7593 14.1277 5.03572 14.1649 7.49996 14.1669"
                      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Password</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={"Nurnabi123"}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => copyToClipboard("Nurnabi123")}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M7.5 12.5C7.5 10.143 7.5 8.9645 8.23223 8.23223C8.9645 7.5 10.143 7.5 12.5 7.5H13.3333C15.6903 7.5 16.8688 7.5 17.6011 8.23223C18.3333 8.9645 18.3333 10.143 18.3333 12.5V13.3333C18.3333 15.6903 18.3333 16.8688 17.6011 17.6011C16.8688 18.3333 15.6903 18.3333 13.3333 18.3333H12.5C10.143 18.3333 8.9645 18.3333 8.23223 17.6011C7.5 16.8688 7.5 15.6903 7.5 13.3333V12.5Z"
                      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path
                      d="M14.1665 7.50033C14.1645 5.03608 14.1273 3.75967 13.41 2.88568C13.2715 2.7169 13.1167 2.56214 12.948 2.42363C12.026 1.66699 10.6562 1.66699 7.91663 1.66699C5.17706 1.66699 3.80728 1.66699 2.88532 2.42363C2.71653 2.56213 2.56178 2.7169 2.42326 2.88568C1.66663 3.80764 1.66663 5.17743 1.66663 7.91699C1.66663 10.6566 1.66663 12.0263 2.42326 12.9483C2.56177 13.1171 2.71653 13.2718 2.88532 13.4103C3.7593 14.1277 5.03572 14.1649 7.49996 14.1669"
                      stroke="#B2B2B3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <p className={"text-sm"}>These credentials are also sent to your email.</p>
          </div>

          {/* Footer */}
          <div className="flex items-center space-x-3 p-3">
            <Button
              onClick={handleCancel}
              className="px-6 text-white font-medium bg-[#B2B2B3] hover:bg-gray-300 rounded-full transition-colors"
            >
              Back to dashboard
            </Button>
            <Button
              onClick={handleNext}
              className="px-6 text-white font-medium bg-teal-500 hover:bg-teal-600 rounded-full transition-colors"
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