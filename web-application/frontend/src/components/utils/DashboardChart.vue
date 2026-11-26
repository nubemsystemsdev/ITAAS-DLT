<template>
    <div class="dashboard-echart" :style="chartStyle">
        <div class="dashboard-echart-graphic" aria-hidden="true">
            <v-chart class="dashboard-echart-instance" :option="resolvedOption" :update-options="chartUpdateOptions" autoresize />
        </div>
        <table
            v-if="chartTable"
            :id="tableId"
            class="dashboard-echart-data"
            :aria-labelledby="labelledBy || undefined"
            :aria-label="tableAriaLabel"
        >
            <thead>
                <tr>
                    <th scope="col">{{ $t("Category") }}</th>
                    <th v-for="(column, index) in chartTable.columns" :key="'chart-col-' + index" scope="col">
                        {{ column }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, rowIndex) in chartTable.rows" :key="'chart-row-' + rowIndex">
                    <th scope="row">{{ row.category }}</th>
                    <td v-for="(value, valueIndex) in row.values" :key="'chart-cell-' + rowIndex + '-' + valueIndex">
                        {{ value }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
import "@/utils/echarts-setup";

import { defineComponent, type PropType } from "vue";
import VChart from "vue-echarts";
import type { EChartsOption } from "echarts";
import { getDashboardChartTable, type DashboardChartTable } from "@/utils/dashboard-chart-options";
import { getUniqueStringId } from "@/utils/unique-id";

export default defineComponent({
    name: "DashboardChart",
    components: {
        VChart,
    },
    props: {
        option: {
            type: Object as PropType<EChartsOption | null>,
            default: null,
        },
        chartHeight: {
            type: Number,
            default: 0,
        },
        labelledBy: {
            type: String,
            default: "",
        },
        accessibleName: {
            type: String,
            default: "",
        },
    },
    data: function () {
        return {
            tableId: "dashboard-chart-data-" + getUniqueStringId(),
        };
    },
    computed: {
        chartUpdateOptions: function () {
            return { notMerge: true };
        },
        chartStyle: function (): Record<string, string> {
            if (!this.chartHeight) {
                return {};
            }
            const height = `${this.chartHeight}px`;
            return {
                height,
                minHeight: height,
            };
        },
        resolvedOption: function (): EChartsOption {
            return (
                this.option || {
                    series: [],
                }
            );
        },
        chartTable: function (): DashboardChartTable | null {
            return getDashboardChartTable(this.resolvedOption, this.$t("Value") + "");
        },
        tableAriaLabel: function (): string | undefined {
            if (this.labelledBy) {
                return undefined;
            }
            return this.accessibleName || undefined;
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/dashboard-charts.css";
</style>
