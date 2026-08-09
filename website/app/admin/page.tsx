import type { Metadata } from "next";
import { AdminPage } from "@/components/admin-page";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Administration",
  description: "Q3JS master administration.",
  robots: { index: false, follow: false },
};

export default function AdminRoute() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <AdminPage />
    </div>
  );
}
