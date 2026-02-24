import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider, type Theme } from "@/components/theme/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bocadi",
  description: "Planificador de menús semanal",
};

const VALID_THEMES: Theme[] = ["light", "dark", "cyan", "sepia"];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("bocadi-theme")?.value ?? "light";
  const theme: Theme = VALID_THEMES.includes(raw as Theme)
    ? (raw as Theme)
    : "light";

  return (
    <html lang="es" data-theme={theme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
