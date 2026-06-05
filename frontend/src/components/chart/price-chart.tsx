"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import type { components } from "@/api/types";
import type { ChartOverlays } from "@/components/chart/chart-toolbar";

type Candle = components["schemas"]["OhlcvCandle"];
type ChartMarker = components["schemas"]["ChartMarker"];
type ChartOverlaysData = components["schemas"]["ChartOverlaysResponse"];

interface PriceChartProps {
  candles: Candle[];
  markers?: ChartMarker[];
  overlays?: ChartOverlays;
  overlayData?: ChartOverlaysData;
  height?: number;
  className?: string;
}

const EMA_COLORS: Record<number, string> = {
  20: "#3b82f6",
  50: "#a855f7",
};

function readSize(el: HTMLElement) {
  const { width, height } = el.getBoundingClientRect();
  return { width: Math.floor(width), height: Math.floor(height) };
}

export function PriceChart({
  candles,
  markers = [],
  overlays = { patterns: true, levels: true, ema: false, projection: true, setup: true },
  overlayData,
  height,
  className,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType, Time> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const projectionLineRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const projectionCandlesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const emaSeriesRefs = useRef<ISeriesApi<"Line", Time>[]>([]);
  const priceLineRefs = useRef<IPriceLine[]>([]);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const { width, height: h } = readSize(el);
    const chart = createChart(el, {
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
      width: Math.max(width, 1),
      height: Math.max(h, 1),
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

    const resize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const next = readSize(containerRef.current);
      if (next.width > 0 && next.height > 0) {
        chartRef.current.applyOptions({ width: next.width, height: next.height });
      }
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    requestAnimationFrame(resize);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
      projectionLineRef.current = null;
      projectionCandlesRef.current = null;
      emaSeriesRefs.current = [];
      priceLineRefs.current = [];
    };
  }, [isDark]);

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
    const visible = overlays.patterns ? markers : [];
    markersRef.current.setMarkers(
      visible.map((m) => ({
        time: m.time as Time,
        position: m.position as "aboveBar" | "belowBar" | "inBar",
        shape: m.shape as "arrowUp" | "arrowDown" | "circle" | "square",
        color: m.color,
        text: m.text,
      }))
    );
  }, [markers, overlays.patterns]);

  useEffect(() => {
    const chart = chartRef.current;
    const mainSeries = seriesRef.current;
    if (!chart || !mainSeries) return;

    for (const pl of priceLineRefs.current) {
      mainSeries.removePriceLine(pl);
    }
    priceLineRefs.current = [];

    if (projectionLineRef.current) {
      chart.removeSeries(projectionLineRef.current);
      projectionLineRef.current = null;
    }
    if (projectionCandlesRef.current) {
      chart.removeSeries(projectionCandlesRef.current);
      projectionCandlesRef.current = null;
    }
    for (const s of emaSeriesRefs.current) {
      chart.removeSeries(s);
    }
    emaSeriesRefs.current = [];

    if (!overlayData) return;

    if (overlays.levels && overlayData.levels.length) {
      for (const lv of overlayData.levels) {
        const isSupport = lv.type === "support";
        const pct = Math.round((lv.strength ?? 0) * 100);
        const pl = mainSeries.createPriceLine({
          price: lv.price,
          color: isSupport ? "#22c55e88" : "#ef444488",
          lineWidth: lv.strength >= 0.7 ? 2 : 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `${isSupport ? "S" : "R"} ${pct}%`,
        });
        priceLineRefs.current.push(pl);
      }
    }

    const setup = overlays.setup ? overlayData.trade_setup : null;
    if (setup?.entry != null) {
      priceLineRefs.current.push(
        mainSeries.createPriceLine({
          price: setup.entry,
          color: "#eab308",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "Entry",
        })
      );
    }
    if (setup?.stop_loss != null) {
      priceLineRefs.current.push(
        mainSeries.createPriceLine({
          price: setup.stop_loss,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "SL",
        })
      );
    }
    if (setup?.take_profit != null) {
      priceLineRefs.current.push(
        mainSeries.createPriceLine({
          price: setup.take_profit,
          color: "#22c55e",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "TP",
        })
      );
    }

    if (overlays.ema && overlayData.ema.length) {
      for (const ema of overlayData.ema) {
        const line = chart.addSeries(LineSeries, {
          color: EMA_COLORS[ema.period] ?? "#64748b",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        line.setData(
          ema.points.map((p) => ({ time: p.time as Time, value: p.value }))
        );
        emaSeriesRefs.current.push(line);
      }
    }

    const projection = overlayData.projection;
    if (overlays.projection && projection) {
      const { path, candles: projCandles, direction } = projection;
      const projColor =
        direction === "bullish" ? "#8b5cf6" : direction === "bearish" ? "#f97316" : "#94a3b8";

      const line = chart.addSeries(LineSeries, {
        color: projColor,
        lineWidth: 2,
        lineStyle: LineStyle.LargeDashed,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });
      line.setData(path.map((p) => ({ time: p.time as Time, value: p.value })));
      projectionLineRef.current = line;

      const ghost = chart.addSeries(CandlestickSeries, {
        upColor: `${projColor}55`,
        downColor: `${projColor}55`,
        borderUpColor: projColor,
        borderDownColor: projColor,
        wickUpColor: projColor,
        wickDownColor: projColor,
      });
      ghost.setData(
        projCandles.map((c) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      projectionCandlesRef.current = ghost;
    }
  }, [overlayData, overlays.levels, overlays.ema, overlays.projection, overlays.setup]);

  const resolvedHeight =
    height != null ? height : className?.includes("h-full") ? "100%" : 520;

  return (
    <div
      ref={containerRef}
      className={cn("w-full", className)}
      style={{ height: resolvedHeight }}
    />
  );
}
