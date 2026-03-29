"use client";

import { useEffect, useState } from "react";

type Props = {
  storeSlug: string;
  roomSlug: string;
};

type ForceRules = {
  byCellIndex: Record<string, number>;
};

export default function ForceRulesEditor({
  storeSlug,
  roomSlug,
}: Props) {
  const [adminKey, setAdminKey] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const [rules, setRules] = useState<ForceRules>({
    byCellIndex: {},
  });

  const [cellCount, setCellCount] = useState(0);
  const [openedCells, setOpenedCells] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const res = await fetch(
      `/api/stores/${storeSlug}/rooms/${roomSlug}/force-rules`,
      {
        headers: {
          "x-system-admin-key": adminKey,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "驗證失敗");
      setLoading(false);
      return;
    }

    // 👉 保險：就算後端還有舊資料也只取 byCellIndex
    setRules({
      byCellIndex: data.force_rules?.byCellIndex || {},
    });

    setCellCount(data.cell_count);
    setOpenedCells(data.opened_cell_indexes);
    setAuthorized(true);
    setLoading(false);
  };

  const handleChange = (key: number, value: string) => {
    const num = value === "" ? "" : Number(value);

    setRules((prev) => {
      const copy = { ...prev };

      copy.byCellIndex = { ...copy.byCellIndex };

      if (value === "") {
        delete copy.byCellIndex[String(key)];
      } else {
        copy.byCellIndex[String(key)] = num as number;
      }

      return copy;
    });
  };

  const handleSave = async () => {
    const res = await fetch(
      `/api/stores/${storeSlug}/rooms/${roomSlug}/force-rules`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-system-admin-key": adminKey,
        },
        body: JSON.stringify({
          force_rules: {
            byCellIndex: rules.byCellIndex,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "儲存失敗");
      return;
    }

    alert("儲存成功");
  };

  if (!authorized) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="mb-2 text-lg font-bold text-red-700">
          特殊規則（限系統管理員）
        </h2>

        <input
          type="password"
          placeholder="請輸入系統管理密碼"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className="w-full rounded border px-3 py-2 text-black"
        />

        <button
          onClick={loadData}
          disabled={loading || !adminKey}
          className="mt-3 rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "驗證中..." : "進入特殊規則"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
      <h2 className="mb-3 text-lg text-black font-bold">
        🎯 特殊規則設定（僅你可用）
      </h2>

      <div>
        <h3 className="mb-2 text-black font-semibold">指定格子</h3>

        <div className="grid text-black grid-cols-5 gap-2">
          {Array.from({ length: cellCount }, (_, i) => {
            const idx = i + 1;
            const disabled = openedCells.includes(idx);

            return (
              <div key={idx}>
                <div className="text-xs text-black">格 {idx}</div>

                <input
                  type="number"
                  disabled={disabled}
                  value={rules.byCellIndex[idx] ?? ""}
                  onChange={(e) =>
                    handleChange(idx, e.target.value)
                  }
                  className="w-full rounded border px-2 py-1"
                />
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
      >
        儲存規則
      </button>
    </div>
  );
}