import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';

interface ReportPeriod {
    start: string;
    end: string;
    label: string;
}

interface ReportFilters {
    start: string;
    end: string;
    category: string;
}

interface ReportStats {
    total_served: number;
    previous_served: number;
    served_growth: number | null;
    average_daily: number;
    average_dispensing_minutes: number | null;
    dispensing_delta_minutes: number | null;
    risk_prescriptions: number;
    risk_follow_up_percent: number;
    formulary_spend: number;
    expenditure_movements: number;
}

interface TopMedicine {
    id: number;
    name: string;
    active_ingredient: string;
    category: string;
    unit: string;
    strength: string | null;
    frequency: number;
    units: number;
    value: number;
    status: string;
    status_label: string;
}

interface ReportProps {
    period: ReportPeriod;
    filters: ReportFilters;
    stats: ReportStats;
    topMedicines: TopMedicine[];
    topMedicinesTotal: number;
    categories: string[];
}

type StatTone = 'brand' | 'teal' | 'violet' | 'sky';
type FooterTone = 'positive' | 'negative' | 'neutral';

const numberFormatter = new Intl.NumberFormat('id-ID');
const decimalFormatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 1,
});
const compactFormatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});
const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export default function Laporan({
    period,
    filters,
    stats,
    topMedicines,
    topMedicinesTotal,
    categories,
}: ReportProps) {
    const [rangeOpen, setRangeOpen] = useState(false);
    const [draftStart, setDraftStart] = useState(period.start);
    const [draftEnd, setDraftEnd] = useState(period.end);
    const [rangeError, setRangeError] = useState<string | null>(null);
    const rangeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDraftStart(period.start);
        setDraftEnd(period.end);
    }, [period.start, period.end]);

    useEffect(() => {
        if (!rangeOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (rangeRef.current && !rangeRef.current.contains(event.target as Node)) {
                setRangeOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setRangeOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [rangeOpen]);

    const applyRange = (startValue = draftStart, endValue = draftEnd) => {
        if (!startValue || !endValue) {
            setRangeError('Lengkapi tanggal mulai dan tanggal akhir.');
            return;
        }

        if (startValue > endValue) {
            setRangeError('Tanggal akhir tidak boleh sebelum tanggal mulai.');
            return;
        }

        setRangeError(null);
        setRangeOpen(false);

        router.get(
            reportUrl({ start: startValue, end: endValue, category: filters.category }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const applyCurrentMonth = () => {
        const range = currentMonthRange();
        setDraftStart(range.start);
        setDraftEnd(range.end);
        applyRange(range.start, range.end);
    };

    const changeCategory = (category: string) => {
        router.get(
            reportUrl({ start: period.start, end: period.end, category }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const exportHref = `/admin/laporan/export?${queryString({
        start: period.start,
        end: period.end,
        category: filters.category,
    })}`;

    const growthText =
        stats.served_growth === null
            ? 'Belum ada pembanding'
            : `${stats.served_growth >= 0 ? '+' : ''}${decimalFormatter.format(stats.served_growth)}% vs periode lalu`;

    const dispensingText =
        stats.average_dispensing_minutes === null
            ? '—'
            : decimalFormatter.format(stats.average_dispensing_minutes);

    const dispensingFooter =
        stats.dispensing_delta_minutes === null
            ? 'Belum ada pembanding'
            : stats.dispensing_delta_minutes <= 0
              ? `${decimalFormatter.format(Math.abs(stats.dispensing_delta_minutes))} menit lebih cepat`
              : `${decimalFormatter.format(stats.dispensing_delta_minutes)} menit lebih lambat`;

    const dispensingFooterTone: FooterTone =
        stats.dispensing_delta_minutes === null
            ? 'neutral'
            : stats.dispensing_delta_minutes <= 0
              ? 'positive'
              : 'negative';

    const followUpText =
        stats.risk_prescriptions === 0
            ? 'Tidak ada risiko tercatat'
            : `${decimalFormatter.format(stats.risk_follow_up_percent)}% ditindaklanjuti`;

    return (
        <>
            <Head title="Laporan Farmasi & E-Prescribing" />

            <AdminLayout>
                <div className="flex w-full flex-col gap-6">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                        <div className="flex min-w-0 flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">
                                    Modul Analitika Farmasi
                                </span>
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    Periode: {period.label}
                                </span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">
                                    Laporan Farmasi &amp; E-Prescribing
                                </h1>
                                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
                                    Analisis rekapitulasi resep elektronik, penggunaan obat
                                    formularium, efisiensi waktu dispensing, dan audit trail
                                    peresepan rumah sakit.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative" ref={rangeRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRangeError(null);
                                        setRangeOpen((open) => !open);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                                >
                                    <CalendarIcon className="h-5 w-5 text-brand-600" />
                                    <span>
                                        {formatShortDate(period.start)} -{' '}
                                        {formatShortDate(period.end)}
                                    </span>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                </button>

                                {rangeOpen && (
                                    <div className="absolute right-0 z-30 mt-2 w-[310px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                                        <p className="text-sm font-bold text-slate-900">
                                            Rentang Tanggal
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Pilih periode data laporan yang ingin dianalisis.
                                        </p>

                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <label className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    Mulai
                                                </span>
                                                <input
                                                    type="date"
                                                    value={draftStart}
                                                    max={draftEnd || undefined}
                                                    onChange={(event) => {
                                                        setDraftStart(event.target.value);
                                                        setRangeError(null);
                                                    }}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
                                                />
                                            </label>
                                            <label className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    Akhir
                                                </span>
                                                <input
                                                    type="date"
                                                    value={draftEnd}
                                                    min={draftStart || undefined}
                                                    onChange={(event) => {
                                                        setDraftEnd(event.target.value);
                                                        setRangeError(null);
                                                    }}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
                                                />
                                            </label>
                                        </div>

                                        {rangeError && (
                                            <p className="mt-2 text-[11px] font-semibold text-red-600">
                                                {rangeError}
                                            </p>
                                        )}

                                        <div className="mt-4 flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={applyCurrentMonth}
                                                className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
                                            >
                                                Bulan ini
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyRange()}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-600"
                                            >
                                                Terapkan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <a
                                href={exportHref}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
                            >
                                <DownloadIcon className="h-5 w-5" />
                                Ekspor CSV
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <ReportStat
                            label="Total Resep Dilayani"
                            value={numberFormatter.format(stats.total_served)}
                            suffix="Resep"
                            tone="brand"
                            accentClass="bg-brand-100/50"
                            icon={<ReceiptIcon className="h-5 w-5" />}
                            footerTone={
                                stats.served_growth === null
                                    ? 'neutral'
                                    : stats.served_growth >= 0
                                      ? 'positive'
                                      : 'negative'
                            }
                            footerIcon={<TrendUpIcon className="h-4 w-4" />}
                            footerLeft={growthText}
                            footerRight={`Rerata ${decimalFormatter.format(stats.average_daily)} resep/hari`}
                        />

                        <ReportStat
                            label="Rata-rata Telaah & Dispensing"
                            value={dispensingText}
                            suffix="Menit"
                            tone="teal"
                            accentClass="bg-emerald-100/60"
                            icon={<TimerIcon className="h-5 w-5" />}
                            footerTone={dispensingFooterTone}
                            footerIcon={<BoltIcon className="h-4 w-4" />}
                            footerLeft={dispensingFooter}
                            footerRight="Target SLA < 15 menit"
                        />

                        <ReportStat
                            label="Intervensi Klinis Tercegah"
                            value={numberFormatter.format(stats.risk_prescriptions)}
                            suffix="Kasus"
                            tone="violet"
                            accentClass="bg-violet-100/60"
                            icon={<ShieldIcon className="h-5 w-5" />}
                            footerTone="positive"
                            footerIcon={<CheckCircleIcon className="h-4 w-4" />}
                            footerLeft={followUpText}
                            footerRight="Alergi & interaksi obat"
                        />

                        <ReportStat
                            label="Pengeluaran Formularium"
                            value={formatCompactCurrency(stats.formulary_spend)}
                            tone="sky"
                            accentClass="bg-sky-100/60"
                            icon={<PaymentsIcon className="h-5 w-5" />}
                            footerTone="positive"
                            footerIcon={<VerifiedIcon className="h-4 w-4" />}
                            footerLeft={`${numberFormatter.format(stats.expenditure_movements)} transaksi keluar`}
                            footerRight="Estimasi harga batch"
                        />
                    </div>

                    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft-card">
                        <div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                    Top 5 Obat Paling Sering Diresepkan (Fast-Moving)
                                </h2>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                    Monitoring perputaran stok, kuantitas dispensing, dan evaluasi
                                    pengeluaran formularium
                                </p>
                            </div>

                            <div className="relative inline-flex items-center">
                                <FilterIcon className="pointer-events-none absolute left-3 h-4 w-4 text-brand-600" />
                                <select
                                    value={filters.category}
                                    onChange={(event) => changeCategory(event.target.value)}
                                    aria-label="Filter golongan farmasi"
                                    className="appearance-none rounded-xl bg-slate-100 py-2.5 pr-9 pl-9 text-xs font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-200/70 focus:ring-2 focus:ring-brand-100"
                                >
                                    <option value="">Filter Golongan</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
                            </div>
                        </div>

                        {topMedicines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 border-t border-slate-100 px-6 py-16 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <ChartIcon className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">
                                    Belum ada data resep pada periode ini
                                </p>
                                <p className="max-w-md text-xs leading-relaxed text-slate-500">
                                    Data obat fast-moving akan muncul setelah resep elektronik dibuat
                                    pada rentang tanggal yang dipilih.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] text-left">
                                    <thead className="bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-5 py-3 sm:px-6">Peringkat &amp; Nama Obat</th>
                                            <th className="px-4 py-3">Golongan Farmasi</th>
                                            <th className="px-4 py-3 text-right">Frekuensi Resep</th>
                                            <th className="px-4 py-3 text-right">Unit Dispensing</th>
                                            <th className="px-4 py-3 text-right">Nilai Transaksi</th>
                                            <th className="px-5 py-3 text-center sm:px-6">
                                                Status Formularium
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topMedicines.map((medicine, index) => (
                                            <tr
                                                key={medicine.id}
                                                className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                                            >
                                                <td className="px-5 py-3.5 sm:px-6">
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                                                index === 0
                                                                    ? 'bg-brand-100 text-brand-700'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {index + 1}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                                {medicine.name}
                                                            </p>
                                                            <p className="truncate text-xs text-slate-500">
                                                                {medicine.active_ingredient} •{' '}
                                                                {medicine.unit}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                        {medicine.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-sm font-medium text-slate-700">
                                                    {numberFormatter.format(medicine.frequency)} kali
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-sm font-medium text-slate-500">
                                                    {numberFormatter.format(medicine.units)}{' '}
                                                    {medicine.unit}
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">
                                                    {currencyFormatter.format(medicine.value)}
                                                </td>
                                                <td className="px-5 py-3.5 text-center sm:px-6">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                            medicine.status === 'aktif'
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                    >
                                                        <CheckCircleIcon className="h-3.5 w-3.5" />
                                                        {medicine.status_label}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <span className="text-xs text-slate-500">
                                {topMedicinesTotal === 0
                                    ? 'Tidak ada obat fast-moving pada filter ini'
                                    : `Menampilkan ${topMedicines.length} dari ${numberFormatter.format(topMedicinesTotal)} obat fast moving teratas`}
                            </span>
                            <Link
                                href="/admin/obat"
                                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition-colors hover:text-brand-800"
                            >
                                Lihat Seluruh Formularium
                                <ChevronRightIcon className="h-4 w-4" />
                            </Link>
                        </div>
                    </section>
                </div>
            </AdminLayout>
        </>
    );
}

interface ReportStatProps {
    label: string;
    value: string;
    suffix?: string;
    tone: StatTone;
    accentClass: string;
    icon: ReactNode;
    footerTone: FooterTone;
    footerIcon: ReactNode;
    footerLeft: string;
    footerRight: string;
}

const iconToneStyles: Record<StatTone, string> = {
    brand: 'bg-brand-50 text-brand-600',
    teal: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600',
};

const footerToneStyles: Record<FooterTone, string> = {
    positive: 'text-emerald-600',
    negative: 'text-red-600',
    neutral: 'text-slate-500',
};

function ReportStat({
    label,
    value,
    suffix,
    tone,
    accentClass,
    icon,
    footerTone,
    footerIcon,
    footerLeft,
    footerRight,
}: ReportStatProps) {
    return (
        <section className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft-card transition-shadow hover:shadow-md">
            <div
                className={`pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full transition-transform duration-500 group-hover:scale-110 ${accentClass}`}
            />
            <div className="relative z-10 flex items-start justify-between gap-3 p-5">
                <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-slate-600">{label}</span>
                    <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                        <span className="text-[32px] leading-10 font-bold tracking-tight text-slate-900">
                            {value}
                        </span>
                        {suffix && (
                            <span className="text-xs font-medium text-slate-500">{suffix}</span>
                        )}
                    </div>
                </div>
                <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconToneStyles[tone]}`}
                >
                    {icon}
                </div>
            </div>

            <div className="relative z-10 -mb-0 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 px-5 py-3">
                <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${footerToneStyles[footerTone]}`}
                >
                    {footerIcon}
                    {footerLeft}
                </span>
                <span className="text-[11px] text-slate-500">{footerRight}</span>
            </div>
        </section>
    );
}

function formatCompactCurrency(value: number): string {
    if (value >= 1_000_000_000) {
        return `Rp ${compactFormatter.format(value / 1_000_000_000)} M`;
    }

    if (value >= 1_000_000) {
        return `Rp ${compactFormatter.format(value / 1_000_000)} Jt`;
    }

    if (value >= 1_000) {
        return `Rp ${compactFormatter.format(value / 1_000)} rb`;
    }

    return currencyFormatter.format(value);
}

function formatShortDate(value: string): string {
    const [year, month, day] = value.split('-');

    if (!year || !month || !day) {
        return value;
    }

    return `${day}/${month}/${year}`;
}

function queryString(params: { start: string; end: string; category?: string }): string {
    const query = new URLSearchParams({ start: params.start, end: params.end });

    if (params.category) {
        query.set('category', params.category);
    }

    return query.toString();
}

function reportUrl(params: { start: string; end: string; category?: string }): string {
    return `/admin/laporan?${queryString(params)}`;
}

function currentMonthRange(): { start: string; end: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return { start: toInputDate(start), end: toInputDate(end) };
}

function toInputDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4m8-4v4M3 10h18" strokeLinecap="round" />
        </svg>
    );
}

function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ChevronRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ReceiptIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function TimerIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l3 2M9 2h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ShieldIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PaymentsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <path d="M3 10h18M7 15h3M3 6V4h18v2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function TrendUpIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function BoltIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function VerifiedIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-1 2.8-2.9-.2L12 21l-2.4-1.7-2.9.2-1-2.8-2.4-1.7.9-2.8-.9-2.8 2.4-1.7 1-2.8 2.9.2L12 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FilterIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ChartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
