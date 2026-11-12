"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Smartphone } from "lucide-react";

export default function PwaInstallGuide() {
  const [show, setShow] = useState(false);
  const [browser, setBrowser] = useState("Safari");

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (ios && !standalone) {
      setBrowser(/CriOS|Chrome/i.test(ua) ? "another browser" : "Safari");
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/45 p-3 sm:items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="evida-install-title" className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-iris-100 text-iris-700"><Smartphone className="h-6 w-6" /></div>
            <div><h2 id="evida-install-title" className="text-base font-bold text-ink">Add EVIDA to your iPhone</h2><p className="mt-1 text-xs text-ink/55">Install it on your Home Screen — free, no App Store needed.</p></div>
          </div>
          <button type="button" onClick={() => setShow(false)} aria-label="Close" className="rounded-full p-2 text-ink/45 hover:bg-sand-100"><X className="h-4 w-4" /></button>
        </div>
        {browser !== "Safari" ? <div className="mt-4 rounded-xl bg-clay-100 p-3 text-xs leading-5 text-ink">You opened EVIDA in another browser. Copy this page link, open Safari, and paste it into the address bar before continuing.</div> : null}
        <ol className="mt-5 space-y-3">
          <li className="flex gap-3 rounded-2xl bg-sand-50 p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-iris-100 text-sm font-bold text-iris-700">1</span><div><p className="text-sm font-semibold text-ink">Tap the Share button</p><p className="mt-1 text-xs leading-5 text-ink/60">In Safari, tap the square icon with the upward arrow at the bottom of the screen. On some iPads it is at the top.</p><Share className="mt-2 h-6 w-6 text-iris-600" /></div></li>
          <li className="flex gap-3 rounded-2xl bg-sand-50 p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-iris-100 text-sm font-bold text-iris-700">2</span><div><p className="text-sm font-semibold text-ink">Choose Add to Home Screen</p><p className="mt-1 text-xs leading-5 text-ink/60">Scroll down in the Share menu if you cannot see it.</p><PlusSquare className="mt-2 h-6 w-6 text-iris-600" /></div></li>
          <li className="flex gap-3 rounded-2xl bg-sand-50 p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-iris-100 text-sm font-bold text-iris-700">3</span><div><p className="text-sm font-semibold text-ink">Tap Add</p><p className="mt-1 text-xs leading-5 text-ink/60">EVIDA will appear as an app icon on your iPhone. Open it from there next time.</p></div></li>
        </ol>
        <button type="button" onClick={() => setShow(false)} className="mt-5 w-full rounded-xl bg-iris-700 px-4 py-3 text-sm font-semibold text-white hover:bg-iris-800">Got it</button>
        <p className="mt-3 text-center text-[11px] text-ink/45">This is a one-time setup. Your account and appointments stay the same.</p>
      </section>
    </div>
  );
}
