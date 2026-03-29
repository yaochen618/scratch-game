import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ModeSelect from "./mode-select";
import ForceRulesEditor from "./force-rules-editor";

type PageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function AdminRoomsPage({ params }: PageProps) {
  const { storeSlug } = await params;
  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("slug", storeSlug)
    .single();

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/admin/stores" className="text-sm text-gray-500">
            ← 回商店列表
          </Link>

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
            找不到商店：{storeSlug}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            storeError：{storeError?.message || "無"}
          </div>
        </div>
      </main>
    );
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, slug, status, cell_count, created_at, draw_mode, store_id")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-green-300 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/stores" className="text-sm text-gray-500">
          ← 回商店列表
        </Link>

        <h1 className="mb-2 mt-4 text-3xl font-bold text-black">
          {store.name} - 房間管理
        </h1>

        <p className="mb-6 text-gray-500">管理此店的所有刮刮樂房間</p>

        {roomsError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
            讀取房間失敗：{roomsError.message}
          </div>
        )}

        {!rooms || rooms.length === 0 ? (
          <div className="rounded-xl border p-6 text-gray-500">
            尚無房間
            <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-600">
{JSON.stringify(
  {
    store,
    rooms,
    roomsError: roomsError?.message ?? null,
  },
  null,
  2
)}
            </pre>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-black">{room.name}</h2>

                <p className="text-sm text-gray-500">slug：{room.slug}</p>
                <p className="text-sm text-gray-500">格數：{room.cell_count}</p>
                <p className="text-sm text-gray-500">狀態：{room.status}</p>
                <p className="text-sm text-gray-500">store_id：{room.store_id}</p>

                <div className="mt-4">
                  <p className="mb-1 text-sm text-gray-500">抽號模式：</p>
                  <ModeSelect
                    roomId={room.id}
                    currentMode={room.draw_mode ?? "uniform"}
                  />

                  <ForceRulesEditor
                    storeSlug={storeSlug}
                    roomSlug={room.slug}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}