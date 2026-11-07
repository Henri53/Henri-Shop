import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/settings";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.siteName,
    description: settings.tagline || "Digital goods shop",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-white antialiased">
        <Providers>
          <Nav siteName={settings.siteName} />
          <div className="flex-1">{children}</div>
          <Footer siteName={settings.siteName} supportUrl={settings.supportUrl} />
        </Providers>
      </body>
    </html>
  );
}
