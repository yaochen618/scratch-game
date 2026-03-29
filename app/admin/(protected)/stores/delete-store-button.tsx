"use client";

export default function DeleteStoreButton({
  storeId,
}: {
  storeId: string | number;
}) {
  const handleDelete = async () => {
    if (!storeId) {
      alert("刪除失敗：缺少 storeId");
      return;
    }

    const ok = confirm("確定要永久刪除這個店家嗎？商店、房間與相關資料都會被刪除。");
    if (!ok) return;

    const res = await fetch(`/api/admin/stores/${storeId}/delete`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert("刪除失敗：" + (data.error || "未知錯誤"));
      return;
    }

    alert("刪除成功");
    window.location.reload();
  };

  return (
    <button
      onClick={handleDelete}
      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
    >
      刪除店家
    </button>
  );
}