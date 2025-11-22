import { NextResponse } from "next/server";
import {
  createUserWithPassword,
  findUserByEmail,
  setUserPassword,
  updateUserProfile,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { USER_COOKIE_KEY } from "@/lib/auth";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type SignupRequestBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  age?: number | string | null;
  education?: string;
};

export async function POST(request: Request) {
  const body: SignupRequestBody = await request
    .json()
    .catch(() => ({} as SignupRequestBody));

  const { email, password, firstName, lastName, age, education } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  if (!firstName || typeof firstName !== "string") {
    return NextResponse.json(
      { error: "First name is required." },
      { status: 400 }
    );
  }

  if (!lastName || typeof lastName !== "string") {
    return NextResponse.json(
      { error: "Last name is required." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  if (!isValidEmail) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  const parsedAge = Number(age);
  if (Number.isNaN(parsedAge) || parsedAge <= 0) {
    return NextResponse.json(
      { error: "Age must be a positive number." },
      { status: 400 }
    );
  }

  const educationEntries =
    typeof education === "string" && education.trim()
      ? education
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

  const profile = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    age: parsedAge,
    education: educationEntries.join(", "),
  };

  const existing = await findUserByEmail(normalizedEmail);
  const hashed = await hashPassword(password);

  let isNewUser = false;

  if (existing) {
    if (existing.password) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    await setUserPassword(normalizedEmail, hashed);
    await updateUserProfile(normalizedEmail, profile);
  } else {
    await createUserWithPassword(normalizedEmail, hashed, 0, profile);
    isNewUser = true;
  }

  const response = NextResponse.json({
    success: true,
    email: normalizedEmail,
    redirect: isNewUser ? "/pricing" : "/dashboard",
  });

  response.cookies.set({
    name: USER_COOKIE_KEY,
    value: normalizedEmail,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
