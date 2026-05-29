// GET available booking slots (config-generated minus already-booked).
import { NextResponse } from "next/server";
import { generateSlots } from "@/lib/booking";
import { readTakenSlots } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const taken = await readTakenSlots().catch((): string[] => []);
  return NextResponse.json({ slots: generateSlots(taken) });
}
