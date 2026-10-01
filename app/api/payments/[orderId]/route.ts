import { NextResponse } from "next/server";

import { supportService } from "@/lib/services/support-service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/payments/[orderId]">,
) {
  const { orderId } = await context.params;
  const payment = supportService.getPayment(orderId);

  if (!payment) {
    return NextResponse.json({ error: `Pagamento do pedido ${orderId} não encontrado.` }, { status: 404 });
  }

  return NextResponse.json(payment);
}
