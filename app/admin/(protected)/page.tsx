import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-green-300 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">管理員總後台</h1>
        <p className="mb-8 text-gray-600">請選擇要進入的管理功能</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/admin/stores"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="mb-2 text-xl font-semibold text-gray-900">商店管理</h2>
            <p className="text-sm text-gray-600">
              建立商店、查看商店、進入房間管理
            </p>
          </Link>

          <Link
            href="/admin/merchants"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="mb-2 text-xl font-semibold text-gray-900">商家帳號管理</h2>
            <p className="text-sm text-gray-600">
              建立商家帳號、重設密碼、查看商家資料
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}