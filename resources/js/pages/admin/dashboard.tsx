import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import type { SharedProps } from '@/types';

interface DashboardStats {
    active_medicines: number;
    inactive_medicines: number;
    critical_stock: number;
    out_of_stock: number;
    total_patients: number;
    patients_today: number;
    total_users: number;
    online_users: number;
}

interface LowStockItem {
    id: number;
    name: string;
    subtitle: string;
    stock: number;
    minimum_stock: number;
    is_out: boolean;
}

interface Activity {
    id: string;
    type: 'handover' | 'in' | 'out' | 'user';
    title: string;
    description: string;
    time: string;
}

interface DashboardProps {
    today: string;
    stats: DashboardStats;
    low_stock: LowStockItem[];
    activities: Activity[];
}

const numberFormatter = new Intl.NumberFormat('id-ID');

export default function Dashboard({ today, stats, low_stock, activities }: DashboardProps) {
    const { auth } = usePage<SharedProps>().props;

    const refresh = () => {
        router.reload({
            only: ['today', 'stats', 'low_stock', 'activities'],
        });
    };

    return (
        <>
            <Head title="Dashboard Admin" />

            <AdminLayout>
                <div className="flex w-full flex-col gap-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-slate-500">
                                Selamat datang kembali, {auth.user?.name ?? 'Admin'}
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">
                                    Ringkasan Sistem &amp; Farmasi
                                </h1>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Ringkasan Hari Ini
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{today}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Total Obat"
                            value={stats.active_medicines}
                            suffix="SKU aktif"
                            chip={
                                stats.inactive_medicines > 0
                                    ? `${numberFormatter.format(stats.inactive_medicines)} nonaktif`
                                    : 'Semua aktif'
                            }
                            tone="brand"
                            accentClass="bg-brand-100/50"
                            icon={<PillIcon className="h-5 w-5" />}
                        />
                        <StatCard
                            label="Stok Kritis"
                            value={stats.critical_stock}
                            suffix="perlu restock"
                            chip={
                                stats.critical_stock > 0
                                    ? stats.out_of_stock > 0
                                        ? `${numberFormatter.format(stats.out_of_stock)} habis`
                                        : 'Perlu restock'
                                    : 'Aman'
                            }
                            tone={stats.critical_stock > 0 ? 'danger' : 'teal'}
                            accentClass="bg-red-100/60"
                            icon={<WarningIcon className="h-5 w-5" />}
                        />
                        <StatCard
                            label="Total Pasien"
                            value={stats.total_patients}
                            suffix="terdaftar"
                            chip={
                                stats.patients_today > 0
                                    ? `+${numberFormatter.format(stats.patients_today)} hari ini`
                                    : 'Tidak ada baru'
                            }
                            tone="teal"
                            accentClass="bg-emerald-100/50"
                            icon={<PatientIcon className="h-5 w-5" />}
                        />
                        <StatCard
                            label="Total Pengguna"
                            value={stats.total_users}
                            suffix="staf medis"
                            chip={`${numberFormatter.format(stats.online_users)} Online`}
                            tone="brand"
                            accentClass="bg-brand-100/50"
                            icon={<UsersIcon className="h-5 w-5" />}
                        />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
                        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft-card sm:p-6 lg:col-span-7">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-2.5 rounded-full bg-red-500" />
                                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                        Peringatan Stok Minimum
                                    </h2>
                                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
                                        {numberFormatter.format(stats.critical_stock)} item
                                    </span>
                                </div>
                                <span className="hidden text-[11px] font-medium text-slate-400 sm:inline-block">
                                    Ambang batas otomatis
                                </span>
                            </div>

                            {low_stock.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-emerald-50/60 px-4 py-10 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                        <CheckCircleIcon className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-semibold text-emerald-800">
                                        Semua stok di atas batas minimum
                                    </p>
                                    <p className="text-xs text-emerald-700/80">
                                        Tidak ada obat yang perlu segera ditambah.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {low_stock.map((medicine) => (
                                        <div
                                            key={medicine.id}
                                            className="flex flex-col gap-3 rounded-xl bg-slate-50/80 p-3 transition-colors hover:bg-slate-100/80 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div
                                                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                                                        medicine.is_out
                                                            ? 'bg-red-100 text-red-600'
                                                            : 'bg-red-50 text-red-500'
                                                    }`}
                                                >
                                                    {medicine.is_out ? (
                                                        <BlockIcon className="h-5 w-5" />
                                                    ) : (
                                                        <PillIcon className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                        {medicine.name}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {medicine.subtitle}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                        medicine.is_out
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-red-50 text-red-600'
                                                    }`}
                                                >
                                                    Stok: {numberFormatter.format(medicine.stock)} / Min:{' '}
                                                    {numberFormatter.format(medicine.minimum_stock)}
                                                </span>
                                                <Link
                                                    href="/admin/stok"
                                                    className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700 transition-colors hover:bg-brand-500 hover:text-white"
                                                >
                                                    <PlusCircleIcon className="h-4 w-4" />
                                                    Tambah Stok
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <span className="text-xs text-slate-500">
                                    {low_stock.length === 0
                                        ? 'Tidak ada peringatan stok'
                                        : `Menampilkan ${low_stock.length} dari ${stats.critical_stock} item kritis`}
                                </span>
                                <Link
                                    href="/admin/stok"
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800"
                                >
                                    Lihat semua stok
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                            </div>
                        </section>

                        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft-card sm:p-6 lg:col-span-5">
                            <div className="flex items-center justify-between pb-1">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-2.5 rounded-full bg-emerald-500" />
                                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                        Aktivitas Terbaru
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={refresh}
                                    title="Muat ulang"
                                    aria-label="Muat ulang aktivitas"
                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <RefreshIcon className="h-4 w-4" />
                                </button>
                            </div>

                            {activities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-10 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                        <ChartIcon className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">
                                        Belum ada aktivitas
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Aktivitas resep, stok, dan akun akan tampil di sini.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative flex flex-col gap-4">
                                    <div className="absolute top-3 bottom-3 left-4 w-0.5 bg-slate-100" />
                                    {activities.map((activity) => (
                                        <div key={activity.id} className="relative z-10 flex items-start gap-3">
                                            <div
                                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${
                                                    activityStyles[activity.type]
                                                }`}
                                            >
                                                <ActivityIcon type={activity.type} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm leading-snug font-medium text-slate-800">
                                                    {activity.title}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {activity.time} • {activity.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </AdminLayout>
        </>
    );
}

const activityStyles: Record<Activity['type'], string> = {
    handover: 'bg-emerald-50 text-emerald-600',
    in: 'bg-brand-50 text-brand-600',
    out: 'bg-sky-50 text-sky-600',
    user: 'bg-violet-50 text-violet-600',
};

function ActivityIcon({ type }: { type: Activity['type'] }) {
    const className = 'h-[18px] w-[18px]';

    if (type === 'handover') {
        return <CheckCircleIcon className={className} />;
    }

    if (type === 'user') {
        return <UserPlusIcon className={className} />;
    }

    if (type === 'in') {
        return <ArrowDownIcon className={className} />;
    }

    return <ArrowUpIcon className={className} />;
}

type StatTone = 'brand' | 'danger' | 'teal';

interface StatCardProps {
    label: string;
    value: number;
    suffix: string;
    chip: string;
    tone: StatTone;
    accentClass: string;
    icon: ReactNode;
}

const toneStyles: Record<StatTone, { icon: string; chip: string; value: string }> = {
    brand: {
        icon: 'bg-brand-50 text-brand-600',
        chip: 'bg-brand-50 text-brand-700',
        value: 'text-slate-900',
    },
    danger: {
        icon: 'bg-red-50 text-red-600',
        chip: 'bg-red-50 text-red-600',
        value: 'text-red-600',
    },
    teal: {
        icon: 'bg-emerald-50 text-emerald-600',
        chip: 'bg-emerald-50 text-emerald-700',
        value: 'text-slate-900',
    },
};

function StatCard({ label, value, suffix, chip, tone, accentClass, icon }: StatCardProps) {
    const styles = toneStyles[tone];

    return (
        <div className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft-card transition-shadow hover:shadow-md">
            <div
                className={`pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full transition-transform duration-500 group-hover:scale-125 ${accentClass}`}
            />
            <div className="relative z-10 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{label}</span>
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${styles.icon}`}
                >
                    {icon}
                </div>
            </div>
            <div className="relative z-10 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                    <span className={`text-3xl leading-none font-bold tracking-tight ${styles.value}`}>
                        {numberFormatter.format(value)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">{suffix}</span>
                </div>
                <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.chip}`}
                >
                    {chip}
                </span>
            </div>
        </div>
    );
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4m8-4v4M3 10h18" strokeLinecap="round" />
        </svg>
    );
}

function PillIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
            <path d="M8.5 8.5l7 7" strokeLinecap="round" />
        </svg>
    );
}

function WarningIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 9v4m0 4h.01M10.3 4.3L2.7 17.6A1.5 1.5 0 004 20h16a1.5 1.5 0 001.3-2.4L13.7 4.3a2 2 0 00-3.4 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PatientIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path
                d="M5.5 21v-1a6.5 6.5 0 0113 0v1M9 12.5l3 3 3-3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function BlockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.6 5.6l12.8 12.8" strokeLinecap="round" />
        </svg>
    );
}

function PlusCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 8v8m-4-4h8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 12h16m0 0l-6-6m6 6l-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ArrowUpIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 20V4m0 0L6 10m6-6l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ArrowDownIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v16m0 0l6-6m-6 6l-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function UserPlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M15 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6m-3-3h6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
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
