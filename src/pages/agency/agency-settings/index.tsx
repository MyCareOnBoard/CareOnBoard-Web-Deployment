import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useLocation } from "react-router";
import AccountTab from "./components/AccountTab";
import NotificationsTab from "./components/NotificationTab";
import UserLevelsTab from "./components/UserLevelsTab";

export default function AgencySettingsPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"account" | "notification" | "userLevels">("account");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check if we need to activate User Levels tab from navigation state
    if (location.state?.activeTab === "userLevels") {
      setActiveTab("userLevels");
    }
  }, [location.state]);

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div>
      {/* Page Header */}
      <h1 className="mb-4 text-[40px] font-bold leading-[1.4] text-[#10141a]">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium ${activeTab === "account"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab("notification")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium ${activeTab === "notification"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
        >
          Notification
        </button>
        <button
          onClick={() => setActiveTab("userLevels")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium ${activeTab === "userLevels"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
        >
          User Levels
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 bg-[#f7f7f7] rounded-2xl">
        {activeTab === "account" ? (
          <AccountTab onSaved={handleSave} />
        ) : activeTab === "notification" ? (
          <NotificationsTab />
        ) : (
          <UserLevelsTab />
        )}
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed flex items-center gap-2 px-5 py-3 bg-white border shadow-lg top-8 right-8 rounded-xl"
        >
          <CheckCircle2 className="w-6 h-6 text-[#00b4b8]" />
          <span className="font-medium text-gray-800">Changes saved successfully!</span>
        </motion.div>
      )}
    </div>
  );
}
