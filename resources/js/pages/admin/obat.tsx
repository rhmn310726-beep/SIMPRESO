import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import type { SharedProps } from '@/types';

interface MedicineRow {
    id: number;
    code: string | null;
    name: string;
    active_ingredient: string;
    category: string | null;
    unit: string;
    strength: string | null;
    stock: number;
    minimum_stock: number;
    storage_location: string | null;
    notes: string | null;
    status: 'aktif' | 'nonaktif';
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedMedicines {
    data: MedicineRow[];
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
    category: string;
    status: string;
}

interface PageProps {
    medicines: PaginatedMedicines;
    filters: Filters;
    categories: string[];
    stats: {
        total: number;
        active: number;
        inactive: number;
    };
    next_code: string;
}

interface MedicineForm {
    code: string;
    name: string;
    active_ingredient: string;
    category: string;
    unit: string;
    strength: string;
    stock: number;
    minimum_stock: number;
    storage_location: string;
    notes: string;
    status: 'aktif' | 'nonaktif';
}

const defaultCategories = [
    'Analgesik / Antipiretik',
    'Antibiotik',
    'Antihistamin',
    'Antasida & Antiulkus',
    'Kortikosteroid',
    'Bronkodilator',
    'Antikoagulan',
];

const defaultUnits = [
    'Tablet',
    'Kapsul',
    'Kaplet',
    'Sirup',
    'Sirup Kering',
    'Injeksi / Ampul',
    'Salep / Gel',
    'Tetes Mata',
    'Suppositoria',
];

const numberFormatter = new Intl.NumberFormat('id-ID');

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none';

const selectClass = `${inputClass} cursor-pointer appearance-none pr-9`;

export default function Obat({ medicines, filters, categories, stats, next_code }: PageProps) {
    const { flash } = usePage<SharedProps>().props;

    const [search, setSearch] = useState(filters.search);
    const [category, setCategory] = useState(filters.category);
    const [status, setStatus] = useState(filters.status);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MedicineRow | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MedicineRow | null>(null);

    const form = useForm<MedicineForm>({
        code: next_code,
        name: '',
        active_ingredient: '',
        category: '',
        unit: '',
        strength: '',
        stock: 0,
        minimum_stock: 0,
        storage_location: '',
        notes: '',
        status: 'aktif',
    });

    const { data, setData, post, put, processing, errors, reset, clearErrors } = form;

    const categoryOptions = Array.from(new Set([...defaultCategories, ...categories]));
    const unitOptions = Array.from(new Set([...defaultUnits, data.unit].filter(Boolean)));

    const navigate = (next: Partial<Filters>) => {
        router.get(
            '/admin/obat',
            {
                search: next.search ?? search,
                category: next.category ?? category,
                status: next.status ?? status,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/admin/obat',
                { search, category, status },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setData({
            code: next_code,
            name: '',
            active_ingredient: '',
            category: '',
            unit: '',
            strength: '',
            stock: 0,
            minimum_stock: 0,
            storage_location: '',
            notes: '',
            status: 'aktif',
        });
        setFormOpen(true);
    };

    const openEdit = (medicine: MedicineRow) => {
        reset();
        clearErrors();
        setEditing(medicine);
        setData({
            code: medicine.code ?? '',
            name: medicine.name,
            active_ingredient: medicine.active_ingredient,
            category: medicine.category ?? '',
            unit: medicine.unit,
            strength: medicine.strength ?? '',
            stock: medicine.stock,
            minimum_stock: medicine.minimum_stock,
            storage_location: medicine.storage_location ?? '',
            notes: medicine.notes ?? '',
            status: medicine.status,
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        if (processing) {
            return;
        }

        setFormOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const submitForm = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setFormOpen(false);
                setEditing(null);
                reset();
            },
        };

        if (editing) {
            put(`/admin/obat/${editing.id}`, options);
        } else {
            post('/admin/obat', options);
        }
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/admin/obat/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const hasFilters = search !== '' || category !== '' || status !== '';

    return (
        <>
            <Head title="Data Obat" />

            <AdminLayout>
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

                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">
                            Daftar Obat
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-600">
                            Kelola data obat dan formularium farmasi rumah sakit secara terpadu.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-[0.99]"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Tambah Obat</span>
                    </button>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatPanel
                        label="Total Obat"
                        value={stats.total}
                        suffix="item formularium"
                        tone="brand"
                        icon={<PillIcon className="h-6 w-6" />}
                    />
                    <StatPanel
                        label="Obat Aktif"
                        value={stats.active}
                        suffix="dapat diresepkan"
                        tone="teal"
                        badge="Tersedia"
                        icon={<CheckCircleIcon className="h-6 w-6" />}
                    />
                    <StatPanel
                        label="Obat Nonaktif"
                        value={stats.inactive}
                        suffix="penangguhan stok"
                        tone="slate"
                        badge="Diarsipkan"
                        icon={<PauseIcon className="h-6 w-6" />}
                    />
                </div>

                <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft-card">
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-4 lg:flex-row lg:items-center">
                        <div className="relative w-full max-w-md flex-1">
                            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari nama obat, kode, atau bahan aktif..."
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                            <div className="relative min-w-[170px] flex-1 sm:flex-initial">
                                <select
                                    value={category}
                                    onChange={(event) => {
                                        setCategory(event.target.value);
                                        navigate({ category: event.target.value });
                                    }}
                                    className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                >
                                    <option value="">Kategori: Semua</option>
                                    {categoryOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>

                            <div className="relative min-w-[150px] flex-1 sm:flex-initial">
                                <select
                                    value={status}
                                    onChange={(event) => {
                                        setStatus(event.target.value);
                                        navigate({ status: event.target.value });
                                    }}
                                    className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                >
                                    <option value="">Status: Semua</option>
                                    <option value="aman">Aman</option>
                                    <option value="kritis">Kritis</option>
                                    <option value="habis">Habis</option>
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setCategory('');
                                        setStatus('');
                                        router.get(
                                            '/admin/obat',
                                            {},
                                            { preserveScroll: true, replace: true },
                                        );
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}

                            <a
                                href="/admin/obat/export"
                                title="Ekspor Data Formularium"
                                className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-600"
                            >
                                <DownloadIcon className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                    <th className="px-4 py-3.5">Kode</th>
                                    <th className="px-4 py-3.5">Nama Obat</th>
                                    <th className="px-4 py-3.5">Kategori</th>
                                    <th className="px-4 py-3.5">Bentuk Sediaan</th>
                                    <th className="px-4 py-3.5">Kekuatan</th>
                                    <th className="px-4 py-3.5 text-right">Stok</th>
                                    <th className="px-4 py-3.5 text-right">Stok Min</th>
                                    <th className="px-4 py-3.5 text-center">Status</th>
                                    <th className="px-4 py-3.5 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {medicines.data.map((medicine) => (
                                    <tr
                                        key={medicine.id}
                                        className={`transition-colors hover:bg-slate-50/80 ${
                                            medicine.status === 'nonaktif' ? 'opacity-60' : ''
                                        }`}
                                    >
                                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-brand-600">
                                            {medicine.code ?? '-'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {medicine.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {medicine.active_ingredient}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600">
                                            {medicine.category ?? '-'}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600">{medicine.unit}</td>
                                        <td className="px-4 py-3.5 font-medium text-slate-700">
                                            {medicine.strength ?? '-'}
                                        </td>
                                        <td
                                            className={`px-4 py-3.5 text-right font-semibold ${
                                                medicine.stock === 0
                                                    ? 'text-red-600'
                                                    : 'text-slate-900'
                                            }`}
                                        >
                                            {numberFormatter.format(medicine.stock)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right text-slate-500">
                                            {numberFormatter.format(medicine.minimum_stock)}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <StockStatusBadge medicine={medicine} />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center justify-center gap-1 text-slate-400">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(medicine)}
                                                    title="Edit Data"
                                                    className="rounded-lg p-1.5 transition-colors hover:bg-brand-50 hover:text-brand-600"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(medicine)}
                                                    title="Hapus Data"
                                                    className="rounded-lg p-1.5 transition-colors hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {medicines.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-16 text-center">
                                            <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                    <PillIcon className="h-6 w-6" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    Belum ada data obat
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {hasFilters
                                                        ? 'Tidak ada obat yang cocok dengan filter. Coba ubah kata kunci.'
                                                        : 'Tambahkan obat pertama ke formularium rumah sakit.'}
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
                            {medicines.total === 0 ? (
                                'Tidak ada data'
                            ) : (
                                <>
                                    Menampilkan{' '}
                                    <span className="font-semibold text-slate-800">
                                        {medicines.from}–{medicines.to}
                                    </span>{' '}
                                    dari{' '}
                                    <span className="font-semibold text-slate-800">
                                        {numberFormatter.format(medicines.total)}
                                    </span>{' '}
                                    obat
                                </>
                            )}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <PaginationArrow href={medicines.prev_page_url} direction="prev" />
                            {medicines.links
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
                            <PaginationArrow href={medicines.next_page_url} direction="next" />
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
                                    <PillIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        {editing ? 'Edit Data Obat' : 'Tambah Data Obat Baru'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Masukkan informasi obat dan formularium farmasi rumah sakit.
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
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Kode Obat" required error={errors.code}>
                                    <input
                                        type="text"
                                        value={data.code}
                                        onChange={(event) => setData('code', event.target.value)}
                                        placeholder="OBT-001"
                                        className={`${inputClass} font-mono text-xs font-semibold text-brand-600`}
                                    />
                                </Field>
                                <Field label="Nama Obat" required error={errors.name}>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(event) => setData('name', event.target.value)}
                                        placeholder="Contoh: Paracetamol 500 mg"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Bahan Aktif"
                                    required
                                    error={errors.active_ingredient}
                                    hint="Dipakai untuk pengecekan alergi."
                                >
                                    <input
                                        type="text"
                                        value={data.active_ingredient}
                                        onChange={(event) =>
                                            setData('active_ingredient', event.target.value)
                                        }
                                        placeholder="Contoh: Paracetamol"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Kategori Farmakologi" required error={errors.category}>
                                    <div className="relative">
                                        <select
                                            value={data.category}
                                            onChange={(event) =>
                                                setData('category', event.target.value)
                                            }
                                            className={selectClass}
                                        >
                                            <option value="">Pilih Kategori</option>
                                            {categoryOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Bentuk Sediaan" required error={errors.unit}>
                                    <div className="relative">
                                        <select
                                            value={data.unit}
                                            onChange={(event) => setData('unit', event.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="">Pilih Sediaan</option>
                                            {unitOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </Field>
                                <Field label="Kekuatan / Dosis" error={errors.strength}>
                                    <input
                                        type="text"
                                        value={data.strength}
                                        onChange={(event) => setData('strength', event.target.value)}
                                        placeholder="Contoh: 500 mg"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Stok Awal" required error={errors.stock}>
                                    <input
                                        type="number"
                                        min={0}
                                        value={data.stock}
                                        onChange={(event) =>
                                            setData(
                                                'stock',
                                                event.target.value === ''
                                                    ? 0
                                                    : Number(event.target.value),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="Stok Minimum (Buffer)"
                                    required
                                    error={errors.minimum_stock}
                                >
                                    <input
                                        type="number"
                                        min={0}
                                        value={data.minimum_stock}
                                        onChange={(event) =>
                                            setData(
                                                'minimum_stock',
                                                event.target.value === ''
                                                    ? 0
                                                    : Number(event.target.value),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Lokasi Rak / Bin" error={errors.storage_location}>
                                    <input
                                        type="text"
                                        value={data.storage_location}
                                        onChange={(event) =>
                                            setData('storage_location', event.target.value)
                                        }
                                        placeholder="Contoh: Rak A-02 / Bin 04"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Status Ketersediaan" error={errors.status}>
                                    <div className="flex items-center gap-4 pt-2">
                                        <label className="inline-flex cursor-pointer items-center gap-2">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="aktif"
                                                checked={data.status === 'aktif'}
                                                onChange={() => setData('status', 'aktif')}
                                                className="h-4 w-4 accent-brand-500"
                                            />
                                            <span className="text-sm font-medium text-slate-800">
                                                Aktif
                                            </span>
                                        </label>
                                        <label className="inline-flex cursor-pointer items-center gap-2">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="nonaktif"
                                                checked={data.status === 'nonaktif'}
                                                onChange={() => setData('status', 'nonaktif')}
                                                className="h-4 w-4 accent-brand-500"
                                            />
                                            <span className="text-sm font-medium text-slate-600">
                                                Ditangguhkan
                                            </span>
                                        </label>
                                    </div>
                                </Field>
                            </div>

                            <Field label="Catatan / Peringatan Khusus" error={errors.notes}>
                                <textarea
                                    rows={2}
                                    value={data.notes}
                                    onChange={(event) => setData('notes', event.target.value)}
                                    placeholder="Peringatan khusus, golongan High-Alert, penyimpanan dingin (2-8°C), dsb."
                                    className={`${inputClass} resize-none`}
                                />
                            </Field>

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
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Obat'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={() => setDeleteTarget(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <TrashIcon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Hapus Data Obat?</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            <span className="font-semibold text-slate-800">{deleteTarget.name}</span>{' '}
                            akan dihapus dari formularium. Obat yang sudah memiliki riwayat resep
                            atau stok tidak dapat dihapus.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
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

function StockStatusBadge({ medicine }: { medicine: MedicineRow }) {
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Habis
            </span>
        );
    }

    if (medicine.stock <= medicine.minimum_stock) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
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

function StatPanel({
    label,
    value,
    suffix,
    tone,
    badge,
    icon,
}: {
    label: string;
    value: number;
    suffix: string;
    tone: 'brand' | 'teal' | 'slate';
    badge?: string;
    icon: ReactNode;
}) {
    const tones = {
        brand: { icon: 'bg-brand-50 text-brand-600', value: 'text-slate-900' },
        teal: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600' },
        slate: { icon: 'bg-slate-100 text-slate-500', value: 'text-slate-500' },
    } as const;

    const style = tones[tone];

    return (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft-card">
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        {label}
                    </span>
                    {badge && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                tone === 'teal'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            {badge}
                        </span>
                    )}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                    <span className={`text-3xl leading-none font-bold ${style.value}`}>
                        {numberFormatter.format(value)}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{suffix}</span>
                </div>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${style.icon}`}>
                {icon}
            </div>
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

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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

function PencilIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
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

function AlertIcon({ className }: { className?: string }) {
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

function PillIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
            <path d="M8.5 8.5l7 7" strokeLinecap="round" />
        </svg>
    );
}

function PauseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 9v6m4-6v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
        </svg>
    );
}
