"use client";

import { useEffect, useState, type CSSProperties } from "react";

export default function PwaInstallGuide() {
  const [show, setShow] = useState(false);
  const [isSafari, setIsSafari] = useState(true);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsSafari(/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua));
    setShow(ios && !standalone && window.sessionStorage.getItem("evida-install-guide-dismissed") !== "1");
  }, []);

  function closeGuide() {
    window.sessionStorage.setItem("evida-install-guide-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  const stepStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 13,
    borderRadius: 14,
    background: "#f7f5fb",
    minWidth: 0,
  };
  const stepNumberStyle: CSSProperties = {
    flex: "0 0 28px",
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#e9e2fb",
    color: "#5633b6",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    lineHeight: 1,
  };
  const stepTextStyle: CSSProperties = {
    flex: "1 1 0%",
    minWidth: 0,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(20, 16, 35, .62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="evida-install-title"
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "min(90dvh, 720px)",
          overflowY: "auto",
          overscrollBehavior: "contain",
          borderRadius: 22,
          background: "#fff",
          color: "#252238",
          padding: "clamp(16px, 5vw, 24px)",
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          fontFamily: "Arial, sans-serif",
          lineHeight: 1.5,
          boxSizing: "border-box",
          overflowWrap: "break-word",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
          <div style={{ flex: "1 1 0%", minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#6c4ad4", fontWeight: 700, letterSpacing: 1 }}>
              EVIDA CLINIC
            </div>
            <h2
              id="evida-install-title"
              style={{ margin: "7px 0 6px", fontSize: "clamp(19px, 5vw, 23px)", lineHeight: 1.3, overflowWrap: "break-word" }}
            >
              Install EVIDA on your iPhone
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#686477", lineHeight: 1.55 }}>
              Add EVIDA to your Home Screen for quick access. It is free and does not need the App Store.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close instructions"
            onClick={closeGuide}
            style={{
              flex: "0 0 36px",
              width: 36,
              height: 36,
              border: 0,
              borderRadius: 20,
              background: "#f1eff7",
              color: "#4a2e99",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {!isSafari ? (
          <p style={{ margin: "14px 0 0", padding: 12, borderRadius: 12, background: "#fff4e5", color: "#714900", fontSize: 13, lineHeight: 1.5 }}>
            First, open this same link in Safari. The installation option is available from Safari on iPhone.
          </p>
        ) : null}

        <ol style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          <li style={stepStyle}>
            <span style={stepNumberStyle}>1</span>
            <div style={stepTextStyle}>
              <strong style={{ display: "block", fontSize: 14, lineHeight: 1.4 }}>Tap Share</strong>
              <span style={{ display: "block", marginTop: 4, color: "#686477", fontSize: 12, lineHeight: 1.55 }}>
                Tap the square with the upward arrow at the bottom of Safari.
              </span>
            </div>
          </li>
          <li style={stepStyle}>
            <span style={stepNumberStyle}>2</span>
            <div style={stepTextStyle}>
              <strong style={{ display: "block", fontSize: 14, lineHeight: 1.4 }}>Choose Add to Home Screen</strong>
              <span style={{ display: "block", marginTop: 4, color: "#686477", fontSize: 12, lineHeight: 1.55 }}>
                Scroll down in the Share menu if you do not see this option.
              </span>
            </div>
          </li>
          <li style={stepStyle}>
            <span style={stepNumberStyle}>3</span>
            <div style={stepTextStyle}>
              <strong style={{ display: "block", fontSize: 14, lineHeight: 1.4 }}>Tap Add</strong>
              <span style={{ display: "block", marginTop: 4, color: "#686477", fontSize: 12, lineHeight: 1.55 }}>
                The EVIDA icon will appear on your iPhone Home Screen.
              </span>
            </div>
          </li>
        </ol>

        <button
          type="button"
          onClick={closeGuide}
          style={{
            display: "block",
            width: "100%",
            minHeight: 48,
            marginTop: 16,
            padding: "12px 16px",
            border: 0,
            borderRadius: 12,
            background: "#6c4ad4",
            color: "#fff",
            fontSize: 15,
            lineHeight: 1.3,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Close instructions
        </button>
      </section>
    </div>
  );
}
