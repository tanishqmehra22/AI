import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map((issue) => issue.message).join(" ") }, { status: 422 });
  console.error("Unhandled API error", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function assertSupabase<T extends { error: { message: string } | null }>(result: T): T {
  if (result.error) throw new ApiError(result.error.message, 500);
  return result;
}
