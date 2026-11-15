import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import DokterLayout from '@/layouts/DokterLayout';
import type { SharedProps } from '@/types';

type SeverityValue = 'ringan' | 'sedang' | 'berat';

interface AllergyRow {
    id: number;
    allergen: string;
    note: string | null;
}

interface PatientDetail {
    id: number;
    medical_record_number: string;
    nik: string | null;
    name: string;
    date_of_birth_label: string | null;
    age: number;
    gender_label: string;
    phone: string | null;
    address: string | null;
    registered_at_label: string | null;
    allergies: AllergyRow[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPatients {
    data: PatientOption[];
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

interface PatientOption {
    id: number;
    medical_record_number: string;
    name: string;
    age: number;
    gender_label: string;
    phone: string | null;
    allergies_count: number;
    registered_at_label: string | null;
}

interface MedicineOption {
    id: number;
    name: string;
    active_ingredient: string;
    category: string | null;
    unit: string;
    strength: string | null;
    stock: number;
    minimum_stock: number;
}

interface AllergyRuleRow {
    active_ingredient: string;
    drug_group: string | null;
    allergen_name: string;
    severity: SeverityValue;
    severity_label: string;
    example_medicines: string[];
}

interface InteractionRow {
    medicine_a_id: number;
    medicine_b_id: number;
    severity: SeverityValue;
    severity_label: string;
    recommendation: string;
}

interface AllergyMatch {
    allergen: string;
    detail: string;
    severity: SeverityValue | null;
}

interface InteractionMatch {
    key: string;
    labelA: string;
    labelB: string;
    severity: SeverityValue;
    severity_label: string;
    recommendation: string;
}

interface SelectedItem {
    key: string;
    medicine: MedicineOption;
    dosage: string;
    quantity: string;
    instructions: string;
}

interface PrescriptionFormData {
    patient_id: number;
    notes: string;
    items: {
        medicine_id: number;
        dosage: string;
        quantity: number;
        instructions: string;
    }[];
}

interface PageProps {
    patient: PatientDetail | null;
    patient_options: PaginatedPatients;
    patients_count: number;
    medicines: MedicineOption[];
    allergy_rules: AllergyRuleRow[];
    interactions: InteractionRow[];
    filters: {
        search: string;
    };
    today: string;
}

const inputClass =
    'w-full rounded-lg border-0 bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none';

const labelClass =
    'mb-1 block font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase';

const SEVERITY_STYLES: Record<SeverityValue, string> = {
    ringan: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    sedang: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    berat: 'bg-error-container text-on-error-container',
};

export default function BuatResep({
    patient,
    patient_options,
    patients_count,
    medicines,
    allergy_rules,
    interactions,
    filters,
    today,
}: PageProps) {
    const { auth, flash } = usePage<SharedProps>().props;
    const [search, setSearch] = useState(filters.search);
    const [items, setItems] = useState<SelectedItem[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [medicineSearch, setMedicineSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [safeOnly, setSafeOnly] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const form = useForm<PrescriptionFormData>({
        patient_id: patient?.id ?? 0,
        notes: '',
        items: [],
    });

    useEffect(() => {
        if (patient !== null || search === filters.search) {
            return;
        }

        const timer = window.setTimeout(() => {
            const params: Record<string, string> = {};

            if (search !== '') {
                params.search = search;
            }

            router.get('/dokter/resep', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search, filters.search, patient]);

    useEffect(() => {
        if (!modalOpen) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setModalOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [modalOpen]);

    useEffect(() => {
        if (notice === null) {
            return;
        }

        const timer = window.setTimeout(() => setNotice(null), 3200);

        return () => window.clearTimeout(timer);
    }, [notice]);

    const categoryOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    medicines
                        .map((medicine) => medicine.category)
                        .filter((category): category is string => category !== null && category !== ''),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [medicines],
    );

    const selectedMedicineIds = useMemo(
        () => new Set(items.map((item) => item.medicine.id)),
        [items],
    );

    const allergyWarnings = useMemo(() => {
        if (patient === null) {
            return [];
        }

        return items
            .map((item) => ({
                item,
                match: findAllergyMatch(item.medicine, patient.allergies, allergy_rules),
            }))
            .filter(
                (entry): entry is { item: SelectedItem; match: AllergyMatch } =>
                    entry.match !== null,
            );
    }, [items, patient, allergy_rules]);

    const interactionWarnings = useMemo(
        () => findInteractions(items, interactions, medicines),
        [items, interactions, medicines],
    );

    const filteredMedicines = useMemo(() => {
        const query = medicineSearch.trim().toLowerCase();

        return medicines.filter((medicine) => {
            if (categoryFilter !== '' && medicine.category !== categoryFilter) {
                return false;
            }

            if (
                safeOnly &&
                patient !== null &&
                findAllergyMatch(medicine, patient.allergies, allergy_rules) !== null
            ) {
                return false;
            }

            if (query === '') {
                return true;
            }

            const haystack =
                `${medicine.name} ${medicine.active_ingredient} ${medicine.category ?? ''}`.toLowerCase();

            return haystack.includes(query);
        });
    }, [medicines, medicineSearch, categoryFilter, safeOnly, patient, allergy_rules]);

    const totalQuantity = items.reduce(
        (total, item) => total + (Number.parseInt(item.quantity, 10) || 0),
        0,
    );
    const warningCount = allergyWarnings.length + interactionWarnings.length;
    const formErrors = form.errors as unknown as Record<string, string | undefined>;
    const generalError = formErrors.patient_id ?? formErrors.items ?? formErrors.notes;

    if (patient === null) {
        return (
            <>
                <Head title="Buat Resep - Pilih Pasien" />
                <DokterLayout>
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-space-md">
                        {flash.success && (
                            <div className="flex items-start gap-3 rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container">
                                <span className="material-symbols-outlined text-[20px]">
                                    check_circle
                                </span>
                                <p className="font-body-md text-body-md leading-relaxed">
                                    {flash.success}
                                </p>
                            </div>
                        )}

                        {flash.error && (
                            <div className="flex items-start gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
                                <span className="material-symbols-outlined text-[20px]">error</span>
                                <p className="font-body-md text-body-md leading-relaxed">
                                    {flash.error}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-end">
                            <div>
                                <p className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                    Portal Dokter
                                </p>
                                <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                                    Buat Resep Elektronik
                                </h1>
                                <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                                    Pilih pasien terlebih dahulu untuk mulai menyusun resep.
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-on-surface-variant shadow-sm sm:self-auto">
                                <span className="material-symbols-outlined text-[18px] text-primary">
                                    groups
                                </span>
                                <span className="font-semibold text-on-surface">
                                    {patients_count}
                                </span>
                                pasien terdaftar
                            </span>
                        </div>

                        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
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
                        </div>

                        <div className="grid grid-cols-1 gap-space-sm md:grid-cols-2">
                            {patient_options.data.map((option) => (
                                <Link
                                    key={option.id}
                                    href={`/dokter/resep?patient=${option.id}`}
                                    className="group flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex min-w-0 items-center gap-space-sm">
                                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-md text-label-md font-bold text-primary">
                                            {initials(option.name)}
                                        </div>
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate font-body-md text-body-md font-semibold text-on-surface transition-colors group-hover:text-primary">
                                                {option.name}
                                            </span>
                                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                                                No. RM: {option.medical_record_number} ·{' '}
                                                {option.age} tahun · {option.gender_label}
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                                                <span className="material-symbols-outlined text-[14px]">
                                                    phone
                                                </span>
                                                {option.phone ?? 'Tidak ada kontak'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                                        {option.allergies_count > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container">
                                                <span className="material-symbols-outlined text-[14px]">
                                                    warning
                                                </span>
                                                {option.allergies_count} alergi
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                                                Tanpa alergi
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold text-primary">
                                            Pilih
                                            <span className="material-symbols-outlined text-[16px]">
                                                arrow_forward
                                            </span>
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {patient_options.data.length === 0 && (
                            <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-container-lowest p-12 text-center shadow-sm">
                                <span className="material-symbols-outlined text-[36px] text-outline">
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
                        )}

                        <div className="flex flex-col items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {patient_options.total === 0 ? (
                                    'Tidak ada data'
                                ) : (
                                    <>
                                        Menampilkan{' '}
                                        <span className="font-semibold text-on-surface">
                                            {patient_options.from}–{patient_options.to}
                                        </span>{' '}
                                        dari{' '}
                                        <span className="font-semibold text-on-surface">
                                            {patient_options.total}
                                        </span>{' '}
                                        pasien
                                    </>
                                )}
                            </span>
                            <div className="flex items-center gap-2">
                                {patient_options.prev_page_url ? (
                                    <Link
                                        href={patient_options.prev_page_url}
                                        preserveScroll
                                        className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            chevron_left
                                        </span>
                                        Sebelumnya
                                    </Link>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-outline opacity-50">
                                        <span className="material-symbols-outlined text-[16px]">
                                            chevron_left
                                        </span>
                                        Sebelumnya
                                    </span>
                                )}
                                {patient_options.next_page_url ? (
                                    <Link
                                        href={patient_options.next_page_url}
                                        preserveScroll
                                        className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                                    >
                                        Berikutnya
                                        <span className="material-symbols-outlined text-[16px]">
                                            chevron_right
                                        </span>
                                    </Link>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-outline opacity-50">
                                        Berikutnya
                                        <span className="material-symbols-outlined text-[16px]">
                                            chevron_right
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </DokterLayout>
            </>
        );
    }

    const syncItems = (nextItems: SelectedItem[]) => {
        setItems(nextItems);
        form.setData(
            'items',
            nextItems.map((item) => ({
                medicine_id: item.medicine.id,
                dosage: item.dosage,
                quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
                instructions: item.instructions,
            })),
        );
    };

    const openFormularium = (onlySafe = false) => {
        setMedicineSearch('');
        setCategoryFilter('');
        setSafeOnly(onlySafe);
        setModalOpen(true);
    };

    const addMedicine = (medicine: MedicineOption) => {
        if (medicine.stock <= 0) {
            return;
        }

        if (selectedMedicineIds.has(medicine.id)) {
            setNotice(`${medicine.name} sudah ada di resep.`);
            return;
        }

        syncItems([
            ...items,
            {
                key: `${medicine.id}-${Date.now()}`,
                medicine,
                dosage: medicine.strength ?? '',
                quantity: '1',
                instructions: '',
            },
        ]);
        setModalOpen(false);
        setNotice(`${medicine.name} ditambahkan ke resep.`);
    };

    const updateItem = (
        key: string,
        patch: Partial<Pick<SelectedItem, 'dosage' | 'quantity' | 'instructions'>>,
    ) => {
        syncItems(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    };

    const removeItem = (key: string) => {
        syncItems(items.filter((item) => item.key !== key));
        form.clearErrors();
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post('/dokter/resep', {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <>
            <Head title={`Buat Resep - ${patient.name}`} />
            <DokterLayout>
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

                    <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
                        <div className="flex items-center gap-space-sm">
                            <Link
                                href="/dokter"
                                aria-label="Kembali ke daftar pasien"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container-high hover:text-primary"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </Link>
                            <div className="flex items-center gap-2 font-label-md text-label-md">
                                <Link
                                    href="/dokter"
                                    className="text-outline transition-colors hover:text-primary"
                                >
                                    Daftar Pasien
                                </Link>
                                <span className="text-outline-variant">/</span>
                                <span className="font-semibold text-on-surface">Buat Resep</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-surface-variant shadow-sm">
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                    calendar_today
                                </span>
                                Tgl: {today}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/40 px-2.5 py-1 font-label-sm text-label-sm font-semibold text-secondary">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                                Rawat Jalan
                            </span>
                        </div>
                    </div>

                    <div className="relative flex flex-col justify-between gap-space-md overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm md:flex-row md:items-center">
                        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary-fixed/30 blur-2xl" />
                        <div className="relative z-10 flex items-center gap-space-md">
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed font-headline-lg text-headline-lg font-bold text-primary shadow-inner">
                                {initials(patient.name)}
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                                <h1 className="truncate font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                                    {patient.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                                    <span className="font-semibold text-primary">
                                        No. RM: {patient.medical_record_number}
                                    </span>
                                    <span className="text-outline-variant">•</span>
                                    <span>{patient.age} tahun</span>
                                    <span className="text-outline-variant">•</span>
                                    <span>{patient.gender_label}</span>
                                    <span className="text-outline-variant">•</span>
                                    <span>NIK: {patient.nik ?? '-'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[15px]">
                                        medical_services
                                    </span>
                                    Dokter: {auth.user?.name ?? '-'}
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/dokter/resep"
                            className="relative z-10 flex flex-shrink-0 items-center gap-2 self-start rounded-lg bg-surface-container-low px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container-high md:self-auto"
                        >
                            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                            Ganti Pasien
                        </Link>
                    </div>

                    {patient.allergies.length > 0 ? (
                        <div className="rounded-xl border-l-4 border-error bg-error-container/35 p-space-md shadow-sm">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[22px] text-error">
                                        warning
                                    </span>
                                    <div>
                                        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                            Peringatan Alergi Pasien
                                        </h2>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                                            Sistem akan menandai obat yang cocok dengan alergi ini.
                                            Peringatan bersifat non-blocking.
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex w-fit items-center rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container">
                                    {patient.allergies.length} alergen terdata
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {patient.allergies.map((allergy) => (
                                    <span
                                        key={allergy.id}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-error-container shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            emergency
                                        </span>
                                        {allergy.allergen}
                                        {allergy.note !== null && (
                                            <span className="font-normal text-on-surface-variant">
                                                · {allergy.note}
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl bg-secondary-container/30 p-space-md text-on-secondary-container shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">
                                verified_user
                            </span>
                            <p className="font-body-sm text-body-sm">
                                Tidak ada data alergi yang tercatat untuk pasien ini.
                            </p>
                        </div>
                    )}

                    <form
                        id="prescription-form"
                        onSubmit={submit}
                        className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-12"
                    >
                        <div className="flex flex-col gap-space-md xl:col-span-8">
                            <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[22px] text-primary">
                                            medication
                                        </span>
                                        <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                                            Obat yang Diresepkan
                                        </h2>
                                        <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-primary-fixed-variant">
                                            {items.length} item
                                        </span>
                                    </div>
                                    <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                                        Lengkapi dosis, jumlah, dan aturan pakai untuk setiap obat.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openFormularium()}
                                    className="inline-flex items-center gap-1.5 self-start rounded-lg bg-primary-container px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary sm:self-auto"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Tambah Obat
                                </button>
                            </div>

                            {generalError && (
                                <div className="flex items-start gap-2 rounded-lg bg-error-container px-3 py-2 text-on-error-container">
                                    <span className="material-symbols-outlined text-[18px]">
                                        error
                                    </span>
                                    <p className="font-body-sm text-body-sm">{generalError}</p>
                                </div>
                            )}

                            {items.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={() => openFormularium()}
                                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/50 bg-surface-container-lowest/70 p-10 text-center transition-colors hover:border-primary/40 hover:bg-surface-container-lowest"
                                >
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
                                        <span className="material-symbols-outlined text-[24px]">
                                            add_medication
                                        </span>
                                    </span>
                                    <span className="font-headline-sm text-body-md font-semibold text-on-surface">
                                        Belum ada obat di resep
                                    </span>
                                    <span className="max-w-sm font-body-sm text-body-sm text-on-surface-variant">
                                        Buka formularium untuk memilih obat aktif. Anda dapat
                                        menambahkan lebih dari satu obat.
                                    </span>
                                    <span className="mt-1 rounded-lg bg-primary-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-primary">
                                        Buka Formularium
                                    </span>
                                </button>
                            ) : (
                                <div className="flex flex-col gap-space-sm">
                                    {items.map((item, index) => {
                                        const match = findAllergyMatch(
                                            item.medicine,
                                            patient.allergies,
                                            allergy_rules,
                                        );
                                        const quantity = Number.parseInt(item.quantity, 10) || 0;
                                        const overStock = quantity > item.medicine.stock;
                                        const dosageError =
                                            formErrors[`items.${index}.dosage`];
                                        const quantityError =
                                            formErrors[`items.${index}.quantity`];
                                        const instructionsError =
                                            formErrors[`items.${index}.instructions`];

                                        return (
                                            <div
                                                key={item.key}
                                                className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
                                            >
                                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                    <div className="flex min-w-0 items-start gap-3">
                                                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                                                            <span className="material-symbols-outlined text-[22px]">
                                                                medication
                                                            </span>
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                                                    {item.medicine.name}
                                                                </h3>
                                                                {item.medicine.category !== null && (
                                                                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                                                                        {item.medicine.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                                                                {item.medicine.active_ingredient}
                                                                {item.medicine.strength !== null
                                                                    ? ` · ${item.medicine.strength}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-shrink-0 items-center gap-2">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold ${
                                                                item.medicine.stock <= 0
                                                                    ? 'bg-error-container text-on-error-container'
                                                                    : item.medicine.stock <=
                                                                        item.medicine.minimum_stock
                                                                      ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                                                                      : 'bg-secondary-container/60 text-on-secondary-container'
                                                            }`}
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">
                                                                inventory_2
                                                            </span>
                                                            Stok {item.medicine.stock}{' '}
                                                            {item.medicine.unit}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(item.key)}
                                                            title={`Hapus ${item.medicine.name}`}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-outline transition-colors hover:bg-error-container hover:text-error"
                                                        >
                                                            <span className="material-symbols-outlined text-[19px]">
                                                                delete
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {match !== null && (
                                                    <div className="mt-3 flex flex-col justify-between gap-2 rounded-lg bg-error-container/45 p-3 sm:flex-row sm:items-center">
                                                        <div className="flex items-start gap-2">
                                                            <span className="material-symbols-outlined text-[19px] text-error">
                                                                warning
                                                            </span>
                                                            <div>
                                                                <p className="font-label-md text-label-md font-semibold text-on-error-container">
                                                                    Risiko alergi: {match.allergen}
                                                                </p>
                                                                <p className="font-body-sm text-body-sm text-on-error-container/80">
                                                                    {match.detail}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => openFormularium(true)}
                                                            className="inline-flex flex-shrink-0 items-center gap-1 self-start rounded-lg bg-surface-container-lowest px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-error shadow-sm transition-colors hover:bg-error-container sm:self-auto"
                                                        >
                                                            Cari alternatif
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                search
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
                                                    <div className="sm:col-span-4">
                                                        <label className={labelClass}>Dosis</label>
                                                        <input
                                                            value={item.dosage}
                                                            onChange={(event) =>
                                                                updateItem(item.key, {
                                                                    dosage: event.target.value,
                                                                })
                                                            }
                                                            required
                                                            maxLength={100}
                                                            placeholder="Contoh: 500 mg"
                                                            className={`${inputClass} ${
                                                                dosageError !== undefined
                                                                    ? 'ring-2 ring-error'
                                                                    : ''
                                                            }`}
                                                        />
                                                        {dosageError && (
                                                            <p className="mt-1 font-body-sm text-body-sm text-error">
                                                                {dosageError}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className={labelClass}>Jumlah</label>
                                                        <div className="relative">
                                                            <input
                                                                value={item.quantity}
                                                                onChange={(event) =>
                                                                    updateItem(item.key, {
                                                                        quantity:
                                                                            event.target.value,
                                                                    })
                                                                }
                                                                required
                                                                min={1}
                                                                type="number"
                                                                className={`${inputClass} pr-16 ${
                                                                    overStock || quantityError
                                                                        ? 'ring-2 ring-error'
                                                                        : ''
                                                                }`}
                                                            />
                                                            <span className="absolute top-1/2 right-3 -translate-y-1/2 font-label-sm text-label-sm text-outline">
                                                                {item.medicine.unit}
                                                            </span>
                                                        </div>
                                                        {quantityError ? (
                                                            <p className="mt-1 font-body-sm text-body-sm text-error">
                                                                {quantityError}
                                                            </p>
                                                        ) : overStock ? (
                                                            <p className="mt-1 font-body-sm text-body-sm text-error">
                                                                Melebihi stok tersedia (
                                                                {item.medicine.stock}{' '}
                                                                {item.medicine.unit})
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="sm:col-span-5">
                                                        <label className={labelClass}>
                                                            Aturan Pakai (Signa)
                                                        </label>
                                                        <input
                                                            value={item.instructions}
                                                            onChange={(event) =>
                                                                updateItem(item.key, {
                                                                    instructions:
                                                                        event.target.value,
                                                                })
                                                            }
                                                            required
                                                            maxLength={255}
                                                            placeholder="Contoh: 3 x 1 tablet sesudah makan"
                                                            className={`${inputClass} ${
                                                                instructionsError !== undefined
                                                                    ? 'ring-2 ring-error'
                                                                    : ''
                                                            }`}
                                                        />
                                                        {instructionsError && (
                                                            <p className="mt-1 font-body-sm text-body-sm text-error">
                                                                {instructionsError}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => openFormularium()}
                                        className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-outline-variant/50 bg-surface-container-lowest/60 px-4 py-3 font-label-md text-label-md font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-surface-container-lowest"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            add
                                        </span>
                                        Tambah Obat Lain
                                    </button>
                                </div>
                            )}

                            <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                            Catatan untuk Farmasi
                                        </h2>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                                            Informasi tambahan yang perlu dibaca petugas farmasi.
                                        </p>
                                    </div>
                                    <span className="font-label-sm text-label-sm text-outline">
                                        {form.data.notes.length}/250
                                    </span>
                                </div>
                                <textarea
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData('notes', event.target.value)
                                    }
                                    maxLength={250}
                                    rows={3}
                                    placeholder="Contoh: Berikan edukasi penggunaan obat dan pantau reaksi alergi."
                                    className={`mt-3 ${inputClass} resize-none ${
                                        formErrors.notes !== undefined
                                            ? 'ring-2 ring-error'
                                            : ''
                                    }`}
                                />
                                {formErrors.notes && (
                                    <p className="mt-1 font-body-sm text-body-sm text-error">
                                        {formErrors.notes}
                                    </p>
                                )}
                            </div>
                        </div>

                        <aside className="xl:col-span-4">
                            <div className="sticky top-20 flex flex-col gap-space-md">
                                <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                                    <div className="border-b border-surface-container-high/60 bg-gradient-to-r from-primary-fixed/40 to-transparent p-space-md">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[21px] text-primary">
                                                    receipt_long
                                                </span>
                                                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                                    Ringkasan Resep
                                                </h2>
                                            </div>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-tertiary-fixed-variant">
                                                <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                                                Belum dikirim
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-space-md">
                                        <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2.5">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-label-sm font-bold text-primary">
                                                {initials(patient.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
                                                    {patient.name}
                                                </p>
                                                <p className="font-label-sm text-label-sm text-on-surface-variant">
                                                    No. RM: {patient.medical_record_number}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 max-h-44 overflow-y-auto">
                                            {items.length === 0 ? (
                                                <p className="rounded-lg bg-surface-container-low/60 px-3 py-4 text-center font-body-sm text-body-sm text-on-surface-variant">
                                                    Belum ada obat dipilih.
                                                </p>
                                            ) : (
                                                <ul className="flex flex-col divide-y divide-surface-container-high/50">
                                                    {items.map((item) => (
                                                        <li
                                                            key={item.key}
                                                            className="flex items-start justify-between gap-2 py-2"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
                                                                    {item.medicine.name}
                                                                </p>
                                                                <p className="font-label-sm text-label-sm text-on-surface-variant">
                                                                    {item.dosage || 'Dosis belum diisi'}
                                                                </p>
                                                            </div>
                                                            <span className="flex-shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                                                                {item.quantity || 0}{' '}
                                                                {item.medicine.unit}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="rounded-lg bg-surface-container-low p-2.5">
                                                <p className="font-label-sm text-label-sm text-outline uppercase">
                                                    Jenis Obat
                                                </p>
                                                <p className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                    {items.length}
                                                </p>
                                            </div>
                                            <div className="rounded-lg bg-surface-container-low p-2.5">
                                                <p className="font-label-sm text-label-sm text-outline uppercase">
                                                    Total Kuantitas
                                                </p>
                                                <p className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                    {totalQuantity}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            {warningCount === 0 ? (
                                                <div className="flex items-start gap-2 rounded-lg bg-secondary-container/30 p-2.5 text-on-secondary-container">
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        verified_user
                                                    </span>
                                                    <p className="font-body-sm text-body-sm">
                                                        Tidak ada peringatan alergi atau interaksi
                                                        terdeteksi.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-error">
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            warning
                                                        </span>
                                                        {warningCount} peringatan klinis
                                                    </div>

                                                    {allergyWarnings.map(({ item, match }) => (
                                                        <div
                                                            key={`allergy-${item.key}`}
                                                            className="rounded-lg bg-error-container p-2.5 text-on-error-container"
                                                        >
                                                            <p className="font-label-sm text-label-sm font-semibold">
                                                                Alergi · {item.medicine.name}
                                                            </p>
                                                            <p className="font-body-sm text-body-sm">
                                                                Cocok dengan alergen{' '}
                                                                {match.allergen}.
                                                            </p>
                                                        </div>
                                                    ))}

                                                    {interactionWarnings.map((warning) => (
                                                        <div
                                                            key={warning.key}
                                                            className={`rounded-lg p-2.5 ${SEVERITY_STYLES[warning.severity]}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="font-label-sm text-label-sm font-semibold">
                                                                    Interaksi · {warning.labelA} +{' '}
                                                                    {warning.labelB}
                                                                </p>
                                                                <span className="flex-shrink-0 rounded-full bg-surface-container-lowest/60 px-1.5 py-0.5 font-label-sm text-label-sm font-semibold">
                                                                    {warning.severity_label}
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 font-body-sm text-body-sm">
                                                                {warning.recommendation}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 flex flex-col gap-2">
                                            <button
                                                type="submit"
                                                disabled={
                                                    items.length === 0 || form.processing
                                                }
                                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-3 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[19px]">
                                                    {form.processing ? 'hourglass_top' : 'send'}
                                                </span>
                                                {form.processing
                                                    ? 'Mengirim Resep...'
                                                    : 'Kirim ke Farmasi'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled
                                                title="Fitur simpan draft belum tersedia"
                                                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-surface-container px-4 py-2.5 font-label-md text-label-md font-semibold text-on-surface-variant opacity-60"
                                            >
                                                <span className="material-symbols-outlined text-[19px]">
                                                    save
                                                </span>
                                                Simpan sebagai Draft
                                            </button>
                                        </div>

                                        <p className="mt-3 flex items-start gap-1.5 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[16px] text-outline">
                                                info
                                            </span>
                                            Resep akan masuk antrean farmasi dengan status
                                            menunggu. Stok baru berkurang saat serah terima obat.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                                    <div className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-[20px] text-primary">
                                            lightbulb
                                        </span>
                                        <div>
                                            <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                                                Panduan Penulisan Resep
                                            </h3>
                                            <ul className="mt-1 list-inside list-disc font-body-sm text-body-sm text-on-surface-variant">
                                                <li>Gunakan dosis dan aturan pakai yang jelas.</li>
                                                <li>Periksa kembali peringatan alergi/interaksi.</li>
                                                <li>
                                                    Catatan farmasi membantu verifikasi dan
                                                    edukasi pasien.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </form>
                </div>
            </DokterLayout>

            {modalOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-inverse-surface/50 backdrop-blur-sm sm:items-center sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="formularium-title"
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface-container-lowest shadow-2xl sm:rounded-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-surface-container-high/60 p-space-md">
                            <div className="flex items-start gap-2">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                                    <span className="material-symbols-outlined text-[22px]">
                                        menu_book
                                    </span>
                                </span>
                                <div>
                                    <h2
                                        id="formularium-title"
                                        className="font-headline-md text-headline-md font-semibold text-on-surface"
                                    >
                                        Formularium Obat
                                    </h2>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Pilih obat aktif yang tersedia di instalasi farmasi.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                aria-label="Tutup formularium"
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    close
                                </span>
                            </button>
                        </div>

                        <div className="border-b border-surface-container-high/60 bg-surface-container-low/40 p-space-md">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <div className="relative flex-1">
                                    <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline">
                                        search
                                    </span>
                                    <input
                                        value={medicineSearch}
                                        onChange={(event) =>
                                            setMedicineSearch(event.target.value)
                                        }
                                        type="search"
                                        placeholder="Cari nama obat atau bahan aktif..."
                                        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-2 pr-3 pl-9 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <select
                                    value={categoryFilter}
                                    onChange={(event) =>
                                        setCategoryFilter(event.target.value)
                                    }
                                    className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    <option value="">Semua kategori</option>
                                    {categoryOptions.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {patient.allergies.length > 0 && (
                                <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                                    <input
                                        type="checkbox"
                                        checked={safeOnly}
                                        onChange={(event) =>
                                            setSafeOnly(event.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                                    />
                                    Sembunyikan obat yang berisiko dengan alergi pasien
                                </label>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-space-md">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="font-label-sm text-label-sm text-on-surface-variant">
                                    {filteredMedicines.length} obat ditemukan
                                </p>
                                {safeOnly && (
                                    <span className="rounded-full bg-error-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container">
                                        Filter aman alergi aktif
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                {filteredMedicines.map((medicine) => {
                                    const selected = selectedMedicineIds.has(medicine.id);
                                    const unavailable = medicine.stock <= 0;
                                    const match = findAllergyMatch(
                                        medicine,
                                        patient.allergies,
                                        allergy_rules,
                                    );

                                    return (
                                        <div
                                            key={medicine.id}
                                            className={`flex flex-col justify-between gap-3 rounded-xl bg-surface-container-low p-3 sm:flex-row sm:items-center ${
                                                unavailable ? 'opacity-60' : ''
                                            }`}
                                        >
                                            <div className="flex min-w-0 items-start gap-2.5">
                                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary shadow-sm">
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        medication
                                                    </span>
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                                                            {medicine.name}
                                                        </h3>
                                                        {match !== null && (
                                                            <span className="rounded-full bg-error-container px-1.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container">
                                                                Risiko alergi
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                                        {medicine.active_ingredient}
                                                        {medicine.strength !== null
                                                            ? ` · ${medicine.strength}`
                                                            : ''}
                                                        {medicine.category !== null
                                                            ? ` · ${medicine.category}`
                                                            : ''}
                                                    </p>
                                                    <p
                                                        className={`mt-0.5 font-label-sm text-label-sm font-semibold ${
                                                            unavailable
                                                                ? 'text-error'
                                                                : medicine.stock <=
                                                                    medicine.minimum_stock
                                                                  ? 'text-tertiary'
                                                                  : 'text-secondary'
                                                        }`}
                                                    >
                                                        Stok: {medicine.stock}{' '}
                                                        {medicine.unit}
                                                        {medicine.stock <=
                                                            medicine.minimum_stock &&
                                                            medicine.stock > 0 &&
                                                            ' (menipis)'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={selected || unavailable}
                                                onClick={() => addMedicine(medicine)}
                                                className="inline-flex flex-shrink-0 items-center justify-center gap-1 self-start rounded-lg bg-primary-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant sm:self-auto"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {selected
                                                        ? 'check'
                                                        : unavailable
                                                          ? 'block'
                                                          : 'add'}
                                                </span>
                                                {selected
                                                    ? 'Ditambahkan'
                                                    : unavailable
                                                      ? 'Stok habis'
                                                      : 'Tambah'}
                                            </button>
                                        </div>
                                    );
                                })}

                                {filteredMedicines.length === 0 && (
                                    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-surface-container-low p-8 text-center">
                                        <span className="material-symbols-outlined text-[32px] text-outline">
                                            search_off
                                        </span>
                                        <p className="font-headline-sm text-body-md font-semibold text-on-surface">
                                            Obat tidak ditemukan
                                        </p>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                                            Ubah kata kunci, kategori, atau filter alergi.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-surface-container-high/60 bg-surface-container-lowest p-space-md">
                            <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px] text-outline">
                                    info
                                </span>
                                Hanya obat aktif di formularium yang ditampilkan.
                            </p>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notice !== null && (
                <div className="fixed right-4 bottom-4 z-[70] flex items-center gap-2 rounded-xl bg-inverse-surface px-4 py-3 text-inverse-on-surface shadow-lg">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <p className="font-body-sm text-body-sm">{notice}</p>
                </div>
            )}
        </>
    );
}

function findAllergyMatch(
    medicine: MedicineOption,
    allergies: AllergyRow[],
    rules: AllergyRuleRow[],
): AllergyMatch | null {
    const fields = [medicine.name, medicine.active_ingredient, medicine.category]
        .filter((value): value is string => value !== null && value !== '')
        .map(normalize);

    for (const allergy of allergies) {
        const allergen = normalize(allergy.allergen);

        if (allergen === '') {
            continue;
        }

        if (
            fields.some(
                (field) =>
                    field.includes(allergen) ||
                    (allergen.includes(field) && field.length >= 4),
            )
        ) {
            return {
                allergen: allergy.allergen,
                detail: 'Nama atau bahan aktif obat cocok dengan alergi pasien.',
                severity: null,
            };
        }
    }

    for (const rule of rules) {
        const allergen = normalize(rule.allergen_name);

        if (allergen === '') {
            continue;
        }

        const patientHasAllergy = allergies.some((allergy) => {
            const value = normalize(allergy.allergen);

            return (
                value !== '' &&
                (value.includes(allergen) ||
                    (allergen.includes(value) && value.length >= 4))
            );
        });

        if (!patientHasAllergy) {
            continue;
        }

        const matchesIngredient = matchesField(fields, rule.active_ingredient);
        const matchesGroup = matchesField(fields, rule.drug_group ?? '');
        const matchesExample = rule.example_medicines.some((example) =>
            matchesField(fields, example),
        );

        if (matchesIngredient || matchesGroup || matchesExample) {
            return {
                allergen: rule.allergen_name,
                detail: `Aturan alergi untuk ${rule.active_ingredient}${
                    rule.drug_group !== null ? ` (${rule.drug_group})` : ''
                }.`,
                severity: rule.severity,
            };
        }
    }

    return null;
}

function findInteractions(
    items: SelectedItem[],
    interactions: InteractionRow[],
    medicines: MedicineOption[],
): InteractionMatch[] {
    const selectedIds = new Set(items.map((item) => item.medicine.id));
    const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    const matches: InteractionMatch[] = [];

    for (const interaction of interactions) {
        if (
            !selectedIds.has(interaction.medicine_a_id) ||
            !selectedIds.has(interaction.medicine_b_id)
        ) {
            continue;
        }

        const medicineA = medicineById.get(interaction.medicine_a_id);
        const medicineB = medicineById.get(interaction.medicine_b_id);

        matches.push({
            key: `${interaction.medicine_a_id}-${interaction.medicine_b_id}`,
            labelA: medicineA?.name ?? 'Obat A',
            labelB: medicineB?.name ?? 'Obat B',
            severity: interaction.severity,
            severity_label: interaction.severity_label,
            recommendation: interaction.recommendation,
        });
    }

    return matches;
}

function matchesField(fields: string[], value: string): boolean {
    const needle = normalize(value);

    if (needle === '') {
        return false;
    }

    return fields.some(
        (field) =>
            field.includes(needle) || (needle.includes(field) && field.length >= 4),
    );
}

function normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
}

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}
