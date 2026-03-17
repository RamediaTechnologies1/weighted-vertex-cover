import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FixIt AI — UDel Campus Maintenance",
  description:
    "AI-powered campus maintenance reporting for University of Delaware",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FixIt AI",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('fixit-theme') || 'system';
    var d = t === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : t === 'dark';
    if (d) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistMono.variable} antialiased bg-[#FAFAFA] dark:bg-[#0A0A0B] text-[#111111] dark:text-[#E5E7EB] min-h-screen`}
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            className: "!bg-white dark:!bg-[#141415] !border-[#E5E7EB] dark:!border-[#262626] !text-[#111111] dark:!text-[#E5E7EB] !shadow-[0_4px_12px_rgba(0,0,0,0.1)] !rounded-[6px]",
          }}
        />
      </body>
    </html>
  );
}
