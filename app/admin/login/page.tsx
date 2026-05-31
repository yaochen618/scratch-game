"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert("登入失敗：" + data.error);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-300 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-6 shadow"
      >
        <h1 className="text-xl font-bold text-black">管理員登入</h1>

        <input
          type="text"
          placeholder="管理員帳號"
          className="w-full rounded border px-3 py-2 text-black"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="管理員密碼"
          className="w-full rounded border px-3 py-2 text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
        >
          {loading ? "登入中..." : "登入"}
        </button>
      </form>
    </main>
  );
}