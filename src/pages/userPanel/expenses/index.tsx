import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExpensesPage() {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (images and PDFs)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image (JPEG, PNG, GIF) or PDF file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a receipt before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please add a message describing your expense.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      const formData = new FormData();
      formData.append('receipt', selectedFile);
      formData.append('message', message);

      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Expense submitted successfully",
        description: "Your expense has been submitted for review.",
      });

      // Reset form
      setMessage("");
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error("Failed to submit expense:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Expenses
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#808081]">Work Availibility</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b4b8]"></div>
          </label>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl p-8 bg-white rounded-2xl">
        {/* Upload Receipts Section */}
        <div className="mb-6">
          <label className="block text-base font-semibold text-[#10141a] mb-3">
            Upload Receipts
          </label>
          
          <div className="relative">
            <input
              type="file"
              id="receipt-upload"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileChange}
            />
            <label
              htmlFor="receipt-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#e5e5e6] rounded-xl hover:border-[#00b4b8]/50 transition-colors cursor-pointer bg-[#f8f9fa] hover:bg-[#f0f1f2]"
            >
              <Upload className="w-8 h-8 text-[#808081] mb-2" />
              <span className="text-sm text-[#808081]">
                {selectedFile ? selectedFile.name : "Upload your receipt"}
              </span>
              <span className="text-xs text-[#a0a0a1] mt-1">
                Supported formats: JPEG, PNG, GIF, PDF (Max 10MB)
              </span>
            </label>
          </div>

          {selectedFile && (
            <div className="mt-3 flex items-center justify-between p-3 bg-[#e5f7f7] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00b4b8]/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#00b4b8]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#10141a]">{selectedFile.name}</p>
                  <p className="text-xs text-[#808081]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
                className="text-[#ef4444] hover:text-[#dc2626] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Your Message Section */}
        <div className="mb-6">
          <label className="block text-base font-semibold text-[#10141a] mb-3">
            Your message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your expense here..."
            className="min-h-[200px] resize-none border-[#e5e5e6] rounded-xl focus:border-[#00b4b8] focus:ring-[#00b4b8] text-[#10141a] placeholder:text-[#a0a0a1]"
          />
          <p className="text-xs text-[#808081] mt-2">
            {message.length} / 500 characters
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-start">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-8 py-3 h-auto font-semibold text-base shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}