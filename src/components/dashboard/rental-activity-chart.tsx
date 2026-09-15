"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors: Record<string, string> = {
  Active: "var(--color-brand)",
  Returned: "var(--color-success)",
  Overdue: "var(--color-danger)",
  Draft: "var(--color-ink-muted)",
};

export function RentalActivityChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--color-surface-muted)" }}
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 10,
            fontSize: 13,
          }}
          formatter={(value) => [Number(value), "Rentals"] as [number, string]}
        />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={54}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={colors[entry.name] ?? "var(--color-brand)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
