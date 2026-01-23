
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Card } from '@/components/ui/card';
import { TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { formatDecimalTime } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';

export type ChartVariant = 'auto' | 'line' | 'bar' | 'pie' | 'gauge';

interface SmartChartProps {
    data: any[];
    typeKey: string;
    label: string;
    unit: string;
    color: string;
    variant?: ChartVariant;
}

export function SmartChart({ data, typeKey, label, unit, color, variant = 'auto' }: SmartChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const textColor = isDark ? '#fff' : '#0f172a'; // Slate-900 for Light Mode

    const normalizedKey = typeKey.toLowerCase();

    // Sort data by timestamp ascending for charts
    const chartData = useMemo(() => {
        return [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [data]);

    const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
    const isIST = unit === 'IST';
    const displayValue = isIST ? formatDecimalTime(Number(latestValue)) : Number(latestValue).toFixed(1);

    // --- Variant Logic ---
    const effectiveVariant = variant !== 'auto' ? variant : (() => {
        if (normalizedKey.includes('helmet_on')) return 'timeline';
        if (normalizedKey === 'sos' || normalizedKey === 'is_leaked') return 'alert';
        if (['spo2', 'stress', 'level_gauge', 'level'].some(k => normalizedKey.includes(k))) return 'gauge';
        return 'line';
    })();

    // --- Rendering Logic based on effectiveVariant ---

    // 1. Timeline (Boolean)
    if (effectiveVariant === 'timeline') {
        const isOn = Number(latestValue) === 1 || String(latestValue).toLowerCase() === 'true';
        const booleanData = chartData.map(d => ({
            timestamp: d.timestamp,
            value: (Number(d.value) === 1 || String(d.value).toLowerCase() === 'true') ? 1 : 0
        }));

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderColor: '#333',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    const val = params[0].value;
                    return `${format(new Date(params[0].axisValue), 'HH:mm:ss')}<br/>Status: ${val === 1 ? 'ON' : 'OFF'}`;
                }
            },
            grid: { left: '-10%', right: '-10%', top: '40%', bottom: '5%', containLabel: false },
            xAxis: {
                type: 'category',
                data: booleanData.map(d => format(new Date(d.timestamp), 'HH:mm:ss')),
                boundaryGap: false,
                axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }
            },
            yAxis: { type: 'value', min: 0, max: 1, splitLine: { show: false }, axisLabel: { show: false } },
            series: [{
                name: 'Status',
                type: 'line',
                data: booleanData.map(d => d.value),
                step: 'end',
                lineStyle: { width: 3, color: isOn ? '#10b981' : '#64748b' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: isOn ? 'rgba(16,185,129,0.5)' : 'rgba(100,116,123,0.5)' },
                        { offset: 1, color: 'rgba(0,0,0,0)' }
                    ])
                },
                showSymbol: false
            }]
        };

        return (
            <div className="relative w-full h-full overflow-hidden">
                <div className="absolute top-2 left-0 right-0 z-10 text-center pointer-events-none flex flex-col items-center justify-center">
                    <div className={`flex items-center gap-2 px-4 py-1 rounded-full ${isOn ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-slate-500/20 border border-slate-500/50'}`}>
                        <div className={`w-3 h-3 rounded-full ${isOn ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`} />
                        <span className={`text-2xl font-black ${isOn ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {isOn ? 'ON' : 'OFF'}
                        </span>
                    </div>
                </div>
                <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme={undefined} />
            </div>
        );
    }

    // 2. Alert
    if (effectiveVariant === 'alert') {
        const isActive = Number(latestValue) === 1 || String(latestValue).toLowerCase() === 'true';
        const count = data.filter(d => Number(d.value) === 1 || String(d.value).toLowerCase() === 'true').length;
        const eventData = chartData.map(d => ({
            timestamp: d.timestamp,
            value: (Number(d.value) === 1 || String(d.value).toLowerCase() === 'true') ? 1 : 0
        }));

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderColor: '#333',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    const val = params[0].value;
                    return `${format(new Date(params[0].axisValue), 'HH:mm:ss')}<br/>${val === 1 ? '⚠️ ALERT' : '✓ Normal'}`;
                }
            },
            grid: { left: '2%', right: '2%', top: '45%', bottom: '8%', containLabel: false },
            xAxis: {
                type: 'category',
                data: eventData.map(d => format(new Date(d.timestamp), 'HH:mm:ss')),
                boundaryGap: false,
                axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }
            },
            yAxis: { type: 'value', min: -0.1, max: 1.1, splitLine: { show: false }, axisLabel: { show: false } },
            series: [
                {
                    name: 'Events',
                    type: 'scatter',
                    data: eventData.map((d, idx) => d.value === 1 ? [idx, 0.5] : null).filter(Boolean),
                    symbolSize: 10,
                    itemStyle: { color: '#ef4444', shadowBlur: 8, shadowColor: 'rgba(239,68,68,0.6)' }
                },
                {
                    name: 'Timeline',
                    type: 'line',
                    data: eventData.map(d => d.value),
                    step: 'end',
                    lineStyle: { width: 2, color: isActive ? '#ef4444' : '#64748b' },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: isActive ? 'rgba(239,68,68,0.4)' : 'rgba(100,116,123,0.3)' },
                            { offset: 1, color: 'rgba(0,0,0,0)' }
                        ])
                    },
                    showSymbol: false
                }
            ]
        };

        return (
            <div className="relative w-full h-full overflow-hidden">
                <div className="absolute top-2 left-0 right-0 z-10 text-center pointer-events-none flex flex-col items-center justify-center">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${isActive ? 'bg-red-500/20 border border-red-500/50 animate-pulse' : 'bg-slate-500/20 border border-slate-500/50'}`}>
                        <TriangleAlert className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                        <span className={`text-lg font-black ${isActive ? 'text-red-400' : 'text-slate-400'}`}>
                            {isActive ? 'ALERT' : 'NORMAL'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">({count})</span>
                    </div>
                </div>
                <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme={undefined} />
            </div>
        );
    }

    // 3. Gauge
    if (effectiveVariant === 'gauge') {
        const option = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis' },
            grid: { left: '42%', right: '4%', top: '15%', bottom: '10%', containLabel: false },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: chartData.map(d => format(new Date(d.timestamp), 'HH:mm:ss')),
                axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }
            },
            yAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false }, min: 0, max: 100 },
            series: [
                {
                    type: 'gauge',
                    center: ['22%', '52%'],
                    radius: '65%',
                    min: 0,
                    max: 100,
                    startAngle: 210,
                    endAngle: -30,
                    axisLine: {
                        lineStyle: {
                            width: 10,
                            color: [[0.3, '#10b981'], [0.7, '#eab308'], [1, '#ef4444']],
                            shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)'
                        }
                    },
                    pointer: { itemStyle: { color: 'auto' }, width: 3 },
                    axisTick: { show: false },
                    splitLine: { length: 6, lineStyle: { width: 2, color: 'auto' } },
                    axisLabel: { color: '#666', distance: 12, fontSize: 7 },
                    detail: {
                        valueAnimation: true, formatter: `{value}${unit}`,
                        color: textColor, fontSize: 14, fontWeight: 'bold', offsetCenter: [0, '45%']
                    },
                    data: [{ value: Number(latestValue).toFixed(0) }]
                },
                {
                    name: label,
                    type: 'line',
                    data: chartData.map(d => d.value),
                    smooth: true, showSymbol: false,
                    lineStyle: { width: 2, color: color, shadowBlur: 10, shadowColor: color },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: color }, { offset: 1, color: 'rgba(0,0,0,0)' }
                        ]),
                        opacity: 0.3
                    }
                }
            ]
        };
        return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme={undefined} />;
    }

    // 4. Bar
    if (effectiveVariant === 'bar') {
        const option = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis' },
            grid: { left: '10%', right: '10%', top: '40%', bottom: '15%', containLabel: false },
            xAxis: {
                type: 'category',
                data: chartData.map(d => format(new Date(d.timestamp), 'HH:mm:ss')),
                axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }
            },
            yAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
            series: [{
                type: 'bar',
                data: chartData.map(d => d.value),
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: color },
                        { offset: 1, color: `${color}33` }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                }
            }]
        };
        return (
            <div className="relative w-full h-full overflow-hidden">
                <div className="absolute top-2 left-0 right-0 z-10 text-center pointer-events-none flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-foreground drop-shadow-2xl tracking-tighter" style={{ textShadow: `0 0 20px ${color}55` }}>
                            {displayValue}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">{unit}</span>
                    </div>
                </div>
                <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme={undefined} />
            </div>
        );
    }

    // 5. Pie
    if (effectiveVariant === 'pie') {
        // For pie, we show the distribution of the last 10 readings or similar
        const recentData = chartData.slice(-10);
        const pieData = recentData.map(d => ({
            name: format(new Date(d.timestamp), 'HH:mm:ss'),
            value: Number(d.value)
        }));

        const option = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'item' },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '60%'],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 10, borderColor: '#111', borderWidth: 2 },
                label: { show: false },
                emphasis: { label: { show: true, fontSize: '12', fontWeight: 'bold', color: '#fff' } },
                data: pieData,
                color: [color, `${color}CC`, `${color}99`, `${color}66`, `${color}33`]
            }]
        };
        return (
            <div className="relative w-full h-full overflow-hidden">
                <div className="absolute top-2 left-0 right-0 z-10 text-center pointer-events-none flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-foreground drop-shadow-2xl tracking-tighter" style={{ textShadow: `0 0 20px ${color}55` }}>
                            {displayValue}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">{unit}</span>
                    </div>
                </div>
                <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme={undefined} />
            </div>
        );
    }

    // Default: Line
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            formatter: isIST ? (params: any) => {
                const val = params[0].value;
                return `${params[0].name}<br/>${label}: ${formatDecimalTime(val)}`;
            } : undefined
        },
        grid: { left: '-10%', right: '-10%', top: '48%', bottom: '0', containLabel: false },
        xAxis: {
            type: 'category',
            data: chartData.map(d => format(new Date(d.timestamp), 'HH:mm:ss')),
            boundaryGap: false,
            axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }
        },
        yAxis: {
            type: 'value', splitLine: { show: false }, axisLabel: { show: false },
            min: isIST ? 0 : (value: any) => Math.floor(value.min - (value.max - value.min) * 0.2),
            max: isIST ? 24 : (value: any) => Math.ceil(value.max + (value.max - value.min) * 0.2),
        },
        series: [{
            name: label, type: 'line', data: chartData.map(d => d.value),
            smooth: true, showSymbol: false,
            lineStyle: { width: 3, color: color, shadowBlur: 15, shadowColor: color },
            areaStyle: {
                opacity: 0.3,
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: color }, { offset: 1, color: 'rgba(0,0,0,0)' }
                ])
            },
            markPoint: {
                symbol: 'circle', symbolSize: 6,
                data: [{ type: 'max', name: 'Max' }, { type: 'min', name: 'Min' }],
                label: { show: false },
                itemStyle: { color: textColor, borderColor: color, borderWidth: 2 }
            }
        }]
    };

    return (
        <div className="relative w-full h-full overflow-hidden">
            <div className="absolute top-2 left-0 right-0 z-10 text-center pointer-events-none flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground drop-shadow-2xl tracking-tighter" style={{ textShadow: `0 0 20px ${color}55` }}>
                        {displayValue}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{unit}</span>
                </div>
            </div>
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme={undefined} />
        </div>
    );
}
