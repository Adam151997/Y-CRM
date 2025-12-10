import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Y shape */}
          <path
            d="M6 4L16 16L26 4"
            stroke="#FF5757"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M16 16V28"
            stroke="#FF5757"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Connection nodes */}
          <circle cx="6" cy="4" r="3" fill="#FF5757" />
          <circle cx="26" cy="4" r="3" fill="#FF5757" />
          <circle cx="16" cy="28" r="3" fill="#FF5757" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
