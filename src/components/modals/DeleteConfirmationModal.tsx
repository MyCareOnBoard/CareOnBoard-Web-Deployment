import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  title = "Delete Account?",
  message = "Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.",
  confirmText = "Delete",
  cancelText = "Cancel",
}: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md px-8 py-8 mx-4 text-center bg-white shadow-2xl rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="text-red-600" size={32} />
              </div>
            </div>
            <h4 className="mb-2 text-xl font-semibold text-gray-900">{title}</h4>
            <p className="mb-6 text-sm text-gray-600">{message}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1"
              >
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 bg-[#d93c24] hover:bg-[#c52d16] text-white"
              >
                {isDeleting ? "Deleting..." : confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}