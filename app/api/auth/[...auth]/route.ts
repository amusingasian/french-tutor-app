import { betterAuth } from "better-auth";
import { NextRequest, NextResponse } from "next/server";

const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NODE_ENV === "production" 
    ? "https://your-vercel-domain.vercel.app"
    : "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
});

export async function POST(request: NextRequest) {
  return auth.handler(request);
}

export async function GET(request: NextRequest) {
  return auth.handler(request);
}
