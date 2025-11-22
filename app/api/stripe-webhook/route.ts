import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  applyPlanToUser,
  recordProcessedCheckoutSession,
} from "@/lib/db";
import { PlanId } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to verify webhook.";
    return new NextResponse(`Webhook error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const email = session.customer_details?.email?.toLowerCase();
    const planId = session.metadata?.planId as PlanId | undefined;

    if (!email || !planId || !sessionId) {
      return NextResponse.json({ status: "missing-metadata" });
    }

    const isNew = await recordProcessedCheckoutSession(sessionId, email, planId);
    if (!isNew) {
      return NextResponse.json({ status: "already-processed" });
    }

    await applyPlanToUser(email, planId);
  }

  return NextResponse.json({ status: "ok" });
}
