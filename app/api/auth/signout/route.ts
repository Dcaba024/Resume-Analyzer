import { NextResponse } from "next/server";
import { clearCurrentUser } from "@/lib/auth";

export async function POST() {
  clearCurrentUser();
  return NextResponse.json({ success: true });
}
