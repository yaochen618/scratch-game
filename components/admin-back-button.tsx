"use client";

import { useRouter } from "next/navigation";

export default function AdminBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/admin")}
      className="mb-4 rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 transition"
    >
      ← 返回管理員總後台
    </button>
  );
}