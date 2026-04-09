import { NextRequest, NextResponse } from "next/server";
import { getDb, toRows } from "@/lib/db";
import { CATEGORIES, type PromptWithMeta } from "@/lib/prompts";

export async function GET(req: NextRequest) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(req.url);
        
        const category = searchParams.get("category");
        const query = searchParams.get("q");
        const limit = parseInt(searchParams.get("limit") || "60");
        const offset = parseInt(searchParams.get("offset") || "0");

        let sql = "SELECT * FROM prompt_library WHERE 1=1";
        const args: (string | number)[] = [];

        if (category) {
            sql += " AND category = ?";
            args.push(category);
        }

        if (query && query.trim()) {
            sql += " AND (title LIKE ? OR prompt LIKE ?)";
            const searchPattern = `%${query}%`;
            args.push(searchPattern, searchPattern);
        }

        // Primeiro, pegamos o total
        const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
        const countResult = await db.execute({ sql: countSql, args });
        const total = (countResult.rows[0] as any)?.total || 0;

        // Agora paginamos
        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        args.push(limit, offset);

        const result = await db.execute({ sql, args });
        const rows = toRows<any>(result.rows);

        const prompts: PromptWithMeta[] = rows.map((r, i) => {
            let metadata = {};
            try {
                metadata = JSON.parse(r.metadata || "{}");
            } catch (e) {
                console.error("Erro ao parsear metadata:", e);
            }

            return {
                title: r.title,
                content: r.prompt,
                category: r.category,
                index: offset + i,
                description: "", // Fallback
                sourceMedia: [], // Fallback
                needReferenceImages: false, // Fallback
                ...metadata,
            } as PromptWithMeta;
        });

        return NextResponse.json({
            prompts,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error("Erro na API de prompts:", error);
        return NextResponse.json({ error: "Erro interno ao buscar prompts" }, { status: 500 });
    }
}
