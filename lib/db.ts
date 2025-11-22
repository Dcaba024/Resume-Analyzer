// lib/db.ts
import { UserCredit } from "@prisma/client";
import { prisma } from "./prisma";
import { MembershipPlanId, PlanId, isMembershipPlan } from "./plans";

const MEMBERSHIP_CONFIG: Record<
  MembershipPlanId,
  { label: string; months: number | null }
> = {
  monthly: { label: "Monthly", months: 1 },
  quarter: { label: "3 Months", months: 3 },
  semiannual: { label: "6 Months", months: 6 },
  annual: { label: "Annual", months: 12 },
  lifetime: { label: "Lifetime", months: null },
};

export async function getUserAccessInfo(email: string) {
  return prisma.userCredit.findUnique({
    where: { email },
  });
}

export async function getUserCredits(email: string) {
  const record = await getUserAccessInfo(email);
  return record?.credits ?? 0;
}

export function hasActiveMembership(
  record?: Pick<UserCredit, "membershipPlan" | "membershipExpiresAt"> | null
) {
  if (!record?.membershipPlan) return false;
  if (record.membershipPlan === "lifetime") return true;
  if (!record.membershipExpiresAt) return false;
  return record.membershipExpiresAt > new Date();
}

export async function decrementUserCredit(email: string) {
  return prisma.userCredit.update({
    where: { email },
    data: { credits: { decrement: 1 } },
  });
}

export async function addUserCredits(email: string, amount = 1) {
  return prisma.userCredit.upsert({
    where: { email },
    update: { credits: { increment: amount } },
    create: { email, credits: amount },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.userCredit.findUnique({
    where: { email },
  });
}

export type UserProfileFields = {
  firstName?: string | null;
  lastName?: string | null;
  age?: number | null;
  education?: string | null;
};

function buildProfileData(profile?: UserProfileFields) {
  if (!profile) return {};
  const data: {
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
    education?: string | null;
  } = {};
  if ("firstName" in profile) data.firstName = profile.firstName ?? null;
  if ("lastName" in profile) data.lastName = profile.lastName ?? null;
  if ("age" in profile) data.age = profile.age ?? null;
  if ("education" in profile) data.education = profile.education ?? null;
  return data;
}

export async function createUserWithPassword(
  email: string,
  hashedPassword: string,
  credits = 1,
  profile?: UserProfileFields
) {
  return prisma.userCredit.create({
    data: {
      email,
      password: hashedPassword,
      credits,
      ...buildProfileData(profile),
    },
  });
}

export async function setUserPassword(
  email: string,
  hashedPassword: string
) {
  return prisma.userCredit.update({
    where: { email },
    data: { password: hashedPassword },
  });
}

export async function updateUserProfile(
  email: string,
  profile: UserProfileFields
) {
  const data = buildProfileData(profile);
  if (!Object.keys(data).length) return null;
  return prisma.userCredit.update({
    where: { email },
    data,
  });
}

export async function ensureUserWithCredits(
  email: string,
  minimumCredits = 1
) {
  const record = await prisma.userCredit.upsert({
    where: { email },
    update: {},
    create: { email, credits: minimumCredits },
  });

  if (record.credits >= minimumCredits) {
    return record;
  }

  return prisma.userCredit.update({
    where: { email },
    data: { credits: minimumCredits },
  });
}

export async function activateMembership(email: string, planKey: MembershipPlanId) {
  const config = MEMBERSHIP_CONFIG[planKey];
  if (!config) {
    throw new Error(`Unknown membership plan: ${planKey}`);
  }

  const record =
    (await prisma.userCredit.findUnique({ where: { email } })) ??
    (await prisma.userCredit.create({ data: { email, credits: 0 } }));

  if (config.months === null) {
    return prisma.userCredit.update({
      where: { email },
      data: { membershipPlan: "lifetime", membershipExpiresAt: null },
    });
  }

  const now = new Date();
  const baseDate =
    record.membershipPlan &&
    record.membershipPlan !== "lifetime" &&
    record.membershipExpiresAt &&
    record.membershipExpiresAt > now
      ? record.membershipExpiresAt
      : now;

  const expires = new Date(baseDate);
  expires.setMonth(expires.getMonth() + config.months);

  return prisma.userCredit.update({
    where: { email },
    data: {
      membershipPlan: planKey,
      membershipExpiresAt: expires,
    },
  });
}

export function getMembershipLabel(planKey?: string | null) {
  if (!planKey) return null;
  if (planKey === "lifetime") return "Lifetime access";
  return MEMBERSHIP_CONFIG[planKey as MembershipPlanId]?.label ?? null;
}

export async function recordProcessedCheckoutSession(
  sessionId: string,
  email: string,
  planId: PlanId
) {
  const existing = await prisma.checkoutSession.findUnique({
    where: { sessionId },
  });

  if (existing) {
    return false;
  }

  await prisma.checkoutSession.create({
    data: {
      sessionId,
      email,
      planId,
    },
  });

  return true;
}

export async function applyPlanToUser(email: string, planId: PlanId) {
  if (isMembershipPlan(planId)) {
    await activateMembership(email, planId as MembershipPlanId);
  } else {
    await addUserCredits(email, 1);
  }
}
