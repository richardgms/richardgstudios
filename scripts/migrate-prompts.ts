import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Carregar variáveis do .env.local ou .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const DB_URL = process.env.TURSO_DATABASE_URL;
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function migrate() {
    console.log("🚀 Iniciando migração de prompts para o Turso...");
    
    if (!DB_URL) {
        console.error("❌ Erro: TURSO_DATABASE_URL não configurada.");
        return;
    }

    const client = createClient({
        url: DB_URL,
        authToken: AUTH_TOKEN,
    });

    const dataDir = path.join(process.cwd(), "src", "data");
    
    if (!fs.existsSync(dataDir)) {
        console.error("❌ Diretório src/data não encontrado.");
        return;
    }

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));
    
    console.log(`📂 Encontrados ${files.length} arquivos JSON.`);

    for (const file of files) {
        const category = file.replace(".json", "");
        const filePath = path.join(dataDir, file);
        
        console.log(`\n📄 Processando categoria: ${category}...`);
        
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const prompts = JSON.parse(content);
            
            if (!Array.isArray(prompts)) {
                console.warn(`[SKIP] ${file} não é um array válido.`);
                continue;
            }

            console.log(`🔄 Inserindo ${prompts.length} prompts...`);

            // Inserir em batches de 50 para não estourar limites do Turso/LibSQL
            const batchSize = 50;
            for (let i = 0; i < prompts.length; i += batchSize) {
                const batch = prompts.slice(i, i + batchSize);
                
                const statements = batch.map(p => ({
                    sql: "INSERT OR REPLACE INTO prompt_library (id, category, title, prompt, metadata) VALUES (?, ?, ?, ?, ?)",
                    args: [
                        uuidv4(),
                        category,
                        p.title || "Sem Título",
                        p.prompt || "",
                        JSON.stringify(p.metadata || {})
                    ]
                }));

                await client.batch(statements, "write");
                
                const progress = Math.min(((i + batch.length) / prompts.length) * 100, 100);
                process.stdout.write(`\r   Progresso: ${progress.toFixed(1)}%`);
            }
            
            console.log(`\n✅ Categoria ${category} concluída!`);
        } catch (err) {
            console.error(`❌ Erro ao processar ${file}:`, err);
        }
    }

    console.log("\n✨ Migração finalizada com sucesso!");
    process.exit(0);
}

migrate().catch(console.error);
