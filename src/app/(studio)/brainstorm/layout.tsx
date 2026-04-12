import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Brainstorm",
};

export default function BrainstormPageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
