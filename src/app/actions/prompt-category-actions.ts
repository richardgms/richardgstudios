'use server';

import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod schema para validação estrita de mutação, prevenindo NoSQL/SQL inj indiretos.
const toggleSchema = z.object({
    promptId: z.string().min(1, "ID de prompt inválido"),
    categoryId: z.string().min(1, "ID de categoria inválido").nullable(),
});

export async function setPromptCategory(promptId: string, categoryId: string | null) {
    try {
        // 1. Validação estrita (Zod) - Evitando inputs crus
        const valid = toggleSchema.parse({ promptId, categoryId });

        // AuthZ Check Mitigado: Nano Banana é uma aplicação desktop/local stand-alone.
        // Como não há tabela de usuários ou tokens, garantimos estritamente 
        // a integridade referencial dos dados para prevenir orphan records.

        // 2. Conexão ao DB local WAL enabled
        const db = getDb();

        // 3. Verificação de integridade referencial antes da Mutação
        const promptObj = db.prepare("SELECT id FROM ps_prompts WHERE id = ?").get(valid.promptId);
        if (!promptObj) {
            return { error: "Rejeitado: O prompt selecionado não existe no banco de dados." };
        }

        if (valid.categoryId) {
            const catObj = db.prepare("SELECT id FROM ps_folders WHERE id = ?").get(valid.categoryId);
            if (!catObj) {
                return { error: "Rejeitado: A categoria de destino não existe." };
            }
        }

        // 4. Mutação Segura com Queries Parametrizadas (Prevenindo SQLi local)
        db.prepare("UPDATE ps_prompts SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(valid.categoryId, valid.promptId);

        // 5. Revalidação de cache rigorosa nas rotas afetadas
        revalidatePath("/(studio)/prompts", "page");
        revalidatePath("/(studio)/studio", "page");
        revalidatePath("/(promptsave)/vault", "page");
        revalidatePath("/vault", "page");

        return { ok: true };
    } catch (error) {
        console.error("[setPromptCategory] Erro interno estrutural:", error);

        // Tratamento de erro mascarado (Security-Coder: graceful handling, não vaza trace stack)
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        return { error: "Falha na transação da base de dados. Tente novamente." };
    }
}
