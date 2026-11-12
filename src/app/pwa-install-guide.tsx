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
    setShow(
      ios &&
        !standalone &&
        window.sessionStorage.getItem("evida-install-guide-dismissed") !== "1",
    );
  }, []);

  function closeGuide() {
    window.sessionStorage.setItem("evida-install-guide-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  const stepStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "30px minmax(0, 1fr)",
    alignItems: "start",
    columnGap: 12,
    padding: "13px 12px",
    borderRadius: 14,
    background: "#f7f5fb",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };

  const stepNumberStyle: CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 999,
    background: "#e9e2fb",
    color: "#5633b6",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    lineHeight: 1,
    fontSize: 14,
  };

  const stepTextStyle: CSSProperties = {
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "normal",
    textAlign: "left",
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
        padding:
          "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))",
        boxSizing: "border-box",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="evida-install-title"
        dir="ltr"
        style={{
          width: "min(100%, 420px)",
          maxHeight:
            "calc(100dvh - max(24px, env(safe-area-inset-top) + env(safe-area-inset-bottom) + 24px))",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          borderRadius: 22,
          background: "#fff",
          color: "#252238",
          padding: "clamp(14px, 4vw, 22px)",
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          fontFamily: "Arial, sans-serif",
          lineHeight: 1.6,
          boxSizing: "border-box",
          overflowWrap: "anywhere",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 36px",
            alignItems: "start",
            gap: 10,
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: "#6c4ad4",
                fontWeight: 700,
                letterSpacing: 1,
                textAlign: "left",
              }}
            >
              EVIDA CLINIC
            </div>
            <h2
              id="evida-install-title"
              style={{
                margin: "7px 0 6px",
                fontSize: "clamp(19px, 5vw, 23px)",
                lineHeight: 1.4,
                textAlign: "left",
                overflowWrap: "anywhere",
              }}
            >
              Install EVIDA on your iPhone
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#686477",
                lineHeight: 1.7,
                textAlign: "left",
              }}
            >
              Add EVIDA to your Home Screen for quick access. It is free and does not require the App Store.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close instructions"
            onClick={closeGuide}
            style={{
              width: 36,
              height: 36,
              border: 0,
              borderRadius: 20,
              background: "#f1eff7",
              color: "#4a2e99",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {!isSafari ? (
          <p
            style={{
              margin: "14px 0 0",
              padding: 12,
              borderRadius: 12,
              background: "#fff4e5",
              color: "#714900",
              fontSize: 13,
              lineHeight: 1.7,
              textAlign: "left",
              overflowWrap: "anywhere",
            }}
          >
            First, open this same link in Safari. The Add to Home Screen option is available in Safari on iPhone.
          </p>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 16,
            minWidth: 0,
          }}
        >
          <div style={stepStyle}>
            <span style={stepNumberStyle}>1</span>
            <div style={stepTextStyle}>
              <strong style={{ display: "block", fontSize: 14, lineHeight: 1.5 }}>
                Tap the Share button
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#686477",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                Tap the square icon with the upward arrow in Safari.
              </span>
            </div>
          </div>

          <div style={stepStyle}>
            <span style={stepNumberStyle}>2</span>
            <div style={stepTextStyle}>
              <strong style={{ display: "block", fontSize: 14, lineHeight: 1.5 }}>
                Choose Add to Home Screen
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#686477",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                If you do not see it, scroll down in the Share menu.
              </span>
            </div>
          </div>

          <div style={stepStyle}>
            <span style={stepNumberStyle}>3</span>
            <div style={stepTextStyle}>
              <strong style={{ display: "block", fontSize: 14, lineHeight: 1.5 }}>
                Tap Add to confirm
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#686477",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                The EVIDA icon will appear on your iPhone Home Screen. Tap it anytime to open the app.
              </span>
            </div>
          </div>
        </div>

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
            lineHeight: 1.4,
            fontWeight: 700,
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          Got it
        </button>
      </section>
    </div>
  );
}
