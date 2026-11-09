import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import type { SharedProps } from '@/types';

interface PrescriptionHistory {
    id: number;
    number: string;
    status: string;
    status_label: string;
    created_at: string | null;
}

interface PatientRow {
    id: number;
    medical_record_number: string;
    nik: string | null;
    name: string;
    date_of_birth: string | null;
    age: number;
    gender: 'L' | 'P';
    gender_label: string;
    phone: string | null;
    address: string | null;
    allergies: string[];
    allergies_count: number;
    prescriptions: PrescriptionHistory[];
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

interface Filters {
    search: string;
    gender: string;
    allergy: boolean;
}

interface PageProps {
    patients: PaginatedPatients;
    filters: Filters;
    stats: {
        total: number;
        with_allergies: number;
        allergy_percent: number;
        new_this_month: number;
        new_last_month: number;
        growth_percent: number | null;
        period: string;
    };
    next_medical_record_number: string;
}

interface PatientForm {
    medical_record_number: string;
    nik: string;
    name: string;
    age: number;
    gender: '' | 'L' | 'P';
    phone: string;
    allergy: string;
}

const numberFormatter = new Intl.NumberFormat('id-ID');

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none';

const selectClass = `${inputClass} cursor-pointer appearance-none pr-9`;

const emptyForm = (medicalRecordNumber: string): PatientForm => ({
    medical_record_number: medicalRecordNumber,
    nik: '',
    name: '',
    age: 0,
    gender: '',
    phone: '',
    allergy: '',
});

export default function Pasien({
    patients,
    filters,
    stats,
    next_medical_record_number,
}: PageProps) {
    const { flash } = usePage<SharedProps>().props;

    const [search, setSearch] = useState(filters.search);
    const [gender, setGender] = useState(filters.gender);
    const [onlyAllergy, setOnlyAllergy] = useState(filters.allergy);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<PatientRow | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PatientRow | null>(null);
    const [historyTarget, setHistoryTarget] = useState<PatientRow | null>(null);
    const [menu, setMenu] = useState<{
        patient: PatientRow;
        top: number;
        left: number;
    } | null>(null);

    const form = useForm<PatientForm>(emptyForm(next_medical_record_number));

    const { data, setData, post, put, processing, errors, reset, clearErrors } = form;

    const navigate = (next: Partial<Filters>) => {
        const nextSearch = next.search ?? search;
        const nextGender = next.gender ?? gender;
        const nextAllergy = next.allergy ?? onlyAllergy;

        const params: Record<string, string | number> = {};

        if (nextSearch !== '') {
            params.search = nextSearch;
        }

        if (nextGender !== '') {
            params.gender = nextGender;
        }

        if (nextAllergy) {
            params.allergy = 1;
        }

        router.get('/admin/pasien', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = setTimeout(() => {
            const params: Record<string, string | number> = {};

            if (search !== '') {
                params.search = search;
            }

            if (gender !== '') {
                params.gender = gender;
            }

            if (onlyAllergy) {
                params.allergy = 1;
            }

            router.get('/admin/pasien', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setData(emptyForm(next_medical_record_number));
        setFormOpen(true);
    };

    const openEdit = (patient: PatientRow) => {
        reset();
        clearErrors();
        setEditing(patient);
        setData({
            medical_record_number: patient.medical_record_number,
            nik: patient.nik ?? '',
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            phone: patient.phone ?? '',
            allergy: patient.allergies.join(', '),
        });
        setMenu(null);
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
            put(`/admin/pasien/${editing.id}`, options);
        } else {
            post('/admin/pasien', options);
        }
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/admin/pasien/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const openMenu = (patient: PatientRow, event: ReactMouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const width = 192;
        const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
        const top = Math.min(rect.bottom + 6, window.innerHeight - 168);

        setMenu({ patient, top, left });
    };

    const hasFilters = search !== '' || gender !== '' || onlyAllergy;

    return (
        <>
            <Head title="Data Pasien" />

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

                <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase">
                                Rekam Medis &amp; Pasien
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">
                            Daftar Pasien
                        </h1>
                        <p className="mt-0.5 max-w-2xl text-sm text-slate-600">
                            Pusat data demografis, kontak, dan riwayat alergi pasien untuk mendukung
                            keselamatan pemberian obat.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href="/admin/pasien/export"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-brand-600"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            <span>Ekspor CSV</span>
                        </a>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-[0.99]"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>Tambah Pasien</span>
                        </button>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatPanel
                        label="Total Pasien Terdaftar"
                        value={stats.total}
                        suffix="jiwa"
                        tone="brand"
                        badge="Rekam Medis Aktif"
                        icon={<UsersIcon className="h-6 w-6" />}
                    />
                    <StatPanel
                        label="Pasien dengan Alergi"
                        value={stats.with_allergies}
                        suffix="pasien berisiko"
                        tone="danger"
                        badge="Perhatian"
                        footer={`${numberFormatter.format(stats.allergy_percent)}% dari total pasien`}
                        icon={<ShieldAlertIcon className="h-6 w-6" />}
                    />
                    <StatPanel
                        label="Pasien Baru Bulan Ini"
                        value={stats.new_this_month}
                        suffix="pendaftaran"
                        tone="teal"
                        badge={growthLabel(stats.growth_percent)}
                        footer={`Periode berjalan: ${stats.period}`}
                        icon={<UserPlusIcon className="h-6 w-6" />}
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
                                placeholder="Cari nama pasien atau No. RM..."
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                            <div className="relative min-w-[170px] flex-1 sm:flex-initial">
                                <select
                                    value={gender}
                                    onChange={(event) => {
                                        setGender(event.target.value);
                                        navigate({ gender: event.target.value });
                                    }}
                                    className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                >
                                    <option value="">Jenis Kelamin: Semua</option>
                                    <option value="L">Laki-laki</option>
                                    <option value="P">Perempuan</option>
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>

                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={onlyAllergy}
                                    onChange={(event) => {
                                        setOnlyAllergy(event.target.checked);
                                        navigate({ allergy: event.target.checked });
                                    }}
                                    className="h-4 w-4 rounded accent-brand-500"
                                />
                                Hanya yang punya alergi
                            </label>

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setGender('');
                                        setOnlyAllergy(false);
                                        router.get(
                                            '/admin/pasien',
                                            {},
                                            { preserveScroll: true, replace: true },
                                        );
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                    <th className="px-4 py-3.5">No. RM</th>
                                    <th className="px-4 py-3.5">Nama</th>
                                    <th className="px-4 py-3.5">Usia</th>
                                    <th className="px-4 py-3.5">Jenis Kelamin</th>
                                    <th className="px-4 py-3.5">No. Telepon</th>
                                    <th className="px-4 py-3.5">Alergi</th>
                                    <th className="px-4 py-3.5 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {patients.data.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="transition-colors hover:bg-slate-50/80"
                                    >
                                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-brand-600">
                                            {patient.medical_record_number}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                        patient.gender === 'L'
                                                            ? 'bg-sky-50 text-sky-600'
                                                            : 'bg-violet-50 text-violet-600'
                                                    }`}
                                                >
                                                    {initials(patient.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                        {patient.name}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {patient.nik
                                                            ? `NIK ${patient.nik}`
                                                            : 'NIK belum diisi'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 font-medium text-slate-700">
                                            {numberFormatter.format(patient.age)} th
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                    patient.gender === 'L'
                                                        ? 'bg-sky-50 text-sky-700'
                                                        : 'bg-violet-50 text-violet-700'
                                                }`}
                                            >
                                                {patient.gender_label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600">
                                            {patient.phone || '-'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <AllergyTags allergies={patient.allergies} />
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <button
                                                type="button"
                                                onClick={(event) => openMenu(patient, event)}
                                                title="Aksi pasien"
                                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <MoreVerticalIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {patients.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                    <UsersIcon className="h-6 w-6" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    Belum ada data pasien
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {hasFilters
                                                        ? 'Tidak ada pasien yang cocok dengan filter. Coba ubah kata kunci.'
                                                        : 'Daftarkan pasien pertama untuk mulai membangun rekam medis.'}
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
                            {patients.total === 0 ? (
                                'Tidak ada data'
                            ) : (
                                <>
                                    Menampilkan{' '}
                                    <span className="font-semibold text-slate-800">
                                        {patients.from}–{patients.to}
                                    </span>{' '}
                                    dari{' '}
                                    <span className="font-semibold text-slate-800">
                                        {numberFormatter.format(patients.total)}
                                    </span>{' '}
                                    pasien
                                </>
                            )}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <PaginationArrow href={patients.prev_page_url} direction="prev" />
                            {patients.links
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
                            <PaginationArrow href={patients.next_page_url} direction="next" />
                        </div>
                    </div>
                </div>
            </AdminLayout>

            {menu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                    <div
                        className="fixed z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                        style={{ top: menu.top, left: menu.left }}
                    >
                        <button
                            type="button"
                            onClick={() => openEdit(menu.patient)}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <PencilIcon className="h-4 w-4 text-slate-400" />
                            Edit Data
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setHistoryTarget(menu.patient);
                                setMenu(null);
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <HistoryIcon className="h-4 w-4 text-slate-400" />
                            Lihat Riwayat
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteTarget(menu.patient);
                                setMenu(null);
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                            <TrashIcon className="h-4 w-4 text-red-500" />
                            Hapus
                        </button>
                    </div>
                </>
            )}

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
                                    <UserPlusIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        {editing ? 'Edit Data Pasien' : 'Tambah Pasien Baru'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Lengkapi data demografis, kontak, dan riwayat alergi pasien.
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
                                <Field
                                    label="No. Rekam Medis"
                                    required
                                    error={errors.medical_record_number}
                                    hint="Dibuat otomatis oleh sistem."
                                >
                                    <input
                                        type="text"
                                        value={data.medical_record_number}
                                        readOnly
                                        className={`${inputClass} cursor-not-allowed bg-slate-100 font-mono text-xs font-semibold text-brand-600`}
                                    />
                                </Field>
                                <Field label="NIK (KTP)" error={errors.nik}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={16}
                                        value={data.nik}
                                        onChange={(event) =>
                                            setData(
                                                'nik',
                                                event.target.value.replace(/\D/g, '').slice(0, 16),
                                            )
                                        }
                                        placeholder="16 digit NIK"
                                        className={`${inputClass} font-mono`}
                                    />
                                </Field>
                            </div>

                            <Field label="Nama Lengkap" required error={errors.name}>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(event) => setData('name', event.target.value)}
                                    placeholder="Contoh: Ahmad Fauzi"
                                    className={inputClass}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Usia"
                                    required
                                    error={errors.age}
                                    hint="Dalam satuan tahun."
                                >
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={0}
                                            max={130}
                                            value={data.age}
                                            onChange={(event) =>
                                                setData(
                                                    'age',
                                                    event.target.value === ''
                                                        ? 0
                                                        : Number(event.target.value),
                                                )
                                            }
                                            className={`${inputClass} pr-14`}
                                        />
                                        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-medium text-slate-400">
                                            tahun
                                        </span>
                                    </div>
                                </Field>
                                <Field
                                    label="Jenis Kelamin"
                                    required
                                    error={errors.gender}
                                >
                                    <div className="relative">
                                        <select
                                            value={data.gender}
                                            onChange={(event) =>
                                                setData(
                                                    'gender',
                                                    event.target.value as '' | 'L' | 'P',
                                                )
                                            }
                                            className={selectClass}
                                        >
                                            <option value="">Pilih Jenis Kelamin</option>
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </Field>
                            </div>

                            <Field
                                label="No. Telepon (WhatsApp)"
                                required
                                error={errors.phone}
                            >
                                <div className="relative">
                                    <PhoneIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={data.phone}
                                        onChange={(event) => setData('phone', event.target.value)}
                                        placeholder="Contoh: 0812 3456 7890"
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                            </Field>

                            <Field
                                label="Riwayat Alergi Obat"
                                error={errors.allergy}
                                hint="Pisahkan beberapa alergi dengan tanda koma, contoh: Penisilin, Sulfa."
                            >
                                <textarea
                                    rows={2}
                                    value={data.allergy}
                                    onChange={(event) => setData('allergy', event.target.value)}
                                    placeholder="Belum ada alergi tercatat"
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
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Pasien'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {historyTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={() => setHistoryTarget(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/60 p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <HistoryIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        Riwayat Resep Pasien
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {historyTarget.name} · {historyTarget.medical_record_number}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHistoryTarget(null)}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto p-4">
                            {historyTarget.prescriptions.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                        <FileIcon className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">
                                        Belum ada riwayat resep
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Pasien ini belum pernah menerima resep elektronik.
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {historyTarget.prescriptions.map((prescription) => (
                                        <li
                                            key={prescription.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                                        >
                                            <div>
                                                <p className="font-mono text-xs font-semibold text-brand-600">
                                                    {prescription.number}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {formatDate(prescription.created_at)}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status={prescription.status}
                                                label={prescription.status_label}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex justify-end border-t border-slate-100 p-4">
                            <button
                                type="button"
                                onClick={() => setHistoryTarget(null)}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                Tutup
                            </button>
                        </div>
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
                        <h3 className="text-lg font-bold text-slate-900">Hapus Data Pasien?</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            <span className="font-semibold text-slate-800">
                                {deleteTarget.name}
                            </span>{' '}
                            beserta seluruh catatan alerginya akan dihapus. Pasien dengan riwayat
                            resep tidak dapat dihapus.
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

function AllergyTags({ allergies }: { allergies: string[] }) {
    if (allergies.length === 0) {
        return <span className="text-xs text-slate-400 italic">Tidak ada</span>;
    }

    const visible = allergies.slice(0, 2);
    const remaining = allergies.length - visible.length;

    return (
        <div className="flex flex-wrap items-center gap-1">
            {visible.map((allergy) => (
                <span
                    key={allergy}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600"
                >
                    <span className="h-1 w-1 rounded-full bg-red-500" />
                    {allergy}
                </span>
            ))}
            {remaining > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    +{remaining}
                </span>
            )}
        </div>
    );
}

function StatPanel({
    label,
    value,
    suffix,
    tone,
    badge,
    footer,
    icon,
}: {
    label: string;
    value: number;
    suffix: string;
    tone: 'brand' | 'teal' | 'danger';
    badge?: string;
    footer?: string;
    icon: ReactNode;
}) {
    const tones = {
        brand: {
            icon: 'bg-brand-50 text-brand-600',
            value: 'text-slate-900',
            badge: 'bg-slate-100 text-slate-500',
        },
        teal: {
            icon: 'bg-emerald-50 text-emerald-600',
            value: 'text-emerald-600',
            badge: 'bg-emerald-50 text-emerald-700',
        },
        danger: {
            icon: 'bg-red-50 text-red-600',
            value: 'text-red-600',
            badge: 'bg-red-50 text-red-600',
        },
    } as const;

    const style = tones[tone];

    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft-card">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        {label}
                    </span>
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

            <div className="mt-3 flex items-center gap-2">
                {badge && (
                    <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}
                    >
                        {badge}
                    </span>
                )}
                {footer && <span className="text-[11px] text-slate-500">{footer}</span>}
            </div>
        </div>
    );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
    const tone = (() => {
        switch (status) {
            case 'diserahkan':
                return 'bg-emerald-50 text-emerald-700';
            case 'dibatalkan':
                return 'bg-slate-100 text-slate-500';
            case 'siap_diambil':
                return 'bg-sky-50 text-sky-700';
            case 'disiapkan':
                return 'bg-violet-50 text-violet-700';
            case 'diterima':
                return 'bg-amber-50 text-amber-700';
            default:
                return 'bg-slate-100 text-slate-600';
        }
    })();

    return (
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
            {label}
        </span>
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

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

function growthLabel(growth: number | null): string {
    if (growth === null) {
        return 'Baru';
    }

    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
}

function formatDate(value: string | null): string {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
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

function MoreVerticalIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
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

function HistoryIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M3 12a9 9 0 109-9 9 9 0 00-7.5 4M3 4v5h5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FileIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M6 2h8l4 4v16H6V2z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M14 2v4h4M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PhoneIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path
                d="M2.5 20a6.5 6.5 0 0113 0M16 5.2a3.5 3.5 0 010 5.6M18 20a6.5 6.5 0 00-2-4.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function UserPlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path
                d="M2.5 20a6.5 6.5 0 0113 0M19 8v6M16 11h6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ShieldAlertIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6l7-3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 8v4m0 3h.01" strokeLinecap="round" strokeLinejoin="round" />
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

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24">
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="42"
                strokeDashoffset="14"
            />
        </svg>
    );
}
