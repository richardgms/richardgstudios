import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Galeria",
};

export default function GalleryPageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
