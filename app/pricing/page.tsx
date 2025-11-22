"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlanId } from "@/lib/plans";

type Plan = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  planId: PlanId;
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "one-time",
    name: "Single Analysis",
    description: "One detailed ATS analysis + rewritten resume",
    priceLabel: "$10",
    planId: "one_time",
  },
  {
    id: "monthly",
    name: "Monthly",
    description: "Unlimited analyses for 1 month",
    priceLabel: "$9.99 / mo",
    planId: "monthly",
    popular: true,
  },
  {
    id: "quarter",
    name: "3 Months",
    description: "Unlimited analyses for 90 days",
    priceLabel: "$20",
    planId: "quarter",
  },
  {
    id: "semiannual",
    name: "6 Months",
    description: "Unlimited analyses for half a year",
    priceLabel: "$30",
    planId: "semiannual",
  },
  {
    id: "annual",
    name: "Annual",
    description: "Unlimited analyses for a full year",
    priceLabel: "$50",
    planId: "annual",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    description: "Pay once, analyze forever",
    priceLabel: "$70",
    planId: "lifetime",
  },
];

export default function Pricing() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: PlanId) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push(`/signin?redirect=${encodeURIComponent("/pricing")}`);
        return;
      }

      if (!data.url) {
        alert("No checkout URL returned");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Unable to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← Home
        </button>
      </div>
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
          Pricing
        </p>
        <h1 className="mt-3 text-4xl font-semibold">
          Flexible plans for every job search
        </h1>
        <p className="mt-3 text-gray-400">
          Unlock the full ATS analyzer and receive rewritten resumes tailored to
          each job description.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg ${
              plan.popular ? "ring-2 ring-blue-500" : ""
            }`}
          >
            {plan.popular && (
              <span className="mb-3 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase">
                Most Popular
              </span>
            )}
            <h2 className="text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-gray-400">{plan.description}</p>
            <p className="mt-6 text-3xl font-bold">{plan.priceLabel}</p>

            <button
              onClick={() => handleCheckout(plan.planId)}
              disabled={loadingPlan === plan.planId}
              className="mt-6 w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPlan === plan.planId ? "Processing..." : "Choose Plan"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
