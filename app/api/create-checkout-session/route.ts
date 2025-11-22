import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PlanId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const priceConfig: Record<PlanId, Stripe.Checkout.SessionCreateParams> = {
  one_time: {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Single Resume Analysis" },
          unit_amount: 1000,
        },
        quantity: 1,
      },
    ],
  },
  lifetime: {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Lifetime Access" },
          unit_amount: 7000,
        },
        quantity: 1,
      },
    ],
  },
  monthly: {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          recurring: { interval: "month" },
          product_data: { name: "Monthly ATS Analyzer" },
          unit_amount: 999,
        },
        quantity: 1,
      },
    ],
  },
  quarter: {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          recurring: { interval: "month", interval_count: 3 },
          product_data: { name: "3 Month Plan" },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
  },
  semiannual: {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          recurring: { interval: "month", interval_count: 6 },
          product_data: { name: "6 Month Plan" },
          unit_amount: 3000,
        },
        quantity: 1,
      },
    ],
  },
  annual: {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          recurring: { interval: "year" },
          product_data: { name: "Annual Plan" },
          unit_amount: 5000,
        },
        quantity: 1,
      },
    ],
  },
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json(
      { error: "You must be signed in before purchasing." },
      { status: 401 }
    );
  }

  const { planId } = (await request.json().catch(() => ({
    planId: "",
  }))) as { planId: PlanId };
  const config = planId ? priceConfig[planId] : undefined;

  if (!config) {
    return NextResponse.json(
      { error: "Invalid plan selected." },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    ...config,
    metadata: { planId },
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  });

  return NextResponse.json({
    id: session.id,
    url: session.url,
  });
}
