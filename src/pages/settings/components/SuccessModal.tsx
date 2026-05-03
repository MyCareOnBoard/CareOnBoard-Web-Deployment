import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

interface SuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  closeButtonAriaLabel?: string; // <-- added
}

export default function SuccessModal({
  isVisible,
  onClose,
  title = "Changes Saved",
  message = "The changes you made have been saved.",
  closeButtonAriaLabel = "Close", // <-- default
}: SuccessModalProps) {
  // Automatically close the modal after 2 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* overlay */}
          <motion.div
            data-testid="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full justify-center max-w-sm bg-white rounded-2xl px-8 py-10 text-center shadow-xl relative">
              {/* Close button */}
              <button
                aria-label={closeButtonAriaLabel}
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>

              <div className="flex m-auto items-center w-20 h-20 bg-green-100 rounded-full">
                <img
                  src="/src/assets/icons/email-verified-success-icon.svg"
                  alt="Mail Verified Icon"
                  className="mx-auto flex items-center w-full"
                />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
