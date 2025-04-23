"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Layout from "../components/Layout";
import { ExpandedComponentsProvider } from "../context/ExpandedComponentsContext";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth");
  const isPrivacyPage = pathname === "/privacy-policy";
  const isTermsPage = pathname === "/terms-of-service";
  const isCookiesPage = pathname === "/cookie-policy";


  if (isAuthPage) {
    return children;
  }

  if (isPrivacyPage || isTermsPage || isCookiesPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
        <nav className="bg-black/50 backdrop-blur-sm border-b border-white/10 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link
              href="/"
              className="text-white hover:text-blue-400 transition-colors duration-200 flex items-center space-x-1"
            >
              <span>← Back to Home</span>
            </Link>
          </div>
        </nav>
        {children}
      </div>
    );
  }

  return (
    <ExpandedComponentsProvider>
      <Layout>{children}</Layout>
    </ExpandedComponentsProvider>
  );
}
