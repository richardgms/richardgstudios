import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Studio AI",
};

export default function StudioPageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
