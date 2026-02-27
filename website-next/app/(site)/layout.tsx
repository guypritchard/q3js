import {AppShell} from "@/components/app-shell";

export default function SiteLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AppShell>{children}</AppShell>;
}
