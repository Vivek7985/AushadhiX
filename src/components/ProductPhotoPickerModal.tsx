import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  FolderOpen,
  X,
  Check,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
  Sparkles,
  Maximize2,
  Minimize2,
  Grid,
  Focus,
} from 'lucide-react';

interface ProductPhotoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (imageDataUrl: string) => void;
  onTriggerBrowse: () => void;
  initialMode?: 'choice' | 'camera' | 'url';
  onScanImage?: (imageDataUrl: string) => void;
}

export const ProductPhotoPickerModal: React.FC<ProductPhotoPickerModalProps> = ({
  isOpen,
  onClose,
  onImageSelected,
  onTriggerBrowse,
  initialMode = 'choice',
  onScanImage,
}) => {
  const [mode, setMode] = useState<'choice' | 'camera' | 'url'>(initialMode);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [flash, setFlash] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [cameraAspect, setCameraAspect] = useState<'cover' | 'contain'>('cover');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    setCapturedPhoto(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or device.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      let msg = 'Could not access camera. Check device permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Allow camera in browser settings or use Browse.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. Choose Browse to pick a file.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode(initialMode || 'choice');
      setCapturedPhoto(null);
      setCameraError(null);
      setUrlInput('');
    } else {
      setMode(initialMode || 'choice');
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
  }, [mode, facingMode]);

  if (!isOpen) return null;

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  const handleConfirmPhoto = () => {
    if (capturedPhoto) {
      onImageSelected(capturedPhoto);
      handleModalClose();
    }
  };

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  const handleChooseBrowse = () => {
    stopCamera();
    onClose();
    onTriggerBrowse();
  };

  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onImageSelected(urlInput.trim());
      handleModalClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      } overflow-hidden`}
    >
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none'
            : mode === 'camera'
            ? 'max-w-5xl h-[94vh] max-h-[920px]'
            : 'max-w-xs'
        }`}
      >
        {/* Simple Header */}
        <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="font-semibold text-xs text-white">
              {mode === 'camera'
                ? 'Take Product Photo'
                : mode === 'url'
                ? 'Enter Image URL'
                : 'Add Product Photo'}
            </h3>
            {mode === 'camera' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Camera
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {mode === 'camera' && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={handleModalClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className={`p-3 sm:p-4 flex-1 flex flex-col min-h-0 ${mode === 'camera' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {/* CHOICE MODE */}
          {mode === 'choice' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 text-center font-medium">
                Choose how to add photo
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Camera Option */}
                <button
                  type="button"
                  onClick={() => setMode('camera')}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 active:scale-95 transition cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-slate-900">
                    Camera
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Take photo
                  </span>
                </button>

                {/* 2. Browse Option */}
                <button
                  type="button"
                  onClick={handleChooseBrowse}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 active:scale-95 transition cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-slate-900">
                    Browse
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Gallery / Files
                  </span>
                </button>
              </div>

              {/* Paste URL Option */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Have an image link?</span>
                <button
                  type="button"
                  onClick={() => setMode('url')}
                  className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 py-0.5 px-2 rounded hover:bg-emerald-50 transition cursor-pointer"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Paste URL</span>
                </button>
              </div>
            </div>
          )}

          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
              {cameraError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2.5 my-auto max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs">Camera Error</h4>
                      <p className="text-[11px] text-rose-700 mt-0.5">{cameraError}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-rose-200/60">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={handleChooseBrowse}
                      className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Browse Files
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Large Expansive Viewfinder */}
                  <div className="relative flex-1 w-full min-h-[440px] sm:min-h-[520px] md:min-h-[580px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none">
                    {flash && (
                      <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-150" />
                    )}

                    {capturedPhoto ? (
                      <img
                        src={capturedPhoto}
                        alt="Captured medicine preview"
                        className="w-full h-full object-contain bg-slate-950"
                      />
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full ${
                            cameraAspect === 'contain' ? 'object-contain' : 'object-cover'
                          } bg-black`}
                        />

                        {/* Optional Grid Overlay */}
                        {showGrid && (
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
                            <div className="border-r border-b border-white/20" />
                            <div className="border-r border-b border-white/20" />
                            <div className="border-b border-white/20" />
                            <div className="border-r border-b border-white/20" />
                            <div className="border-r border-b border-white/20" />
                            <div className="border-b border-white/20" />
                            <div className="border-r border-b border-white/20" />
                            <div className="border-r border-b border-white/20" />
                            <div />
                          </div>
                        )}

                        {/* Clear Corner Framing Overlay */}
                        <div className="absolute inset-4 sm:inset-8 md:inset-12 pointer-events-none flex flex-col justify-between z-20">
                          <div className="flex justify-between w-full">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                            <div className="w-9 h-9 sm:w-12 sm:h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                          </div>

                          <div className="flex justify-between w-full">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                            <div className="w-9 h-9 sm:w-12 sm:h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                          </div>
                        </div>

                        {/* Guidance Pill */}
                        <div className="absolute top-3 sm:top-4 inset-x-0 flex justify-center pointer-events-none z-20 px-3">
                          <span className="bg-black/75 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full border border-white/20 shadow-lg">
                            Align product packaging inside frame
                          </span>
                        </div>

                        {/* Overlay Controls */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30">
                          <button
                            type="button"
                            onClick={() => setShowGrid(!showGrid)}
                            className={`p-2 rounded-xl backdrop-blur-md border transition cursor-pointer text-xs ${
                              showGrid
                                ? 'bg-emerald-500 text-white border-emerald-400'
                                : 'bg-black/50 text-white/80 border-white/20 hover:bg-black/70 hover:text-white'
                            }`}
                            title={showGrid ? 'Hide grid' : 'Show grid'}
                          >
                            <Grid className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setCameraAspect((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
                            className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white/80 hover:text-white border border-white/20 backdrop-blur-md transition cursor-pointer text-xs"
                            title={cameraAspect === 'cover' ? 'Switch to Fit/Contain' : 'Switch to Fill/Cover'}
                          >
                            <Focus className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Camera Controls */}
                  {capturedPhoto ? (
                    <div className="flex items-center gap-2 pt-1 shrink-0 flex-wrap sm:flex-nowrap">
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer active:scale-95 transition"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-600" />
                        <span>Retake</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmPhoto}
                        className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer active:scale-98 transition"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Use This Photo</span>
                      </button>

                      {onScanImage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (capturedPhoto) {
                              onScanImage(capturedPhoto);
                              handleModalClose();
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer active:scale-98 transition"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                          <span>Scan Details with AI</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 pt-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMode('choice')}
                        className="px-3.5 py-2 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-medium cursor-pointer border border-slate-200 hover:bg-slate-100"
                      >
                        Back
                      </button>

                      {/* Snap Button */}
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        disabled={!isCameraActive}
                        className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 cursor-pointer transition"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                        <span>Capture Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-medium border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        title="Flip camera"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Flip Camera</span>
                        <span className="sm:hidden">Flip</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* URL MODE */}
          {mode === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Image Web URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  required
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMode('choice')}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                >
                  Add Image
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
