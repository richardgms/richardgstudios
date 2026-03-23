import { LucideIcon } from "lucide-react";

export interface BrainstormMessage {
    role: "user" | "assistant";
    content: string;
    attachments?: BrainstormAttachment[];
}

export interface ChatSession {
    id: string;
    name: string;
    updated_at: string;
    snippet?: string;
}

export interface BrainstormAttachment {
    id: string;
    url: string;
    type: string;
    base64?: string;
    fileUri?: string;
    name?: string;
    fileInstance?: File;
    isUploading?: boolean;
}

export interface SuggestionItem {
    icon: LucideIcon;
    title: string;
    prompt: string;
}
