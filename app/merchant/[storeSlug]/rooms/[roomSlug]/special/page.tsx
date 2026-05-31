import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import ModeSelect from "../../mode-select";
import ForceRulesEditor from "../../force-rules-editor";

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

export default async function SpecialAdjustPage({ params }: PageProps) {
  const { storeSlug, roomSlug } = await params;

  const cookieStore = await cookies();
  const staffId = cookieStore.get("staff_session")?.value;

  if (!staffId) {
    return (
      <main className="min-h-screen bg-blue-200 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-red-600">
          找不到 staff_session，請重新用特殊身分登入。
        </div>
      </main>
    );
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("slug", storeSlug)
    .single();

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-blue-200 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-red-600">
          找不到商店：{storeSlug}
        </div>
      </main>
    );
  }

  const { data: staff, error: staffError } = await supabase
    .from("store_staff")
    .select(
      "id, username, store_id, can_manage_special_rules, can_manage_special_mode, is_active"
    )
    .eq("id", staffId)
    .maybeSingle();

  if (staffError) {
    return (
      <main className="min-h-screen bg-blue-200 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-red-600">
          讀取特殊身分失敗：{staffError.message}
        </div>
      </main>
    );
  }

  if (!staff) {
    return (
      <main className="min-h-screen bg-blue-200 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-red-600">
          找不到特殊身分資料
        </div>
      </main>
    );
  }

  if (String(staff.store_id) !== String(store.id)) {
    return (
      <main className="min-h-screen bg-blue-200 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-red-600">
          特殊身分綁定店家不符
          <br />
          staff.store_id = {String(staff.store_id)}
          <br />
          store.id = {String(store.id)}
        </div>
      </main>
    );
  }

  if (!staff.is_active) {
    return (
      <main className="min-h-screen bg-blue-200 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-red-600">
          特殊身分已停用
        </div>
      </main>
    );
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, slug, draw_mode")
    .eq("store_id", store.id)
    .eq("slug", roomSlug)
    .single();

  if (roomError || !room) {
    return (
      <main className="min-h-screen bg-blue-200 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-red-600">
          找不到房間：{roomSlug}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-200 p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/merchant/${store.slug}/rooms`}
          className="text-sm bg-white p-2 rounded-xl text-gray-700 hover:underline"
        >
          ← 返回房間管理
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-black">特殊調整</h1>

        <p className="mt-2 text-gray-700">
          店家：{store.name} / 房間：{room.name}
        </p>

        <section className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-3 text-xl font-bold text-black">特殊模式</h2>

          {staff.can_manage_special_mode ? (
            <ModeSelect
              roomId={room.id}
              currentMode={room.draw_mode ?? "normal"}
            />
          ) : (
            <p className="text-sm text-gray-500">你沒有特殊模式管理權限</p>
          )}
        </section>

        <section className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-3 text-xl font-bold text-black">特殊規則</h2>

          {staff.can_manage_special_rules ? (
            <ForceRulesEditor storeSlug={store.slug} roomSlug={room.slug} />
          ) : (
            <p className="text-sm text-gray-500">你沒有特殊規則管理權限</p>
          )}
        </section>
      </div>
    </main>
  );
}