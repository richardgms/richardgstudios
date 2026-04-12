import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Studio AI",
};

export default function StudioHome() {
  redirect("/studio");
}
