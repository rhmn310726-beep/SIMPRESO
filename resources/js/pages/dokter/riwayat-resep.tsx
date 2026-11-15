import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import DokterLayout from '@/layouts/DokterLayout';
import type { SharedProps } from '@/types';

type PrescriptionStatusValue =
    | 'menunggu'
    | 'diterima'
    | 'disiapkan'
    | 'siap_diambil'
    | 'diserahkan'
    | 'dibatalkan';

type StatusFilter = '' | PrescriptionStatusValue;

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PrescriptionItemRow {
    id: number;
    medicine_name: string;
    unit: string | null;
    dosage: string;
    quantity: number;
    instructions: string;
}

interface PatientSummary {
    id: number;
    medical_record_number: string;
    name: string;
    age: number;
    gender: 'L' | 'P';
    gender_label: string;
    phone: string | null;
}

interface PrescriptionRow {
    id: number;
    number: string;
    status: PrescriptionStatusValue;
    status_label: string;
    created_at_label: string | null;
    created_at_time: string | null;
    created_at_full: string | null;
    handover_at_label: string | null;
    notes: string | null;
    items_count: number;
    patient: PatientSummary | null;
    items: PrescriptionItemRow[];
}

interface StatusOption {
    value: PrescriptionStatusValue;
    label: string;
}

interface PaginatedPrescriptions {
    data: PrescriptionRow[];
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

interface PageProps {
    prescriptions: PaginatedPrescriptions;
    stats: {
        total: number;
        handed_over: number;
        in_progress: number;
        cancelled: number;
        handed_over_percent: number;
        period_label: string;
    };
    filters: {
        search: string;
        status: StatusFilter;
        from: string | null;
        to: string | null;
    };
    status_options: StatusOption[];
}

const STATUS_STYLES: Record<PrescriptionStatusValue, string> = {
    menunggu: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    diterima: 'bg-primary-fixed text-on-primary-fixed-variant',
    disiapkan: 'bg-surface-container-high text-on-surface',
    siap_diambil: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    diserahkan: 'bg-secondary-container text-on-secondary-container',
    dibatalkan: 'bg-error-container text-on-error-container',
};

const STATUS_DOTS: Record<PrescriptionStatusValue, string> = {
    menunggu: 'bg-tertiary',
    diterima: 'bg-primary',
    disiapkan: 'bg-outline',
    siap_diambil: 'bg-secondary',
    diserahkan: 'bg-secondary',
    dibatalkan: 'bg-error',
};

const STATUS_FLOW: {
    value: Exclude<PrescriptionStatusValue, 'dibatalkan'>;
    label: string;
    description: string;
}[] = [
    {
        value: 'menunggu',
        label: 'Menunggu Telaah',
        description: 'Resep masuk antrean dan menunggu telaah farmasi.',
    },
    {
        value: 'diterima',
        label: 'Diterima',
        description: 'Resep diterima dan sedang ditelaah oleh apoteker.',
    },
    {
        value: 'disiapkan',
        label: 'Disiapkan',
        description: 'Obat sedang disiapkan dan dikemas oleh farmasi.',
    },
    {
        value: 'siap_diambil',
        label: 'Siap Diambil',
        description: 'Obat siap diambil di instalasi farmasi.',
    },
    {
        value: 'diserahkan',
        label: 'Diserahkan',
        description: 'Obat telah diserahkan kepada pasien atau penerima.',
    },
];

type TimelineState = 'completed' | 'current' | 'pending' | 'cancelled';

interface TimelineStep {
    key: string;
    label: string;
    description: string;
    time: string | null;
    state: TimelineState;
}

const TIMELINE_DOT_STYLES: Record<TimelineState, string> = {
    completed: 'bg-secondary text-on-secondary',
    current: 'bg-primary text-on-primary ring-4 ring-primary/15',
    pending: 'bg-surface-container-high text-outline',
    cancelled: 'bg-error-container text-on-error-container',
};

const inputClass =
    'w-full rounded-lg border border-outline-variant/30 bg-surface-container-low py-1.5 pr-space-md pl-9 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none';

export default function RiwayatResep({
    prescriptions,
    stats,
    filters,
    status_options,
}: PageProps) {
    const { auth } = usePage<SharedProps>().props;
    const doctorName = auth.user?.name ?? 'Dokter';

    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState<StatusFilter>(filters.status);
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [selected, setSelected] = useState<PrescriptionRow | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const appliedFrom = filters.from ?? '';
    const appliedTo = filters.to ?? '';

    useEffect(() => {
        setSearch(filters.search);
        setStatus(filters.status);
        setFrom(appliedFrom);
        setTo(appliedTo);
    }, [filters.search, filters.status, appliedFrom, appliedTo]);

    useEffect(() => {
        if (
            search === filters.search &&
            status === filters.status &&
            from === appliedFrom &&
            to === appliedTo
        ) {
            return;
        }

        const timer = window.setTimeout(() => {
            const params: Record<string, string> = {};

            if (search.trim() !== '') {
                params.search = search.trim();
            }

            if (status !== '') {
                params.status = status;
            }

            if (from !== '') {
                params.from = from;
            }

            if (to !== '') {
                params.to = to;
            }

            router.get('/dokter/riwayat-resep', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search, status, from, to, filters.search, filters.status, appliedFrom, appliedTo]);

    useEffect(() => {
        if (selected === null) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelected(null);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [selected]);

    const hasFilters =
        filters.search !== '' ||
        filters.status !== '' ||
        filters.from !== null ||
        filters.to !== null;

    const exportParams = new URLSearchParams();

    if (filters.search !== '') {
        exportParams.set('search', filters.search);
    }

    if (filters.status !== '') {
        exportParams.set('status', filters.status);
    }

    if (filters.from !== null) {
        exportParams.set('from', filters.from);
    }

    if (filters.to !== null) {
        exportParams.set('to', filters.to);
    }

    const exportUrl = `/dokter/riwayat-resep/export${
        exportParams.toString() === '' ? '' : `?${exportParams.toString()}`
    }`;

    const resetFilters = () => {
        setSearch('');
        setStatus('');
        setFrom('');
        setTo('');
    };

    const handleRefresh = () => {
        setRefreshing(true);

        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    const handedOverPercent = stats.handed_over_percent.toLocaleString('id-ID', {
        maximumFractionDigits: 1,
    });

    return (
        <>
            <Head title="Riwayat Resep" />
            <DokterLayout>
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-lg">
                    <div className="flex flex-col justify-between gap-space-md sm:flex-row sm:items-end">
                        <div>
                            <p className="font-label-sm text-label-sm font-semibold tracking-wider text-secondary uppercase">
                                Portal Dokter
                            </p>
                            <h1 className="mt-1 font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                                Riwayat Resep
                            </h1>
                            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                                Pantau seluruh resep yang Anda kirim ke Instalasi Farmasi.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container-high active:scale-95"
                            >
                                <span
                                    className={`material-symbols-outlined text-[18px] text-primary ${
                                        refreshing ? 'animate-spin' : ''
                                    }`}
                                >
                                    sync
                                </span>
                                Refresh
                            </button>
                            <a
                                href={exportUrl}
                                className="flex items-center gap-2 rounded-lg bg-primary px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    download
                                </span>
                                Export CSV
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Total Resep"
                            value={stats.total}
                            hint={`Periode ${stats.period_label}`}
                            icon="receipt_long"
                            iconClass="bg-primary-fixed text-primary"
                        />
                        <StatCard
                            label="Diserahkan"
                            value={stats.handed_over}
                            hint={`${handedOverPercent}% dari resep bulan ini`}
                            icon="task_alt"
                            iconClass="bg-secondary-fixed text-secondary"
                        />
                        <StatCard
                            label="Dalam Proses"
                            value={stats.in_progress}
                            hint="Menunggu telaah hingga siap diambil"
                            icon="hourglass_top"
                            iconClass="bg-tertiary-fixed text-tertiary"
                        />
                        <StatCard
                            label="Dibatalkan"
                            value={stats.cancelled}
                            hint="Resep yang tidak dilanjutkan"
                            icon="cancel"
                            iconClass="bg-error-container text-on-error-container"
                        />
                    </div>

                    <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                        <div className="flex flex-col gap-space-md border-b border-surface-container-high/40 px-space-lg pt-space-lg pb-space-md">
                            <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
                                <div>
                                    <h2 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                                        Daftar Riwayat Resep
                                    </h2>
                                    <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                                        {prescriptions.total} resep tercatat untuk akun Anda.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-full sm:w-72">
                                        <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline">
                                            search
                                        </span>
                                        <input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            type="search"
                                            placeholder="Cari nama pasien atau No. Resep..."
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface">
                                        <span className="material-symbols-outlined text-[18px] text-outline">
                                            tune
                                        </span>
                                        <span className="text-body-sm text-outline">Status:</span>
                                        <select
                                            value={status}
                                            onChange={(event) =>
                                                setStatus(event.target.value as StatusFilter)
                                            }
                                            className="cursor-pointer bg-transparent pr-1 font-medium text-on-surface focus:outline-none"
                                        >
                                            <option value="">Semua Status</option>
                                            {status_options.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface">
                                        <span className="material-symbols-outlined text-[18px] text-outline">
                                            calendar_month
                                        </span>
                                        <input
                                            type="date"
                                            value={from}
                                            onChange={(event) => setFrom(event.target.value)}
                                            aria-label="Dari tanggal"
                                            className="w-[8.4rem] bg-transparent font-label-md text-label-md text-on-surface focus:outline-none"
                                        />
                                        <span className="text-outline-variant">—</span>
                                        <input
                                            type="date"
                                            value={to}
                                            onChange={(event) => setTo(event.target.value)}
                                            aria-label="Sampai tanggal"
                                            className="w-[8.4rem] bg-transparent font-label-md text-label-md text-on-surface focus:outline-none"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        disabled={!hasFilters}
                                        className="flex items-center gap-1.5 rounded-lg bg-surface-container px-3.5 py-1.5 font-label-md text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            filter_alt_off
                                        </span>
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <table className="w-full border-collapse text-left font-body-md text-body-md">
                                <thead>
                                    <tr className="bg-surface-container-low font-label-sm text-label-sm tracking-wide text-on-surface-variant uppercase">
                                        <th className="px-space-md py-3 font-semibold">No. Resep</th>
                                        <th className="px-space-md py-3 font-semibold">
                                            Tanggal &amp; Waktu
                                        </th>
                                        <th className="px-space-md py-3 font-semibold">Nama Pasien</th>
                                        <th className="px-space-md py-3 font-semibold">Jumlah Item</th>
                                        <th className="px-space-md py-3 font-semibold">
                                            Status Farmasi
                                        </th>
                                        <th className="px-space-md py-3 text-right font-semibold">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescriptions.data.map((prescription) => (
                                        <tr
                                            key={prescription.id}
                                            className="border-b border-surface-container-high/50 transition-colors last:border-0 hover:bg-surface-container-low/60"
                                        >
                                            <td className="px-space-md py-3">
                                                <span className="font-code-sm text-code-sm font-semibold text-primary">
                                                    {prescription.number}
                                                </span>
                                                {prescription.notes && (
                                                    <span
                                                        title={prescription.notes}
                                                        className="mt-0.5 flex items-center gap-1 font-body-sm text-body-sm text-outline"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            sticky_note_2
                                                        </span>
                                                        Ada catatan
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-space-md py-3">
                                                <div className="font-body-sm text-body-sm font-semibold text-on-surface">
                                                    {prescription.created_at_label ?? '-'}
                                                </div>
                                                <div className="font-body-sm text-body-sm text-on-surface-variant">
                                                    {prescription.created_at_time ?? '-'}
                                                </div>
                                            </td>
                                            <td className="px-space-md py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-md text-label-md font-bold text-primary">
                                                        {initials(
                                                            prescription.patient?.name ?? 'Pasien',
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                                                            {prescription.patient?.name ?? '-'}
                                                        </span>
                                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                                            {prescription.patient
                                                                ? `RM ${prescription.patient.medical_record_number} • ${prescription.patient.age} th • ${prescription.patient.gender_label}`
                                                                : 'Data pasien tidak tersedia'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-space-md py-3">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-[15px]">
                                                        medication
                                                    </span>
                                                    {prescription.items_count} item
                                                </span>
                                            </td>
                                            <td className="px-space-md py-3">
                                                <StatusBadge
                                                    status={prescription.status}
                                                    label={prescription.status_label}
                                                />
                                            </td>
                                            <td className="px-space-md py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelected(prescription)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-primary-fixed"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">
                                                        visibility
                                                    </span>
                                                    Lihat Detail
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {prescriptions.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-space-md py-14 text-center">
                                                <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-outline">
                                                        <span className="material-symbols-outlined text-[28px]">
                                                            history_edu
                                                        </span>
                                                    </div>
                                                    <p className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                                        Belum ada resep yang cocok
                                                    </p>
                                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                                        Coba ubah kata kunci, status, atau rentang tanggal.
                                                    </p>
                                                    {hasFilters && (
                                                        <button
                                                            type="button"
                                                            onClick={resetFilters}
                                                            className="mt-1 rounded-lg bg-primary-container px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary"
                                                        >
                                                            Reset Filter
                                                        </button>
                                                    )}
                                                    {!hasFilters && (
                                                        <Link
                                                            href="/dokter/resep"
                                                            className="mt-1 rounded-lg bg-primary-container px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary"
                                                        >
                                                            Buat Resep Baru
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-space-sm bg-surface-container-lowest p-space-md sm:flex-row">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {prescriptions.total === 0 ? (
                                    'Tidak ada data'
                                ) : (
                                    <>
                                        Menampilkan{' '}
                                        <span className="font-semibold text-on-surface">
                                            {prescriptions.from}–{prescriptions.to}
                                        </span>{' '}
                                        dari{' '}
                                        <span className="font-semibold text-on-surface">
                                            {prescriptions.total}
                                        </span>{' '}
                                        resep
                                    </>
                                )}
                            </span>
                            <div className="flex items-center gap-1">
                                <PaginationArrow href={prescriptions.prev_page_url} direction="prev" />
                                {prescriptions.links
                                    .filter((link) => /^\d+$/.test(link.label))
                                    .map((link) => (
                                        <Link
                                            key={link.label}
                                            href={link.url ?? '#'}
                                            preserveScroll
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg font-label-sm text-label-sm font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-primary-container text-on-primary shadow-sm'
                                                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                                            }`}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                <PaginationArrow href={prescriptions.next_page_url} direction="next" />
                            </div>
                        </div>
                    </div>
                </div>

                {selected && (
                    <PrescriptionDrawer
                        prescription={selected}
                        doctorName={doctorName}
                        onClose={() => setSelected(null)}
                    />
                )}
            </DokterLayout>
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
        <div className="group relative flex min-h-[132px] items-start justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
            <div className="z-10 flex h-full flex-col justify-between gap-1">
                <div>
                    <span className="block font-label-sm text-label-sm tracking-wider text-outline uppercase">
                        {label}
                    </span>
                    <span className="mt-1 block font-display-lg text-display-lg leading-none font-bold text-on-surface">
                        {value}
                    </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-outline">
                        info
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>
                </div>
            </div>
            <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${iconClass}`}
            >
                <span
                    className="material-symbols-outlined text-[26px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    {icon}
                </span>
            </div>
        </div>
    );
}

function StatusBadge({
    status,
    label,
}: {
    status: PrescriptionStatusValue;
    label: string;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label-sm text-label-sm font-semibold ${STATUS_STYLES[status]}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status]}`} />
            {label}
        </span>
    );
}

function PrescriptionDrawer({
    prescription,
    doctorName,
    onClose,
}: {
    prescription: PrescriptionRow;
    doctorName: string;
    onClose: () => void;
}) {
    const patient = prescription.patient;
    const timeline = buildTimeline(prescription);

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-inverse-surface/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="riwayat-resep-detail-title"
                className="flex h-full w-full max-w-2xl flex-col bg-surface-container-lowest shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex flex-shrink-0 items-start justify-between gap-space-sm border-b border-surface-container-high p-space-lg">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                            <span className="material-symbols-outlined text-[24px]">
                                receipt_long
                            </span>
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2
                                    id="riwayat-resep-detail-title"
                                    className="font-headline-md text-headline-md font-bold text-on-surface"
                                >
                                    Detail Resep {prescription.number}
                                </h2>
                                <StatusBadge
                                    status={prescription.status}
                                    label={prescription.status_label}
                                />
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px] text-outline">
                                    schedule
                                </span>
                                {prescription.created_at_full ?? '-'}
                                <span className="text-outline-variant">•</span>
                                Instalasi Farmasi
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup detail resep"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-space-lg">
                    <div className="grid grid-cols-1 gap-3 rounded-xl bg-surface-container-low p-4 sm:grid-cols-2">
                        <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                Identitas Pasien
                            </span>
                            <span className="mt-1 font-body-md text-body-md font-bold text-on-surface">
                                {patient?.name ?? '-'}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {patient
                                    ? `No. RM: ${patient.medical_record_number} • ${patient.age} tahun • ${patient.gender_label}`
                                    : 'Data pasien tidak tersedia'}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {patient?.phone ?? 'Nomor telepon tidak tercatat'}
                            </span>
                        </div>
                        <div className="flex flex-col sm:border-l sm:border-surface-container-high sm:pl-3">
                            <span className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                Dokter Pemeriksa
                            </span>
                            <span className="mt-1 font-body-md text-body-md font-bold text-primary">
                                {doctorName}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                Tanggal resep: {prescription.created_at_label ?? '-'}
                            </span>
                            {prescription.handover_at_label && (
                                <span className="font-body-sm text-body-sm text-on-surface-variant">
                                    Serah terima: {prescription.handover_at_label}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-label-md text-label-md font-bold text-on-surface">
                                <span className="material-symbols-outlined text-[20px] text-primary">
                                    medication
                                </span>
                                Daftar Obat yang Diresepkan
                            </span>
                            <span className="rounded bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-semibold text-outline">
                                {prescription.items_count} Item Obat
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-surface-container-high">
                            <table className="w-full border-collapse text-left font-body-sm text-body-sm">
                                <thead>
                                    <tr className="bg-surface-container-low font-label-sm text-label-sm tracking-wide text-on-surface-variant uppercase">
                                        <th className="px-3 py-2.5 font-semibold">Obat</th>
                                        <th className="px-3 py-2.5 font-semibold">Dosis</th>
                                        <th className="px-3 py-2.5 font-semibold">Signa</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescription.items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-t border-surface-container-high/60"
                                        >
                                            <td className="px-3 py-2.5">
                                                <span className="font-label-md text-label-md font-semibold text-on-surface">
                                                    {item.medicine_name}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-on-surface-variant">
                                                {item.dosage}
                                            </td>
                                            <td className="px-3 py-2.5 text-on-surface-variant">
                                                {item.instructions}
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <span className="rounded bg-surface-container-high px-2 py-1 font-code-sm text-code-sm font-semibold text-on-surface">
                                                    {item.quantity} {item.unit ?? 'unit'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}

                                    {prescription.items.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-6 text-center text-on-surface-variant"
                                            >
                                                Tidak ada item obat pada resep ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {prescription.notes && (
                        <div className="rounded-xl bg-surface-container-low p-4">
                            <span className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                Catatan untuk Farmasi
                            </span>
                            <p className="mt-1 font-body-md text-body-md leading-relaxed text-on-surface">
                                {prescription.notes}
                            </p>
                        </div>
                    )}

                    <div className="rounded-xl border border-surface-container-high/60 bg-surface-container-low p-4">
                        <span className="mb-3 block font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                            Riwayat Status Farmasi
                        </span>

                        <ol className="flex flex-col">
                            {timeline.map((step, index) => (
                                <li
                                    key={step.key}
                                    className="relative flex gap-3 pb-4 last:pb-0"
                                >
                                    {index < timeline.length - 1 && (
                                        <span className="absolute top-8 left-3 h-[calc(100%-1.25rem)] w-px bg-outline-variant" />
                                    )}
                                    <div
                                        className={`relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[14px] ${TIMELINE_DOT_STYLES[step.state]}`}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            {step.state === 'completed'
                                                ? 'check'
                                                : step.state === 'current'
                                                  ? 'radio_button_checked'
                                                  : step.state === 'cancelled'
                                                    ? 'close'
                                                    : 'circle'}
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`font-label-md text-label-md ${
                                                    step.state === 'current'
                                                        ? 'font-semibold text-primary'
                                                        : step.state === 'cancelled'
                                                          ? 'font-semibold text-on-error-container'
                                                          : step.state === 'completed'
                                                            ? 'font-semibold text-on-surface'
                                                            : 'text-outline'
                                                }`}
                                            >
                                                {step.label}
                                            </span>
                                            {step.time && (
                                                <span className="font-body-sm text-body-sm text-outline">
                                                    {step.time}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                                            {step.description}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <p className="mt-3 border-t border-surface-container-high pt-2 font-body-sm text-body-sm text-outline">
                            Waktu pembuatan dan serah terima diambil dari data resep. Waktu tiap
                            perpindahan status farmasi belum tersimpan di database.
                        </p>
                    </div>
                </div>

                <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-t border-surface-container-high p-space-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-surface-container-low px-space-md py-2.5 font-label-md text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                    >
                        Tutup
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                        {patient && (
                            <Link
                                href={`/dokter/pasien/${patient.id}`}
                                className="flex items-center gap-2 rounded-lg bg-surface-container-high px-space-md py-2.5 font-label-md text-label-md font-semibold text-primary transition-colors hover:bg-surface-container-highest"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    open_in_new
                                </span>
                                Buka Rekam Pasien
                            </Link>
                        )}
                        {patient && (
                            <Link
                                href={`/dokter/resep?patient=${patient.id}`}
                                className="flex items-center gap-2 rounded-lg bg-primary px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    replay
                                </span>
                                Resepkan Ulang
                            </Link>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
}

function buildTimeline(prescription: PrescriptionRow): TimelineStep[] {
    if (prescription.status === 'dibatalkan') {
        return [
            {
                key: 'created',
                label: 'Resep Dibuat',
                description: 'Resep elektronik dikirim ke Instalasi Farmasi.',
                time: prescription.created_at_full,
                state: 'completed',
            },
            {
                key: 'cancelled',
                label: 'Resep Dibatalkan',
                description: 'Resep dibatalkan sebelum obat diserahkan kepada pasien.',
                time: null,
                state: 'cancelled',
            },
        ];
    }

    const currentIndex = STATUS_FLOW.findIndex(
        (step) => step.value === prescription.status,
    );

    return STATUS_FLOW.map((step, index) => {
        const time =
            index === 0
                ? prescription.created_at_full
                : index === STATUS_FLOW.length - 1
                  ? prescription.handover_at_label
                  : null;

        return {
            key: step.value,
            label: step.label,
            description: step.description,
            time,
            state:
                index < currentIndex
                    ? 'completed'
                    : index === currentIndex
                      ? 'current'
                      : 'pending',
        };
    });
}

function PaginationArrow({
    href,
    direction,
}: {
    href: string | null;
    direction: 'prev' | 'next';
}) {
    const label = direction === 'prev' ? 'Prev' : 'Next';
    const icon = direction === 'prev' ? 'chevron_left' : 'chevron_right';
    const iconElement = <span className="material-symbols-outlined text-[16px]">{icon}</span>;

    if (!href) {
        return (
            <span className="flex cursor-not-allowed items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-outline opacity-50">
                {direction === 'prev' && iconElement}
                {label}
                {direction === 'next' && iconElement}
            </span>
        );
    }

    return (
        <Link
            href={href}
            preserveScroll
            className="flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
        >
            {direction === 'prev' && iconElement}
            {label}
            {direction === 'next' && iconElement}
        </Link>
    );
}

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}
