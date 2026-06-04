import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Store = {
  id: string;
  name: string;
  slug: string;
  announcement: string | null;
  is_active: boolean | null;
};

type Room = {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  status: string;
  cell_count: number | null;
  prize_numbers: string | null;
  created_at: string;
};

type Cell = {
  room_id: string;
  is_revealed: boolean | null;
  revealed_number: number | null;
};

type BestRoomInfo = {
  name: string;
  slug: string;
  cell_count: number;
  revealed_count: number;
  remaining_count: number;
  remaining_prize_count: number;
  remaining_prize_rate: number;
};

function parsePrizeNumbers(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((number) => Number.isInteger(number));
}

function getBestRoomMap(rooms: Room[], cells: Cell[]) {
  const bestRoomMap: Record<string, BestRoomInfo> = {};

  for (const room of rooms) {
    const prizeNumbers = parsePrizeNumbers(room.prize_numbers);
    const prizeTotalCount = prizeNumbers.length;

    if (prizeTotalCount <= 0) continue;

    const roomCells = cells.filter(
      (cell) => String(cell.room_id) === String(room.id)
    );

    const revealedCells = roomCells.filter((cell) => cell.is_revealed);
    const revealedCount = revealedCells.length;

    const cellCount = Number(room.cell_count || 0);
    const remainingCount = Math.max(cellCount - revealedCount, 0);

    if (remainingCount <= 0) continue;

    const revealedPrizeCount = revealedCells.filter((cell) =>
      prizeNumbers.includes(Number(cell.revealed_number))
    ).length;

    const remainingPrizeCount = Math.max(
      prizeTotalCount - revealedPrizeCount,
      0
    );

    if (remainingPrizeCount <= 0) continue;

    const remainingPrizeRate =
      Math.round((remainingPrizeCount / remainingCount) * 1000) / 10;

    const currentBest = bestRoomMap[String(room.store_id)];

    if (
      !currentBest ||
      remainingPrizeRate > currentBest.remaining_prize_rate
    ) {
      bestRoomMap[String(room.store_id)] = {
        name: room.name,
        slug: room.slug,
        cell_count: cellCount,
        revealed_count: revealedCount,
        remaining_count: remainingCount,
        remaining_prize_count: remainingPrizeCount,
        remaining_prize_rate: remainingPrizeRate,
      };
    }
  }

  return bestRoomMap;
}

export default async function StoresPage() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, announcement, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-red-600">讀取商店失敗</h1>
          <p className="mt-2 text-gray-600">{error.message}</p>
        </div>
      </main>
    );
  }

  const storeIds = (stores || []).map((store) => store.id);

  let bestRoomMap: Record<string, BestRoomInfo> = {};

  if (storeIds.length > 0) {
    const { data: rooms } = await supabase
      .from("rooms")
      .select(
        "id, store_id, name, slug, status, cell_count, prize_numbers, created_at"
      )
      .in("store_id", storeIds);

    const roomIds = (rooms || []).map((room) => room.id);

    let cells: Cell[] = [];

    if (roomIds.length > 0) {
      const { data: cellData } = await supabase
        .from("cells")
        .select("room_id, is_revealed, revealed_number")
        .in("room_id", roomIds);

      cells = (cellData || []) as Cell[];
    }

    bestRoomMap = getBestRoomMap((rooms || []) as Room[], cells);
  }

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-black">商店列表</h1>

        {!stores || stores.length === 0 ? (
          <div className="rounded-2xl border bg-gray-50 p-6 text-gray-500">
            目前沒有可顯示的商店
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store: Store) => {
              const bestRoom = bestRoomMap[String(store.id)];

              return (
                <Link
                  key={store.id}
                  href={`/stores/${store.slug}`}
                  className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <h2 className="text-xl font-bold text-black">{store.name}</h2>

                  {bestRoom && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-yellow-100 p-3">
                      <div className="text-sm font-bold text-red-700">
                        最高中獎機率
                      </div>

                      <div className="mt-1 text-lg font-bold text-black">
                        {bestRoom.name}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
                        <div className="rounded-xl bg-white px-3 py-2">
                          <div className="text-gray-500">剩餘獎數</div>
                          <div className="font-bold text-red-700">
                            {bestRoom.remaining_prize_count}
                          </div>
                        </div>

                        <div className="rounded-xl bg-white px-3 py-2">
                          <div className="text-gray-500">已開洞數</div>
                          <div className="font-bold text-orange-700">
                            {bestRoom.revealed_count} / {bestRoom.cell_count}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-center">
                        <div className="text-sm text-gray-500">中獎機率</div>
                        <div className="text-xl font-bold text-red-600">
                          {bestRoom.remaining_prize_rate}%
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}