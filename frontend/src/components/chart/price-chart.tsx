"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import type { components } from "@/api/types";

type Candle = components["schemas"]["OhlcvCandle"];
type ChartMarker = components["schemas"]["ChartMarker"];

interface PriceChartProps {
  candles: Candle[];
  markers?: ChartMarker[];
  height?: number;
}

export function PriceChart({ candles, markers = [], height = 480 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType, Time> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#a1a1aa" : "#71717a",
      },
      grid: {
        vertLines: { color: isDark ? "#27272a" : "#e4e4e7" },
        horzLines: { color: isDark ? "#27272a" : "#e4e4e7" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? "#3f3f46" : "#d4d4d8" },
      timeScale: { borderColor: isDark ? "#3f3f46" : "#d4d4d8", timeVisible: true },
      width: containerRef.current.clientWidth,
      height,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series);

    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [isDark, height]);

  useEffect(() => {
    if (!seriesRef.current || !candles.length) return;
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    seriesRef.current.setData(
      sorted.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.setMarkers(
      markers.map((m) => ({
        time: m.time as Time,
        position: m.position as "aboveBar" | "belowBar" | "inBar",
        shape: m.shape as "arrowUp" | "arrowDown" | "circle" | "square",
        color: m.color,
        text: m.text,
      }))
    );
  }, [markers]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
