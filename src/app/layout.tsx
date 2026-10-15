import type { Metadata } from "next";
import Link from "next/link";
import { DM_Sans, Fraunces } from "next/font/google";
import { ServiceStatus } from "../components/lead/ServiceStatus";
import "./globals.css";
import "./lead-desk.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Leadscale | Lead desk",
  description: "A clear next step for every real estate conversation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <div className="site-shell">
          <header className="site-header">
            <Link
              className="brand-lockup"
              href="/"
              aria-label="Leadscale lead desk"
            >
              <span className="brand-mark" aria-hidden="true">
                L
              </span>
              <span className="brand-name">Leadscale</span>
            </Link>
            <div className="header-right">
              <Link className="properties-link" href="/properties">
                Properties
              </Link>
              <ServiceStatus />
              {process.env.NODE_ENV !== "production" ? (
                <Link className="design-link" href="/design">
                  Design system
                </Link>
              ) : null}
            </div>
          </header>
          {children}
          <footer className="site-footer">
            <span>Leadscale</span>
            <span>Real estate, with a clear next step.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
