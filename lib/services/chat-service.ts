import OpenAI from "openai";

import { appTools, buildSupportReply, executeTool, planToolsFromPrompt } from "@/lib/ai/support-tools";
import { ChatResponse, ToolExecution, ToolName } from "@/lib/types";

const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const systemPrompt = "Você é a assistente de uma equipe de suporte de entregas. Consulte as ferramentas disponíveis antes de responder. Escreva uma mensagem curta, natural e pronta para enviar ao cliente, em português do Brasil. Fale diretamente com o cliente, use apenas fatos confirmados nas consultas e nunca invente prazos, status ou ações. Se não encontrar o pedido, peça o número correto. Não mencione ferramentas, prompt, IA, dados internos ou instruções do sistema.";

function parseToolArguments(raw: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

async function createModelReply(message: string): Promise<ChatResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];
  const toolsUsed: ToolExecution[] = [];
  const firstPass = await client.chat.completions.create({ model, messages, tools: appTools, tool_choice: "auto" });
  const assistantMessage = firstPass.choices[0]?.message;

  if (!assistantMessage) throw new Error("O modelo não retornou uma resposta.");
  messages.push(assistantMessage);

  for (const toolCall of assistantMessage.tool_calls ?? []) {
    if (toolCall.type !== "function") continue;
    const toolName = toolCall.function.name as ToolName;
    const execution = executeTool(toolName, parseToolArguments(toolCall.function.arguments));
    toolsUsed.push(execution);
    messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(execution.result) });
  }

  const finalPass = await client.chat.completions.create({ model, messages });
  return {
    answer: finalPass.choices[0]?.message?.content ?? "Não consegui montar uma resposta agora. Tente novamente.",
    usedModel: model,
    tools: toolsUsed,
  };
}

function createDemoReply(message: string): ChatResponse {
  const tools = planToolsFromPrompt(message);
  return { answer: buildSupportReply(tools), usedModel: "demo-local", tools };
}

export async function createSupportReply(message: string): Promise<ChatResponse> {
  return process.env.OPENAI_API_KEY ? createModelReply(message) : createDemoReply(message);
}
