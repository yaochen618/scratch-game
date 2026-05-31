import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PageProps = {
  params: Promise<{
    storeSlug: string;
    roomSlug: string;
  }>;
};

function formatTaiwanTime(dateString: string | null) {
  if (!dateString) return "未記錄";

  return new Date(dateString).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function DrawRecordsPage({ params }: PageProps) {
  const { storeSlug, roomSlug } = await params;

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("slug", storeSlug)
    .single();

  if (!store) {
    return <main className="p-8">找不到商店</main>;
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, slug")
    .eq("store_id", store.id)
    .eq("slug", roomSlug)
    .single();

  if (!room) {
    return <main className="p-8">找不到房間</main>;
  }

  const { data: records, error } = await supabase
    .from("cells")
    .select("*")
    .eq("room_id", room.id)
    .eq("is_revealed", true)
    .order("draw_order", { ascending: true });

  return (
    <main className="min-h-screen bg-blue-200 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">
            {room.name} 抽取紀錄
          </h1>

          <Link
            href={`/merchant/${store.slug}/rooms`}
            className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            ← 返回房間管理
          </Link>
        </div>

        <section className="rounded-xl bg-white p-4 shadow">
          {error && (
            <div className="text-red-600">
              讀取抽取紀錄失敗：{error.message}
            </div>
          )}

          {!records || records.length === 0 ? (
            <div className="text-gray-500">目前還沒有抽取紀錄</div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-100 text-black">
                  <th className="p-3">抽數</th>
                  <th className="p-3">號碼</th>
                  <th className="p-3">抽取時間 (+8)</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record: any, index: number) => (
                  <tr key={record.id ?? index} className="border-b text-black">
                    <td className="p-3">
                      第 {record.draw_order ?? index + 1} 抽
                    </td>

                    <td className="p-3 font-semibold text-red-600">
                      {record.revealed_number ?? "-"}
                    </td>

                    <td className="p-3">
                      {formatTaiwanTime(
                        record.revealed_at ??
                          record.updated_at ??
                          record.created_at
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}