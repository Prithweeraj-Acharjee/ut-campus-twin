import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UT Campus Twin — University of Toledo",
  description: "Real-time campus activity dashboard — see how busy buildings and parking lots are right now.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
