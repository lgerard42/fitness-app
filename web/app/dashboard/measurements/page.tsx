"use client";

import { Ruler, TrendingDown, TrendingUp } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { formatDate } from "@/lib/utils";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/dashboard/Charts";

export default function MeasurementsPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const measurements = [...data.bodyMeasurements].reverse();
  const latest = measurements[measurements.length - 1];
  const previous = measurements[measurements.length - 2];

  const weightData = measurements
    .filter((m) => m.weight != null)
    .map((m) => ({ date: formatDate(m.date), weight: m.weight }));

  const bodyFatData = measurements
    .filter((m) => m.bodyFatPercent != null)
    .map((m) => ({ date: formatDate(m.date), bodyFat: m.bodyFatPercent }));

  const measurementCards = [
    {
      label: "Weight",
      value: latest?.weight,
      prev: previous?.weight,
      unit: "lbs",
      positiveIsGood: false,
    },
    {
      label: "Body Fat",
      value: latest?.bodyFatPercent,
      prev: previous?.bodyFatPercent,
      unit: "%",
      positiveIsGood: false,
    },
    {
      label: "Chest",
      value: latest?.chest,
      prev: previous?.chest,
      unit: "in",
      positiveIsGood: true,
    },
    {
      label: "Waist",
      value: latest?.waist,
      prev: previous?.waist,
      unit: "in",
      positiveIsGood: false,
    },
    {
      label: "Left Arm",
      value: latest?.leftArm,
      prev: previous?.leftArm,
      unit: "in",
      positiveIsGood: true,
    },
    {
      label: "Right Arm",
      value: latest?.rightArm,
      prev: previous?.rightArm,
      unit: "in",
      positiveIsGood: true,
    },
    {
      label: "Left Thigh",
      value: latest?.leftThigh,
      prev: previous?.leftThigh,
      unit: "in",
      positiveIsGood: true,
    },
    {
      label: "Right Thigh",
      value: latest?.rightThigh,
      prev: previous?.rightThigh,
      unit: "in",
      positiveIsGood: true,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-dark">
          Body Measurements
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your body composition over time.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {measurementCards.map((card) => {
          const diff =
            card.value != null && card.prev != null
              ? +(card.value - card.prev).toFixed(1)
              : null;
          const isPositive = diff != null && diff > 0;
          const isGood =
            diff != null
              ? card.positiveIsGood
                ? diff > 0
                : diff < 0
              : null;

          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Ruler size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <p className="text-xl font-extrabold text-neutral-dark">
                {card.value != null ? `${card.value} ${card.unit}` : "—"}
              </p>
              {diff != null && (
                <div className="flex items-center gap-1 mt-1">
                  {isPositive ? (
                    <TrendingUp
                      size={12}
                      className={isGood ? "text-accent" : "text-red-500"}
                    />
                  ) : (
                    <TrendingDown
                      size={12}
                      className={isGood ? "text-accent" : "text-red-500"}
                    />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isGood ? "text-accent" : "text-red-500"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {diff} {card.unit}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Weight Over Time" subtitle="Body weight (lbs)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ fill: "#10B981", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Body Fat %" subtitle="Percentage over time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={bodyFatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="bodyFat"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={{ fill: "#F59E0B", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
