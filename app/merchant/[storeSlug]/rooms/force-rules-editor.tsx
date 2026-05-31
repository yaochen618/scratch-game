"use client";

import { useEffect, useState } from "react";

type Props = {
  storeSlug: string;
  roomSlug: string;
};

type ForceRules = {
  byCellIndex: Record<string, number>;
};

type AddRule = {
  after_draw: number;
  numbersText: string;
};

type SpecialMode = {
  addRules: AddRule[];
};

type ApiSpecialMode = {
  enabled?: boolean;
  base_mode?: "room_range" | "custom_pool" | "auto_exclude_added";
  add_rules?: {
    after_draw: number;
    numbers: number[];
  }[];
};

export default function ForceRulesEditor({ storeSlug, roomSlug }: Props) {
  const [loading, setLoading] = useState(false);
  const [drawMode, setDrawMode] = useState<"normal" | "special">("normal");

  const [rules, setRules] = useState<ForceRules>({
    byCellIndex: {},
  });

  const [specialMode, setSpecialMode] = useState<SpecialMode>({
    addRules: [],
  });

  const [cellCount, setCellCount] = useState(0);
  const [openedCells, setOpenedCells] = useState<number[]>([]);

  const parseNumberList = (text: string) => {
    return [
      ...new Set(
        text
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0)
      ),
    ];
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/stores/${storeSlug}/rooms/${roomSlug}/force-rules`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "讀取特殊設定失敗");
        return;
      }

      const apiSpecialMode: ApiSpecialMode = data.special_mode || {};

      setRules({
        byCellIndex: data.force_rules?.byCellIndex || {},
      });

      setDrawMode(data.draw_mode === "special" ? "special" : "normal");

      setSpecialMode({
        addRules: Array.isArray(apiSpecialMode.add_rules)
          ? apiSpecialMode.add_rules.map((rule) => ({
              after_draw: rule.after_draw,
              numbersText: Array.isArray(rule.numbers)
                ? rule.numbers.join(",")
                : "",
            }))
          : [],
      });

      setCellCount(data.cell_count || 0);
      setOpenedCells(data.opened_cell_indexes || []);
    } catch (error) {
      console.error(error);
      alert("讀取失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeSlug, roomSlug]);

  const handleCellChange = (key: number, value: string) => {
    const num = value === "" ? "" : Number(value);

    setRules((prev) => {
      const copy = {
        ...prev,
        byCellIndex: { ...prev.byCellIndex },
      };

      if (value === "") {
        delete copy.byCellIndex[String(key)];
      } else {
        copy.byCellIndex[String(key)] = num as number;
      }

      return copy;
    });
  };

  const addSpecialRuleRow = () => {
    setSpecialMode((prev) => ({
      ...prev,
      addRules: [
        ...prev.addRules,
        {
          after_draw: 0,
          numbersText: "",
        },
      ],
    }));
  };

  const updateSpecialRuleRow = (
    index: number,
    field: "after_draw" | "numbersText",
    value: string
  ) => {
    setSpecialMode((prev) => {
      const copy = [...prev.addRules];

      if (field === "after_draw") {
        copy[index] = {
          ...copy[index],
          after_draw: Number(value) || 0,
        };
      } else {
        copy[index] = {
          ...copy[index],
          numbersText: value,
        };
      }

      return {
        ...prev,
        addRules: copy,
      };
    });
  };

  const removeSpecialRuleRow = (index: number) => {
    setSpecialMode((prev) => ({
      ...prev,
      addRules: prev.addRules.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const payload = {
      draw_mode: drawMode,
      force_rules: {
        byCellIndex: rules.byCellIndex,
      },
      special_mode:
        drawMode === "special"
          ? {
              enabled: true,
              base_mode: "auto_exclude_added",
              add_rules: specialMode.addRules.map((rule) => ({
                after_draw: Number(rule.after_draw) || 0,
                numbers: parseNumberList(rule.numbersText),
              })),
            }
          : null,
    };

    const res = await fetch(
      `/api/stores/${storeSlug}/rooms/${roomSlug}/force-rules`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "儲存失敗");
      return;
    }

    alert("儲存成功");
    loadData();
  };

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
      <h2 className="text-lg font-bold text-black">🎯 特殊調整</h2>

      {loading && <div className="text-sm text-gray-600">讀取中...</div>}

      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-2 font-semibold text-black">特殊模式</h3>

        <select
          value={drawMode}
          onChange={(e) =>
            setDrawMode(e.target.value as "normal" | "special")
          }
          className="w-full rounded border px-3 py-2 text-black"
        >
          <option value="normal">一般模式</option>
          <option value="special">特殊模式</option>
        </select>

        <p className="mt-2 text-sm text-gray-600">
          一般模式：1 ~ 格數 的正常抽法
          <br />
          特殊模式：可設定第幾抽後加入哪些數字
        </p>
      </div>

      {drawMode === "special" && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-2 font-semibold text-black">特殊模式設定</h3>

          <p className="mb-3 text-sm text-gray-600">
            系統會自動用「1 ~ 格數」扣掉所有後續加入的數字，作為初始獎池。
          </p>

          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-black">
              指定抽數後增加獎項
            </div>

            <button
              type="button"
              onClick={addSpecialRuleRow}
              className="rounded bg-green-600 px-3 py-1 text-sm text-white"
            >
              + 新增規則
            </button>
          </div>

          <div className="space-y-2">
            {specialMode.addRules.map((rule, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded border p-3 md:grid-cols-[120px_1fr_80px]"
              >
                <div>
                  <div className="mb-1 text-xs text-black">第幾抽後</div>
                  <input
                    type="number"
                    min={0}
                    value={rule.after_draw}
                    onChange={(e) =>
                      updateSpecialRuleRow(
                        index,
                        "after_draw",
                        e.target.value
                      )
                    }
                    className="w-full rounded border px-2 py-1 text-black"
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs text-black">增加哪些獎</div>
                  <input
                    type="text"
                    value={rule.numbersText}
                    onChange={(e) =>
                      updateSpecialRuleRow(
                        index,
                        "numbersText",
                        e.target.value
                      )
                    }
                    placeholder="例如：1,3"
                    className="w-full rounded border px-2 py-1 text-black"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeSpecialRuleRow(index)}
                    className="w-full rounded bg-red-500 px-2 py-1 text-white"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-2 font-semibold text-black">
          特殊規則設定（指定格數出什麼）
        </h3>

        <p className="mb-3 text-sm text-gray-600">
          已刮開的格子不能再修改。
        </p>

        <div className="grid grid-cols-5 gap-2 text-black">
          {Array.from({ length: cellCount }, (_, i) => {
            const idx = i + 1;
            const disabled = openedCells.includes(idx);

            return (
              <div key={idx}>
                <div className="text-xs">格 {idx}</div>
                <input
                  type="number"
                  disabled={disabled}
                  value={rules.byCellIndex[idx] ?? ""}
                  onChange={(e) => handleCellChange(idx, e.target.value)}
                  className="w-full rounded border px-2 py-1 disabled:bg-gray-200"
                />
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        儲存全部設定
      </button>
    </div>
  );
}