export const gameState = {
  pool: Array.from({ length: 27 }, (_, i) => i + 4) as number[], // 4~30
  drawCount: 0,
  added23: false,
  added1: false,
};

export function resetGameState() {
  gameState.pool = Array.from({ length: 27 }, (_, i) => i + 4);
  gameState.drawCount = 0;
  gameState.added23 = false;
  gameState.added1 = false;
}