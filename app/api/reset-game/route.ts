import { NextResponse } from "next/server";
import { resetGameState } from "../../../lib/gameState";

export async function POST() {
  resetGameState();

  return NextResponse.json({
    ok: true,
  });
}