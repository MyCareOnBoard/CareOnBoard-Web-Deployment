import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signatureData: { signatureType: string; signatureData: string }) => void;
  title?: string;
}

export default function SignatureModal({
  open,
  onOpenChange,
  onSave,
  title = "Digital Signature",
}: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState("type");
  const [typedSignature, setTypedSignature] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize canvas for drawing
  useEffect(() => {
    if (activeTab === "draw" && canvasRef.current && open) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;

      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(2, 2);
      context.lineCap = "round";
      context.strokeStyle = "#000";
      context.lineWidth = 2;
      contextRef.current = context;
    }
  }, [activeTab, open]);

  const startDrawing = ({ nativeEvent }: { nativeEvent: MouseEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    if (contextRef.current) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
    }
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: { nativeEvent: MouseEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    if (!contextRef.current) return;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
          setUploadedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    let signatureData = null;

    if (activeTab === "type" && typedSignature) {
      signatureData = { signatureType: "type", signatureData: typedSignature };
    } else if (activeTab === "draw" && canvasRef.current) {
      signatureData = {
        signatureType: "draw",
        signatureData: canvasRef.current.toDataURL(),
      };
    } else if (activeTab === "upload" && uploadedImage) {
      signatureData = { signatureType: "upload", signatureData: uploadedImage };
    }

    if (signatureData) {
      onSave(signatureData);
      // Reset state
      setTypedSignature("");
      setUploadedImage(null);
      clearCanvas();
      setActiveTab("type");
    } else {
      alert("Please provide a signature before proceeding.");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state
    setTypedSignature("");
    setUploadedImage(null);
    clearCanvas();
    setActiveTab("type");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden bg-white max-w-8xl rounded-3xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <DialogTitle className="text-2xl font-bold text-[#10141a]">
              {title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e5e5e6] mb-6">
            <button
              onClick={() => setActiveTab("type")}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === "type"
                  ? "text-[#00b4b8] border-b-2 border-[#00b4b8]"
                  : "text-[#808081] hover:text-[#10141a]"
              }`}
            >
              Type
            </button>
            <button
              onClick={() => setActiveTab("draw")}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === "draw"
                  ? "text-[#00b4b8] border-b-2 border-[#00b4b8]"
                  : "text-[#808081] hover:text-[#10141a]"
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === "upload"
                  ? "text-[#00b4b8] border-b-2 border-[#00b4b8]"
                  : "text-[#808081] hover:text-[#10141a]"
              }`}
            >
              Upload
            </button>
          </div>

          {/* Content Area */}
          <div className="mb-6">
            <div className="bg-[#f8f9fa] rounded-xl p-6 min-h-[240px] flex items-center justify-center">
              {/* Type Tab */}
              {activeTab === "type" && (
                <div className="w-full">
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Type your signature here"
                    className="w-full text-center text-3xl font-signature border-b-2 border-[#e5e5e6] bg-transparent focus:border-[#00b4b8] outline-none py-4 text-[#10141a]"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  />
                </div>
              )}

              {/* Draw Tab */}
              {activeTab === "draw" && (
                <div className="relative w-full">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent("mousedown", {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                      });
                      if (!canvasRef.current) return;
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent("mousemove", {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                      });
                      if (!canvasRef.current) return;
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    onTouchEnd={() => {
                      const mouseEvent = new MouseEvent("mouseup", {});
                      if (!canvasRef.current) return;
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    className="w-full h-48 bg-white border-2 border-dashed border-[#e5e5e6] rounded-lg cursor-crosshair"
                  />
                  <button
                    onClick={clearCanvas}
                    className="absolute top-2 right-2 text-xs text-[#808081] hover:text-[#10141a] bg-white px-3 py-1 rounded-md border border-[#e5e5e6]"
                  >
                    Clear
                  </button>
                  <p className="text-center text-sm text-[#808081] mt-3">
                    Draw your signature above
                  </p>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === "upload" && (
                <div className="w-full">
                  {!uploadedImage ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#e5e5e6] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#00b4b8] hover:bg-white transition-colors min-h-[200px]"
                    >
                      <svg
                        className="w-12 h-12 text-[#808081] mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span className="text-sm text-[#808081] mb-1">
                        Upload your signature
                      </span>
                      <span className="text-xs text-[#a0a0a1]">
                        Supported formats: JPEG, PNG, JPG
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpeg,.png,.jpg"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={uploadedImage}
                        alt="Uploaded signature"
                        className="mx-auto rounded-lg max-h-48"
                      />
                      <button
                        onClick={() => setUploadedImage(null)}
                        className="absolute top-2 right-2 text-xs text-[#808081] hover:text-[#10141a] bg-white px-3 py-1 rounded-md border border-[#e5e5e6]"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-[#808081] mt-4 leading-relaxed text-center">
              By signing this document with an electronic signature, I agree that such
              signature will be as valid as handwritten signatures to the extent allowed
              by local law.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              className="flex-1 bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full py-3 h-auto font-medium border-0"
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full py-3 h-auto font-medium"
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}