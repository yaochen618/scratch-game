"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnterPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!code.trim()) {
      setErrorMsg("請輸入驗證碼");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const text = await res.text();

      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        setErrorMsg("伺服器回傳格式錯誤");
        return;
      }

      if (!res.ok) {
        setErrorMsg(json.error || "驗證失敗");
        return;
      }

      // ✅ 你要的是進入所有商店頁面
      router.push("/stores");
    } catch (error) {
      console.error(error);
      setErrorMsg("系統錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-black">
          歡迎進入客服系統
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          請輸入驗證碼後進入系統
        </p>

        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          placeholder="請輸入驗證碼"
          className="mb-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-black outline-none focus:border-black"
        />

        {errorMsg ? (
          <p className="mb-3 text-sm text-red-500">{errorMsg}</p>
        ) : null}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? "驗證中..." : "進入系統"}
        </button>
      </div>
    </main>
  );
}