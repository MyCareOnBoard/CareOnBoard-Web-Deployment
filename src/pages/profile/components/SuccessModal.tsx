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
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
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
            <div className="relative justify-center w-full max-w-sm px-8 py-10 text-center bg-white shadow-xl rounded-2xl">
              {/* Close button */}
              <button
                aria-label={closeButtonAriaLabel}
                onClick={onClose}
                className="absolute text-gray-400 top-3 right-3 hover:text-gray-600"
              >
                ✕
              </button>

              <div className="flex items-center w-20 h-20 m-auto bg-green-100 rounded-full">
                <img
                  src="/src/assets/icons/email-verified-success-icon.svg"
                  alt="Mail Verified Icon"
                  className="flex items-center w-full mx-auto"
                />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
