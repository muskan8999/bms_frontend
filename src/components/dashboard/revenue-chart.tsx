"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

export function RevenueChart({ data }: { data: { date: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="rentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          tickFormatter={(value: number) => `₹${value >= 1000 ? `${value / 1000}k` : value}`}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-line-strong)" }}
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--color-ink)",
          }}
          labelStyle={{ color: "var(--color-ink-muted)", fontSize: 12 }}
          formatter={(value) => [formatCurrency(Number(value)), "Rent accrued"] as [string, string]}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--color-brand)"
          strokeWidth={2}
          fill="url(#rentFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
