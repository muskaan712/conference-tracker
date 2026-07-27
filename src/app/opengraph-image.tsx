import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TIERS: { label: string; bg: string; fg: string }[] = [
  { label: "A*", bg: "#fde9d0", fg: "#7a4310" },
  { label: "A", bg: "#d3f3e6", fg: "#0d5f42" },
  { label: "B", bg: "#d9edfb", fg: "#0b4a72" },
  { label: "C", bg: "#e9dff6", fg: "#4a2a72" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#faf7f1",
        padding: 72,
        color: "#211c15",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#b5502d",
            color: "#fff8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          A
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>{siteConfig.title}</div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 28,
          lineHeight: 1.45,
          color: "#4b453b",
          maxWidth: 980,
        }}
      >
        Verified deadlines, rankings, and locations for AI, ML, NLP, vision, IR, and trustworthy-AI
        conferences — plus resubmission planning and weekly update checks.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {TIERS.map((tier) => (
          <div
            key={tier.label}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: 999,
              background: tier.bg,
              color: tier.fg,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {tier.label}
          </div>
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 22px",
            borderRadius: 999,
            background: "#e4ddcf",
            color: "#4b453b",
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          Europe · Worldwide
        </div>
      </div>
    </div>,
    size,
  );
}
