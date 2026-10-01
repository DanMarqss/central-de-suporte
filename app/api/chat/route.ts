import { NextRequest, NextResponse } from "next/server";

import { parseChatRequest } from "@/lib/dto/chat-request-dto";
import { createSupportReply } from "@/lib/services/chat-service";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const dto = parseChatRequest(body);
  if (!dto) {
    return NextResponse.json({ error: "A mensagem é obrigatória e deve ter até 4.000 caracteres." }, { status: 400 });
  }

  try {
    return NextResponse.json(await createSupportReply(dto.message));
  } catch (error) {
    console.error("Falha ao gerar resposta de suporte:", error);
    return NextResponse.json({ error: "Não foi possível gerar a resposta. Tente novamente." }, { status: 500 });
  }
}
