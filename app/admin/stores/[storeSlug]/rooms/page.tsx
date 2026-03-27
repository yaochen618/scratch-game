import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ModeSelect from "./mode-select";

type PageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function AdminRoomsPage({ params }: PageProps) {
  const { storeSlug } = await params;

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
        </div>
      </main>
    );
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, slug, status, cell_count, created_at, draw_mode")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-green-300 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/stores" className="text-sm text-gray-500">
          ← 回商店列表
        </Link>

        <h1 className="mb-2 mt-4 text-3xl text-black font-bold">
          {store.name} - 房間管理
        </h1>

        <p className="mb-6 text-gray-500">管理此店的所有刮刮樂房間</p>

        {!rooms || rooms.length === 0 ? (
          <div className="rounded-xl border p-6 text-gray-500">尚無房間</div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="rounded-xl border p-5 shadow-sm bg-white">
                <h2 className="text-lg text-black font-semibold">{room.name}</h2>

                <p className="text-sm text-gray-500">slug：{room.slug}</p>
                <p className="text-sm text-gray-500">格數：{room.cell_count}</p>
                <p className="text-sm text-gray-500">狀態：{room.status}</p>

                <div className="mt-4">
                  <p className="mb-1 text-sm text-gray-500">抽號模式：</p>
                  <ModeSelect
                    roomId={room.id}
                    currentMode={room.draw_mode ?? "uniform"}
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/stores/${store.slug}/rooms/${room.slug}`}
                    className="rounded bg-black px-3 py-1 text-sm text-white"
                  >
                    查看前台
                  </Link>

                  <Link
                    href={`/merchant/${store.slug}/rooms`}
                    className="rounded border bg-blue-500 px-3 py-1 text-sm"
                  >
                    商家後台
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}