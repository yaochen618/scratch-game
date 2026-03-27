import { supabase } from "@/lib/supabase";
import ResetRoomButton from "./reset-room-button";
import CreateRoomForm from "./create-room-form";
import DeleteRoomButton from "./delete-room-button";
import AnnouncementEditor from "./announcement-editor";

type PageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function RoomsPage({ params }: PageProps) {
  const { storeSlug } = await params;

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, announcement")
    .eq("slug", storeSlug)
    .single();

  if (!store) {
    return (
      <main className="mx-auto max-w-5xl bg-white p-8 min-h-screen">
        <h1 className="text-2xl font-bold">找不到商店</h1>
      </main>
    );
  }

  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, name, slug, status, cell_count")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl bg-white p-8 min-h-screen">
        <h1 className="text-2xl font-bold">{store.name} 管理</h1>
        <p className="mt-4 text-red-600">讀取失敗</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-blue-200 p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">{store.name} 管理</h1>
          <p className="mt-2 text-gray-600">商店網址代稱：{store.slug}</p>
        </div>

        <div className="w-full md:w-[320px]">
          <CreateRoomForm storeSlug={store.slug} />
        </div>
      </div>

      <div className="mb-8">
        <AnnouncementEditor
          storeSlug={store.slug}
          initialAnnouncement={store.announcement ?? ""}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full border-collapse bg-white">
          <thead className="bg-gray-200 text-left">
            <tr>
              <th className="px-4 py-3 text-gray-600">名稱</th>
              <th className="px-4 py-3 text-gray-600">ID</th>
              <th className="px-4 py-3 text-gray-600">狀態</th>
              <th className="px-4 py-3 text-gray-600">格數</th>
              <th className="px-4 py-3 text-gray-600">操作</th>
            </tr>
          </thead>

          <tbody>
            {rooms?.length ? (
              rooms.map((room) => (
                <tr key={room.id} className="border-t">
                  <td className="px-4 py-3 text-gray-600">{room.name}</td>
                  <td className="px-4 py-3 text-gray-600">{room.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{room.status}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {room.cell_count ?? 30}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-2">
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
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  目前沒有房間
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}