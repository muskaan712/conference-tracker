import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TIERS: { label: string; bg: string; fg: string }[] = [
  { label: "A*", bg: "#dbe4ff", fg: "#17337a" },
  { label: "A", bg: "#e7edff", fg: "#2540a8" },
  { label: "B", bg: "#fce2ec", fg: "#9c1a52" },
  { label: "C", bg: "#fff6cc", fg: "#7a5b06" },
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
        background: "#f7f9ff",
        padding: 72,
        color: "#17213c",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#3557d6",
            color: "#ffffff",
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
          color: "#52618a",
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
            background: "#eef2ff",
            color: "#3557d6",
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
