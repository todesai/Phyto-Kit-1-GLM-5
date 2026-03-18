import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Phyto Kit - Recipe Discovery & Nutritional Analysis",
  description: "Discover recipes with detailed nutrition information, bioactive compounds analysis, and food safety insights. Powered by TheMealDB and AI.",
  keywords: ["recipes", "nutrition", "bioactive compounds", "food safety", "cooking", "TheMealDB", "healthy eating"],
  authors: [{ name: "Phyto Kit Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Phyto Kit",
    description: "Recipe discovery with nutritional analysis and bioactive compounds research",
    url: "https://chat.z.ai",
    siteName: "Phyto Kit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Phyto Kit",
    description: "Recipe discovery with nutritional analysis and bioactive compounds research",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
