import { NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

export async function GET() {
  try {

    const allowedGateways = new Set(["bacs", "paypal"]);

    const response = await wcAPI.get("/payment_gateways");
    const gateways = Array.isArray(response.data) ? response.data : [];

    const paymentMethods = gateways
      .filter((g: any) =>
        allowedGateways.has(g.id) &&
        (g.enabled === true || g.enabled === "yes")
      )
      .map((g: any) => ({
        id: g.id,
        title: g.title || g.method_title || g.id,
        description: g.description || "",
        enabled: true,
      }));

    if (paymentMethods.length > 0) {
      return NextResponse.json({ paymentMethods });
    }

    // fallback if WooCommerce returns nothing
    return NextResponse.json({
      paymentMethods: [
        {
          id: "bacs",
          title: "On account",
          description: "Make your payment directly into our bank account.",
          enabled: true,
        },
        {
          id: "paypal",
          title: "PayPal",
          description: "Pay via PayPal.",
          enabled: true,
        },
      ],
    });

  } catch (error) {

    console.error("Payment methods API error:", error);

    return NextResponse.json({
      paymentMethods: [
        {
          id: "bacs",
          title: "On account",
          description: "Make your payment directly into our bank account.",
          enabled: true,
        },
        {
          id: "paypal",
          title: "PayPal",
          description: "Pay via PayPal.",
          enabled: true,
        },
      ],
    });

  }
}