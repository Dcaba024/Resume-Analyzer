export const PLAN_IDS = [
  "one_time",
  "monthly",
  "quarter",
  "semiannual",
  "annual",
  "lifetime",
] as const;

export const MEMBERSHIP_PLAN_IDS = [
  "monthly",
  "quarter",
  "semiannual",
  "annual",
  "lifetime",
] as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type MembershipPlanId = (typeof MEMBERSHIP_PLAN_IDS)[number];

export function isMembershipPlan(planId: PlanId): planId is MembershipPlanId {
  return (MEMBERSHIP_PLAN_IDS as readonly string[]).includes(planId);
}
