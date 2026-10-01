import { NextResponse } from "next/server";

import { supportService } from "@/lib/services/support-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/orders/[orderId]">,
) {
  const { orderId } = await context.params;
  const details = supportService.getOrderDetails(orderId);
  if (!details) {
    return NextResponse.json({ error: `Pedido ${orderId} não encontrado.` }, { status: 404 });
  }

  return NextResponse.json(details);
}
