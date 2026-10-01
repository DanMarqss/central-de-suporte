import { Customer, KnowledgeBaseDocument, Order, Payment } from "@/lib/types";

export const customers: Customer[] = [
  { id: "cus_1001", name: "João Silva", email: "joao.silva@email.com", segment: "Premium" },
  { id: "cus_1002", name: "Mariana Costa", email: "mariana.costa@email.com", segment: "Growth" },
];

export const orders: Order[] = [
  { id: "8921", customerId: "cus_1001", status: "Em transporte", shippingStatus: "Saiu do centro logístico de Manaus", expectedDelivery: "2026-10-03", lastUpdate: "2026-10-01 09:10" },
  { id: "9012", customerId: "cus_1002", status: "Separando pedido", shippingStatus: "Aguardando coleta da transportadora", expectedDelivery: "2026-10-05", lastUpdate: "2026-10-01 08:32" },
];

export const payments: Payment[] = [
  { orderId: "8921", status: "Aprovado", method: "Cartão de crédito", amount: 249.9, approvedAt: "2026-09-29 14:18" },
  { orderId: "9012", status: "Processando", method: "PIX", amount: 89.9, approvedAt: "2026-10-01 08:10" },
];

export const knowledgeBase: KnowledgeBaseDocument[] = [
  { id: "doc_1", title: "Política de prazo logístico", content: "Pedidos com pagamento aprovado podem levar até 48 horas para atualização do rastreio. Após coleta, o prazo médio de entrega é de 3 a 5 dias úteis." },
  { id: "doc_2", title: "Fluxo de atendimento", content: "O atendente deve confirmar pedido, status do pagamento e etapa logística antes de orientar o cliente. Se houver atraso acima do prazo estimado, abrir incidente com operação." },
  { id: "doc_3", title: "Status de pagamento", content: "Pagamentos com status aprovado liberam o pedido para expedição. Status processando indica que a confirmação ainda não foi concluída." },
];
