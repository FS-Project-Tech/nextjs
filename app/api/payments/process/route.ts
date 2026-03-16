import { NextResponse } from "next/server";

/**
 * Process payment before order creation
 */
export async function POST(req: Request) {
  try {

    const body = await req.json();

    const {
      payment_method,
      amount,
      currency = "AUD",
      billing
    } = body;

    if (!payment_method) {
      return NextResponse.json(
        { error: "Payment method required" },
        { status: 400 }
      );
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    switch (payment_method) {

      // OFFLINE METHODS
      case "cod":
      case "bacs":
      case "bank_transfer":
        return NextResponse.json({
          success: true,
          payment_method,
          requires_payment: false,
          message: "Offline payment selected",
        });

      // PAYPAL
      case "paypal":
        return processPayPalPayment(amount, currency, billing);

      default:
        return NextResponse.json(
          { error: "Unsupported payment method" },
          { status: 400 }
        );
    }

  } catch (error) {

    console.error("Payment processing error:", error);

    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

/**
 * PayPal integration placeholder
 */
async function processPayPalPayment(
  amount: number,
  currency: string,
  billing: any
) {

  // TODO: Replace with PayPal SDK integration

  return NextResponse.json({
    success: true,
    payment_method: "paypal",
    requires_payment: true,
    transaction_id: `paypal_${Date.now()}`,
    status: "pending",
  });
}