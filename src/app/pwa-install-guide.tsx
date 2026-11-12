"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare } from "lucide-react";

export default function PwaInstallGuide() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ios = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setShow(ios && !standalone);
  }, []);

  if (!show) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-md rounded-2xl border border-iris-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">Install EVIDA on your iPhone</p>
          <p className="mt-1 text-xs leading-5 text-ink/65">Open this page in Safari, then tap Share and choose Add to Home Screen.</p>
        </div>
        <button type="button" onClick={() => setShow(false)} aria-label="Close install instructions" className="rounded-lg p-1 text-ink/45 hover:bg-sand-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-sand-50 p-3">
          <Share className="h-5 w-5 text-iris-600" />
          <p className="mt-2 text-xs font-semibold text-ink">1. Tap Share</p>
          <p className="mt-1 text-[11px] text-ink/55">At the bottom of Safari</p>
        </div>
        <div className="rounded-xl bg-sand-50 p-3">
          <PlusSquare className="h-5 w-5 text-iris-600" />
          <p className="mt-2 text-xs font-semibold text-ink">2. Add to Home Screen</p>
          <p className="mt-1 text-[11px] text-ink/55">Then tap Add</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-ink/55">If you opened EVIDA in Chrome or another browser, copy the link and open it in Safari first.</p>
    </aside>
  );
}
