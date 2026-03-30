"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MerchantLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch("/api/merchant/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const rawText = await res.text();
      console.log("login status =", res.status);
      console.log("login rawText =", rawText);

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (err) {
        console.error("JSON parse error:", err);
        alert("登入 API 回傳的不是 JSON，請看 console");
        return;
      }

      console.log("login data =", data);

      if (!res.ok) {
        alert(data?.error || `登入失敗 (${res.status})`);
        return;
      }

      const storeSlug = data?.merchant?.storeSlug;
      console.log("storeSlug =", storeSlug);

      if (!storeSlug) {
        alert("登入成功，但找不到店家資訊");
        return;
      }

      router.push(`/merchant`);
      router.refresh();
    } catch (error) {
      console.error("login error =", error);
      alert("發生錯誤，請看 console");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-black">商家登入</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              帳號
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-black"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}