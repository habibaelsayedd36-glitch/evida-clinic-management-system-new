"use client";

import { useEffect, useState } from "react";

export default function PwaInstallGuide() {
  const [show, setShow] = useState(false);
  const [isSafari, setIsSafari] = useState(true);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsSafari(/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua));
    setShow(ios && !standalone);
  }, []);

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20, 16, 35, .58)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="evida-install-title" style={{ width: "100%", maxWidth: 390, maxHeight: "88dvh", overflowY: "auto", borderRadius: 22, background: "#fff", color: "#252238", padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,.25)", fontFamily: "Arial, sans-serif", lineHeight: 1.45 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6c4ad4", fontWeight: 700, letterSpacing: 1 }}>EVIDA CLINIC</div>
            <h2 id="evida-install-title" style={{ margin: "6px 0 4px", fontSize: 21, lineHeight: 1.25 }}>Install EVIDA on your iPhone</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#686477" }}>Add EVIDA to your Home Screen for quick access. It is free and does not need the App Store.</p>
          </div>
          <button type="button" aria-label="Close" onClick={() => setShow(false)} style={{ flex: "0 0 auto", border: 0, borderRadius: 20, background: "#f1eff7", width: 34, height: 34, fontSize: 21, cursor: "pointer" }}>×</button>
        </div>
        {!isSafari ? <p style={{ margin: "14px 0", padding: 11, borderRadius: 10, background: "#fff4e5", color: "#714900", fontSize: 13 }}>First, open this same link in Safari. The installation option is available from Safari on iPhone.</p> : null}
        <ol style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
          <li style={{ display: "flex", gap: 11, padding: 12, borderRadius: 13, background: "#f7f5fb" }}>
            <b style={{ flex: "0 0 27px", height: 27, borderRadius: 20, background: "#e9e2fb", color: "#5633b6", display: "grid", placeItems: "center" }}>1</b>
            <div><b style={{ display: "block", fontSize: 14 }}>Tap Share</b><span style={{ display: "block", marginTop: 3, color: "#686477", fontSize: 12 }}>Tap the square with the upward arrow at the bottom of Safari.</span></div>
          </li>
          <li style={{ display: "flex", gap: 11, padding: 12, borderRadius: 13, background: "#f7f5fb" }}>
            <b style={{ flex: "0 0 27px", height: 27, borderRadius: 20, background: "#e9e2fb", color: "#5633b6", display: "grid", placeItems: "center" }}>2</b>
            <div><b style={{ display: "block", fontSize: 14 }}>Choose Add to Home Screen</b><span style={{ display: "block", marginTop: 3, color: "#686477", fontSize: 12 }}>Scroll down in the Share menu if you do not see it.</span></div>
          </li>
          <li style={{ display: "flex", gap: 11, padding: 12, borderRadius: 13, background: "#f7f5fb" }}>
            <b style={{ flex: "0 0 27px", height: 27, borderRadius: 20, background: "#e9e2fb", color: "#5633b6", display: "grid", placeItems: "center" }}>3</b>
            <div><b style={{ display: "block", fontSize: 14 }}>Tap Add</b><span style={{ display: "block", marginTop: 3, color: "#686477", fontSize: 12 }}>The EVIDA icon will appear on your iPhone Home Screen.</span></div>
          </li>
        </ol>
        <button type="button" onClick={() => setShow(false)} style={{ display: "block", width: "100%", minHeight: 48, marginTop: 18, padding: "12px 16px", border: 0, borderRadius: 12, background: "#6c4ad4", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", position: "sticky", bottom: 0 }}>Close instructions</button>
      </section>
    </div>
  );
}
