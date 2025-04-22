"use client";

import { usePathname } from "next/navigation";
import Layout from "../components/Layout";
import { ExpandedComponentsProvider } from "../context/ExpandedComponentsContext";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth");

  if (isAuthPage) {
    return children;
  }

  return (
    <ExpandedComponentsProvider>
      <Layout>{children}</Layout>
    </ExpandedComponentsProvider>
  );
} 