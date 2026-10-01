import { supportService } from "@/lib/services/support-service";
import { ToolExecution, ToolName } from "@/lib/types";

export const appTools = [
  {
    type: "function" as const,
    function: {
      name: "get_customer",
      description: "Busca os dados do cliente a partir do número do pedido.",
      parameters: { type: "object", properties: { orderId: { type: "string", description: "Número do pedido do cliente." } }, required: ["orderId"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_order",
      description: "Consulta o status logístico e operacional do pedido.",
      parameters: { type: "object", properties: { orderId: { type: "string", description: "Número do pedido." } }, required: ["orderId"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_payment_status",
      description: "Retorna o status do pagamento do pedido.",
      parameters: { type: "object", properties: { orderId: { type: "string", description: "Número do pedido." } }, required: ["orderId"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_knowledge_base",
      description: "Busca procedimentos internos e políticas de atendimento.",
      parameters: { type: "object", properties: { query: { type: "string", description: "Termo buscado na base de conhecimento." } }, required: ["query"] },
    },
  },
];

export function executeTool(tool: ToolName, args: Record<string, string>): ToolExecution {
  switch (tool) {
    case "get_customer":
      return { tool, args, result: supportService.getCustomerByOrder(args.orderId ?? "") };
    case "get_order":
      return { tool, args, result: supportService.getOrder(args.orderId ?? "") };
    case "get_payment_status":
      return { tool, args, result: supportService.getPayment(args.orderId ?? "") };
    case "search_knowledge_base":
      return { tool, args, result: supportService.searchKnowledge(args.query ?? "") };
  }
}

export function planToolsFromPrompt(message: string): ToolExecution[] {
  const orderId = supportService.findOrderIdInText(message);
  const tools: ToolExecution[] = [
    executeTool("get_customer", { orderId }),
    executeTool("get_order", { orderId }),
    executeTool("get_payment_status", { orderId }),
  ];

  if (/prazo|atras|entrega|transport|pedido|pagamento|status|politica|política/i.test(message)) {
    tools.push(executeTool("search_knowledge_base", { query: /pagamento/i.test(message) ? "pagamento" : "entrega" }));
  }

  return tools;
}

export function buildSupportReply(toolExecutions: ToolExecution[]) {
  const customer = toolExecutions.find((item) => item.tool === "get_customer")?.result as { name?: string } | null;
  const order = toolExecutions.find((item) => item.tool === "get_order")?.result as { id?: string; status?: string; shippingStatus?: string; expectedDelivery?: string } | null;
  const payment = toolExecutions.find((item) => item.tool === "get_payment_status")?.result as { status?: string; method?: string } | null;
  const docs = toolExecutions.find((item) => item.tool === "search_knowledge_base")?.result as Array<{ content: string }> | undefined;

  if (!customer || !order || !payment) {
    return "Não encontrei esse pedido na base de demonstração. Confira o número e me envie novamente, por favor.";
  }

  const firstName = customer.name?.split(" ")[0] ?? "cliente";
  const orderStatus = order.status?.toLowerCase() ?? "em processamento";
  const shippingStatus = order.shippingStatus?.toLowerCase() ?? "sem atualização logística";
  const deliveryDate = order.expectedDelivery ?? "ainda sem previsão confirmada";
  const paymentMessage = payment.status?.toLowerCase() === "aprovado"
    ? `O pagamento está aprovado via ${payment.method}.`
    : `O pagamento via ${payment.method} ainda está ${payment.status?.toLowerCase() ?? "pendente"}, então a confirmação não foi concluída.`;
  const policy = docs?.[0]?.content ? ` ${docs[0].content}` : "";

  return `Olá, ${firstName}! Consultei o seu pedido #${order.id}. Ele está ${orderStatus}, com a atualização: ${shippingStatus}. ${paymentMessage} A previsão de entrega é ${deliveryDate}.${policy}`;
}
