import { ImageResponse } from "next/og";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

const STEPS = ["ask questions", "prompt the model", "hidden tests"];

/** Shared visual for opengraph-image.tsx and twitter-image.tsx — same card, two conventions. */
export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#71717a",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Prompt Engineering Practice
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 108,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: -2,
          }}
        >
          Cleet Code
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 34,
            color: "#a1a1aa",
          }}
        >
          LeetCode for prompting.
        </div>

        <div style={{ display: "flex", marginTop: 56, alignItems: "center" }}>
          {STEPS.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  border: "1px solid #3f3f46",
                  color: "#e4e4e7",
                  fontSize: 22,
                  fontFamily: "Menlo, monospace",
                }}
              >
                {step}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ display: "flex", margin: "0 14px", color: "#52525b", fontSize: 24 }}>
                  {"→"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
