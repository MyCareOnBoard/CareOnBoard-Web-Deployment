import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";
import { useSignDocumentMutation } from "@/pages/applicant/application/api";

type SignaturePayload = {
  signatureType: string;
  signatureData: string;
};

interface DigitalSignatureModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  proceed?: () => void;
  useCase?: string;
  onSave?: (signatureData: SignaturePayload) => void;
  skipBackend?: boolean;
  mode?: 'create' | 'view';
  existingSignature?: SignaturePayload | null;
  nested?: boolean;
  portalClassName?: string;
}

const DigitalSignatureModal = ({
  isOpen,
  setIsOpen,
  proceed,
  useCase = "general",
  onSave,
  skipBackend = false,
  mode = 'create',
  existingSignature,
  nested = false,
  portalClassName,
}: DigitalSignatureModalProps) => {
  const [activeTab, setActiveTab] = useState('type');
  const [typedSignature, setTypedSignature] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [signDocument] = useSignDocumentMutation();

  // Initialize canvas for drawing
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;

      const context = canvas.getContext('2d');
      if (!context) return;
      context.scale(2, 2);
      context.lineCap = 'round';
      context.strokeStyle = '#000';
      context.lineWidth = 2;
      contextRef.current = context;
    }
  }, [activeTab]);

  const startDrawing = (
    { nativeEvent }: { nativeEvent: MouseEvent }
  ) => {
    const { offsetX, offsetY } = nativeEvent
    if (contextRef.current) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
    }
    setIsDrawing(true);
  };

  const draw = (
    { nativeEvent }: { nativeEvent: MouseEvent }
  ) => {
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

  const getTouchPos = (canvas: HTMLCanvasElement, touch: React.Touch) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current || !contextRef.current) return;
    const touch = e.touches[0];
    const pos = getTouchPos(canvasRef.current, touch);
    contextRef.current.beginPath();
    contextRef.current.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current || !contextRef.current) return;
    const touch = e.touches[0];
    const pos = getTouchPos(canvasRef.current, touch);
    contextRef.current.lineTo(pos.x, pos.y);
    contextRef.current.stroke();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
          setUploadedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    let signatureData: SignaturePayload | null = null;

    if (activeTab === 'type' && typedSignature) {
      signatureData = { signatureType: 'type', signatureData: typedSignature };
    } else if (activeTab === 'draw' && canvasRef.current) {
      signatureData = { signatureType: 'draw', signatureData: canvasRef.current.toDataURL() };
    } else if (activeTab === 'upload' && uploadedImage) {
      signatureData = { signatureType: 'upload', signatureData: uploadedImage };
    }

    if (signatureData) {
      try {
        if (!skipBackend) {
          await signDocument({
            context: useCase,
            data: signatureData
          }).unwrap();
        }

        onSave?.(signatureData);
        proceed?.();
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to save signature:', error);
        alert('Failed to save signature. Please try again.');
      }
    } else {
      alert('Please provide a signature before proceeding.');
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-signature-modal
      className={cn(
        "fixed inset-0 z-40 flex items-center justify-center p-4",
        "bg-black/20 backdrop-blur-sm pointer-events-auto",
        nested && "z-[100]",
        portalClassName
      )}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl animate-fadeIn rounded-lg bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">Digital Signature</h2>
            <button
              onClick={handleCancel}
              className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* View Mode */}
          {mode === 'view' && existingSignature && (
            <>
              <div className="p-6">
                <div className="bg-[#EFEFEF] rounded-lg p-6 min-h-[240px] flex items-center justify-center">
                  {existingSignature.signatureType === 'type' ? (
                    <div className="w-full text-center">
                      <p
                        className="text-4xl py-4"
                        style={{ fontFamily: 'Brush Script MT, cursive' }}
                      >
                        {existingSignature.signatureData}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <img
                        src={existingSignature.signatureData}
                        alt="Signature"
                        className="max-h-48 object-contain"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Signature type: {existingSignature.signatureType === 'type' ? 'Typed' : existingSignature.signatureType === 'draw' ? 'Drawn' : 'Uploaded'}
                </p>
              </div>
              <div className="flex items-center justify-center p-3">
                <Button
                  onClick={handleCancel}
                  className="px-8 text-white font-medium bg-teal-500 hover:bg-teal-600 rounded-full transition-colors"
                >
                  Close
                </Button>
              </div>
            </>
          )}

          {/* Create Mode */}
          {mode === 'create' && (
            <>
              {/* Tabs */}
              <div className="flex border-b border-b-[#B2B2B3]">
                <button
                  onClick={() => setActiveTab('type')}
                  className={`cursor-pointer px-6 py-3 font-medium transition-colors relative ${activeTab === 'type'
                    ? 'text-teal-600 border-b-8 border-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Type
                </button>
                <button
                  onClick={() => setActiveTab('draw')}
                  className={`cursor-pointer px-6 py-3 font-medium transition-colors relative ${activeTab === 'draw'
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Draw
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`cursor-pointer px-6 py-3 font-medium transition-colors relative ${activeTab === 'upload'
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Upload
                </button>
              </div>

              {/* Content Area */}
              <div className="p-6">
                <div className="bg-[#EFEFEF] rounded-lg p-6 min-h-[240px] flex items-center justify-center">
                  {/* Type Tab */}
                  {activeTab === 'type' && (
                    <div className="w-full">
                      <input
                        type="text"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="Type your signature here"
                        className="w-full text-center text-3xl font-signature border-b-2 border-gray-300 bg-transparent focus:border-teal-600 outline-none py-4"
                        style={{ fontFamily: 'Brush Script MT, cursive' }}
                      />
                    </div>
                  )}

                  {/* Draw Tab */}
                  {activeTab === 'draw' && (
                    <div className="w-full relative">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="w-full h-48 bg-white border-2 border-dashed border-gray-300 rounded cursor-crosshair"
                      />
                      <button
                        onClick={clearCanvas}
                        className="absolute top-2 right-2 text-xs text-gray-600 hover:text-gray-900 bg-white px-3 py-1 rounded border border-gray-300"
                      >
                        Clear
                      </button>
                      <p className="text-center text-sm text-gray-500 mt-3">
                        Draw your signature above
                      </p>
                    </div>
                  )}

                  {/* Upload Tab */}
                  {activeTab === 'upload' && (
                    <div className="w-full">
                      {!uploadedImage ? (
                        <FileUpload
                          name={"signature"}
                          className="h-[90px] w-full max-w-[100vw]"
                          label={"Upload your signature"}
                          accept=".jpeg, .png, .jpg"
                          onChange={handleFileUpload}
                        />
                      ) : (
                        <div className="relative">
                          <img
                            src={uploadedImage}
                            alt="Uploaded signature"
                            className="max-h-48 mx-auto"
                          />
                          <button
                            onClick={() => setUploadedImage(null)}
                            className="absolute top-2 right-2 text-xs text-gray-600 hover:text-gray-900 bg-white px-3 py-1 rounded border border-gray-300"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                  By signing this document with an electronic signature, I agree that such signature will be as valid as
                  handwritten signatures to the extent allowed by local law.
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between space-x-3 p-3">
                <Button
                  onClick={handleCancel}
                  className="px-6 text-white font-medium bg-[#B2B2B3] hover:bg-gray-300 rounded-full transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  className="px-6 text-white font-medium bg-teal-500 hover:bg-teal-600 rounded-full transition-colors"
                >
                  Next
                </Button>
              </div>
            </>
          )}
      </div>
    </div>,
    document.body
  );
};

export default DigitalSignatureModal;