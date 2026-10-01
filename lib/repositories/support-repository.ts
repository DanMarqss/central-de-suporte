import { customers, knowledgeBase, orders, payments } from "@/lib/data/demo-data";

export const supportRepository = {
  findCustomer(customerId: string) {
    return customers.find((customer) => customer.id === customerId) ?? null;
  },

  findCustomerByOrder(orderId: string) {
    const order = this.findOrder(orderId);
    return order ? this.findCustomer(order.customerId) : null;
  },

  findOrder(orderId: string) {
    return orders.find((order) => order.id === orderId) ?? null;
  },

  findPayment(orderId: string) {
    return payments.find((payment) => payment.orderId === orderId) ?? null;
  },

  findKnowledge(query: string) {
    const normalizedQuery = query.toLocaleLowerCase("pt-BR");
    return knowledgeBase.filter((document) => `${document.title} ${document.content}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
  },

  findOrderIdInText(input: string) {
    return input.match(/#?(\d{4,})/)?.[1] ?? "";
  },
};
