"use client";

import { useState } from "react";
import type { TableColumn, TableRow } from "@/lib/types";

/** Repeating-rows input (e.g. one row per medicine). Submits its rows as JSON in a hidden input. */
export function TableField({ name, columns, initial, disabled }: {
  name: string;
  columns: TableColumn[];
  initial?: TableRow[];
  disabled?: boolean;
}) {
  const blank = () => Object.fromEntries(columns.map((c) => [c.key, ""])) as TableRow;
  const [rows, setRows] = useState<TableRow[]>(initial?.length ? initial : [blank()]);
  const set = (i: number, key: string, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <div className="table-field">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <table className="table table-input">
        <thead>
          <tr>
            <th className="num">#</th>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="num muted">{i + 1}</td>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.type === "select" ? (
                    <select value={r[c.key] ?? ""} disabled={disabled} aria-label={`${c.label} row ${i + 1}`} onChange={(e) => set(i, c.key, e.target.value)}>
                      <option value="">—</option>
                      {c.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={c.type}
                      step={c.type === "number" ? "any" : undefined}
                      value={r[c.key] ?? ""}
                      disabled={disabled}
                      aria-label={`${c.label} row ${i + 1}`}
                      onChange={(e) => set(i, c.key, e.target.value)}
                    />
                  )}
                </td>
              ))}
              <td>
                <button type="button" className="btn btn-sm btn-danger" disabled={disabled} aria-label={`Remove row ${i + 1}`}
                  onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [blank()]))}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => setRows((rs) => [...rs, blank()])}>+ Add row</button>
    </div>
  );
}
