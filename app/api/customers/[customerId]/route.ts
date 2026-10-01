import { NextResponse } from "next/server";

import { supportService } from "@/lib/services/support-service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/customers/[customerId]">,
) {
  const { customerId } = await context.params;
  const customer = supportService.getCustomer(customerId);

  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  return NextResponse.json(customer);
}
