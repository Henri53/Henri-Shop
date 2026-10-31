import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Vaultline",
  description: "Account shop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="bg-bg text-white font-sans min-h-screen">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
