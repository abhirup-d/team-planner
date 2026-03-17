import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Team Analytics Dashboard",
  description: "Resource planner and team utilisation tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lato.variable} antialiased`}
        style={{ fontFamily: "var(--font-lato), sans-serif" }}
      >
        <ThemeProvider>
          <Sidebar />
          <main className="md:ml-64 min-h-screen p-6 pt-16 md:pt-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
