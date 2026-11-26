import type { EChartsOption } from "echarts";

export type DashboardChartPalette = {
    primary: string;
    success: string;
    error: string;
    warning: string;
    muted: string;
    neutral: string;
    secondary: string;
    lineStroke: string;
    axisText: string;
    gridLine: string;
};

function readThemeScopeElement(): Element {
    if (typeof document === "undefined") {
        return {} as Element;
    }
    return document.querySelector(".main-layout.dark-theme, .main-layout.light-theme") || document.documentElement;
}

function readCssVar(name: string, fallback = ""): string {
    if (typeof document === "undefined") {
        return fallback;
    }
    const value = getComputedStyle(readThemeScopeElement()).getPropertyValue(name).trim();
    return value || fallback;
}

export function readDashboardChartPalette(): DashboardChartPalette {
    return {
        primary: readCssVar("--chart-income-bar-fill", readCssVar("--color-brand-primary", "#1c2659")),
        success: readCssVar("--color-feedback-success", "#10b981"),
        error: readCssVar("--color-feedback-error", "#ef4444"),
        warning: readCssVar("--color-feedback-warning", "#f59e0b"),
        muted: readCssVar("--color-text-muted", "#6b7280"),
        neutral: readCssVar("--color-neutral-light", "#e5e5e5"),
        secondary: readCssVar("--color-brand-secondary", "#5a7bae"),
        lineStroke: readCssVar("--chart-blockchain-line-stroke", readCssVar("--color-brand-secondary", "#5a7bae")),
        axisText: readCssVar("--chart-axis-label", readCssVar("--color-text-muted", "#6b7280")),
        gridLine: readCssVar("--chart-grid-line", readCssVar("--color-neutral-light", "#e5e5e5")),
    };
}

function axisLabelStyle(palette: DashboardChartPalette) {
    return {
        color: palette.axisText,
        fontFamily: "Comfortaa, sans-serif",
        fontSize: 11,
    };
}

function categoryAxisDefaults(palette: DashboardChartPalette) {
    return {
        axisLine: { lineStyle: { color: palette.gridLine } },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(palette),
    };
}

function valueAxisDefaults(palette: DashboardChartPalette) {
    return {
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: palette.gridLine } },
        axisLabel: axisLabelStyle(palette),
    };
}

function baseTextStyle(palette: DashboardChartPalette) {
    return axisLabelStyle(palette);
}

function baseGrid() {
    return {
        left: 4,
        right: 12,
        top: 36,
        bottom: 4,
        containLabel: true,
    };
}

export function getSubscriptionStatusColor(status: string, palette: DashboardChartPalette): string {
    if (status === "Active") {
        return palette.success;
    }
    if (status === "Cancelled") {
        return palette.error;
    }
    if (status === "Pending" || status === "Pending Payment") {
        return palette.warning;
    }
    if (status === "Suspended" || status === "Past Due") {
        return palette.warning;
    }
    return palette.primary;
}

export function buildRevenueMonthlyChartOption(
    points: Array<{ month: string; revenueCents: number }>,
    formatMonthLabel: (month: string) => string,
    formatMoneyShort: (cents: number) => string,
    revenueLabel: string,
    palette: DashboardChartPalette,
): EChartsOption {
    return {
        color: [palette.primary],
        textStyle: baseTextStyle(palette),
        grid: baseGrid(),
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            valueFormatter: function (value) {
                return formatMoneyShort(Number(value || 0));
            },
        },
        xAxis: {
            type: "category",
            data: points.map((point) => formatMonthLabel(point.month)),
            ...categoryAxisDefaults(palette),
        },
        yAxis: {
            type: "value",
            ...valueAxisDefaults(palette),
            axisLabel: {
                ...axisLabelStyle(palette),
                formatter: function (value: number) {
                    return formatMoneyShort(value);
                },
            },
        },
        series: [
            {
                type: "bar",
                name: revenueLabel,
                barMaxWidth: 28,
                itemStyle: { borderRadius: [4, 4, 0, 0] },
                data: points.map((point) => point.revenueCents),
            },
        ],
    };
}

export function buildSubscriptionTrendChartOption(
    points: Array<{ month: string; created: number; cancelled: number }>,
    formatMonthLabel: (month: string) => string,
    labels: { created: string; cancelled: string },
    palette: DashboardChartPalette,
): EChartsOption {
    return {
        color: [palette.success, palette.error],
        textStyle: baseTextStyle(palette),
        grid: baseGrid(),
        legend: {
            top: 0,
            right: 0,
            itemWidth: 10,
            itemHeight: 10,
            textStyle: baseTextStyle(palette),
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
        },
        xAxis: {
            type: "category",
            data: points.map((point) => formatMonthLabel(point.month)),
            ...categoryAxisDefaults(palette),
        },
        yAxis: {
            type: "value",
            minInterval: 1,
            ...valueAxisDefaults(palette),
        },
        series: [
            {
                type: "bar",
                name: labels.created,
                barMaxWidth: 16,
                itemStyle: { borderRadius: [4, 4, 0, 0] },
                data: points.map((point) => point.created),
            },
            {
                type: "bar",
                name: labels.cancelled,
                barMaxWidth: 16,
                itemStyle: { borderRadius: [4, 4, 0, 0] },
                data: points.map((point) => point.cancelled),
            },
        ],
    };
}

const SUBSCRIPTION_STATUS_ROW_HEIGHT = 36;
const SUBSCRIPTION_STATUS_CHART_PADDING = 28;

export function getSubscriptionStatusChartHeight(entryCount: number): number {
    if (entryCount <= 0) {
        return 120;
    }
    return entryCount * SUBSCRIPTION_STATUS_ROW_HEIGHT + SUBSCRIPTION_STATUS_CHART_PADDING;
}

export function buildSubscriptionStatusChartOption(
    entries: Array<{ status: string; count: number; label: string }>,
    palette: DashboardChartPalette,
    seriesName = "",
): EChartsOption {
    return {
        textStyle: baseTextStyle(palette),
        grid: {
            left: 4,
            right: 16,
            top: 4,
            bottom: 0,
            containLabel: true,
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
        },
        xAxis: {
            type: "value",
            minInterval: 1,
            ...valueAxisDefaults(palette),
        },
        yAxis: {
            type: "category",
            inverse: true,
            boundaryGap: false,
            data: entries.map((entry) => entry.label),
            ...categoryAxisDefaults(palette),
        },
        series: [
            {
                type: "bar",
                name: seriesName || undefined,
                barWidth: 20,
                barCategoryGap: "20%",
                itemStyle: { borderRadius: [0, 4, 4, 0] },
                label: {
                    show: true,
                    position: "right",
                    color: palette.axisText,
                    fontFamily: "Comfortaa, sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                },
                data: entries.map((entry) => ({
                    value: entry.count,
                    itemStyle: {
                        color: getSubscriptionStatusColor(entry.status, palette),
                    },
                })),
            },
        ],
    };
}

export function sliceBlockchainEventsDaily(
    points: Array<{ day: string; eventCount: number }>,
    periodDays: number,
): Array<{ day: string; eventCount: number }> {
    if (!points.length || periodDays <= 0) {
        return [];
    }
    return points.slice(-periodDays);
}

export function buildBlockchainEventsChartOption(
    points: Array<{ day: string; eventCount: number }>,
    formatDayLabel: (day: string) => string,
    palette: DashboardChartPalette,
    seriesName = "",
): EChartsOption {
    const lineColor = palette.lineStroke;
    return {
        color: [lineColor],
        textStyle: baseTextStyle(palette),
        grid: {
            left: 4,
            right: 12,
            top: 12,
            bottom: 4,
            containLabel: true,
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "line" },
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: points.map((point) => formatDayLabel(point.day)),
            ...categoryAxisDefaults(palette),
            axisLabel: {
                ...axisLabelStyle(palette),
                interval: Math.max(0, Math.floor(points.length / 6) - 1),
            },
        },
        yAxis: {
            type: "value",
            minInterval: 1,
            ...valueAxisDefaults(palette),
        },
        series: [
            {
                type: "line",
                name: seriesName || undefined,
                smooth: true,
                symbol: "circle",
                symbolSize: 6,
                lineStyle: { width: 2, color: lineColor },
                itemStyle: { color: lineColor },
                areaStyle: { color: lineColor, opacity: 0.18 },
                data: points.map((point) => point.eventCount),
            },
        ],
    };
}

export type DashboardChartTableRow = {
    category: string;
    values: string[];
};

export type DashboardChartTable = {
    columns: string[];
    rows: DashboardChartTableRow[];
};

type ChartAxisLike = {
    type?: string;
    data?: unknown[];
    axisLabel?: {
        formatter?: string | ((value: string | number, index?: number) => string);
    };
};

type ChartSeriesLike = {
    name?: string;
    data?: unknown[];
};

type ChartTooltipLike = {
    valueFormatter?: (value: unknown) => string;
};

function asList<T>(value: T | T[] | undefined | null): T[] {
    if (value == null) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

function firstAxis(axis: EChartsOption["xAxis"] | EChartsOption["yAxis"]): ChartAxisLike | undefined {
    const item = asList(axis as ChartAxisLike | ChartAxisLike[] | undefined)[0];
    if (!item || typeof item !== "object") {
        return undefined;
    }
    return item;
}

function axisCategories(axis: ChartAxisLike | undefined): string[] {
    if (!Array.isArray(axis?.data)) {
        return [];
    }
    return axis.data.map((item) => String(item ?? ""));
}

function seriesPointValue(item: unknown): number | string | null {
    if (item == null) {
        return null;
    }
    if (typeof item === "number" || typeof item === "string") {
        return item;
    }
    if (Array.isArray(item)) {
        const nested = item.length > 1 ? item[item.length - 1] : item[0];
        return seriesPointValue(nested);
    }
    if (typeof item === "object" && "value" in item) {
        return seriesPointValue((item as { value: unknown }).value);
    }
    return null;
}

function formatSeriesValue(item: unknown, formatter?: (value: number) => string): string {
    const raw = seriesPointValue(item);
    if (raw == null) {
        return "";
    }
    if (formatter && typeof raw === "number") {
        return formatter(raw);
    }
    return String(raw);
}

function valueFormatterFromAxis(
    axis: ChartAxisLike | undefined,
    tooltip: EChartsOption["tooltip"],
): ((value: number) => string) | undefined {
    const axisFormatter = axis?.axisLabel?.formatter;
    if (typeof axisFormatter === "function") {
        return function (value: number): string {
            return String(axisFormatter(value, 0));
        };
    }
    const tooltipOption = asList(tooltip as ChartTooltipLike | ChartTooltipLike[] | undefined)[0];
    if (typeof tooltipOption?.valueFormatter === "function") {
        return function (value: number): string {
            return String(tooltipOption.valueFormatter(value));
        };
    }
    return undefined;
}

export function getDashboardChartTable(option: EChartsOption | null | undefined, unnamedSeriesLabel: string): DashboardChartTable | null {
    if (!option) {
        return null;
    }

    const seriesList = asList(option.series as ChartSeriesLike | ChartSeriesLike[] | undefined).filter(function (series) {
        return Boolean(series && typeof series === "object");
    });
    if (!seriesList.length) {
        return null;
    }

    const xAxis = firstAxis(option.xAxis);
    const yAxis = firstAxis(option.yAxis);
    const categoryAxis = yAxis?.type === "category" ? yAxis : xAxis;
    const valueAxis = yAxis?.type === "category" ? xAxis : yAxis;
    const formatter = valueFormatterFromAxis(valueAxis, option.tooltip);

    const dataLengths = seriesList.map(function (series) {
        return Array.isArray(series.data) ? series.data.length : 0;
    });
    const maxLength = Math.max(0, ...dataLengths);
    const labeledCategories = axisCategories(categoryAxis);
    const categories = labeledCategories.length
        ? labeledCategories
        : Array.from({ length: maxLength }, function (_unused, index) {
              return String(index + 1);
          });

    if (!categories.length) {
        return null;
    }

    const columns = seriesList.map(function (series, index) {
        const name = typeof series.name === "string" ? series.name.trim() : "";
        return name || unnamedSeriesLabel + (seriesList.length > 1 ? " " + (index + 1) : "");
    });

    return {
        columns: columns,
        rows: categories.map(function (category, index) {
            return {
                category: category,
                values: seriesList.map(function (series) {
                    const data = Array.isArray(series.data) ? series.data : [];
                    return formatSeriesValue(data[index], formatter);
                }),
            };
        }),
    };
}
