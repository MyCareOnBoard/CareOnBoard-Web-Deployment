import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "react-router";
import AccountTab from "./components/AccountTab";
import NotificationsTab from "./components/NotificationTab";
import UserLevelsTab from "./components/UserLevelsTab";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";

const AgencyInfoTab = lazy(() => import("./components/AgencyInfoTab"));

export default function AgencySettingsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"account" | "agencyInfo" | "notification" | "userLevels">("account");
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
      <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium whitespace-nowrap ${activeTab === "account"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab("agencyInfo")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium whitespace-nowrap ${activeTab === "agencyInfo"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
        >
          Agency Information
        </button>
        <button
          onClick={() => setActiveTab("notification")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium whitespace-nowrap ${activeTab === "notification"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
        >
          Notification
        </button>
        {((user?.userType === UserType.AGENCY_STAFF && user?.profile?.accessList?.includes("User Levels")) || user?.userType === UserType.AGENCY) && (
        <button
          onClick={() => setActiveTab("userLevels")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium whitespace-nowrap ${activeTab === "userLevels"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
        >
            Team
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="min-w-0 overflow-x-hidden rounded-2xl bg-[#f7f7f7] p-4">
        {activeTab === "account" ? (
          <AccountTab onSaved={handleSave} />
        ) : activeTab === "agencyInfo" ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center p-12 bg-white border rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-[#00b3ad]" />
              </div>
            }
          >
            <AgencyInfoTab onSaved={handleSave} />
          </Suspense>
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
