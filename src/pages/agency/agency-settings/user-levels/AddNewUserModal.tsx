import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface AddNewUserModalProps {
  open: boolean;
  onClose: () => void;
}

const accessLevelOptions = [
  { id: "dsp-management", label: "DSP Management" },
  { id: "client-management", label: "Client Management" },
  { id: "scheduling", label: "Scheduling" },
  { id: "notes", label: "Notes" },
  { id: "billing-management", label: "Billing & Management" },
  { id: "ai-automation", label: "AI Automation" },
  { id: "support", label: "Support" },
  { id: "analytics", label: "Analytics" },
  { id: "goals-documents", label: "Goals & Documents" },
  { id: "applicant-directory", label: "Applicant Directory" },
  { id: "reports", label: "Reports" },
  { id: "community-inclusion", label: "Community Inclusion" },
  { id: "trainings", label: "Trainings" },
];

export default function AddNewUserModal({ open, onClose }: AddNewUserModalProps) {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetLink, setShowResetLink] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let newPassword = "";
    for (let i = 0; i < 13; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  };

  const toggleAccessLevel = (levelId: string) => {
    setSelectedLevels((prev) =>
      prev.includes(levelId)
        ? prev.filter((id) => id !== levelId)
        : [...prev, levelId]
    );
  };

  const handleCreateUser = () => {
    // Simulate user creation
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      // Reset form
      setUserName("");
      setEmail("");
      setPassword("");
      setSelectedLevels([]);
      onClose();
    }, 2000);
  };

  const handleSendResetLink = () => {
    setShowResetLink(true);
    setTimeout(() => {
      setShowResetLink(false);
    }, 2000);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-end pr-8">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div 
            className="relative bg-white rounded-[30px] border border-[rgba(255,255,255,0.3)] w-full max-w-[500px] max-h-[90vh] shadow-xl flex flex-col"
          >
            {/* Title Bar - Fixed */}
            <div className="flex items-center justify-between p-5 pb-0 shrink-0">
              <h2 className="text-[20px] font-bold leading-[1.6] text-[#10141a]">
                Add New User
              </h2>
              <button
                onClick={onClose}
                className="bg-[#eff2f3] border border-[rgba(255,255,255,0.3)] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#10141a]" />
              </button>
            </div>

            {/* Form - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex flex-col gap-4">
            {/* User Name */}
            <div className="flex flex-col gap-[4px] w-full">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                User Name
              </label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter Username"
                className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-[4px] w-full">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john-doe@agency.com"
                className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
              />
            </div>

            {/* Generate Password */}
            <div className="flex flex-col gap-[4px] w-full">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                Generate Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    value={password}
                    readOnly
                    placeholder="Click generate to create password"
                    className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white pl-[16px] pr-[44px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
                  />
                  {password && (
                    <button
                      onClick={copyPassword}
                      className="absolute right-[12px] top-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      {passwordCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#808081]" />
                      )}
                    </button>
                  )}
                </div>
                {!password && (
                  <Button
                    type="button"
                    onClick={generatePassword}
                    className="h-[44px] px-[20px] rounded-[12px] bg-[#00b4b8] hover:bg-[#009FA3] text-white text-[14px] font-medium whitespace-nowrap"
                  >
                    Generate
                  </Button>
                )}
              </div>
              {password && (
                <button
                  onClick={handleSendResetLink}
                  className="text-[12px] text-[#00B4B8] hover:underline mt-1 text-left"
                >
                  Send a reset password link
                </button>
              )}
            </div>

            {/* Access Level */}
            <div className="flex flex-col gap-[8px] w-full">
              <label className="text-[12px] font-normal leading-[normal]">
                Access Level
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {accessLevelOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleAccessLevel(option.id)}
                    className={`h-[36px] px-[12px] rounded-[8px] text-[12px] font-medium transition-colors ${
                      selectedLevels.includes(option.id)
                        ? "bg-[#00B4B8] text-white"
                        : "bg-[#f5f5f5] text-[#525253] hover:bg-[#e0e3e4]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Fixed */}
        <div className="flex gap-3 p-5 pt-4 border-t border-gray-200 sm:flex-row sm:items-center sm:justify-center shrink-0">
          <Button
            onClick={onClose}
            className="h-[44px] px-[24px] rounded-[30px] bg-transparent hover:bg-[#f5f5f5] text-[#10141a] text-[14px] font-medium border border-[#cccccd] w-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            className="h-[44px] px-[24px] rounded-[30px] bg-[#00b4b8] hover:bg-[#009FA3] text-white text-[14px] font-medium w-50"
          >
            Create User
          </Button>
        </div>
      </div>
    </div>
  )}

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <>
            <div 
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-[20px] shadow-2xl p-8 flex flex-col items-center text-center min-w-[380px]"
            >
              <div className="flex items-center justify-center flex-shrink-0 w-16 h-16 bg-[#22C55E] rounded-full mb-4">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-[20px] font-semibold text-[#10141a] mb-2">User Created Successfully</h3>
              <p className="text-[14px] text-[#808081] leading-relaxed">
                The use has been created. Please check their mail for the login credentials
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reset Link Toast */}
      <AnimatePresence>
        {showResetLink && (
          <>
            <div 
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-[20px] shadow-2xl p-8 flex flex-col items-center text-center min-w-[380px]"
            >
              <div className="w-16 h-16 rounded-full bg-[#00B4B8] flex items-center justify-center flex-shrink-0 mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-[20px] font-semibold text-[#10141a] mb-2">Reset Link Sent</h3>
              <p className="text-[14px] text-[#808081] leading-relaxed">
                Password reset link has been sent to this account
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
