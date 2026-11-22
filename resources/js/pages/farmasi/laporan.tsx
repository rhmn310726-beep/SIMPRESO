import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import FarmasiLayout from '@/layouts/FarmasiLayout';

interface DailyRow {
    date: string;
    date_label: string;
    is_today: boolean;
    created_count: number;
    completed_count: number;
    average_minutes: number | null;
    on_time_percent: number;
    sla_status: string;
}

interface Props {
    period: { start: string; end: string; range: string; label: string };
    filters: { start: string; end: string; range: string };
    stats: {
        total_completed: number;
        average_minutes: number | null;
        on_time_percent: number;
        on_time_count: number;
        total_units: number;
        target_minutes: number;
        average_items_per_prescription: number;
    };
    daily: DailyRow[];
}

function fmt(n: number | null | undefined, digits = 1): string {
    if (n === null || n === undefined) return '-';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(n);
}

export default function Laporan({ period, stats, daily }: Props) {
    const [range, setRange] = useState(period.range || 'month');
    const [start, setStart] = useState(period.start);
    const [end, setEnd] = useState(period.end);

    const apply = (nextRange: string, nextStart?: string, nextEnd?: string) => {
        const params: Record<string, string> = { range: nextRange };
        if (nextRange === 'custom' && nextStart && nextEnd) {
            params.start = nextStart;
            params.end = nextEnd;
        }
        router.get('/farmasi/laporan', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    const onRangeChange = (value: string) => {
        setRange(value);
        if (value !== 'custom') {
            apply(value);
        }
    };

    const exportHref = `/farmasi/laporan/export?range=${encodeURIComponent(period.range)}&start=${encodeURIComponent(period.start)}&end=${encodeURIComponent(period.end)}`;

    const totalCreated = daily.reduce((s, r) => s + r.created_count, 0);
    const overallSlaOk = stats.on_time_percent >= 95;

    return (
        <>
            <Head title="Laporan Pelayanan Farmasi" />
            <FarmasiLayout>
                <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-space-xl">
                    <div className="flex flex-col justify-between gap-space-md md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-wider text-primary">
                                <span className="material-symbols-outlined text-[16px]">analytics</span>
                                <span>Modul Pelaporan</span>
                            </div>
                            <h1 className="font-headline-lg text-headline-lg text-on-surface">Laporan Pelayanan Farmasi</h1>
                            <p className="font-body-md text-body-md text-on-surface-variant">
                                Rekapitulasi resep yang diserahkan dan waktu pelayanan (berdasarkan konfirmasi serah terima) periode {period.label}.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-space-sm">
                            <div className="flex flex-wrap items-center gap-space-sm rounded-lg bg-surface-container-lowest p-2 shadow-sm">
                                <div className="relative inline-flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-2 text-[18px] text-outline">calendar_month</span>
                                    <select value={range} onChange={(e) => onRangeChange(e.target.value)} className="cursor-pointer appearance-none bg-transparent py-1.5 pr-8 pl-8 font-label-md text-label-md text-on-surface focus:outline-none">
                                        <option value="month">Bulan Ini</option>
                                        <option value="today">Hari Ini</option>
                                        <option value="week">7 Hari Terakhir</option>
                                        <option value="custom">Kustom</option>
                                    </select>
                                    <span className="material-symbols-outlined pointer-events-none absolute right-1 text-[18px] text-outline">expand_more</span>
                                </div>
                                {range === 'custom' && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded bg-surface-container-low px-2 py-1 font-label-sm text-label-sm" />
                                        <span className="text-outline">–</span>
                                        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded bg-surface-container-low px-2 py-1 font-label-sm text-label-sm" />
                                        <button type="button" onClick={() => apply('custom', start, end)} className="rounded bg-primary-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-primary hover:bg-primary">Terapkan</button>
                                    </div>
                                )}
                            </div>
                            <a href={exportHref} className="inline-flex items-center gap-space-xs rounded-lg bg-primary px-space-md py-2 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                <span>Ekspor CSV</span>
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard icon="check_circle" iconTone="primary" label="Total Resep Selesai" value={fmt(stats.total_completed, 0)} foot={<span className="font-body-sm text-body-sm text-on-surface-variant">Resep diserahkan pada periode ini</span>} />
                        <KpiCard icon="timer" iconTone="primary" label="Rata-rata Waktu Pelayanan" value={stats.average_minutes === null ? '-' : fmt(stats.average_minutes, 1)} suffix="Menit" foot={<span className="font-body-sm text-body-sm text-secondary">Target ≤ {stats.target_minutes} menit (dibuat → serah terima)</span>} />
                        <KpiCard icon="verified" iconTone="secondary" label="Tepat Waktu" value={`${fmt(stats.on_time_percent, 1)}%`} foot={<span className="font-body-sm text-body-sm text-secondary">{fmt(stats.on_time_count, 0)} resep sesuai target waktu</span>} />
                        <KpiCard icon="pill" iconTone="primary" label="Total Obat Terlayani" value={fmt(stats.total_units, 0)} foot={<span className="font-body-sm text-body-sm text-on-surface-variant">Rata-rata {fmt(stats.average_items_per_prescription, 2)} unit / resep</span>} />
                    </div>

                    <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                        <div className="flex flex-col justify-between gap-space-sm bg-surface-container-low p-space-lg sm:flex-row sm:items-center">
                            <div className="flex flex-col">
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">Rekapitulasi Pelayanan Harian</h2>
                                <span className="font-body-sm text-body-sm text-on-surface-variant">Per hari berdasarkan waktu serah terima (diserahkan). "Lembar Resep" = resep dibuat pada hari tersebut.</span>
                            </div>
                            <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant">Unit: Instalasi Farmasi</span>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant">
                                        <th className="px-space-lg py-3 font-semibold uppercase tracking-wider">Tanggal / Hari</th>
                                        <th className="px-space-md py-3 text-right font-semibold uppercase tracking-wider">Lembar Resep</th>
                                        <th className="px-space-md py-3 text-right font-semibold uppercase tracking-wider">Resep Selesai</th>
                                        <th className="px-space-md py-3 text-right font-semibold uppercase tracking-wider">Waktu Rata-rata</th>
                                        <th className="px-space-md py-3 text-right font-semibold uppercase tracking-wider">Kepatuhan</th>
                                        <th className="px-space-lg py-3 text-center font-semibold uppercase tracking-wider">Status SLA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-container font-body-md text-body-md text-on-surface">
                                    {daily.length === 0 ? (
                                        <tr><td colSpan={6} className="px-space-lg py-12 text-center font-body-md text-body-md text-on-surface-variant">Tidak ada data pada periode ini.</td></tr>
                                    ) : daily.map((row) => (
                                        <tr key={row.date} className="transition-colors hover:bg-surface-container-low">
                                            <td className="flex items-center gap-2 px-space-lg py-3.5 font-medium text-on-surface">
                                                <span className={`h-2 w-2 rounded-full ${row.completed_count > 0 ? 'bg-secondary' : 'bg-outline-variant'}`} />
                                                <span>{row.date_label}{row.is_today ? ' (Hari Ini)' : ''}</span>
                                            </td>
                                            <td className="px-space-md py-3.5 text-right text-on-surface">{row.created_count}</td>
                                            <td className="px-space-md py-3.5 text-right font-medium text-on-surface">{row.completed_count}</td>
                                            <td className="px-space-md py-3.5 text-right font-code-sm text-code-sm text-on-surface">{row.average_minutes === null ? '-' : `${fmt(row.average_minutes, 1)} mnt`}</td>
                                            <td className={`px-space-md py-3.5 text-right font-code-sm text-code-sm font-semibold ${row.completed_count === 0 ? 'text-on-surface-variant' : row.on_time_percent >= 95 ? 'text-secondary' : 'text-[#b45309]'}`}>{row.completed_count === 0 ? '-' : `${fmt(row.on_time_percent, 1)}%`}</td>
                                            <td className="px-space-lg py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold ${row.completed_count === 0 ? 'bg-surface-container text-on-surface-variant' : row.sla_status === 'Memenuhi Target' ? 'bg-secondary-container/40 text-on-secondary-container' : 'bg-[#fffbeb] text-[#b45309]'}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{row.completed_count === 0 ? 'remove' : row.sla_status === 'Memenuhi Target' ? 'done_all' : 'schedule'}</span>
                                                    <span>{row.sla_status}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-surface-container-low font-label-md text-label-md font-semibold text-on-surface">
                                    <tr>
                                        <td className="px-space-lg py-3">Total / Ringkasan Periode</td>
                                        <td className="px-space-md py-3 text-right font-code-sm text-code-sm">{fmt(totalCreated, 0)}</td>
                                        <td className="px-space-md py-3 text-right font-code-sm text-code-sm">{fmt(stats.total_completed, 0)}</td>
                                        <td className="px-space-md py-3 text-right font-code-sm text-code-sm text-secondary">{stats.average_minutes === null ? '-' : `${fmt(stats.average_minutes, 1)} mnt`}</td>
                                        <td className="px-space-md py-3 text-right font-code-sm text-code-sm text-secondary">{fmt(stats.on_time_percent, 1)}%</td>
                                        <td className="px-space-lg py-3 text-center font-label-sm text-label-sm text-on-surface-variant">{overallSlaOk ? 'Memenuhi Target' : 'Perlu Perhatian'}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-space-sm bg-surface-container-lowest p-space-md sm:flex-row">
                            <div className="flex items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px] text-outline">info</span>
                                <span>Waktu pelayanan dihitung dari resep dibuat hingga konfirmasi serah terima. Target SLA: ≤ {stats.target_minutes} menit.</span>
                            </div>
                            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high">
                                <span className="material-symbols-outlined text-[16px]">print</span>
                                <span>Cetak Rekap</span>
                            </button>
                        </div>
                    </div>
                </div>
            </FarmasiLayout>
        </>
    );
}

function KpiCard({ icon, iconTone, label, value, suffix, foot }: { icon: string; iconTone: 'primary' | 'secondary'; label: string; value: string; suffix?: string; foot: React.ReactNode }) {
    return (
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-medium text-on-surface-variant">{label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container ${iconTone === 'secondary' ? 'text-secondary' : 'text-primary'}`}>
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
            </div>
            <div className="mt-space-md">
                <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-display-lg leading-tight text-on-surface">{value}</span>
                    {suffix && <span className="font-label-md text-label-md text-on-surface-variant">{suffix}</span>}
                </div>
                <div className="mt-1">{foot}</div>
            </div>
        </div>
    );
}
