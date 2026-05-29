import { lazy, Suspense, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";
import type { DspPaymentDetails } from "@/lib/api/paymentDetails";
import AccountTab from "./components/AccountTab";
import NotificationsTab from "./components/NotificationTab";

const PaymentTab = lazy(() => import("./components/PaymentTab"));

type SettingsTab = "account" | "notification" | "payroll";

function PaymentTabFallback() {
  return (
    <div className="flex items-center justify-center p-12 bg-white border rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b3ad]" />
        <p className="text-sm text-gray-500">Loading payroll details...</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [showSuccess, setShowSuccess] = useState(false);
  const [payrollCache, setPayrollCache] = useState<DspPaymentDetails | null>(null);
  const [hasOpenedPayroll, setHasOpenedPayroll] = useState(false);

  const isEmployee = user?.userType === UserType.EMPLOYEE;

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handlePayrollCacheUpdate = useCallback((details: DspPaymentDetails) => {
    setPayrollCache(details);
  }, []);

  const openPayrollTab = () => {
    setHasOpenedPayroll(true);
    setActiveTab("payroll");
  };

  return (
    <div>
      <h1 className="mb-4 text-[40px] font-bold leading-[1.4] text-[#10141a]">Settings</h1>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium ${
            activeTab === "account"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
          }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab("notification")}
          className={`px-4 py-2 rounded-full cursor-pointer font-medium ${
            activeTab === "notification"
              ? "bg-[#00B4B8] text-white"
              : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
          }`}
        >
          Notification
        </button>
        {user && isEmployee && (
          <button
            onClick={openPayrollTab}
            className={`px-4 py-2 rounded-full cursor-pointer font-medium ${
              activeTab === "payroll"
                ? "bg-[#00B4B8] text-white"
                : "outline-2 outline-offset-2 outline-solid outline-gray-300 bg-gray-200 text-gray-500"
            }`}
          >
            Payroll
          </button>
        )}
      </div>

      <div className="p-4 bg-[#f7f7f7] rounded-2xl">
        {activeTab === "account" ? (
          <AccountTab onSaved={handleSave} />
        ) : activeTab === "notification" ? (
          <NotificationsTab />
        ) : hasOpenedPayroll ? (
          <Suspense fallback={<PaymentTabFallback />}>
            <PaymentTab
              cachedDetails={payrollCache}
              onCacheUpdate={handlePayrollCacheUpdate}
            />
          </Suspense>
        ) : null}
      </div>

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
