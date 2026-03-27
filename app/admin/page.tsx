import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const adminCards = [
  {
    title: "商家帳號管理",
    description: "建立商家帳號、重設密碼、停用/啟用與刪除帳號",
    href: "/admin/merchants",
  },
  {
    title: "商店管理",
    description: "建立商店、調整綁定商家、解除綁定與刪除商店",
    href: "/admin/stores",
  },
  {
    title: "商家入口頁",
    description: "查看商家登入後的後台入口頁與實際管理流程",
    href: "/merchant",
  },
];

export default async function AdminHomePage() {
  const cookieStore = await cookies();
  const adminId = cookieStore.get("admin_session")?.value;

  if (!adminId) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-green-300 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">系統管理員後台</h1>
          <p className="text-gray-600">請選擇要進行的管理項目</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="mb-3 text-xl font-semibold text-gray-900">
                {card.title}
              </h2>
              <p className="text-sm leading-6 text-gray-600">
                {card.description}
              </p>
              <div className="mt-6 text-sm font-medium text-black">進入 →</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}