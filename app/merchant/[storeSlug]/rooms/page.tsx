import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  getRemainingDays,
  isMerchantExpired,
} from "@/lib/merchant-plan";
import ResetRoomButton from "@/components/reset-room-button";
import CreateRoomForm from "@/components/create-room-form";
import DeleteRoomButton from "@/components/delete-room-button";
import AnnouncementEditor from "@/components/announcement-editor";
import ToggleRoomStatusButton from "@/components/toggle-room-status-button";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

type RoomRow = {
  id: string | number;
  name: string;
  slug: string;
  status: string;
  cell_count: number;
};

type CellRow = {
  room_id: string | number;
  is_revealed: boolean;
};

export default async function RoomsPage({ params }: PageProps) {
  const { storeSlug } = await params;

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select(
      "id, name, slug, announcement, expires_at, is_active, billing_status, plan_type"
    )
    .eq("slug", storeSlug)
    .single();

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-white p-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">找不到商店</h1>
        </div>
      </main>
    );
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, slug, status, cell_count")
    .eq("store_id", store.id)
    .order("name", { ascending: true });

  const roomIds = (rooms ?? []).map((room) => room.id);

  let progressMap: Record<string, { revealed: number; total: number }> = {};

  if (roomIds.length > 0) {
    const { data: cells, error: cellsError } = await supabase
      .from("cells")
      .select("room_id, is_revealed")
      .in("room_id", roomIds);

    if (!cellsError && cells) {
      for (const room of rooms as RoomRow[]) {
        progressMap[String(room.id)] = {
          revealed: 0,
          total: room.cell_count ?? 0,
        };
      }

      for (const cell of cells as CellRow[]) {
        const key = String(cell.room_id);

        if (!progressMap[key]) {
          progressMap[key] = {
            revealed: 0,
            total: 0,
          };
        }

        if (cell.is_revealed) {
          progressMap[key].revealed += 1;
        }
      }
    }
  }

  const isExpired = isMerchantExpired(store);
  const remainingDays = getRemainingDays(store);

  return (
    <main className="min-h-screen bg-blue-200 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {store.name} 房間管理
          </h1>

          <Link
            href="/merchant"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            ← 返回商家首頁
          </Link>
        </div>

        <section className="rounded-xl bg-white p-4 shadow">
          <div className="space-y-1 text-sm text-gray-700">
            <div>方案：{store.plan_type ?? "未設定"}</div>
            <div>狀態：{store.is_active ? "啟用中" : "停用"}</div>
            <div>帳務：{store.billing_status ?? "未設定"}</div>
            <div>
              到期：
              {store.expires_at
                ? new Date(store.expires_at).toLocaleString()
                : "未設定"}
            </div>
            <div>剩餘天數：{remainingDays}</div>
          </div>

          {isExpired && (
            <div className="mt-2 font-semibold text-red-600">
              ⚠ 租約已過期
            </div>
          )}
        </section>

        <div className="mt-6">
          <AnnouncementEditor
            storeSlug={store.slug}
            initialAnnouncement={store.announcement ?? ""}
          />
        </div>

        <div className="mt-6">
          <CreateRoomForm storeSlug={store.slug} />
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold text-black">房間列表</h2>

          {roomsError && (
            <div className="text-red-600">
              讀取失敗：{roomsError.message}
            </div>
          )}

          {!rooms || rooms.length === 0 ? (
            <div className="text-gray-500">目前還沒有房間</div>
          ) : (
            <div className="space-y-4">
              {(rooms as RoomRow[]).map((room) => {
                const progress = progressMap[String(room.id)] ?? {
                  revealed: 0,
                  total: room.cell_count ?? 0,
                };

                const revealed = progress.revealed;
                const total = progress.total || room.cell_count || 0;
                const percent =
                  total > 0 ? Math.round((revealed / total) * 100) : 0;

                return (
                  <div
                    key={String(room.id)}
                    className="rounded-xl border bg-white p-4 shadow"
                  >
                    <div className="font-bold text-black">{room.name}</div>
                    <div className="text-sm text-gray-600">slug：{room.slug}</div>
                    <div className="text-sm text-gray-600">
                      格數：{room.cell_count}
                    </div>
                    <div className="text-sm text-gray-600">
                      狀態：{room.status}
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
                        <span>刮板進度</span>
                        <span>
                          {revealed}/{total}（{percent}%）
                        </span>
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mt-2 text-sm text-gray-600">
                        {revealed === 0
                          ? "尚未開始"
                          : revealed >= total
                          ? "已全部刮開"
                          : "進行中"}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <ResetRoomButton
                        storeSlug={store.slug}
                        roomSlug={room.slug}
                        roomName={room.name}
                      />
                      <DeleteRoomButton
                        storeSlug={store.slug}
                        roomSlug={room.slug}
                        roomName={room.name}
                      />
                      <ToggleRoomStatusButton
                        storeSlug={store.slug}
                        roomSlug={room.slug}
                        currentStatus={room.status}
                        roomName={room.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}