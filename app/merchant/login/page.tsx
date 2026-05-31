"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MerchantLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);

      const res = await fetch("/api/merchant/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const rawText = await res.text();
      console.log("login status =", res.status);
      console.log("login rawText =", rawText);

      const data = rawText ? JSON.parse(rawText) : null;
      console.log("login data =", data);

      if (!res.ok) {
        alert(data?.error || `登入失敗 (${res.status})`);
        return;
      }

      console.log("login type =", data?.type);

      if (data?.type === "staff") {
        window.location.replace(`/merchant/${data.staff.storeSlug}/rooms`);
        return;
      }

      window.location.replace("/merchant");
      return;
    } catch (error) {
      console.error("login error =", error);
      alert("登入發生錯誤，請看 Console");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-black">
          商家登入
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              帳號
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-black"
              placeholder="請輸入帳號"
              autoComplete="username"
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
              placeholder="請輸入密碼"
              autoComplete="current-password"
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