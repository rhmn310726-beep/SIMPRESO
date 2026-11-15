import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import DokterLayout from '@/layouts/DokterLayout';
import type { SharedProps } from '@/types';

type GenderFilter = '' | 'L' | 'P';
type StatusFilter = '' | 'belum' | 'sudah';

interface PatientRow {
    id: number;
    medical_record_number: string;
    name: string;
    age: number;
    gender: 'L' | 'P';
    gender_label: string;
    allergies: string[];
    has_prescription_today: boolean;
    queue_number: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPatients {
    data: PatientRow[];
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
    today: string;
    stats: {
        total_today: number;
        done_today: number;
        pending_today: number;
        progress_percent: number;
        prescriptions_today: number;
        waiting_pharmacy: number;
    };
    patients: PaginatedPatients;
    filters: {
        search: string;
        gender: GenderFilter;
        status: StatusFilter;
    };
    status_counts: {
        semua: number;
        belum: number;
        sudah: number;
    };
}

export default function DaftarPasien({ today, stats, patients, filters, status_counts }: PageProps) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user;

    const [search, setSearch] = useState(filters.search);
    const [gender, setGender] = useState<GenderFilter>(filters.gender);
    const [status, setStatus] = useState<StatusFilter>(filters.status);
    const [refreshing, setRefreshing] = useState(false);

    const navigate = (next: { search?: string; gender?: GenderFilter; status?: StatusFilter }) => {
        const nextSearch = next.search ?? search;
        const nextGender = next.gender ?? gender;
        const nextStatus = next.status ?? status;

        const params: Record<string, string> = {};

        if (nextSearch !== '') {
            params.search = nextSearch;
        }

        if (nextGender !== '') {
            params.gender = nextGender;
        }

        if (nextStatus !== '') {
            params.status = nextStatus;
        }

        router.get('/dokter', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = window.setTimeout(() => {
            const params: Record<string, string> = {};

            if (search !== '') {
                params.search = search;
            }

            if (gender !== '') {
                params.gender = gender;
            }

            if (status !== '') {
                params.status = status;
            }

            router.get('/dokter', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    const handleRefresh = () => {
        setRefreshing(true);

        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    const hasFilters = search !== '' || gender !== '' || status !== '';
    const progress = stats.progress_percent.toLocaleString('id-ID', { maximumFractionDigits: 1 });

    const resetFilters = () => {
        setSearch('');
        setGender('');
        setStatus('');
        router.get('/dokter', {}, { preserveScroll: true, replace: true });
    };

    return (
        <>
            <Head title="Dashboard Dokter" />
            <DokterLayout>
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-lg">
                    <div className="flex flex-col justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row sm:items-center">
                        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-secondary" />
                                <span className="font-label-md text-label-md font-semibold text-secondary">
                                    Praktik Aktif
                                </span>
                            </div>
                            <span className="hidden text-outline-variant sm:inline">•</span>
                            <p className="font-body-md text-body-md text-on-surface-variant">
                                Selamat datang,{' '}
                                <span className="font-semibold text-on-surface">{user?.name ?? 'Dokter'}</span> —
                                Rawat Jalan RS
                            </p>
                        </div>
                        <div className="flex items-center gap-2 font-label-sm text-label-sm text-outline">
                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                            <span>Hari ini, {today}</span>
                            <span className="hidden rounded-full bg-surface-container px-2 py-0.5 font-code-sm text-code-sm text-on-surface-variant md:inline">
                                Shift Pagi: 08.00 - 14.00
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <div className="group relative flex min-h-[140px] items-start justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
                            <div className="z-10 flex h-full flex-col justify-between gap-1">
                                <div>
                                    <span className="block font-label-sm text-label-sm tracking-wider text-outline uppercase">
                                        Antrean Terdaftar
                                    </span>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="font-display-lg text-display-lg leading-none font-bold text-on-surface">
                                            {stats.total_today}
                                        </span>
                                        <span className="flex items-center gap-0.5 font-label-sm text-label-sm font-medium text-primary">
                                            <span className="material-symbols-outlined text-[14px]">
                                                pending_actions
                                            </span>{' '}
                                            {stats.pending_today} belum diresepkan
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <span className="block font-headline-sm text-headline-sm font-semibold leading-tight text-on-surface">
                                        Pasien Hari Ini
                                    </span>
                                    <span className="mt-0.5 block font-body-sm text-body-sm text-outline">
                                        Pasien terdaftar hari ini
                                    </span>
                                </div>
                            </div>
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary transition-transform group-hover:scale-105">
                                <span
                                    className="material-symbols-outlined text-[26px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    groups
                                </span>
                            </div>
                        </div>

                        <div className="group relative flex min-h-[140px] items-start justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
                            <div className="z-10 flex h-full flex-col justify-between gap-1">
                                <div>
                                    <span className="block font-label-sm text-label-sm tracking-wider text-outline uppercase">
                                        Progres Peresepan
                                    </span>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="font-display-lg text-display-lg leading-none font-bold text-on-surface">
                                            {stats.prescriptions_today}
                                        </span>
                                        <span className="flex items-center gap-0.5 font-label-sm text-label-sm font-medium text-secondary">
                                            <span className="material-symbols-outlined text-[14px]">
                                                task_alt
                                            </span>{' '}
                                            {progress}% pasien selesai
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <span className="block font-headline-sm text-headline-sm font-semibold leading-tight text-on-surface">
                                        Resep Dibuat Hari Ini
                                    </span>
                                    <span className="mt-0.5 block font-body-sm text-body-sm text-outline">
                                        Selesai ditangani oleh dokter
                                    </span>
                                </div>
                            </div>
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-secondary transition-transform group-hover:scale-105">
                                <span
                                    className="material-symbols-outlined text-[26px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    assignment_turned_in
                                </span>
                            </div>
                        </div>

                        <div className="group relative flex min-h-[140px] items-start justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
                            <div className="z-10 flex h-full flex-col justify-between gap-1">
                                <div>
                                    <span className="block font-label-sm text-label-sm tracking-wider text-outline uppercase">
                                        Status Dispensing
                                    </span>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="font-display-lg text-display-lg leading-none font-bold text-on-surface">
                                            {stats.waiting_pharmacy}
                                        </span>
                                        <span className="flex items-center gap-0.5 font-label-sm text-label-sm font-medium text-tertiary">
                                            <span className="material-symbols-outlined text-[14px]">
                                                priority_high
                                            </span>{' '}
                                            Prioritas telaah
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <span className="block font-headline-sm text-headline-sm font-semibold leading-tight text-on-surface">
                                        Resep Menunggu Farmasi
                                    </span>
                                    <span className="mt-0.5 block font-body-sm text-body-sm text-outline">
                                        Dalam antrean telaah apoteker
                                    </span>
                                </div>
                            </div>
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary transition-transform group-hover:scale-105">
                                <span
                                    className="material-symbols-outlined text-[26px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    hourglass_top
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                        <div className="flex flex-col gap-space-md border-b border-surface-container-high/40 px-space-lg pt-space-lg pb-space-md">
                            <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
                                <div>
                                    <h2 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                                        Daftar Pasien Hari Ini
                                    </h2>
                                    <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                                        Daftar antrean pasien poli rawat jalan yang siap menerima telaah dan lembar
                                        resep
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                    <div className="flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface">
                                        <span className="material-symbols-outlined text-[18px] text-outline">
                                            wc
                                        </span>
                                        <span className="text-body-sm text-outline">Gender:</span>
                                        <select
                                            value={gender}
                                            onChange={(event) => {
                                                const value = event.target.value as GenderFilter;
                                                setGender(value);
                                                navigate({ gender: value });
                                            }}
                                            className="cursor-pointer bg-transparent pr-1 font-medium text-on-surface focus:outline-none"
                                        >
                                            <option value="">Semua</option>
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface">
                                        <span className="material-symbols-outlined text-[18px] text-outline">
                                            tune
                                        </span>
                                        <span className="text-body-sm text-outline">Status:</span>
                                        <select
                                            value={status}
                                            onChange={(event) => {
                                                const value = event.target.value as StatusFilter;
                                                setStatus(value);
                                                navigate({ status: value });
                                            }}
                                            className="cursor-pointer bg-transparent pr-1 font-medium text-on-surface focus:outline-none"
                                        >
                                            <option value="">Semua Status</option>
                                            <option value="belum">Belum Diresepkan</option>
                                            <option value="sudah">Sudah Diresepkan</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRefresh}
                                        title="Muat ulang data pasien"
                                        className="flex items-center gap-1.5 rounded-lg bg-surface-container px-3.5 py-1.5 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-high active:scale-95"
                                    >
                                        <span
                                            className={`material-symbols-outlined text-[18px] text-primary ${
                                                refreshing ? 'animate-spin' : ''
                                            }`}
                                        >
                                            sync
                                        </span>
                                        <span className="font-medium">Refresh</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col justify-between gap-space-md pt-1 sm:flex-row sm:items-center">
                                <div className="relative w-full sm:w-80">
                                    <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline">
                                        search
                                    </span>
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        type="search"
                                        placeholder="Cari nama pasien atau No. RM..."
                                        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low py-1.5 pr-space-md pl-9 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                                    {(
                                        [
                                            { key: '', label: 'Semua' },
                                            { key: 'belum', label: 'Belum Diresepkan' },
                                            { key: 'sudah', label: 'Sudah Diresepkan' },
                                        ] as const
                                    ).map((chip) => {
                                        const active = status === chip.key;
                                        const count =
                                            chip.key === ''
                                                ? status_counts.semua
                                                : status_counts[chip.key];

                                        return (
                                            <button
                                                key={chip.label}
                                                type="button"
                                                onClick={() => {
                                                    setStatus(chip.key);
                                                    navigate({ status: chip.key });
                                                }}
                                                className={`rounded-full px-3.5 py-1.5 font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                                                    active
                                                        ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                                        : 'bg-surface-container font-medium text-on-surface-variant hover:bg-surface-container-high'
                                                }`}
                                            >
                                                {chip.label} ({count})
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <table className="w-full border-collapse text-left font-body-md text-body-md">
                                <thead>
                                    <tr className="bg-surface-container-low font-label-sm text-label-sm tracking-wide text-on-surface-variant uppercase">
                                        <th className="px-space-md py-3 font-semibold">No. RM</th>
                                        <th className="px-space-md py-3 font-semibold">Nama Pasien</th>
                                        <th className="px-space-md py-3 font-semibold">Usia</th>
                                        <th className="px-space-md py-3 font-semibold">Jenis Kelamin</th>
                                        <th className="px-space-md py-3 font-semibold">Alergi Terdata</th>
                                        <th className="px-space-md py-3 font-semibold">Status Resep</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.data.map((patient, index) => (
                                        <tr
                                            key={patient.id}
                                            className={`border-b border-surface-container-low transition-colors hover:bg-surface-container-high/40 ${
                                                index % 2 === 0
                                                    ? 'bg-surface-container-lowest'
                                                    : 'bg-surface-container-low/30'
                                            }`}
                                        >
                                            <td className="px-space-md py-3 font-code-sm text-code-sm font-semibold whitespace-nowrap text-primary">
                                                {patient.medical_record_number}
                                            </td>
                                            <td className="px-space-md py-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-body-sm ${
                                                            patient.gender === 'P'
                                                                ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                                                                : 'bg-primary-fixed text-on-primary-fixed-variant'
                                                        }`}
                                                    >
                                                        {initials(patient.name)}
                                                    </div>
                                                    <div className="flex flex-col justify-center">
                                                        <Link
                                                            href={`/dokter/pasien/${patient.id}`}
                                                            className="block font-headline-sm text-body-md font-semibold leading-tight text-on-surface transition-colors hover:text-primary hover:underline"
                                                        >
                                                            {patient.name}
                                                        </Link>
                                                        <span className="font-body-sm text-body-sm text-outline">
                                                            Antrean #{String(patient.queue_number).padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-space-md py-3 whitespace-nowrap text-on-surface">
                                                {patient.age} Thn
                                            </td>
                                            <td className="px-space-md py-3 whitespace-nowrap text-on-surface-variant">
                                                {patient.gender_label}
                                            </td>
                                            <td className="px-space-md py-3">
                                                {patient.allergies.length === 0 ? (
                                                    <span className="font-body-sm text-body-sm whitespace-nowrap text-outline">
                                                        Tidak ada
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {patient.allergies.map((allergy) => (
                                                            <span
                                                                key={allergy}
                                                                className="inline-flex items-center gap-1 rounded-full bg-error-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container"
                                                            >
                                                                <span className="material-symbols-outlined text-[13px]">
                                                                    warning
                                                                </span>
                                                                {allergy}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-space-md py-3 whitespace-nowrap">
                                                {patient.has_prescription_today ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            check_circle
                                                        </span>
                                                        Sudah Diresepkan
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-surface-container-highest px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                                                        Belum Diresepkan
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {patients.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-space-md py-10 text-center">
                                                <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[32px] text-outline">
                                                        person_off
                                                    </span>
                                                    <p className="font-headline-sm text-body-md font-semibold text-on-surface">
                                                        {hasFilters
                                                            ? 'Tidak ada pasien yang cocok'
                                                            : 'Belum ada pasien terdaftar hari ini'}
                                                    </p>
                                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                                        {hasFilters
                                                            ? 'Coba ubah kata kunci atau filter yang dipilih.'
                                                            : 'Pasien yang didaftarkan hari ini akan muncul di sini.'}
                                                    </p>
                                                    {hasFilters && (
                                                        <button
                                                            type="button"
                                                            onClick={resetFilters}
                                                            className="mt-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                                                        >
                                                            Reset filter
                                                        </button>
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
                                {patients.total === 0 ? (
                                    'Tidak ada data'
                                ) : (
                                    <>
                                        Menampilkan{' '}
                                        <span className="font-semibold text-on-surface">
                                            {patients.from}–{patients.to}
                                        </span>{' '}
                                        dari{' '}
                                        <span className="font-semibold text-on-surface">
                                            {patients.total}
                                        </span>{' '}
                                        pasien
                                    </>
                                )}
                            </span>
                            <div className="flex items-center gap-1">
                                <PaginationArrow href={patients.prev_page_url} direction="prev" />
                                {patients.links
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
                                <PaginationArrow href={patients.next_page_url} direction="next" />
                            </div>
                        </div>
                    </div>

                    <div className="relative flex items-center gap-space-md overflow-hidden rounded-xl border border-surface-container-high/40 bg-surface-container-lowest p-space-md shadow-sm">
                        <div className="w-1.5 self-stretch rounded-full bg-primary" />
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                            <span className="material-symbols-outlined text-[22px]">health_and_safety</span>
                        </div>
                        <div className="flex flex-col pr-space-sm">
                            <span className="font-headline-sm text-body-lg font-semibold leading-tight text-on-surface">
                                Pemberitahuan Telaah Obat Terintegrasi
                            </span>
                            <p className="mt-0.5 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                                Sistem farmasi klinis secara otomatis memvalidasi interaksi obat ganda dan
                                kontraindikasi alergi terdata saat Anda mengklik tombol "Buat Resep". Pastikan
                                riwayat alergi pasien selalu dikonfirmasi sebelum menyelesaikan formulasi.
                            </p>
                        </div>
                    </div>
                </div>
            </DokterLayout>
        </>
    );
}

function PaginationArrow({ href, direction }: { href: string | null; direction: 'prev' | 'next' }) {
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
