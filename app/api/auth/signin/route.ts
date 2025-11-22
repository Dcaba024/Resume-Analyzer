import { NextResponse } from "next/server";
import {
  createUserWithPassword,
  findUserByEmail,
  setUserPassword,
} from "@/lib/db";
import { USER_COOKIE_KEY } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  const { email, password } = await request
    .json()
    .catch(() => ({ email: "", password: "" }));

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
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

  let record = await findUserByEmail(normalizedEmail);
  const hashed =
    typeof record?.password === "string"
      ? record.password
      : await hashPassword(password);

  if (!record) {
    record = await createUserWithPassword(normalizedEmail, hashed);
  } else if (!record.password) {
    record = await setUserPassword(normalizedEmail, hashed);
  } else {
    const isMatch = await verifyPassword(password, record.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }
  }

  const response = NextResponse.json({ success: true, email: normalizedEmail });
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
