import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Current public app origin or fallback for APK packaging
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aushadhix.app';
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
        title="Install Android App / Download APK"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-100" />
        <span className="hidden sm:inline">Get Mobile App</span>
        <span className="sm:hidden">App</span>
      </button>

      {/* MODAL: Android APK & Mobile Installation Guide */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">Install AushadhiX on Android</h3>
                  <div className="text-[11px] text-emerald-200">
                    Standalone Mobile App &amp; APK Distribution
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Option 1: Direct 1-Tap Mobile Installation */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Option 1: Direct Android Phone Install (Recommended)
                  </span>
                  <span className="text-[10px] uppercase font-bold bg-emerald-200/70 text-emerald-800 px-1.5 py-0.5 rounded">
                    Instant
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Open this link on your Android device in Google Chrome:
                </p>
                <div className="bg-white border border-emerald-200 rounded-xl p-2 font-mono text-[11px] text-slate-700 truncate select-all">
                  {appUrl}
                </div>
                <p className="text-slate-500 text-[11px]">
                  Tap <strong>&ldquo;Install App&rdquo;</strong> in the menu or tap the <strong>&ldquo;Add to Home screen&rdquo;</strong> prompt. It installs directly onto your phone with an app icon, full-screen standalone UI, and offline storage.
                </p>

                {isInstallable && (
                  <button
                    type="button"
                    onClick={async () => {
                      await install();
                      setShowModal(false);
                    }}
                    disabled={installing}
                    className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {installing ? 'Prompting Install...' : 'Install on This Device Now'}
                  </button>
                )}
              </div>

              {/* Option 2: Build Official Signed .APK / .AAB */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-700" />
                    Option 2: Generate Signed .APK Binary File
                  </span>
                  <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    Package
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  The PWA Web Manifest, 512x512 maskable icons, and Service Worker are fully configured. You can generate a signed standalone <strong>.apk</strong> or Google Play Store package (<strong>.aab</strong>) in 1 click using Microsoft / Google&apos;s <strong>PWABuilder</strong>:
                </p>

                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Build .APK with PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <div className="text-[10px] text-slate-400 leading-snug">
                  1. Click above to open PWABuilder with this app pre-verified.
                  <br />
                  2. Click <strong>&ldquo;Package for Stores&rdquo; &rarr; &ldquo;Android&rdquo;</strong>.
                  <br />
                  3. Download the standalone <strong>.apk</strong> to install on any Android phone!
                </div>
              </div>

              {/* iOS Note */}
              {isIOS && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  <strong>On iPhone / iPad:</strong> Tap the Safari Share icon &rarr; select <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
