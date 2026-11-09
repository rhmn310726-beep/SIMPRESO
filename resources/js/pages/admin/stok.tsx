import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import type { SharedProps } from '@/types';

interface Movement {
    id: number;
    type: 'masuk' | 'keluar';
    quantity: number;
    note: string | null;
    at: string;
    time: string;
}

interface StockMedicine {
    id: number;
    code: string | null;
    name: string;
    active_ingredient: string;
    category: string | null;
    unit: string;
    stock: number;
    minimum_stock: number;
    status: 'aktif' | 'nonaktif';
}

interface StockBatchRow {
    id: number;
    batch_number: string;
    location: string;
    storage_location: string | null;
    quantity: number;
    unit_price: number;
    expired_at: string | null;
    received_at: string | null;
    note: string | null;
    medicine: StockMedicine;
    movements: Movement[];
}

interface MedicineOption {
    id: number;
    code: string | null;
    name: string;
    category: string | null;
    unit: string;
    stock: number;
    minimum_stock: number;
    storage_location: string | null;
    status: 'aktif' | 'nonaktif';
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedBatches {
    data: StockBatchRow[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: PaginationLink[];
}

interface Filters {
    search: string;
    location: string;
    status: string;
    category: string;
    tab: string;
}

interface Stats {
    total_value: number;
    safe_skus: number;
    critical_skus: number;
    out_of_stock: number;
    expiring_batches: number;
    total_batches: number;
    recent_batches: number;
}

interface PageProps {
    batches: PaginatedBatches;
    filters: Filters;
    locations: string[];
    categories: string[];
    medicines: MedicineOption[];
    stats: Stats;
}

interface StockForm {
    medicine_id: string;
    batch_number: string;
    quantity: number;
    unit_price: number;
    location: string;
    storage_location: string;
    expired_at: string;
    received_at: string;
    note: string;
}

const defaultLocations = [
    'Gudang Utama Farmasi',
    'Depo Rawat Jalan',
    'Depo Rawat Inap',
    'Depo Farmasi IGD',
];

const numberFormatter = new Intl.NumberFormat('id-ID');
const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none';

const selectClass = `${inputClass} cursor-pointer appearance-none pr-9`;

function todayIso(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function emptyForm(medicineId = ''): StockForm {
    return {
        medicine_id: medicineId,
        batch_number: '',
        quantity: 1,
        unit_price: 0,
        location: defaultLocations[0],
        storage_location: '',
        expired_at: '',
        received_at: todayIso(),
        note: '',
    };
}

function formatDate(value: string | null): string {
    if (!value) {
        return '-';
    }

    return dateFormatter.format(new Date(`${value}T00:00:00`));
}

type ExpiryTone = 'danger' | 'warning' | 'muted';

function expiryInfo(value: string | null): { label: string; tone: ExpiryTone } {
    if (!value) {
        return { label: 'Tanpa kadaluwarsa', tone: 'muted' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(`${value}T00:00:00`);
    const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);

    if (days < 0) {
        return { label: `Kadaluwarsa ${Math.abs(days)} hari`, tone: 'danger' };
    }

    if (days <= 90) {
        return { label: `${days} hari lagi`, tone: 'warning' };
    }

    const months = Math.max(1, Math.round(days / 30));

    return { label: `> ${months} bulan`, tone: 'muted' };
}

export default function Stok({ batches, filters, locations, categories, medicines, stats }: PageProps) {
    const { flash } = usePage<SharedProps>().props;

    const [search, setSearch] = useState(filters.search);
    const [location, setLocation] = useState(filters.location);
    const [status, setStatus] = useState(filters.status);
    const [category, setCategory] = useState(filters.category);
    const [tab, setTab] = useState(filters.tab);

    const [formOpen, setFormOpen] = useState(false);
    const [movementTarget, setMovementTarget] = useState<StockBatchRow | null>(null);
    const [detailTarget, setDetailTarget] = useState<StockBatchRow | null>(null);

    const form = useForm<StockForm>(emptyForm());
    const { data, setData, post, processing, errors, reset, clearErrors } = form;

    const navigate = (next: Partial<Filters>) => {
        router.get(
            '/admin/stok',
            {
                search: next.search ?? search,
                location: next.location ?? location,
                status: next.status ?? status,
                category: next.category ?? category,
                tab: next.tab ?? tab,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/admin/stok',
                { search, location, status, category, tab },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [search, location, status, category, tab, filters.search]);

    const openAdd = (medicineId = '') => {
        reset();
        clearErrors();
        setData(emptyForm(medicineId));
        setFormOpen(true);
    };

    const closeForm = () => {
        if (processing) {
            return;
        }

        setFormOpen(false);
        reset();
        clearErrors();
    };

    const selectMedicine = (medicineId: string) => {
        const selected = medicines.find((medicine) => String(medicine.id) === medicineId);

        setData((current) => ({
            ...current,
            medicine_id: medicineId,
            storage_location: current.storage_location || (selected?.storage_location ?? ''),
            batch_number:
                current.batch_number ||
                (selected !== undefined
                    ? `BTH-${selected.code ?? `OBT-${selected.id}`}-${todayIso().replaceAll('-', '')}`
                    : ''),
        }));
    };

    const submitForm = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post('/admin/stok', {
            preserveScroll: true,
            onSuccess: () => {
                setFormOpen(false);
                reset();
            },
        });
    };

    const selectTab = (next: string) => {
        setTab(next);
        setStatus('');
        navigate({ tab: next, status: '' });
    };

    const hasFilters = search !== '' || location !== '' || status !== '' || category !== '' || tab !== 'all';

    const selectedMedicine = medicines.find((medicine) => String(medicine.id) === data.medicine_id);
    const locationOptions = Array.from(new Set([...defaultLocations, ...locations]));
    const categoryOptions = Array.from(new Set(categories.filter(Boolean)));

    const tabs = [
        { key: 'all', label: 'Semua Batch', count: stats.total_batches, tone: 'brand' as const },
        { key: 'kritis', label: 'Stok Menipis', count: stats.critical_skus, tone: 'danger' as const },
        {
            key: 'kadaluwarsa',
            label: 'Hampir Kadaluwarsa',
            count: stats.expiring_batches,
            tone: 'warning' as const,
        },
        {
            key: 'masuk',
            label: 'Stok Masuk Baru (7 Hari)',
            count: stats.recent_batches,
            tone: 'teal' as const,
        },
    ];

    return (
        <>
            <Head title="Stok & Inventaris" />

            <AdminLayout>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1.5 font-medium text-slate-500">
                            <WarehouseIcon className="h-4 w-4" />
                            Inventaris
                        </span>
                        <ChevronRightIcon className="h-4 w-4 text-slate-300" />
                        <span className="font-semibold text-slate-800">Stok &amp; Inventaris Obat</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                        <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                        Metode FIFO &amp; FEFO Aktif
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    </span>
                </div>

                {flash.success && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                        <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <p className="leading-relaxed">{flash.success}</p>
                    </div>
                )}

                {flash.error && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <p className="leading-relaxed">{flash.error}</p>
                    </div>
                )}

                <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">
                            Manajemen Stok Obat
                        </h1>
                        <p className="text-sm text-slate-600">
                            Pantau pergerakan stok, nomor batch, tanggal kadaluwarsa, dan buffer
                            stok obat secara real-time.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href="/admin/stok/export"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                            <DownloadIcon className="h-4 w-4 text-emerald-600" />
                            Ekspor Laporan
                        </a>
                        <button
                            type="button"
                            onClick={() => openAdd()}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-[0.99]"
                        >
                            <PlusCircleIcon className="h-5 w-5" />
                            Penyesuaian / Tambah Stok
                        </button>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Total Nilai Stok"
                        value={rupiahFormatter.format(stats.total_value)}
                        suffix="nilai persediaan"
                        chip={`${numberFormatter.format(stats.total_batches)} batch`}
                        tone="brand"
                        icon={<MoneyIcon className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Stok Aman"
                        value={numberFormatter.format(stats.safe_skus)}
                        suffix="SKU"
                        chip="Ketersediaan optimal"
                        tone="teal"
                        icon={<CheckCircleIcon className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Stok Kritis / Menipis"
                        value={numberFormatter.format(stats.critical_skus)}
                        suffix="SKU"
                        chip={
                            stats.out_of_stock > 0
                                ? `${numberFormatter.format(stats.out_of_stock)} habis`
                                : 'Perlu reorder segera'
                        }
                        tone="danger"
                        icon={<WarningIcon className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Kadaluwarsa (<90 Hari)"
                        value={numberFormatter.format(stats.expiring_batches)}
                        suffix="Batch"
                        chip="Prioritas FEFO"
                        tone="danger"
                        icon={<CalendarXIcon className="h-5 w-5" />}
                    />
                </div>

                <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft-card">
                    <div className="flex flex-col gap-4 bg-slate-50/50 p-4">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                            <div className="relative md:col-span-5">
                                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari nama obat, kode SKU, atau No. Batch..."
                                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                />
                            </div>

                            <div className="relative md:col-span-3">
                                <WarehouseIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={location}
                                    onChange={(event) => {
                                        setLocation(event.target.value);
                                        navigate({ location: event.target.value });
                                    }}
                                    className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-9 text-sm text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                >
                                    <option value="">Semua Lokasi</option>
                                    {locationOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>

                            <div className="relative md:col-span-2">
                                <select
                                    value={status}
                                    onChange={(event) => {
                                        setStatus(event.target.value);
                                        setTab('all');
                                        navigate({ status: event.target.value, tab: 'all' });
                                    }}
                                    className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="aman">Aman</option>
                                    <option value="kritis">Kritis</option>
                                    <option value="habis">Habis</option>
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>

                            <div className="relative md:col-span-2">
                                <select
                                    value={category}
                                    onChange={(event) => {
                                        setCategory(event.target.value);
                                        navigate({ category: event.target.value });
                                    }}
                                    className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                >
                                    <option value="">Semua Kategori</option>
                                    {categoryOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {tabs.map((item) => {
                                const active = tab === item.key;

                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => selectTab(item.key)}
                                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                            active
                                                ? 'bg-brand-500 text-white shadow-sm'
                                                : 'bg-white text-slate-600 shadow-xs hover:bg-slate-100'
                                        }`}
                                    >
                                        {item.label}
                                        <span
                                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                                active
                                                    ? 'bg-white/20 text-white'
                                                    : tabToneClass[item.tone]
                                            }`}
                                        >
                                            {numberFormatter.format(item.count)}
                                        </span>
                                    </button>
                                );
                            })}

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setLocation('');
                                        setStatus('');
                                        setCategory('');
                                        setTab('all');
                                        router.get('/admin/stok', {}, { preserveScroll: true, replace: true });
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[1080px] text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                    <th className="px-4 py-3.5">Kode &amp; Nama Obat</th>
                                    <th className="px-4 py-3.5">Kategori &amp; Satuan</th>
                                    <th className="px-4 py-3.5">No. Batch &amp; Lokasi</th>
                                    <th className="px-4 py-3.5">Tgl Kadaluwarsa</th>
                                    <th className="px-4 py-3.5 text-right">Stok Saat Ini</th>
                                    <th className="px-4 py-3.5 text-right">Min. Buffer</th>
                                    <th className="px-4 py-3.5 text-center">Status</th>
                                    <th className="px-4 py-3.5 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {batches.data.map((batch) => {
                                    const expiry = expiryInfo(batch.expired_at);
                                    const medicine = batch.medicine;
                                    const rowTone =
                                        medicine.status === 'nonaktif'
                                            ? 'opacity-60'
                                            : medicine.stock === 0
                                              ? 'bg-red-50/50'
                                              : medicine.stock <= medicine.minimum_stock
                                                ? 'bg-red-50/30'
                                                : '';

                                    return (
                                        <tr
                                            key={batch.id}
                                            className={`transition-colors hover:bg-slate-50/80 ${rowTone}`}
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">
                                                        {medicine.name}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-slate-400">
                                                        SKU: {medicine.code ?? '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700">
                                                        {medicine.category ?? '-'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {medicine.unit}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-semibold text-slate-800">
                                                        {batch.batch_number}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-emerald-700">
                                                        <ShelfIcon className="h-3.5 w-3.5" />
                                                        {batch.storage_location ?? batch.location}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {batch.location}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">
                                                        {formatDate(batch.expired_at)}
                                                    </span>
                                                    <span
                                                        className={`mt-0.5 w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold ${expiryBadgeClass[expiry.tone]}`}
                                                    >
                                                        {expiry.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span
                                                        className={`text-base font-bold ${
                                                            medicine.stock === 0
                                                                ? 'text-red-600'
                                                                : medicine.stock <= medicine.minimum_stock
                                                                  ? 'text-red-600'
                                                                  : 'text-slate-900'
                                                        }`}
                                                    >
                                                        {numberFormatter.format(batch.quantity)}
                                                        <span className="ml-1 text-xs font-medium text-slate-500">
                                                            {medicine.unit}
                                                        </span>
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        total {numberFormatter.format(medicine.stock)}{' '}
                                                        {medicine.unit}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-sm text-slate-500">
                                                {numberFormatter.format(medicine.minimum_stock)}{' '}
                                                {medicine.unit}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <StatusBadge medicine={medicine} />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-center gap-1 text-slate-400">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMovementTarget(batch)}
                                                        title="Mutasi / Kartu Stok"
                                                        className="rounded-lg p-1.5 transition-colors hover:bg-brand-50 hover:text-brand-600"
                                                    >
                                                        <SwapIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAdd(String(medicine.id))}
                                                        title="Tambah Penyesuaian"
                                                        className="rounded-lg p-1.5 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                                                    >
                                                        <AddBoxIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetailTarget(batch)}
                                                        title="Detail Batch"
                                                        className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                                    >
                                                        <MoreIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {batches.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-16 text-center">
                                            <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                    <BoxIcon className="h-6 w-6" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    Belum ada batch stok
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {hasFilters
                                                        ? 'Tidak ada batch yang cocok dengan filter. Coba ubah kata kunci.'
                                                        : 'Tambahkan stok pertama untuk mulai memantau persediaan.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 sm:flex-row">
                        <span className="text-xs text-slate-500">
                            {batches.total === 0 ? (
                                'Tidak ada data'
                            ) : (
                                <>
                                    Menampilkan{' '}
                                    <span className="font-semibold text-slate-800">
                                        {batches.from}–{batches.to}
                                    </span>{' '}
                                    dari{' '}
                                    <span className="font-semibold text-slate-800">
                                        {numberFormatter.format(batches.total)}
                                    </span>{' '}
                                    data batch stok obat
                                </>
                            )}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <PaginationArrow href={batches.prev_page_url} direction="prev" />
                            {batches.links
                                .filter((link) => /^\d+$/.test(link.label))
                                .map((link) => (
                                    <Link
                                        key={link.label}
                                        href={link.url ?? '#'}
                                        preserveScroll
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-brand-500 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            <PaginationArrow href={batches.next_page_url} direction="next" />
                        </div>
                    </div>
                </div>
            </AdminLayout>

            {formOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={closeForm}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 rounded-t-2xl border-b border-slate-100 bg-slate-50/60 p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
                                    <BoxIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        Tambah Stok / Batch Baru
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Catat penerimaan batch beserta harga dan tanggal kadaluwarsa.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={processing}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={submitForm} className="space-y-4 p-6">
                            <Field label="Obat" required error={errors.medicine_id}>
                                <div className="relative">
                                    <select
                                        value={data.medicine_id}
                                        onChange={(event) => selectMedicine(event.target.value)}
                                        className={selectClass}
                                    >
                                        <option value="">Pilih Obat</option>
                                        {medicines.map((medicine) => (
                                            <option key={medicine.id} value={medicine.id}>
                                                {medicine.name} ({medicine.code ?? 'tanpa kode'})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                </div>
                                {selectedMedicine && (
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Stok saat ini{' '}
                                        {numberFormatter.format(selectedMedicine.stock)}{' '}
                                        {selectedMedicine.unit} • Min.{' '}
                                        {numberFormatter.format(selectedMedicine.minimum_stock)}{' '}
                                        {selectedMedicine.unit}
                                    </p>
                                )}
                            </Field>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="No. Batch" required error={errors.batch_number}>
                                    <input
                                        type="text"
                                        value={data.batch_number}
                                        onChange={(event) => setData('batch_number', event.target.value)}
                                        placeholder="BTH-PAR-2401"
                                        className={`${inputClass} font-mono text-xs font-semibold text-brand-600`}
                                    />
                                </Field>
                                <Field label="Jumlah Stok" required error={errors.quantity}>
                                    <input
                                        type="number"
                                        min={1}
                                        value={data.quantity}
                                        onChange={(event) =>
                                            setData(
                                                'quantity',
                                                event.target.value === '' ? 0 : Number(event.target.value),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Harga Satuan (Rp)"
                                    required
                                    error={errors.unit_price}
                                    hint="Dipakai untuk menghitung total nilai stok."
                                >
                                    <input
                                        type="number"
                                        min={0}
                                        value={data.unit_price}
                                        onChange={(event) =>
                                            setData(
                                                'unit_price',
                                                event.target.value === '' ? 0 : Number(event.target.value),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Tanggal Kadaluwarsa" required error={errors.expired_at}>
                                    <input
                                        type="date"
                                        value={data.expired_at}
                                        onChange={(event) => setData('expired_at', event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Lokasi Penyimpanan" required error={errors.location}>
                                    <div className="relative">
                                        <select
                                            value={data.location}
                                            onChange={(event) => setData('location', event.target.value)}
                                            className={selectClass}
                                        >
                                            {locationOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </Field>
                                <Field label="Rak / Bin" error={errors.storage_location}>
                                    <input
                                        type="text"
                                        value={data.storage_location}
                                        onChange={(event) =>
                                            setData('storage_location', event.target.value)
                                        }
                                        placeholder="Contoh: Rak A-01 / Bin 04"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Tanggal Diterima" error={errors.received_at}>
                                    <input
                                        type="date"
                                        value={data.received_at}
                                        onChange={(event) => setData('received_at', event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Catatan" error={errors.note}>
                                    <input
                                        type="text"
                                        value={data.note}
                                        onChange={(event) => setData('note', event.target.value)}
                                        placeholder="No. faktur, supplier, dsb."
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={processing}
                                    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {processing ? (
                                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckIcon className="h-4 w-4" />
                                    )}
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Stok'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {movementTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={() => setMovementTarget(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Kartu Stok</h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {movementTarget.medicine.name} • {movementTarget.batch_number}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMovementTarget(null)}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-6">
                            {movementTarget.movements.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 px-4 py-10 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                        <SwapIcon className="h-5 w-5" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">
                                        Belum ada mutasi stok
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Mutasi masuk/keluar untuk obat ini akan tampil di sini.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {movementTarget.movements.map((movement) => (
                                        <div
                                            key={movement.id}
                                            className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                                        >
                                            <div
                                                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                                                    movement.type === 'masuk'
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : 'bg-red-100 text-red-600'
                                                }`}
                                            >
                                                {movement.type === 'masuk' ? (
                                                    <ArrowDownIcon className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpIcon className="h-4 w-4" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {movement.type === 'masuk' ? 'Stok masuk' : 'Stok keluar'}{' '}
                                                    {numberFormatter.format(movement.quantity)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {movement.note ?? 'Tanpa catatan'}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">
                                                    {movement.time}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {detailTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={() => setDetailTarget(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                    <BoxIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Detail Batch
                                    </h3>
                                    <p className="text-xs font-mono text-slate-500">
                                        {detailTarget.batch_number}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailTarget(null)}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            <div>
                                <p className="text-lg font-bold text-slate-900">
                                    {detailTarget.medicine.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {detailTarget.medicine.category ?? 'Tanpa kategori'} •{' '}
                                    {detailTarget.medicine.unit}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem label="No. Batch" value={detailTarget.batch_number} mono />
                                <DetailItem
                                    label="Lokasi"
                                    value={detailTarget.location}
                                />
                                <DetailItem
                                    label="Rak / Bin"
                                    value={detailTarget.storage_location ?? '-'}
                                />
                                <DetailItem
                                    label="Kadaluwarsa"
                                    value={formatDate(detailTarget.expired_at)}
                                />
                                <DetailItem
                                    label="Diterima"
                                    value={formatDate(detailTarget.received_at)}
                                />
                                <DetailItem
                                    label="Stok Batch"
                                    value={`${numberFormatter.format(detailTarget.quantity)} ${detailTarget.medicine.unit}`}
                                />
                                <DetailItem
                                    label="Harga Satuan"
                                    value={rupiahFormatter.format(detailTarget.unit_price)}
                                />
                                <DetailItem
                                    label="Nilai Batch"
                                    value={rupiahFormatter.format(
                                        detailTarget.quantity * detailTarget.unit_price,
                                    )}
                                />
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                    Catatan
                                </p>
                                <p className="mt-1 text-sm text-slate-700">
                                    {detailTarget.note ?? 'Tidak ada catatan tambahan.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const tabToneClass: Record<'brand' | 'danger' | 'warning' | 'teal', string> = {
    brand: 'bg-brand-100 text-brand-700',
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-700',
    teal: 'bg-emerald-100 text-emerald-700',
};

const expiryBadgeClass: Record<ExpiryTone, string> = {
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-700',
    muted: 'bg-slate-100 text-slate-500',
};

function StatusBadge({ medicine }: { medicine: StockMedicine }) {
    if (medicine.status === 'nonaktif') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Nonaktif
            </span>
        );
    }

    if (medicine.stock === 0) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Habis
            </span>
        );
    }

    if (medicine.stock <= medicine.minimum_stock) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Kritis
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Aman
        </span>
    );
}

const metricTones = {
    brand: {
        icon: 'bg-brand-50 text-brand-600',
        value: 'text-slate-900',
        chip: 'bg-brand-50 text-brand-700',
    },
    teal: {
        icon: 'bg-emerald-50 text-emerald-600',
        value: 'text-slate-900',
        chip: 'bg-emerald-50 text-emerald-700',
    },
    danger: {
        icon: 'bg-red-50 text-red-600',
        value: 'text-red-600',
        chip: 'bg-red-50 text-red-600',
    },
} as const;

function MetricCard({
    label,
    value,
    suffix,
    chip,
    tone,
    icon,
}: {
    label: string;
    value: string;
    suffix: string;
    chip: string;
    tone: keyof typeof metricTones;
    icon: ReactNode;
}) {
    const style = metricTones[tone];

    return (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft-card transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.icon}`}>
                    {icon}
                </div>
            </div>
            <div>
                <div className="flex items-baseline gap-2">
                    <span className={`text-2xl leading-none font-bold tracking-tight ${style.value}`}>
                        {value}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">{suffix}</span>
                </div>
                <span
                    className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}
                >
                    {chip}
                </span>
            </div>
        </div>
    );
}

function DetailItem({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-100 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {label}
            </p>
            <p className={`mt-1 text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>
                {value}
            </p>
        </div>
    );
}

function Field({
    label,
    required = false,
    error,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
            {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
        </div>
    );
}

function PaginationArrow({
    href,
    direction,
}: {
    href: string | null;
    direction: 'prev' | 'next';
}) {
    const label = direction === 'prev' ? 'Sebelumnya' : 'Selanjutnya';

    if (!href) {
        return (
            <span className="flex cursor-not-allowed items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-400 opacity-60">
                {direction === 'prev' && <ChevronLeftIcon className="h-4 w-4" />}
                {label}
                {direction === 'next' && <ChevronRightIcon className="h-4 w-4" />}
            </span>
        );
    }

    return (
        <Link
            href={href}
            preserveScroll
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200"
        >
            {direction === 'prev' && <ChevronLeftIcon className="h-4 w-4" />}
            {label}
            {direction === 'next' && <ChevronRightIcon className="h-4 w-4" />}
        </Link>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
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

function ChevronLeftIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
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
                d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
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

function AddBoxIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M21 8l-9-5-9 5m18 0v8l-9 5-9-5V8m18 0l-9 5m0 0L3 8m9 5v8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 9v4m-2-2h4" strokeLinecap="round" />
        </svg>
    );
}

function BoxIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M21 8l-9-5-9 5m18 0v8l-9 5-9-5V8m18 0l-9 5m0 0L3 8m9 5v8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function WarehouseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 21V9l9-6 9 6v12" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 21v-7h10v7M7 17h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ShelfIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 4v16M20 4v16M4 9h16M4 15h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function MoneyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2.5" y="6" width="19" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 9v6M18 9v6" strokeLinecap="round" />
        </svg>
    );
}

function CalendarXIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4m8-4v4M3 10h18M10 14l4 4m0-4l-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ShieldCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SwapIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function MoreIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
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

function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
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

function AlertIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 8v5m0 3h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path
                d="M21 12a9 9 0 00-9-9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
