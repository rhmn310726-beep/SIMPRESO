import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import DokterLayout from '@/layouts/DokterLayout';
import type { SharedProps } from '@/types';

interface PatientRow {
    id: number;
    medical_record_number: string;
    nik: string | null;
    name: string;
    age: number;
    gender: 'L' | 'P';
    gender_label: string;
    phone: string | null;
    allergies_count: number;
    registered_at_label: string | null;
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
    patients: PaginatedPatients;
    filters: {
        search: string;
    };
}

export default function PilihPasien({ patients, filters }: PageProps) {
    const { flash } = usePage<SharedProps>().props;
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = window.setTimeout(() => {
            const params: Record<string, string> = {};

            if (search !== '') {
                params.search = search;
            }

            router.get('/dokter/pasien', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search, filters.search]);

    return (
        <DokterLayout>
            <Head title="Detail Pasien" />

            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-md">
                {flash.success && (
                    <div className="flex items-start gap-3 rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        <p className="font-body-md text-body-md leading-relaxed">{flash.success}</p>
                    </div>
                )}

                {flash.error && (
                    <div className="flex items-start gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
                        <span className="material-symbols-outlined text-[20px]">error</span>
                        <p className="font-body-md text-body-md leading-relaxed">{flash.error}</p>
                    </div>
                )}

                <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-end">
                    <div>
                        <p className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                            Portal Dokter
                        </p>
                        <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                            Detail Pasien
                        </h1>
                        <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                            Cari dan pilih pasien untuk membuka rekam medis, riwayat alergi, dan resep.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-on-surface-variant shadow-sm sm:self-auto">
                        <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
                        <span className="font-semibold text-on-surface">{patients.total}</span>
                        pasien terdaftar
                    </span>
                </div>

                <div className="flex flex-col justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-md">
                        <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline">
                            search
                        </span>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            type="search"
                            placeholder="Cari nama pasien, No. RM, atau NIK..."
                            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low py-2 pr-space-md pl-9 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    {filters.search !== '' && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="inline-flex items-center gap-1.5 self-start rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high sm:self-auto"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Reset pencarian
                        </button>
                    )}
                </div>

                <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-surface-container-high/60 bg-surface-container-low/50 font-label-sm text-label-sm tracking-wider text-outline uppercase">
                                    <th className="px-space-md py-3 font-semibold">Pasien</th>
                                    <th className="px-space-md py-3 font-semibold">NIK</th>
                                    <th className="px-space-md py-3 font-semibold">Usia / Gender</th>
                                    <th className="px-space-md py-3 font-semibold">Kontak</th>
                                    <th className="px-space-md py-3 font-semibold">Alergi</th>
                                    <th className="px-space-md py-3 font-semibold">Terdaftar</th>
                                    <th className="px-space-md py-3 text-right font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container-high/40">
                                {patients.data.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="group transition-colors hover:bg-surface-container-low/60"
                                    >
                                        <td className="px-space-md py-3">
                                            <div className="flex items-center gap-space-sm">
                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-md text-label-md font-bold text-primary">
                                                    {initials(patient.name)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <Link
                                                        href={`/dokter/pasien/${patient.id}`}
                                                        className="font-body-md text-body-md font-semibold text-on-surface transition-colors group-hover:text-primary"
                                                    >
                                                        {patient.name}
                                                    </Link>
                                                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                                                        No. RM: {patient.medical_record_number}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-space-md py-3 font-body-sm text-body-sm whitespace-nowrap text-on-surface-variant">
                                            {patient.nik ?? '-'}
                                        </td>
                                        <td className="px-space-md py-3 font-body-sm text-body-sm whitespace-nowrap text-on-surface-variant">
                                            {patient.age} tahun · {patient.gender_label}
                                        </td>
                                        <td className="px-space-md py-3 font-body-sm text-body-sm whitespace-nowrap text-on-surface-variant">
                                            {patient.phone ?? '-'}
                                        </td>
                                        <td className="px-space-md py-3 whitespace-nowrap">
                                            {patient.allergies_count > 0 ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-error-container">
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        warning
                                                    </span>
                                                    {patient.allergies_count} alergi
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-surface-container-highest px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                                                    Tidak ada
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-space-md py-3 font-body-sm text-body-sm whitespace-nowrap text-on-surface-variant">
                                            {patient.registered_at_label ?? '-'}
                                        </td>
                                        <td className="px-space-md py-3 text-right">
                                            <Link
                                                href={`/dokter/pasien/${patient.id}`}
                                                className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-primary transition-colors hover:bg-primary hover:text-on-primary"
                                            >
                                                Lihat Detail
                                                <span className="material-symbols-outlined text-[16px]">
                                                    arrow_forward
                                                </span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}

                                {patients.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-space-md py-12 text-center">
                                            <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[32px] text-outline">
                                                    person_search
                                                </span>
                                                <p className="font-headline-sm text-body-md font-semibold text-on-surface">
                                                    {filters.search !== ''
                                                        ? 'Pasien tidak ditemukan'
                                                        : 'Belum ada pasien terdaftar'}
                                                </p>
                                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                                    {filters.search !== ''
                                                        ? 'Coba gunakan nama, No. RM, atau NIK lain.'
                                                        : 'Pasien yang didaftarkan akan muncul di sini.'}
                                                </p>
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
                                    <span className="font-semibold text-on-surface">{patients.total}</span>{' '}
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
            </div>
        </DokterLayout>
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
