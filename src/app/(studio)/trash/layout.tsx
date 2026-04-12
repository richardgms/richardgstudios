import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Lixeira",
};

export default function TrashPageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
