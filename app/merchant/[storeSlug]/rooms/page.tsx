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
      <main className="mx-auto max-w-5xl min-h-screen bg-white p-8">
        <h1 className="text-2xl font-bold">找不到商店</h1>
      </main>
    );
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, slug, status, cell_count")
    .eq("store_id", store.id);

  const isExpired = isMerchantExpired(store);
  const remainingDays = getRemainingDays(store);

  return (
    <main className="max-w-5xl min-h-screen bg-blue-200 p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        {store.name} 房間管理
      </h1>

      <section className="mt-6">
        <div className="text-sm text-gray-600">
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
          <div className="mt-2 text-red-600 font-semibold">
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
        <h2 className="mb-4 text-2xl text-black font-bold">房間列表</h2>

        {roomsError && (
          <div className="text-red-600">
            讀取失敗：{roomsError.message}
          </div>
        )}

        {!rooms || rooms.length === 0 ? (
          <div className="text-gray-500">目前還沒有房間</div>
        ) : (
          <div className="space-y-4">
            {(rooms as RoomRow[]).map((room) => (
              <div
                key={String(room.id)}
                className="border bg-white rounded-xl p-4"
              >
                <div className="font-bold text-black">{room.name}</div>
                <div className="text-sm text-black">slug：{room.slug}</div>
                <div className="text-sm text-black">格數：{room.cell_count}</div>

                <div className="mt-3 flex flex-warp gap-2">
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
            ))}
          </div>
        )}
      </section>
    </main>
  );
}