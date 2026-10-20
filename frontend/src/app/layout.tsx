import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import DevConsole from "@/components/DevConsole";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Event Marketplace",
  description: "Post and browse event requirements for planners, performers and crew",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} min-h-screen bg-[#faf7f2] font-sans text-stone-800`}>
        <nav className="flex items-center justify-between border-b border-[#e7e0d5] px-8 py-4">
          <a href="/" className="font-serif text-xl text-stone-900">Event Marketplace</a>
          <a href="/post-requirement" className="rounded-full bg-stone-900 px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-white">
            + Post requirement
          </a>
        </nav>
        {children}
        <DevConsole />
      </body>
    </html>
  );
}