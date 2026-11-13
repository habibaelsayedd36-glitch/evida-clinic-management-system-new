"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent));

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (isIOS) {
      window.location.assign("/install");
      return;
    }
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setPromptEvent(null);
        return;
      } catch (error) {
        console.error("EVIDA install prompt failed:", error);
        setPromptEvent(null);
      }
    }
    setShowHelp(true);
  }

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-iris-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-iris-700 transition hover:border-iris-500 hover:bg-iris-50"
        aria-label="Install Evida app"
      >
        <Download className="h-4 w-4 shrink-0" />
        Install App
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="install-title">
          <div className="relative my-auto w-full max-w-md rounded-2xl bg-white p-6 text-ink shadow-2xl sm:p-7">
            <button type="button" onClick={() => setShowHelp(false)} className="absolute right-4 top-4 rounded-lg p-2 text-ink/55 hover:bg-sand-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-iris-50 text-iris-700">
              <Download className="h-6 w-6" />
            </div>
            <h2 id="install-title" className="mt-4 pr-8 font-display text-xl font-bold">
              {isMobile ? "Add Evida to your phone" : "Install Evida on your computer"}
            </h2>
            {isIOS ? (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-ink/75">
                <li>1. Open this page in Safari.</li>
                <li className="flex items-center gap-2">2. Tap the Share button <Share className="h-4 w-4 shrink-0 text-iris-700" /> at the bottom.</li>
                <li>3. Choose “Add to Home Screen”.</li>
                <li>4. Tap “Add”. Evida will appear on your home screen.</li>
              </ol>
            ) : isMobile ? (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-ink/75">
                <li>1. Open this page in Chrome.</li>
                <li>2. Tap the three-dot menu in the top corner.</li>
                <li>3. Choose “Install app” or “Add to Home screen”.</li>
                <li>4. Confirm “Install” or “Add”.</li>
              </ol>
            ) : (
              <>
                <p className="mt-3 text-sm leading-6 text-ink/65">
                  In Google Chrome or Microsoft Edge, use the browser menu to install Evida as a desktop app:
                </p>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-ink/75">
                  <li>1. Open Evida in Google Chrome or Microsoft Edge.</li>
                  <li>2. Click the three-dot menu in the top-right corner.</li>
                  <li>3. In Chrome, choose “Cast, save, and share” → “Install page as app”. In Edge, choose “Apps” → “Install this site as an app”.</li>
                  <li>4. Confirm by clicking “Install”. Evida will open in its own window.</li>
                </ol>
                <p className="mt-4 rounded-xl bg-sand-50 p-3 text-xs leading-5 text-ink/60">
                  If you do not see an install option, open the website in the latest Chrome or Edge and check the browser menu again.
                </p>
              </>
            )}
            <button type="button" onClick={() => setShowHelp(false)} className="mt-6 w-full rounded-xl bg-iris-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-iris-800">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
