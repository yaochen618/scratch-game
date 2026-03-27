import { NextResponse } from "next/server";
import { gameState } from "../../../lib/gameState";

export async function POST() {
  let currentPool = [...gameState.pool];

  // 第 5 抽完成後，下一抽前加入 2、3
  if (gameState.drawCount === 5 && !gameState.added23) {
    currentPool.push(2, 3);
    gameState.added23 = true;
  }

  // 第 10 抽完成後，下一抽前加入 1
  if (gameState.drawCount === 10 && !gameState.added1) {
    currentPool.push(1);
    gameState.added1 = true;
  }

  if (currentPool.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_numbers" },
      { status: 400 }
    );
  }

  const randomIndex = Math.floor(Math.random() * currentPool.length);
  const pickedNumber = currentPool[randomIndex];

  gameState.pool = currentPool.filter((_, i) => i !== randomIndex);
  gameState.drawCount += 1;

  return NextResponse.json({
    ok: true,
    number: pickedNumber,
    drawOrder: gameState.drawCount,
    time: new Date().toISOString(),
    remainCount: gameState.pool.length,
  });
}