import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import FarmasiLayout from '@/layouts/FarmasiLayout';
import type { SharedProps } from '@/types';

type QueueStatus = 'menunggu' | 'diterima' | 'disiapkan' | 'siap_diambil';
type AlertLevel = 'danger' | 'warning' | 'safe';
type ViewMode = 'kanban' | 'tabel';
type AlertFilter = 'all' | 'warning' | 'safe';

interface Stats {
    waiting: number;
    received: number;
    preparing: number;
    processing: number;
    ready: number;
    handed_over_today: number;
    active_total: number;
    created_today: number;
}

interface AllergyRow {
    allergen: string;
    note: string | null;
}

interface InteractionRow {
    medicine_a: string;
    medicine_b: string;
    severity: string;
    severity_label: string;
    recommendation: string;
}

interface QueueItem {
    id: number;
    number: string;
    status: QueueStatus;
    status_label: string;
    created_at_label: string;
    created_at_time: string;
    notes: string | null;
    patient: {
        id: number;
        medical_record_number: string;
        name: string;
        age: number;
        gender_label: string;
        phone: string | null;
    };
    doctor_name: string;
    items_count: number;
    items: {
        medicine_name: string;
        dosage: string;
        quantity: number;
        instructions: string;
        unit: string | null;
        strength: string | null;
    }[];
    allergies: AllergyRow[];
    interactions: InteractionRow[];
    has_alerts: boolean;
    alert_level: AlertLevel;
}

interface DoctorOption {
    id: number;
    name: string;
}

interface Props {
    today: string;
    stats: Stats;
    queue: QueueItem[];
    doctor_options: DoctorOption[];
    filters: {
        search: string;
        doctor_id: string;
    };
    last_updated_at: string | null;
}

interface Column {
    key: QueueStatus;
    title: string;
    dot: string;
    headerClass: string;
    titleClass: string;
    countClass: string;
    actionLabel: string;
    actionIcon: string;
    actionClass: string;
}

const columns: Column[] = [
    {
        key: 'menunggu',
        title: 'Menunggu Telaah',
        dot: 'bg-outline',
        headerClass: 'bg-surface-container-low',
        titleClass: 'text-on-surface',
        countClass: 'bg-surface-container-highest text-on-surface-variant',
        actionLabel: 'Buka Detail & Telaah',
        actionIcon: 'verified_user',
        actionClass: 'bg-primary-container text-on-primary hover:bg-primary',
    },
    {
        key: 'diterima',
        title: 'Diterima / Peracikan',
        dot: 'bg-primary-container',
        headerClass: 'bg-surface-container',
        titleClass: 'text-on-surface',
        countClass: 'bg-surface-container-highest text-primary',
        actionLabel: 'Buka Detail Peracikan',
        actionIcon: 'inventory_2',
        actionClass: 'bg-surface-container-low text-primary hover:bg-surface-container',
    },
    {
        key: 'disiapkan',
        title: 'Disiapkan / Etiket Siap',
        dot: 'bg-secondary',
        headerClass: 'bg-surface-container-high',
        titleClass: 'text-on-surface',
        countClass: 'bg-surface-container text-secondary',
        actionLabel: 'Buka Detail Etiket',
        actionIcon: 'label',
        actionClass:
            'bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary',
    },
    {
        key: 'siap_diambil',
        title: 'Siap Diambil',
        dot: 'bg-secondary',
        headerClass: 'bg-secondary-fixed',
        titleClass: 'text-on-secondary-fixed',
        countClass: 'bg-surface-container-lowest text-secondary',
        actionLabel: 'Buka Detail Serah Terima',
        actionIcon: 'how_to_reg',
        actionClass: 'bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant',
    },
];

const statusStyles: Record<QueueStatus, string> = {
    menunggu: 'bg-surface-container-highest text-on-surface-variant',
    diterima: 'bg-primary-fixed text-on-primary-fixed-variant',
    disiapkan: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    siap_diambil: 'bg-secondary-fixed-dim text-on-secondary-fixed',
};

const statusSteps: { key: QueueStatus; label: string }[] = [
    { key: 'menunggu', label: 'Menunggu' },
    { key: 'diterima', label: 'Diterima' },
    { key: 'disiapkan', label: 'Disiapkan' },
    { key: 'siap_diambil', label: 'Siap Diambil' },
];

export default function DashboardFarmasi({
    today,
    stats,
    queue,
    doctor_options,
    filters,
    last_updated_at,
}: Props) {
    const { auth } = usePage<SharedProps>().props;
    const [search, setSearch] = useState(filters.search);
    const [doctorId, setDoctorId] = useState(filters.doctor_id);
    const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
    const [view, setView] = useState<ViewMode>('kanban');
    const [selected, setSelected] = useState<QueueItem | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [clock, setClock] = useState(() => currentClock());
    const isFirstFilterEffect = useRef(true);

    useEffect(() => {
        const timer = window.setInterval(() => setClock(currentClock()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        setSearch(filters.search);
        setDoctorId(filters.doctor_id);
    }, [filters.search, filters.doctor_id]);

    useEffect(() => {
        if (isFirstFilterEffect.current) {
            isFirstFilterEffect.current = false;

            return;
        }

        if (search === filters.search && doctorId === filters.doctor_id) {
            return;
        }

        const timer = window.setTimeout(() => {
            const params: Record<string, string> = {};

            if (search.trim() !== '') {
                params.search = search.trim();
            }

            if (doctorId !== '') {
                params.doctor_id = doctorId;
            }

            router.get('/farmasi', params, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['queue', 'stats', 'doctor_options', 'filters', 'last_updated_at'],
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search, doctorId, filters.search, filters.doctor_id]);

    useEffect(() => {
        if (selected === null) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelected(null);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selected]);

    const visibleQueue = useMemo(() => {
        if (alertFilter === 'warning') {
            return queue.filter((item) => item.has_alerts);
        }

        if (alertFilter === 'safe') {
            return queue.filter((item) => !item.has_alerts);
        }

        return queue;
    }, [queue, alertFilter]);

    useEffect(() => {
        setSelected((current) => {
            if (current === null) {
                return null;
            }

            return visibleQueue.find((item) => item.id === current.id) ?? current;
        });
    }, [visibleQueue]);

    const grouped = useMemo(() => {
        const result: Record<QueueStatus, QueueItem[]> = {
            menunggu: [],
            diterima: [],
            disiapkan: [],
            siap_diambil: [],
        };

        for (const item of visibleQueue) {
            result[item.status].push(item);
        }

        return result;
    }, [visibleQueue]);

    const hasServerFilter = filters.search !== '' || filters.doctor_id !== '';
    const hasClientFilter = alertFilter !== 'all';
    const hasFilter = hasServerFilter || hasClientFilter;

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    const resetFilters = () => {
        setSearch('');
        setDoctorId('');
        setAlertFilter('all');
    };

    return (
        <>
            <Head title="Dashboard Farmasi" />
            <FarmasiLayout>
                <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-space-lg">
                    {/* Dashboard menampilkan pantauan antrean; proses telaah, transisi status,
                        dan serah terima dilakukan di Antrean Resep. */}
                    <section className="flex flex-col justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm md:flex-row md:items-center">
                        <div className="flex items-center gap-space-sm">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary-container">
                                <span className="material-symbols-outlined text-[20px]">badge</span>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                    Selamat datang,{' '}
                                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                                        {auth.user?.name ?? 'Petugas Farmasi'}
                                    </span>{' '}
                                    — Instalasi Farmasi RS
                                </p>
                                <span className="font-label-sm text-label-sm text-outline">
                                    Pantauan antrean resep • {today}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-space-md">
                            <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-space-sm py-1 font-label-sm text-label-sm text-secondary">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                                <span>{stats.active_total} resep aktif hari ini</span>
                            </div>
                            <div className="hidden items-center gap-1 font-code-sm text-code-sm text-outline lg:flex">
                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                                <span id="live-clock">{clock}</span>
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label="Resep Masuk"
                            value={stats.waiting}
                            unit="antrean"
                            icon="inbox"
                            iconClass="bg-surface-container text-primary-container"
                            blobClass="bg-surface-container"
                            valueClass="text-primary"
                            badge="Butuh Telaah"
                            badgeClass="bg-surface-container text-primary"
                            footer={`${stats.created_today} dibuat hari ini`}
                        />
                        <KpiCard
                            label="Sedang Diproses"
                            value={stats.processing}
                            unit="resep"
                            icon="experiment"
                            iconClass="bg-surface-container-high text-on-surface-variant"
                            blobClass="bg-surface-container-highest"
                            valueClass="text-on-surface"
                            badge={`${stats.received} diterima • ${stats.preparing} disiapkan`}
                            badgeClass="bg-surface-container-high text-on-surface-variant"
                            footer="Telaah & peracikan"
                        />
                        <KpiCard
                            label="Siap Diambil"
                            value={stats.ready}
                            unit="resep"
                            icon="verified"
                            iconClass="bg-secondary-fixed text-on-secondary-fixed"
                            blobClass="bg-secondary-fixed opacity-60"
                            valueClass="text-secondary"
                            badge="Menunggu serah terima"
                            badgeClass="bg-secondary-fixed-dim text-on-secondary-fixed"
                            footer="Status siap diambil"
                        />
                        <KpiCard
                            label="Diserahkan Hari Ini"
                            value={stats.handed_over_today}
                            unit="resep"
                            icon="task_alt"
                            iconClass="bg-surface-container text-secondary"
                            blobClass="bg-surface-container"
                            valueClass="text-on-surface"
                            badge={`${stats.active_total} resep aktif`}
                            badgeClass="bg-surface-container text-secondary"
                            footer="Konfirmasi serah terima"
                        />
                    </section>

                    <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm print:hidden">
                        <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
                            <div className="flex flex-wrap items-center gap-space-md">
                                <div className="flex items-center gap-space-sm">
                                    <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">
                                        Antrean Resep Masuk
                                    </h1>
                                    <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-primary-container">
                                        Live
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-space-sm py-1 font-label-sm text-label-sm text-secondary">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
                                    </span>
                                    <span className="font-medium">
                                        {last_updated_at
                                            ? `Sinkron s.d. ${last_updated_at}`
                                            : 'Menunggu pembaruan antrean'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-space-sm">
                                <div className="flex items-center rounded-lg bg-surface-container-low p-1">
                                    <button
                                        type="button"
                                        onClick={() => setView('kanban')}
                                        aria-pressed={view === 'kanban'}
                                        className={`flex items-center gap-1.5 rounded-lg px-space-md py-1.5 font-label-sm text-label-sm transition-colors ${
                                            view === 'kanban'
                                                ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                                : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            view_kanban
                                        </span>
                                        Kanban
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('tabel')}
                                        aria-pressed={view === 'tabel'}
                                        className={`flex items-center gap-1.5 rounded-lg px-space-md py-1.5 font-label-sm text-label-sm transition-colors ${
                                            view === 'tabel'
                                                ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                                : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            table_rows
                                        </span>
                                        Tabel
                                    </button>
                                </div>

                                <div className="hidden h-6 w-px bg-surface-container-highest sm:block" />

                                <div className="relative">
                                    <select
                                        value={doctorId}
                                        onChange={(event) => setDoctorId(event.target.value)}
                                        aria-label="Filter Dokter"
                                        className="cursor-pointer appearance-none rounded-lg bg-surface-container-low py-2 pr-8 pl-space-md font-label-sm text-label-sm text-on-surface shadow-sm focus:ring-2 focus:ring-primary-container focus:outline-none"
                                    >
                                        <option value="">Dokter: Semua Dokter</option>
                                        {doctor_options.map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.name}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined pointer-events-none absolute top-2.5 right-2 text-[16px] text-outline">
                                        expand_more
                                    </span>
                                </div>

                                <div className="relative">
                                    <select
                                        value={alertFilter}
                                        onChange={(event) =>
                                            setAlertFilter(event.target.value as AlertFilter)
                                        }
                                        aria-label="Filter Peringatan"
                                        className="cursor-pointer appearance-none rounded-lg bg-surface-container-low py-2 pr-8 pl-space-md font-label-sm text-label-sm text-on-surface shadow-sm focus:ring-2 focus:ring-primary-container focus:outline-none"
                                    >
                                        <option value="all">Peringatan: Semua</option>
                                        <option value="warning">Ada alergi / interaksi</option>
                                        <option value="safe">Aman / tanpa peringatan</option>
                                    </select>
                                    <span className="material-symbols-outlined pointer-events-none absolute top-2.5 right-2 text-[16px] text-outline">
                                        expand_more
                                    </span>
                                </div>

                                {hasFilter && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-primary-fixed"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            filter_alt_off
                                        </span>
                                        Reset
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={refresh}
                                    disabled={refreshing}
                                    title="Muat ulang antrean"
                                    className="flex items-center justify-center rounded-lg bg-surface-container-low p-2 text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-wait disabled:opacity-60"
                                >
                                    <span
                                        className={`material-symbols-outlined text-[18px] ${
                                            refreshing ? 'animate-spin' : ''
                                        }`}
                                    >
                                        refresh
                                    </span>
                                    <span className="sr-only">Muat ulang antrean</span>
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline">
                                search
                            </span>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari No. Resep, nama pasien, No. RM, atau dokter..."
                                aria-label="Cari antrean resep"
                                className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low py-2.5 pr-3 pl-10 font-body-md text-body-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </section>

                    {hasFilter && visibleQueue.length === 0 && view === 'kanban' && (
                        <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest px-space-md py-3 font-label-sm text-label-sm text-on-surface-variant shadow-sm">
                            <span>Tidak ada resep yang cocok dengan pencarian atau filter.</span>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    filter_alt_off
                                </span>
                                Reset filter
                            </button>
                        </div>
                    )}

                    {view === 'kanban' ? (
                        <section className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2 xl:grid-cols-4">
                            {columns.map((column) => (
                                <div key={column.key} className="flex flex-col gap-space-md">
                                    <div
                                        className={`flex items-center justify-between rounded-xl p-space-md shadow-sm ${column.headerClass}`}
                                    >
                                        <div className="flex items-center gap-space-sm">
                                            <span
                                                className={`h-3 w-3 rounded-full ${column.dot}`}
                                            />
                                            <h2
                                                className={`font-label-md text-label-md font-bold ${column.titleClass}`}
                                            >
                                                {column.title}
                                            </h2>
                                        </div>
                                        <span
                                            className={`rounded-full px-2 py-0.5 font-code-sm text-code-sm font-semibold ${column.countClass}`}
                                        >
                                            {grouped[column.key].length}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-space-md">
                                        {grouped[column.key].length === 0 ? (
                                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-lowest/60 px-4 py-8 text-center">
                                                <span className="material-symbols-outlined text-[24px] text-outline-variant">
                                                    event_available
                                                </span>
                                                <p className="mt-1 font-label-sm text-label-sm text-outline">
                                                    Tidak ada resep
                                                </p>
                                            </div>
                                        ) : (
                                            grouped[column.key].map((item) => (
                                                <QueueCard
                                                    key={item.id}
                                                    item={item}
                                                    column={column}
                                                    onOpen={() => setSelected(item)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </section>
                    ) : visibleQueue.length === 0 ? (
                        <EmptyQueue hasFilter={hasFilter} onReset={resetFilters} />
                    ) : (
                        <QueueTable queue={visibleQueue} onOpen={setSelected} />
                    )}

                    <footer className="flex flex-col items-start justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-md font-body-sm text-body-sm text-on-surface-variant shadow-sm sm:flex-row sm:items-center">
                        <div className="flex flex-wrap items-center gap-x-space-md gap-y-1">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-secondary">
                                    verified
                                </span>
                                Menampilkan{' '}
                                <strong className="font-semibold text-on-surface">
                                    {visibleQueue.length} resep
                                </strong>{' '}
                                ·{' '}
                                <strong className="font-semibold text-on-surface">
                                    {stats.active_total} total aktif
                                </strong>
                            </span>
                            <span className="text-outline">•</span>
                            <span>
                                {last_updated_at
                                    ? `Terakhir diperbarui ${last_updated_at}`
                                    : 'Belum ada pembaruan antrean'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-space-md">
                            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
                                <span className="h-2 w-2 rounded-full bg-secondary" />
                                <span>Aman</span>
                                <span className="ml-2 h-2 w-2 rounded-full bg-error" />
                                <span>Perlu Perhatian Alergi</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="flex items-center gap-1 rounded-lg bg-surface-container px-space-md py-1.5 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-surface-container-high"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    print
                                </span>
                                Cetak Rekap Antrean
                            </button>
                        </div>
                    </footer>
                </div>
            </FarmasiLayout>

            {selected !== null && (
                <DetailDrawer item={selected} onClose={() => setSelected(null)} />
            )}
        </>
    );
}

function KpiCard({
    label,
    value,
    unit,
    icon,
    iconClass,
    blobClass,
    valueClass,
    badge,
    badgeClass,
    footer,
}: {
    label: string;
    value: number;
    unit: string;
    icon: string;
    iconClass: string;
    blobClass: string;
    valueClass: string;
    badge: string;
    badgeClass: string;
    footer: string;
}) {
    return (
        <article className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md">
            <div
                className={`absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-bl-full transition-transform group-hover:scale-105 ${blobClass}`}
            />
            <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                        {label}
                    </span>
                    <div className="mt-1 flex items-baseline gap-space-xs">
                        <span
                            className={`font-display-lg text-display-lg font-bold ${valueClass}`}
                        >
                            {value}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {unit}
                        </span>
                    </div>
                </div>
                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconClass}`}
                >
                    <span className="material-symbols-outlined text-[24px]">{icon}</span>
                </div>
            </div>
            <div className="mt-space-md flex items-center justify-between gap-2 pt-space-xs">
                <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-label-sm text-label-sm font-medium ${badgeClass}`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {badge}
                </span>
                <span className="font-code-sm text-code-sm text-outline">{footer}</span>
            </div>
        </article>
    );
}

function QueueCard({
    item,
    column,
    onOpen,
}: {
    item: QueueItem;
    column: Column;
    onOpen: () => void;
}) {
    const allergyNames = item.allergies.map((allergy) => allergy.allergen).join(', ');
    const firstInteraction = item.interactions[0];

    return (
        <article className="relative flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="font-code-sm text-code-sm font-bold tracking-wide text-primary">
                    {item.number}
                </span>
                <div className="flex items-center gap-1 font-code-sm text-code-sm text-outline">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>{item.created_at_time}</span>
                </div>
            </div>

            <div className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                    <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        {item.patient.name}
                    </span>
                    <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-label-sm font-medium text-primary">
                        {item.status_label}
                    </span>
                </div>
                <span className="mt-0.5 font-label-sm text-label-sm text-outline">
                    {item.patient.medical_record_number} • {item.patient.age} Th •{' '}
                    {item.patient.gender_label}
                </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low p-2 font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-outline">
                    stethoscope
                </span>
                <span className="truncate">{item.doctor_name}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">medication</span>
                    {item.items_count} item obat
                </span>
                {item.has_alerts ? (
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold text-error">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Perlu perhatian
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-fixed">
                        <span className="material-symbols-outlined text-[12px]">
                            check_circle
                        </span>
                        Aman / Non-Alergi
                    </span>
                )}
            </div>

            {allergyNames !== '' && (
                <div className="flex items-start gap-1.5 rounded-lg bg-error-container p-2 text-on-error-container shadow-sm">
                    <span className="material-symbols-outlined mt-px shrink-0 text-[18px] text-error">
                        warning
                    </span>
                    <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm leading-tight font-bold">
                            Alergi: {allergyNames}
                        </span>
                        <span className="mt-0.5 font-body-sm text-body-sm leading-tight text-error">
                            Cek potensi reaksi silang sebelum persetujuan
                        </span>
                    </div>
                </div>
            )}

            {firstInteraction !== undefined && (
                <div className="flex items-start gap-1.5 rounded-lg bg-tertiary-fixed p-2 text-on-tertiary-fixed">
                    <span className="material-symbols-outlined mt-px shrink-0 text-[18px]">
                        sync_problem
                    </span>
                    <div className="flex min-w-0 flex-col">
                        <span className="font-label-sm text-label-sm leading-tight font-bold">
                            Interaksi {firstInteraction.severity_label}:{' '}
                            {firstInteraction.medicine_a} + {firstInteraction.medicine_b}
                        </span>
                        {item.interactions.length > 1 && (
                            <span className="mt-0.5 font-body-sm text-body-sm opacity-80">
                                +{item.interactions.length - 1} interaksi lain
                            </span>
                        )}
                    </div>
                </div>
            )}

            <Link
                href={`/farmasi/antrean-resep/${item.id}`}
                title={`${column.actionLabel} — buka halaman proses resep`}
                className={`mt-1 flex w-full items-center justify-center gap-2 rounded-lg px-space-md py-2 font-label-md text-label-md font-semibold shadow-sm transition-colors ${column.actionClass}`}
            >
                <span className="material-symbols-outlined text-[18px]">{column.actionIcon}</span>
                <span>{column.actionLabel}</span>
            </Link>
        </article>
    );
}

function QueueTable({
    queue,
    onOpen,
}: {
    queue: QueueItem[];
    onOpen: (item: QueueItem) => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-outline-variant/60">
                    <thead className="bg-surface-container-low">
                        <tr className="text-left font-label-sm text-label-sm text-on-surface-variant">
                            <th className="px-space-md py-3 font-semibold">Resep</th>
                            <th className="px-space-md py-3 font-semibold">Pasien</th>
                            <th className="px-space-md py-3 font-semibold">Dokter</th>
                            <th className="px-space-md py-3 font-semibold">Obat</th>
                            <th className="px-space-md py-3 font-semibold">Peringatan</th>
                            <th className="px-space-md py-3 font-semibold">Status</th>
                            <th className="px-space-md py-3 text-right font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                        {queue.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-container-low/70">
                                <td className="px-space-md py-3">
                                    <p className="font-code-sm text-code-sm font-bold text-primary">
                                        {item.number}
                                    </p>
                                    <p className="font-label-sm text-label-sm text-outline">
                                        {item.created_at_label} · {item.created_at_time}
                                    </p>
                                </td>
                                <td className="px-space-md py-3">
                                    <p className="font-label-md text-label-md font-semibold text-on-surface">
                                        {item.patient.name}
                                    </p>
                                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                                        {item.patient.medical_record_number} · {item.patient.age} th
                                        · {item.patient.gender_label}
                                    </p>
                                </td>
                                <td className="px-space-md py-3 font-label-sm text-label-sm text-on-surface-variant">
                                    {item.doctor_name}
                                </td>
                                <td className="px-space-md py-3 font-label-sm text-label-sm text-on-surface-variant">
                                    {item.items_count} item
                                </td>
                                <td className="px-space-md py-3">
                                    {item.has_alerts ? (
                                        <div className="flex flex-col gap-1 font-label-sm text-label-sm">
                                            {item.allergies.length > 0 && (
                                                <span className="inline-flex items-center gap-1 text-error">
                                                    <span className="material-symbols-outlined text-[15px]">
                                                        dangerous
                                                    </span>
                                                    {item.allergies
                                                        .map((allergy) => allergy.allergen)
                                                        .join(', ')}
                                                </span>
                                            )}
                                            {item.interactions.length > 0 && (
                                                <span className="inline-flex items-center gap-1 text-tertiary">
                                                    <span className="material-symbols-outlined text-[15px]">
                                                        sync_problem
                                                    </span>
                                                    {item.interactions.length} interaksi obat
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="font-label-sm text-label-sm text-secondary">
                                            Tidak ada
                                        </span>
                                    )}
                                </td>
                                <td className="px-space-md py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold ${statusStyles[item.status]}`}
                                    >
                                        {item.status_label}
                                    </span>
                                </td>
                                <td className="px-space-md py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => onOpen(item)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-surface-container"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            visibility
                                        </span>
                                        Detail
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function EmptyQueue({ hasFilter, onReset }: { hasFilter: boolean; onReset: () => void }) {
    return (
        <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-space-lg py-16 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">
                inbox
            </span>
            <h2 className="mt-space-sm font-headline-sm text-headline-sm text-on-surface">
                {hasFilter ? 'Tidak ada resep yang cocok' : 'Antrean resep kosong'}
            </h2>
            <p className="mt-1 max-w-md font-body-md text-body-md text-on-surface-variant">
                {hasFilter
                    ? 'Coba ubah kata kunci pencarian atau filter yang dipilih.'
                    : 'Resep baru dari dokter akan muncul di sini secara otomatis.'}
            </p>
            {hasFilter && (
                <button
                    type="button"
                    onClick={onReset}
                    className="mt-space-md inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary transition-colors hover:bg-primary"
                >
                    <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                    Reset Filter
                </button>
            )}
        </section>
    );
}

function DetailDrawer({ item, onClose }: { item: QueueItem; onClose: () => void }) {
    const currentStep = statusSteps.findIndex((step) => step.key === item.status);

    return (
        <div className="fixed inset-0 z-[70] flex justify-end">
            <div
                className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={`Detail resep ${item.number}`}
                className="relative flex h-full w-full max-w-xl flex-col bg-surface-container-lowest shadow-2xl"
            >
                <div className="flex items-start justify-between gap-space-md border-b border-outline-variant/60 px-space-lg py-space-md">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                {item.number}
                            </h2>
                            <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold ${statusStyles[item.status]}`}
                            >
                                {item.status_label}
                            </span>
                        </div>
                        <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                            Dibuat {item.created_at_label} · {item.created_at_time}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup detail resep"
                        className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-space-lg py-space-md">
                    <div className="mb-space-md flex items-start gap-2 rounded-xl bg-surface-container px-3 py-2.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                            info
                        </span>
                        <p className="font-label-sm text-label-sm">
                            Proses telaah, perubahan status, dan konfirmasi serah terima dilakukan
                            dari halaman Antrean Resep.
                        </p>
                    </div>

                    <section className="grid gap-space-sm sm:grid-cols-2">
                        <div className="rounded-xl bg-surface-container-low p-space-sm">
                            <p className="font-label-sm text-label-sm font-semibold tracking-wide text-outline uppercase">
                                Pasien
                            </p>
                            <p className="mt-1 font-label-md text-label-md font-semibold text-on-surface">
                                {item.patient.name}
                            </p>
                            <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                                {item.patient.medical_record_number} · {item.patient.age} tahun ·{' '}
                                {item.patient.gender_label}
                            </p>
                            {item.patient.phone !== null && (
                                <p className="mt-1 font-label-sm text-label-sm text-outline">
                                    {item.patient.phone}
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl bg-surface-container-low p-space-sm">
                            <p className="font-label-sm text-label-sm font-semibold tracking-wide text-outline uppercase">
                                Dokter Penulis
                            </p>
                            <p className="mt-1 font-label-md text-label-md font-semibold text-on-surface">
                                {item.doctor_name}
                            </p>
                            <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                                {item.items_count} item obat
                            </p>
                        </div>
                    </section>

                    <section className="mt-space-md">
                        <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                            Peringatan Klinis
                        </h3>
                        <div className="mt-space-sm flex flex-col gap-space-sm">
                            {item.allergies.length === 0 && item.interactions.length === 0 && (
                                <div className="flex items-start gap-2 rounded-xl bg-secondary-fixed px-3 py-2.5 text-on-secondary-fixed">
                                    <span className="material-symbols-outlined text-[18px]">
                                        verified
                                    </span>
                                    <p className="font-label-sm text-label-sm">
                                        Tidak ada alergi atau interaksi obat yang terdata.
                                    </p>
                                </div>
                            )}

                            {item.allergies.length > 0 && (
                                <div className="rounded-xl bg-error-container px-3 py-2.5 text-on-error-container">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">
                                            dangerous
                                        </span>
                                        <p className="font-label-md text-label-md font-semibold">
                                            Alergi terdata
                                        </p>
                                    </div>
                                    <ul className="mt-2 flex flex-col gap-1">
                                        {item.allergies.map((allergy) => (
                                            <li
                                                key={allergy.allergen}
                                                className="font-label-sm text-label-sm"
                                            >
                                                <span className="font-semibold">
                                                    {allergy.allergen}
                                                </span>
                                                {allergy.note !== null &&
                                                    allergy.note !== '' && (
                                                        <span> · {allergy.note}</span>
                                                    )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {item.interactions.map((interaction) => (
                                <div
                                    key={`${interaction.medicine_a}-${interaction.medicine_b}`}
                                    className="rounded-xl bg-tertiary-fixed px-3 py-2.5 text-on-tertiary-fixed"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-label-md text-label-md font-semibold">
                                            {interaction.medicine_a} + {interaction.medicine_b}
                                        </p>
                                        <span className="rounded-full bg-surface-container-lowest px-2 py-0.5 font-label-sm text-label-sm font-semibold">
                                            {interaction.severity_label}
                                        </span>
                                    </div>
                                    <p className="mt-1 font-label-sm text-label-sm">
                                        {interaction.recommendation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="mt-space-md">
                        <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                            Obat Diresepkan
                        </h3>
                        <div className="mt-space-sm flex flex-col gap-space-sm">
                            {item.items.map((medicine, index) => (
                                <div
                                    key={`${medicine.medicine_name}-${index}`}
                                    className="rounded-xl border border-outline-variant/60 p-space-sm"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-label-md text-label-md font-semibold text-on-surface">
                                                {medicine.medicine_name}
                                            </p>
                                            <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                                                {[medicine.strength, medicine.unit]
                                                    .filter(
                                                        (value): value is string =>
                                                            value !== null && value !== '',
                                                    )
                                                    .join(' · ')}
                                            </p>
                                        </div>
                                        <span className="rounded-lg bg-surface-container-low px-2 py-1 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                                            {medicine.quantity} {medicine.unit ?? ''}
                                        </span>
                                    </div>
                                    <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
                                        Dosis: {medicine.dosage}
                                    </p>
                                    <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                                        Aturan pakai: {medicine.instructions}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {item.notes !== null && item.notes !== '' && (
                        <section className="mt-space-md">
                            <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                                Catatan Farmasi
                            </h3>
                            <p className="mt-space-sm rounded-xl bg-surface-container-low px-3 py-2.5 font-label-sm text-label-sm text-on-surface-variant">
                                {item.notes}
                            </p>
                        </section>
                    )}

                    <section className="mt-space-md">
                        <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                            Progres Status
                        </h3>
                        <div className="mt-space-sm grid grid-cols-4 gap-1">
                            {statusSteps.map((step, index) => (
                                <div
                                    key={step.key}
                                    className={`rounded-lg px-2 py-2 text-center font-label-sm text-label-sm ${
                                        index <= currentStep
                                            ? 'bg-primary-fixed font-semibold text-on-primary-fixed-variant'
                                            : 'bg-surface-container-low text-outline'
                                    }`}
                                >
                                    {step.label}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="flex items-center justify-between gap-space-sm border-t border-outline-variant/60 px-space-lg py-space-md">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-outline-variant/70 px-space-md py-2 font-label-md text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
                    >
                        Tutup
                    </button>
                    <Link
                        href={`/farmasi/antrean-resep/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary transition-colors hover:bg-primary"
                    >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        Buka Proses Resep
                    </Link>
                </div>
            </aside>
        </div>
    );
}

function currentClock(): string {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');

    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
}
