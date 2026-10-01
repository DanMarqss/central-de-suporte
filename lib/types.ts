export type Customer = {
  id: string;
  name: string;
  email: string;
  segment: string;
};

export type Order = {
  id: string;
  customerId: string;
  status: string;
  shippingStatus: string;
  expectedDelivery: string;
  lastUpdate: string;
};

export type Payment = {
  orderId: string;
  status: string;
  method: string;
  amount: number;
  approvedAt: string;
};

export type KnowledgeBaseDocument = {
  id: string;
  title: string;
  content: string;
};

export type ToolName =
  | "get_customer"
  | "get_order"
  | "get_payment_status"
  | "search_knowledge_base";

export type ToolExecution = {
  tool: ToolName;
  args: Record<string, string>;
  result: unknown;
};

export type ChatResponse = {
  answer: string;
  usedModel: string;
  tools: ToolExecution[];
};
