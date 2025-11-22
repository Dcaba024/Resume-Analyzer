import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  applyPlanToUser,
  recordProcessedCheckoutSession,
} from "@/lib/db";
import { PlanId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const { sessionId } = await request.json().catch(() => ({ sessionId: "" }));

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing checkout session id." },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_details?.email?.toLowerCase();
    const planId = session.metadata?.planId as PlanId | undefined;

    if (!email || !planId) {
      return NextResponse.json(
        { error: "Unable to confirm purchase metadata." },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed." },
        { status: 400 }
      );
    }

    const isNew = await recordProcessedCheckoutSession(
      sessionId,
      email,
      planId
    );

    if (isNew) {
      await applyPlanToUser(email, planId);
    }

    return NextResponse.json({ success: true, alreadyProcessed: !isNew });
  } catch (error) {
    console.error("Failed to confirm checkout session", error);
    return NextResponse.json(
      { error: "Unable to confirm checkout session." },
      { status: 500 }
    );
  }
}
