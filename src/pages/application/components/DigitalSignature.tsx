import React, {useState, useRef, useEffect} from 'react';
import {X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {FileUpload} from "@/components/ui/file-upload";

const DigitalSignatureModal = (
  {isOpen, setIsOpen, proceed}: {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    proceed: () => void
  }
) => {
  const [activeTab, setActiveTab] = useState('type');
  const [typedSignature, setTypedSignature] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

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
    {nativeEvent}: { nativeEvent: MouseEvent }
  ) => {
    const {offsetX, offsetY} = nativeEvent
    if (contextRef.current) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
    }
    setIsDrawing(true);
  };

  const draw = (
    {nativeEvent}: { nativeEvent: MouseEvent }
  ) => {
    if (!isDrawing) return;
    const {offsetX, offsetY} = nativeEvent;
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

  const handleNext = () => {
    let signatureData = null;

    if (activeTab === 'type' && typedSignature) {
      signatureData = {type: 'typed', value: typedSignature};
    } else if (activeTab === 'draw' && canvasRef.current) {
      signatureData = {type: 'drawn', value: canvasRef.current.toDataURL()};
    } else if (activeTab === 'upload' && uploadedImage) {
      signatureData = {type: 'uploaded', value: uploadedImage};
    }

    if (signatureData) {
      console.log('Signature saved:', signatureData);
      proceed();
      setIsOpen(false);
    } else {
      alert('Please provide a signature before proceeding.');
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-40 backdrop-blur z-40"
        onClick={() => setIsOpen(false)}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl relative animate-fadeIn p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">Digital Signature</h2>
            <button
              onClick={handleCancel}
              className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-b-[#B2B2B3]">
            <button
              onClick={() => setActiveTab('type')}
              className={`cursor-pointer px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'type'
                  ? 'text-teal-600 border-b-8 border-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Type
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`cursor-pointer px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'draw'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`cursor-pointer px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'upload'
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
                    style={{fontFamily: 'Brush Script MT, cursive'}}
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
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent('mousedown', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                      });
                      if (!canvasRef.current) return;
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                      });
                      if (!canvasRef.current) return;
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    onTouchEnd={(e) => {
                      const mouseEvent = new MouseEvent('mouseup', {});
                      if (!canvasRef.current) return;
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
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
        </div>
      </div>
    </>
  );
};

export default DigitalSignatureModal;