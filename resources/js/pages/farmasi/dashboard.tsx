import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import FarmasiLayout from '@/layouts/FarmasiLayout';

type QueueStatus = 'menunggu' | 'diterima' | 'disiapkan' | 'siap_diambil';
type AlertLevel = 'danger' | 'warning' | 'safe';
type ViewMode = 'kanban' | 'tabel';

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

const columns: {
    key: QueueStatus;
    title: string;
    subtitle: string;
    icon: string;
    dot: string;
    count: string;
}[] = [
    {
        key: 'menunggu',
        title: 'Menunggu Telaah',
        subtitle: 'Perlu verifikasi awal',
        icon: 'pending_actions',
        dot: 'bg-tertiary',
        count: 'bg-tertiary-fixed text-on-tertiary-fixed',
    },
    {
        key: 'diterima',
        title: 'Diterima / Peracikan',
        subtitle: 'Sedang disiapkan',
        icon: 'medication',
        dot: 'bg-primary',
        count: 'bg-primary-fixed text-on-primary-fixed',
    },
    {
        key: 'disiapkan',
        title: 'Disiapkan / Etiket Siap',
        subtitle: 'Menunggu pemeriksaan akhir',
        icon: 'inventory_2',
        dot: 'bg-secondary',
        count: 'bg-secondary-fixed text-on-secondary-fixed',
    },
    {
        key: 'siap_diambil',
        title: 'Siap Diambil di Loket',
        subtitle: 'Menunggu serah terima',
        icon: 'shopping_bag',
        dot: 'bg-[#b45309]',
        count: 'bg-[#ffedd5] text-[#9a3412]',
    },
];

const statusStyles: Record<QueueStatus, string> = {
    menunggu: 'bg-tertiary-fixed text-on-tertiary-fixed',
    diterima: 'bg-primary-fixed text-on-primary-fixed-variant',
    disiapkan: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    siap_diambil: 'bg-[#ffedd5] text-[#9a3412]',
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
    const [search, setSearch] = useState(filters.search);
    const [doctorId, setDoctorId] = useState(filters.doctor_id);
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

    useEffect(() => {
        setSelected((current) => {
            if (current === null) {
                return null;
            }

            return queue.find((item) => item.id === current.id) ?? current;
        });
    }, [queue]);

    const grouped = useMemo(() => {
        const result: Record<QueueStatus, QueueItem[]> = {
            menunggu: [],
            diterima: [],
            disiapkan: [],
            siap_diambil: [],
        };

        for (const item of queue) {
            if (
                item.status === 'menunggu' ||
                item.status === 'diterima' ||
                item.status === 'disiapkan' ||
                item.status === 'siap_diambil'
            ) {
                result[item.status].push(item);
            }
        }

        return result;
    }, [queue]);

    const hasFilter = filters.search !== '' || filters.doctor_id !== '';

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    const resetFilters = () => {
        setSearch('');
        setDoctorId('');
    };

    return (
        <>
            <Head title="Dashboard Farmasi" />
            <FarmasiLayout>
                <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-space-md">
                    <section className="flex flex-col gap-space-md lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-space-sm font-label-sm text-label-sm">
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 font-semibold text-on-secondary-fixed-variant">
                                    <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                                    Instalasi Farmasi
                                </span>
                                <span className="text-outline">{today}</span>
                            </div>
                            <h1 className="mt-space-sm font-headline-lg text-headline-lg text-on-surface">
                                Ringkasan Antrean Resep
                            </h1>
                            <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
                                Pantau resep yang masuk, sedang disiapkan, siap diambil, dan sudah
                                diserahkan hari ini.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-space-sm">
                            <div className="flex items-center gap-space-sm rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-space-md py-2.5 shadow-sm">
                                <span className="material-symbols-outlined text-[20px] text-primary">
                                    schedule
                                </span>
                                <div>
                                    <p className="font-label-sm text-label-sm text-outline">
                                        Waktu saat ini
                                    </p>
                                    <p className="font-label-md text-label-md font-semibold text-on-surface">
                                        {clock}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-space-md py-3 font-label-md text-label-md font-semibold text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container-high hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">print</span>
                                Cetak Rekap
                            </button>
                        </div>
                    </section>

                    <section className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Resep Masuk"
                            value={stats.waiting}
                            hint="Menunggu telaah awal"
                            icon="inbox"
                            iconClass="bg-tertiary-fixed text-on-tertiary-fixed"
                        />
                        <StatCard
                            label="Sedang Diproses"
                            value={stats.processing}
                            hint={`${stats.received} diterima · ${stats.preparing} disiapkan`}
                            icon="medication"
                            iconClass="bg-primary-fixed text-on-primary-fixed-variant"
                        />
                        <StatCard
                            label="Siap Diambil"
                            value={stats.ready}
                            hint="Menunggu serah terima"
                            icon="shopping_bag"
                            iconClass="bg-[#ffedd5] text-[#9a3412]"
                        />
                        <StatCard
                            label="Diserahkan Hari Ini"
                            value={stats.handed_over_today}
                            hint={`${stats.active_total} resep aktif saat ini`}
                            icon="task_alt"
                            iconClass="bg-secondary-fixed text-on-secondary-fixed-variant"
                        />
                    </section>

                    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-space-sm shadow-sm print:hidden">
                        <div className="flex flex-col gap-space-sm xl:flex-row xl:items-center">
                            <div className="relative flex-1">
                                <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline">
                                    search
                                </span>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari No. Resep, nama pasien, No. RM, atau dokter..."
                                    aria-label="Cari antrean resep"
                                    className="w-full rounded-xl border border-outline-variant/70 bg-surface-container-low py-2.5 pr-3 pl-10 font-body-md text-body-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-space-sm">
                                <label className="flex items-center gap-2 rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">
                                        stethoscope
                                    </span>
                                    <span className="sr-only">Filter dokter</span>
                                    <select
                                        value={doctorId}
                                        onChange={(event) => setDoctorId(event.target.value)}
                                        className="min-w-40 bg-transparent font-label-md text-label-md text-on-surface outline-none"
                                    >
                                        <option value="">Semua dokter</option>
                                        {doctor_options.map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {hasFilter && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-primary-fixed"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            filter_alt_off
                                        </span>
                                        Reset
                                    </button>
                                )}

                                <div className="flex rounded-xl border border-outline-variant/70 bg-surface-container-low p-1">
                                    <button
                                        type="button"
                                        onClick={() => setView('kanban')}
                                        aria-pressed={view === 'kanban'}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-label-sm font-semibold transition ${
                                            view === 'kanban'
                                                ? 'bg-surface-container-lowest text-primary shadow-sm'
                                                : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            view_kanban
                                        </span>
                                        Kanban
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('tabel')}
                                        aria-pressed={view === 'tabel'}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-label-sm font-semibold transition ${
                                            view === 'tabel'
                                                ? 'bg-surface-container-lowest text-primary shadow-sm'
                                                : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            table_rows
                                        </span>
                                        Tabel
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={refresh}
                                    disabled={refreshing}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 py-2 font-label-sm text-label-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-wait disabled:opacity-60"
                                >
                                    <span
                                        className={`material-symbols-outlined text-[18px] ${
                                            refreshing ? 'animate-spin' : ''
                                        }`}
                                    >
                                        refresh
                                    </span>
                                    Muat Ulang
                                </button>
                            </div>
                        </div>
                    </section>

                    {queue.length === 0 ? (
                        <EmptyQueue hasFilter={hasFilter} onReset={resetFilters} />
                    ) : view === 'kanban' ? (
                        <section className="grid gap-space-md xl:grid-cols-4">
                            {columns.map((column) => (
                                <div
                                    key={column.key}
                                    className="flex min-h-[420px] flex-col rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-space-sm border-b border-outline-variant/60 px-space-md py-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`h-2.5 w-2.5 rounded-full ${column.dot}`}
                                                />
                                                <h2 className="font-label-md text-label-md font-semibold text-on-surface">
                                                    {column.title}
                                                </h2>
                                                <span
                                                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 font-label-sm text-label-sm font-bold ${column.count}`}
                                                >
                                                    {grouped[column.key].length}
                                                </span>
                                            </div>
                                            <p className="mt-1 pl-[18px] font-label-sm text-label-sm text-outline">
                                                {column.subtitle}
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-[20px] text-outline">
                                            {column.icon}
                                        </span>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-space-sm p-space-sm">
                                        {grouped[column.key].length === 0 ? (
                                            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/70 px-4 py-10 text-center">
                                                <span className="material-symbols-outlined text-[28px] text-outline-variant">
                                                    event_available
                                                </span>
                                                <p className="mt-2 font-label-sm text-label-sm text-outline">
                                                    Tidak ada resep
                                                </p>
                                            </div>
                                        ) : (
                                            grouped[column.key].map((item) => (
                                                <QueueCard
                                                    key={item.id}
                                                    item={item}
                                                    onOpen={() => setSelected(item)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </section>
                    ) : (
                        <QueueTable queue={queue} onOpen={setSelected} />
                    )}

                    <footer className="flex flex-col gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-space-md py-3 font-label-sm text-label-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-x-space-md gap-y-1">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-secondary" />
                                {queue.length} resep ditampilkan
                            </span>
                            <span>{stats.created_today} resep dibuat hari ini</span>
                            <span>{stats.active_total} resep aktif</span>
                        </div>
                        <span>
                            {last_updated_at
                                ? `Terakhir diperbarui ${last_updated_at}`
                                : 'Belum ada pembaruan antrean'}
                        </span>
                    </footer>
                </div>
            </FarmasiLayout>

            {selected !== null && (
                <DetailDrawer item={selected} onClose={() => setSelected(null)} />
            )}
        </>
    );
}

function StatCard({
    label,
    value,
    hint,
    icon,
    iconClass,
}: {
    label: string;
    value: number;
    hint: string;
    icon: string;
    iconClass: string;
}) {
    return (
        <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-space-md shadow-sm">
            <div className="flex items-start justify-between gap-space-sm">
                <div>
                    <p className="font-label-sm text-label-sm font-semibold tracking-wide text-on-surface-variant uppercase">
                        {label}
                    </p>
                    <p className="mt-2 font-headline-lg text-headline-lg leading-none font-bold text-on-surface">
                        {value}
                    </p>
                    <p className="mt-2 font-label-sm text-label-sm text-outline">{hint}</p>
                </div>
                <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
                >
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                </span>
            </div>
        </article>
    );
}

function QueueCard({ item, onOpen }: { item: QueueItem; onOpen: () => void }) {
    const allergyNames = item.allergies.map((allergy) => allergy.allergen).join(', ');
    const firstInteraction = item.interactions[0];

    return (
        <article className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-space-sm shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:border-primary/40 hover:shadow-md">
            <div className="flex items-start justify-between gap-space-sm">
                <div>
                    <p className="font-label-md text-label-md font-bold text-primary">
                        {item.number}
                    </p>
                    <p className="mt-0.5 font-label-sm text-label-sm text-outline">
                        {item.created_at_time}
                    </p>
                </div>
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold ${statusStyles[item.status]}`}
                >
                    {item.status_label}
                </span>
            </div>

            <div className="mt-space-sm border-t border-outline-variant/50 pt-space-sm">
                <p className="font-label-md text-label-md font-semibold text-on-surface">
                    {item.patient.name}
                </p>
                <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    {item.patient.medical_record_number} · {item.patient.age} th ·{' '}
                    {item.patient.gender_label}
                </p>
                <p className="mt-1 flex items-center gap-1 font-label-sm text-label-sm text-outline">
                    <span className="material-symbols-outlined text-[15px]">stethoscope</span>
                    {item.doctor_name}
                </p>
            </div>

            <div className="mt-space-sm flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[15px]">medication</span>
                    {item.items_count} item obat
                </span>
                {item.has_alerts ? (
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold text-error">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Perlu perhatian
                    </span>
                ) : (
                    <span className="font-label-sm text-label-sm text-secondary">
                        Tidak ada alergi/interaksi
                    </span>
                )}
            </div>

            {allergyNames !== '' && (
                <div className="mt-space-sm flex items-start gap-2 rounded-lg bg-error-container/70 px-2.5 py-2 text-on-error-container">
                    <span className="material-symbols-outlined mt-0.5 text-[17px]">dangerous</span>
                    <p className="font-label-sm text-label-sm leading-snug">
                        <span className="font-semibold">Alergi terdata:</span> {allergyNames}
                    </p>
                </div>
            )}

            {firstInteraction !== undefined && (
                <div className="mt-space-sm flex items-start gap-2 rounded-lg bg-tertiary-fixed px-2.5 py-2 text-on-tertiary-fixed">
                    <span className="material-symbols-outlined mt-0.5 text-[17px]">
                        sync_problem
                    </span>
                    <div className="min-w-0 font-label-sm text-label-sm leading-snug">
                        <p className="font-semibold">
                            Interaksi {firstInteraction.severity_label}: {firstInteraction.medicine_a}{' '}
                            + {firstInteraction.medicine_b}
                        </p>
                        {item.interactions.length > 1 && (
                            <p className="mt-0.5 opacity-80">
                                +{item.interactions.length - 1} interaksi lain
                            </p>
                        )}
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={onOpen}
                className="mt-space-sm flex w-full items-center justify-center gap-1.5 rounded-lg border border-outline-variant/70 px-3 py-2 font-label-sm text-label-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary-fixed hover:text-primary"
            >
                <span className="material-symbols-outlined text-[17px]">visibility</span>
                Lihat Detail Resep
            </button>
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
        <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
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
                                    <p className="font-label-md text-label-md font-bold text-primary">
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
                                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/70 px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface-variant transition-colors hover:bg-primary-fixed hover:text-primary"
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
        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-space-lg py-16 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">
                inbox
            </span>
            <h2 className="mt-space-sm font-headline-sm text-headline-sm text-on-surface">
                {hasFilter ? 'Tidak ada resep yang cocok' : 'Antrean resep kosong'}
            </h2>
            <p className="mt-1 max-w-md font-body-md text-body-md text-on-surface-variant">
                {hasFilter
                    ? 'Coba ubah kata kunci pencarian atau filter dokter.'
                    : 'Resep baru dari dokter akan muncul di sini secara otomatis.'}
            </p>
            {hasFilter && (
                <button
                    type="button"
                    onClick={onReset}
                    className="mt-space-md inline-flex items-center gap-1.5 rounded-xl bg-primary px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary transition-colors hover:bg-primary/90"
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
                        className="rounded-xl border border-outline-variant/70 px-space-md py-2 font-label-md text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
                    >
                        Tutup
                    </button>
                    <Link
                        href="/farmasi/antrean-resep"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary transition-colors hover:bg-primary/90"
                    >
                        <span className="material-symbols-outlined text-[18px]">queue</span>
                        Buka Antrean Resep
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
