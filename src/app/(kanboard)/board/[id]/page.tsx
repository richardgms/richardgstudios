"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { KanbanBoard } from "@/components/kanboard/KanbanBoard";

export default function BoardPage() {
    const params = useParams();
    const boardId = params.id as string;
    const { setKbActiveBoardId } = useAppStore();

    useEffect(() => {
        setKbActiveBoardId(boardId);
        return () => setKbActiveBoardId(null);
    }, [boardId, setKbActiveBoardId]);

    return <KanbanBoard boardId={boardId} />;
}
