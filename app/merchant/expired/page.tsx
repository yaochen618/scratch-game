export default function MerchantExpiredPage() {
  return (
    <main className="min-h-screen bg-blue-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-red-600">方案已到期</h1>
        <p className="mt-4 text-gray-600">
          你的商家方案目前已到期，請聯絡系統管理員續約後再使用。
        </p>
      </div>
    </main>
  );
}