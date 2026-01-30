import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdForge",
  description: "Persona-First Advertising Platform - Transform consumer intelligence into high-performance creatives",
  keywords: ["advertising", "AI", "personas", "marketing", "creatives"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
