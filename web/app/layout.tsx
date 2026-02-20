import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Only Fit | Lift. Track. Dominate.",
  description:
    "The modern fitness app for tracking workouts, supersets, rest timers, and personal records. Built for everyone from beginners to advanced athletes.",
  openGraph: {
    title: "Only Fit | Lift. Track. Dominate.",
    description:
      "The modern fitness app for tracking workouts, supersets, rest timers, and personal records.",
    type: "website",
    siteName: "Only Fit",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
