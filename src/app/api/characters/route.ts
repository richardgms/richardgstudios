import { NextRequest, NextResponse } from "next/server";
import { getCharacters, createCharacter, getCharacterWithReferences, addCharacterReference } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
        const character = getCharacterWithReferences(id);
        if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });
        return NextResponse.json(character);
    }

    const characters = getCharacters();
    return NextResponse.json(characters);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, name, description, characterId, imagePath, slotIndex, metadata } = body;

        if (action === "create") {
            if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
            const id = createCharacter(name, description);
            return NextResponse.json({ id });
        }

        if (action === "add_reference") {
            if (!characterId || !imagePath) return NextResponse.json({ error: "characterId and imagePath are required" }, { status: 400 });
            const id = addCharacterReference(characterId, imagePath, slotIndex, metadata);
            return NextResponse.json({ id });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
