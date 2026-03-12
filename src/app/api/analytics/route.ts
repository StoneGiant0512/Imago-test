import { NextResponse } from "next/server";
import { getAnalyticsSnapshot } from "@/lib/searchAnalytics";

export async function GET() {
  const snapshot = getAnalyticsSnapshot();
  return NextResponse.json(snapshot);
}

