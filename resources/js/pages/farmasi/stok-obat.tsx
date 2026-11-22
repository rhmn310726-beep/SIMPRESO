import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import FarmasiLayout from '@/layouts/FarmasiLayout';

interface MedicineRow {
    id: number;
    code: string | null;
    name: string;
    active_ingredient: string | null;
    category: string | null;
    unit: string | null;
    strength: string | null;
    storage_location: string | null;
    stock: number;
    minimum_stock: number;
    status: string;
    stock_status: 'aman' | 'kritis' | 'habis';
}

interface MedicineOption {
    id: number;
    code: string | null;
    name: string;
    unit: string | null;
    stock: number;
    minimum_stock: number;
    storage_location: string | null;
    status: string;
}

interface Movement {
    id: number;
    type: 'masuk' | 'keluar';
    type_label: string;
    quantity: number;
    note: string | null;
    at_label: string | null;
    medicine: { id: number | null; code: string | null; name: string; unit: string | null };
    user_name: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Paginated<T> {
    data: T[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    medicines: Paginated<MedicineRow>;
    medicine_options: MedicineOption[];
    movements: Movement[];
    filters: { search: string; category: string; status: string; critical_only: boolean; tab: string };
    categories: string[];
    locations: string[];
    stats: { total: number; safe: number; critical: number; out: number };
    last_synced_at: string;
}

const statusMeta: Record<string, { label: string; badge: string; dot?: string; icon?: string; row?: string }> = {
    aman: {
        label: 'Aman',
        badge: 'bg-[#f0fdf4] text-[#15803d]',
        dot: 'bg-[#15803d]',
        row: 'hover:bg-surface-container-low/60',
    },
    kritis: {
        label: '⚠ Kritis',
        badge: 'bg-[#fffbeb] text-[#b45309]',
        icon: 'warning',
        row: 'bg-[#fef2f2] hover:bg-[#fee2e2]/60',
    },
    habis: {
        label: '❌ Habis',
        badge: 'bg-[#fee2e2] text-[#b91c1c]',
        icon: 'cancel',
        row: 'bg-[#fef2f2] hover:bg-[#fee2e2]/60',
    },
};

function todayIso(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function StokObat({ medicines, medicine_options, movements, filters, categories, locations, stats, last_synced_at }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [category, setCategory] = useState(filters.category);
    const [status, setStatus] = useState(filters.status);
    const [criticalOnly, setCriticalOnly] = useState(filters.critical_only);
    const [tab, setTab] = useState<'fisik' | 'mutasi'>(filters.tab === 'mutasi' ? 'mutasi' : 'fisik');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedMedicineId, setSelectedMedicineId] = useState<number | ''>('');

    const form = useForm({
        medicine_id: '',
        batch_number: '',
        quantity: 1,
        unit_price: 0,
        location: locations[0] ?? 'Gudang Utama Farmasi',
        storage_location: '',
        expired_at: '',
        received_at: todayIso(),
        note: '',
    });

    useEffect(() => {
        setSearch(filters.search);
        setCategory(filters.category);
        setStatus(filters.status);
        setCriticalOnly(filters.critical_only);
        setTab(filters.tab === 'mutasi' ? 'mutasi' : 'fisik');
    }, [filters]);

    const selectedMedicine = useMemo(
        () => medicine_options.find((m) => m.id === Number(selectedMedicineId || form.data.medicine_id)),
        [medicine_options, selectedMedicineId, form.data.medicine_id],
    );

    const apply = (next?: Partial<{ search: string; category: string; status: string; critical_only: boolean; tab: string }>) => {
        const params: Record<string, string> = {};
        const s = (next?.search ?? search).trim();
        const c = next?.category ?? category;
        const st = next?.status ?? status;
        const co = next?.critical_only ?? criticalOnly;
        const t = next?.tab ?? tab;
        if (s) params.search = s;
        if (c) params.category = c;
        if (st) params.status = st;
        if (co) params.critical_only = '1';
        if (t && t !== 'fisik') params.tab = t;
        router.get('/farmasi/stok-obat', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== filters.search) {
                apply({ search });
            }
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const openModal = (medicineId?: number) => {
        const id = medicineId ?? medicine_options[0]?.id;
        const med = id !== undefined ? medicine_options.find((m) => m.id === id) : undefined;
        form.setData({
            medicine_id: id !== undefined ? String(id) : '',
            batch_number: med?.code ? `BTH-${med.code}-${todayIso().replaceAll('-', '')}` : '',
            quantity: 1,
            unit_price: 0,
            location: locations[0] ?? 'Gudang Utama Farmasi',
            storage_location: med?.storage_location ?? '',
            expired_at: '',
            received_at: todayIso(),
            note: '',
        });
        setSelectedMedicineId(id ?? '');
        form.clearErrors();
        setModalOpen(true);
    };

    const closeModal = () => {
        if (form.processing) return;
        setModalOpen(false);
    };

    const submitRestock = (e: FormEvent) => {
        e.preventDefault();
        form.post('/farmasi/stok-obat', {
            preserveScroll: true,
            onSuccess: () => {
                setModalOpen(false);
                form.reset();
            },
        });
    };

    const safePercent = stats.total > 0 ? ((stats.safe / stats.total) * 100).toFixed(1) : '0.0';

    return (
        <>
            <Head title="Stok Obat" />
            <FarmasiLayout>
                <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-space-xl">
                    <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-space-sm">
                                <span className="font-display-lg text-display-lg tracking-tight text-on-surface">Manajemen Stok Obat</span>
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">Gudang & Depo</span>
                            </div>
                            <p className="max-w-3xl font-body-md text-body-md text-on-surface-variant">
                                Pantau ketersediaan stok obat, status minimum, dan catat penerimaan stok (mutasi masuk) secara terintegrasi.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-space-sm">
                            <button type="button" onClick={() => openModal()} className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary">
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                <span>Tambah Stok Masuk</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryCard label="Total Item Obat" value={stats.total} suffix="Item" icon="inventory_2" tone="primary" footLeft="Katalog Obat" footRight="Semua item" />
                        <SummaryCard label="Stok Aman" value={stats.safe} suffix="Item" icon="verified" iconFill tone="secondary" footChip={`${safePercent}% terpenuhi`} />
                        <SummaryCard label="Stok Kritis" value={stats.critical} suffix="Item" icon="warning" iconFill tone="warning" footChip="≤ Stok minimum" footRight="Perlu perhatian" />
                        <SummaryCard label="Stok Habis (OOS)" value={stats.out} suffix="Item" icon="production_quantity_limits" tone="error" footChip="Tindakan segera" footRight="Tidak tersedia" />
                    </div>

                    <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                        <div className="flex flex-col justify-between gap-space-sm bg-surface-container-low p-space-md sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2 rounded-xl bg-surface-container p-1">
                                <button type="button" onClick={() => { setTab('fisik'); apply({ tab: 'fisik' }); }} className={`rounded-lg px-4 py-2 font-label-md text-label-md transition-all ${tab === 'fisik' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                                    Daftar Stok Fisik
                                </button>
                                <button type="button" onClick={() => { setTab('mutasi'); apply({ tab: 'mutasi' }); }} className={`rounded-lg px-4 py-2 font-label-md text-label-md transition-all ${tab === 'mutasi' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                                    Riwayat Stok Masuk / Keluar (Mutasi)
                                </button>
                            </div>
                            <div className="flex items-center gap-2 self-end font-body-sm text-body-sm text-on-surface-variant sm:self-auto">
                                <span className="material-symbols-outlined text-[16px] text-secondary">update</span>
                                <span>Sinkronisasi: <span className="font-code-sm text-code-sm font-semibold text-on-surface">{last_synced_at}</span></span>
                            </div>
                        </div>

                        {tab === 'fisik' ? (
                            <>
                                <div className="flex flex-col justify-between gap-space-md bg-surface-container-lowest p-space-lg lg:flex-row lg:items-center">
                                    <div className="flex flex-1 flex-col items-stretch gap-space-sm sm:flex-row sm:items-center">
                                        <div className="relative max-w-md flex-1">
                                            <span className="material-symbols-outlined absolute top-2.5 left-3 text-[18px] text-outline">search</span>
                                            <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-lg bg-surface-container-low pr-space-md pl-9 font-body-sm text-body-sm text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="Cari nama obat, kode, atau zat aktif..." type="text" />
                                        </div>
                                        <div className="relative min-w-[220px]">
                                            <select value={category} onChange={(e) => { setCategory(e.target.value); apply({ category: e.target.value }); }} className="h-10 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low px-3 pr-8 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container">
                                                <option value="">Kategori: Semua</option>
                                                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <span className="material-symbols-outlined pointer-events-none absolute top-2.5 right-2.5 text-[18px] text-outline">expand_more</span>
                                        </div>
                                        <div className="relative min-w-[190px]">
                                            <select value={status} onChange={(e) => { setStatus(e.target.value); apply({ status: e.target.value }); }} className="h-10 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low px-3 pr-8 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container">
                                                <option value="">Status: Semua</option>
                                                <option value="aman">Hanya Aman</option>
                                                <option value="kritis">Hanya Kritis</option>
                                                <option value="habis">Hanya Habis</option>
                                            </select>
                                            <span className="material-symbols-outlined pointer-events-none absolute top-2.5 right-2.5 text-[18px] text-outline">expand_more</span>
                                        </div>
                                    </div>
                                    <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 transition-colors hover:bg-surface-container">
                                        <input checked={criticalOnly} onChange={(e) => { setCriticalOnly(e.target.checked); apply({ critical_only: e.target.checked }); }} className="h-4 w-4 cursor-pointer accent-primary" type="checkbox" />
                                        <span className="font-label-md text-label-md text-on-surface">Hanya tampilkan stok kritis & habis</span>
                                    </label>
                                </div>

                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left font-body-sm text-body-sm">
                                        <thead>
                                            <tr className="bg-surface-container-high/60 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                                                <th className="px-space-md py-3.5">Kode Obat</th>
                                                <th className="px-space-md py-3.5">Nama Obat & Bentuk</th>
                                                <th className="px-space-md py-3.5">Kategori Farmakologi</th>
                                                <th className="px-space-md py-3.5">Lokasi Rak / Bin</th>
                                                <th className="px-space-md py-3.5 text-right">Stok Saat Ini</th>
                                                <th className="px-space-md py-3.5 text-right">Buffer (Min)</th>
                                                <th className="px-space-md py-3.5 text-center">Status</th>
                                                <th className="px-space-md py-3.5 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-on-surface">
                                            {medicines.data.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-space-lg py-16 text-center">
                                                        <span className="material-symbols-outlined text-[40px] text-outline-variant">inventory_2</span>
                                                        <p className="mt-2 font-headline-sm text-headline-sm text-on-surface">Tidak ada data obat</p>
                                                        <p className="font-body-sm text-body-sm text-on-surface-variant">Ubah filter/pencarian atau pastikan data obat tersedia.</p>
                                                    </td>
                                                </tr>
                                            ) : medicines.data.map((item) => {
                                                const meta = statusMeta[item.stock_status];
                                                return (
                                                    <tr key={item.id} className={`transition-colors ${meta.row}`}>
                                                        <td className="px-space-md py-3 font-code-sm text-code-sm font-semibold text-primary">{item.code ?? '-'}</td>
                                                        <td className="px-space-md py-3">
                                                            <div className={`font-label-md text-label-md font-semibold ${item.stock_status === 'aman' ? 'text-on-surface' : 'text-[#991b1b]'}`}>{item.name}</div>
                                                            <div className={`font-body-sm text-body-sm ${item.stock_status === 'aman' ? 'text-on-surface-variant' : 'text-[#b91c1c]'}`}>
                                                                {[item.strength, item.unit].filter(Boolean).join(' • ') || item.active_ingredient || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-space-md py-3">
                                                            <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface">{item.category ?? '-'}</span>
                                                        </td>
                                                        <td className="px-space-md py-3">
                                                            <div className="flex items-center gap-1.5 font-code-sm text-code-sm text-on-surface-variant">
                                                                <span className="material-symbols-outlined text-[16px] text-outline">shelves</span>
                                                                <span>{item.storage_location ?? '-'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-space-md py-3 text-right">
                                                            <span className={`font-headline-sm text-headline-sm font-semibold ${item.stock_status === 'habis' ? 'text-error' : item.stock_status === 'kritis' ? 'text-[#b45309]' : 'text-on-surface'}`}>{item.stock}</span>
                                                            <span className={`ml-1 ${item.stock_status === 'habis' ? 'font-semibold text-error' : item.stock_status === 'kritis' ? 'text-[#92400e]' : 'text-on-surface-variant'}`}>{item.unit ?? ''}</span>
                                                        </td>
                                                        <td className="px-space-md py-3 text-right font-code-sm text-code-sm text-on-surface-variant">{item.minimum_stock} {item.unit ?? ''}</td>
                                                        <td className="px-space-md py-3 text-center">
                                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold ${meta.badge}`}>
                                                                {meta.icon ? <span className="material-symbols-outlined text-[13px]">{meta.icon}</span> : meta.dot ? <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> : null}
                                                                {item.stock_status === 'aman' ? 'Aman' : item.stock_status === 'kritis' ? 'Kritis' : 'Habis'}
                                                            </span>
                                                        </td>
                                                        <td className="px-space-md py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button type="button" disabled title="Kartu stok detail per batch belum tersedia di halaman farmasi" className="cursor-not-allowed rounded-lg px-2.5 py-1 font-label-sm text-label-sm text-outline-variant">Kartu Stok</button>
                                                                <button type="button" onClick={() => openModal(item.id)} className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-label-sm font-medium transition-colors ${item.stock_status === 'habis' ? 'bg-error text-on-error hover:bg-[#991b1b]' : item.stock_status === 'kritis' ? 'bg-primary-container text-on-primary hover:bg-primary' : 'bg-surface-container text-on-surface hover:bg-primary-container hover:text-on-primary'}`}>
                                                                    <span className="material-symbols-outlined text-[14px]">add</span>Tambah
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-col justify-between gap-space-md bg-surface-container-low/50 p-space-lg sm:flex-row sm:items-center">
                                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                                        Menampilkan <span className="font-code-sm text-code-sm font-semibold text-on-surface">{medicines.from ?? 0}–{medicines.to ?? 0}</span> dari <span className="font-code-sm text-code-sm font-semibold text-on-surface">{medicines.total}</span> data obat
                                    </div>
                                    {medicines.links.length > 3 && (
                                        <div className="flex flex-wrap items-center gap-1 self-center sm:self-auto">
                                            {medicines.links.map((link, idx) => (
                                                <Link key={idx} href={link.url ?? '#'} preserveState className={`rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm transition-colors ${link.active ? 'bg-primary-container font-semibold text-on-primary' : link.url ? 'text-on-surface hover:bg-surface-container' : 'cursor-not-allowed text-outline-variant'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left font-body-sm text-body-sm">
                                    <thead>
                                        <tr className="bg-surface-container-high/60 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                                            <th className="px-space-md py-3.5">Waktu</th>
                                            <th className="px-space-md py-3.5">Obat</th>
                                            <th className="px-space-md py-3.5">Jenis Mutasi</th>
                                            <th className="px-space-md py-3.5 text-right">Jumlah</th>
                                            <th className="px-space-md py-3.5">Petugas</th>
                                            <th className="px-space-md py-3.5">Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.length === 0 ? (
                                            <tr><td colSpan={6} className="px-space-lg py-16 text-center font-body-md text-body-md text-on-surface-variant">Belum ada riwayat mutasi stok.</td></tr>
                                        ) : movements.map((m) => (
                                            <tr key={m.id} className="border-t border-outline-variant/30 hover:bg-surface-container-low/50">
                                                <td className="px-space-md py-3 font-label-sm text-label-sm text-on-surface-variant">{m.at_label ?? '-'}</td>
                                                <td className="px-space-md py-3">
                                                    <p className="font-label-md text-label-md font-semibold text-on-surface">{m.medicine.name}</p>
                                                    <p className="font-code-sm text-code-sm text-primary">{m.medicine.code ?? '-'}</p>
                                                </td>
                                                <td className="px-space-md py-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold ${m.type === 'masuk' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{m.type === 'masuk' ? 'south_west' : 'north_east'}</span>
                                                        {m.type_label}
                                                    </span>
                                                </td>
                                                <td className="px-space-md py-3 text-right font-code-sm text-code-sm font-semibold text-on-surface">{m.quantity} {m.medicine.unit ?? ''}</td>
                                                <td className="px-space-md py-3 font-body-sm text-body-sm text-on-surface-variant">{m.user_name ?? '-'}</td>
                                                <td className="px-space-md py-3 font-body-sm text-body-sm text-on-surface">{m.note ?? '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-space-md rounded-xl bg-secondary-fixed/30 p-space-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-on-secondary"><span className="material-symbols-outlined text-[18px]">verified_user</span></div>
                            <p className="font-body-sm text-body-sm text-on-secondary-fixed"><span className="font-semibold">Catatan:</span> Status stok ditentukan dari stok saat ini terhadap batas minimum. Penambahan stok dicatat sebagai batch dan mutasi masuk; pengurangan stok terjadi saat serah terima resep.</p>
                        </div>
                    </div>
                </div>

                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-xl overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl">
                            <div className="flex items-center justify-between bg-surface-container-low px-space-lg py-space-md">
                                <div className="flex items-center gap-space-sm">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-fixed text-primary"><span className="material-symbols-outlined text-[20px]">add_box</span></div>
                                    <div>
                                        <h3 className="font-headline-sm text-headline-sm leading-snug text-on-surface">Tambah Stok Obat Masuk</h3>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">Penerimaan batch & mutasi masuk</span>
                                    </div>
                                </div>
                                <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"><span className="material-symbols-outlined text-[20px]">close</span></button>
                            </div>

                            <form onSubmit={submitRestock} className="flex flex-col gap-space-md p-space-lg">
                                <div className="flex flex-col gap-1.5">
                                    <label className="font-label-sm text-label-sm font-semibold text-on-surface">Obat <span className="text-error">*</span></label>
                                    <select
                                        value={form.data.medicine_id}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            form.setData('medicine_id', val);
                                            setSelectedMedicineId(val ? Number(val) : '');
                                            const med = medicine_options.find((m) => m.id === Number(val));
                                            if (med) {
                                                form.setData((d) => ({
                                                    ...d,
                                                    medicine_id: val,
                                                    batch_number: d.batch_number || (med.code ? `BTH-${med.code}-${todayIso().replaceAll('-', '')}` : ''),
                                                    storage_location: d.storage_location || med.storage_location || '',
                                                }));
                                            }
                                        }}
                                        className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                                        required
                                    >
                                        <option value="">Pilih obat</option>
                                        {medicine_options.map((m) => (
                                            <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ''}{m.name}</option>
                                        ))}
                                    </select>
                                    {form.errors.medicine_id && <p className="font-body-sm text-body-sm text-error">{form.errors.medicine_id}</p>}
                                    {selectedMedicine && (
                                        <div className="mt-1 flex items-center justify-between rounded-lg bg-primary/5 p-3">
                                            <div>
                                                <span className="font-code-sm text-code-sm font-semibold text-primary">{selectedMedicine.code ?? '-'}</span>
                                                <div className="font-label-md text-label-md font-bold text-on-surface">{selectedMedicine.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-label-sm text-label-sm text-on-surface-variant">Stok Saat Ini:</span>
                                                <div className="font-headline-sm text-headline-sm font-bold text-on-surface">{selectedMedicine.stock} {selectedMedicine.unit ?? ''}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                                    <Field label="Jumlah Masuk" required error={form.errors.quantity}>
                                        <input type="number" min={1} value={form.data.quantity} onChange={(e) => form.setData('quantity', Number(e.target.value))} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-headline-sm text-headline-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" required />
                                    </Field>
                                    <Field label="Harga Satuan (Rp)" required error={form.errors.unit_price} hint="Wajib diisi untuk pencatatan batch (isi 0 bila belum ada).">
                                        <input type="number" min={0} value={form.data.unit_price} onChange={(e) => form.setData('unit_price', Number(e.target.value))} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" required />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                                    <Field label="Nomor Batch" required error={form.errors.batch_number}>
                                        <input type="text" value={form.data.batch_number} onChange={(e) => form.setData('batch_number', e.target.value)} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-code-sm text-code-sm uppercase text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="Contoh: B-90214" required />
                                    </Field>
                                    <Field label="Tanggal Kadaluarsa (ED)" required error={form.errors.expired_at}>
                                        <input type="date" value={form.data.expired_at} onChange={(e) => form.setData('expired_at', e.target.value)} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" required />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                                    <Field label="Lokasi Penyimpanan" required error={form.errors.location}>
                                        <select value={form.data.location} onChange={(e) => form.setData('location', e.target.value)} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" required>
                                            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Rak / Bin" error={form.errors.storage_location}>
                                        <input type="text" value={form.data.storage_location} onChange={(e) => form.setData('storage_location', e.target.value)} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="Contoh: Rak A-01" />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                                    <Field label="Tanggal Diterima" error={form.errors.received_at}>
                                        <input type="date" value={form.data.received_at} onChange={(e) => form.setData('received_at', e.target.value)} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" />
                                    </Field>
                                    <Field label="Catatan Mutasi / No. Faktur / Sumber" error={form.errors.note}>
                                        <input type="text" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} className="h-10 w-full rounded-lg bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="Supplier, No. faktur, kondisi, dsb." />
                                    </Field>
                                </div>

                                <div className="flex items-center justify-end gap-space-sm bg-surface-container-low/60 px-space-lg py-space-md -mx-space-lg -mb-space-lg mt-1">
                                    <button type="button" onClick={closeModal} disabled={form.processing} className="rounded-lg px-4 py-2 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50">Batal</button>
                                    <button type="submit" disabled={form.processing} className="flex items-center gap-1.5 rounded-lg bg-primary-container px-5 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary disabled:opacity-60">
                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                        <span>{form.processing ? 'Menyimpan...' : 'Simpan Stok'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </FarmasiLayout>
        </>
    );
}

function SummaryCard({ label, value, suffix, icon, iconFill, tone, footLeft, footRight, footChip }: { label: string; value: number; suffix: string; icon: string; iconFill?: boolean; tone: 'primary' | 'secondary' | 'warning' | 'error'; footLeft?: string; footRight?: string; footChip?: string }) {
    const toneCfg = {
        primary: { iconBox: 'bg-primary-fixed text-primary', value: 'text-on-surface', chip: 'bg-primary/10 text-primary' },
        secondary: { iconBox: 'bg-secondary-fixed text-secondary', value: 'text-on-surface', chip: 'bg-secondary-fixed text-on-secondary-fixed font-semibold' },
        warning: { iconBox: 'bg-[#fef3c7] text-[#b45309]', value: 'text-[#b45309]', chip: 'bg-[#fef3c7] text-[#92400e] font-semibold' },
        error: { iconBox: 'bg-error-container text-error', value: 'text-error', chip: 'bg-error-container text-on-error-container font-semibold' },
    }[tone];

    return (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
                    <div className={`mt-1 font-display-lg text-display-lg ${toneCfg.value}`}>{value} <span className="font-headline-sm text-headline-sm font-normal text-on-surface-variant">{suffix}</span></div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneCfg.iconBox}`}>
                    <span className="material-symbols-outlined text-[22px]" style={iconFill ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
                </div>
            </div>
            <div className="mt-space-md flex items-center gap-2">
                {footChip && <span className={`rounded-full px-2 py-0.5 font-code-sm text-code-sm ${toneCfg.chip}`}>{footChip}</span>}
                {footLeft && <span className={`rounded-full px-2 py-0.5 font-code-sm text-code-sm ${toneCfg.chip}`}>{footLeft}</span>}
                {footRight && <span className="text-[12px] text-outline">• {footRight}</span>}
            </div>
        </div>
    );
}

function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">{label} {required && <span className="text-error">*</span>}</label>
            {children}
            {hint && !error && <p className="font-body-sm text-body-sm text-on-surface-variant">{hint}</p>}
            {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
        </div>
    );
}
