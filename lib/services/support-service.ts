import { supportRepository } from "@/lib/repositories/support-repository";

export const supportService = {
  getCustomer(customerId: string) {
    return supportRepository.findCustomer(customerId);
  },

  getCustomerByOrder(orderId: string) {
    return supportRepository.findCustomerByOrder(orderId);
  },

  getOrder(orderId: string) {
    return supportRepository.findOrder(orderId);
  },

  getOrderDetails(orderId: string) {
    const order = supportRepository.findOrder(orderId);
    if (!order) return null;

    return {
      order,
      customer: supportRepository.findCustomer(order.customerId),
      payment: supportRepository.findPayment(orderId),
    };
  },

  getPayment(orderId: string) {
    return supportRepository.findPayment(orderId);
  },

  searchKnowledge(query: string) {
    return supportRepository.findKnowledge(query);
  },

  findOrderIdInText(input: string) {
    return supportRepository.findOrderIdInText(input);
  },
};
