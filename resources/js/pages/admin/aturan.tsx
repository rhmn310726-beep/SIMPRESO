import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import type { SharedProps } from '@/types';

type Severity = 'ringan' | 'sedang' | 'berat';
type RuleTab = 'alergi' | 'interaksi';

interface AllergyRuleRow {
    id: number;
    active_ingredient: string;
    drug_group: string | null;
    allergen_name: string;
    severity: Severity;
    severity_label: string;
    example_medicines: string[];
    updated_at: string | null;
}

interface InteractionRow {
    id: number;
    medicine_a_id: number;
    medicine_b_id: number;
    medicine_a: string;
    medicine_b: string;
    severity: Severity;
    severity_label: string;
    recommendation: string;
    updated_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Paginated<T> {
    data: T[];
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

interface MedicineOption {
    id: number;
    label: string;
}

interface PageProps {
    activeTab: RuleTab;
    allergyRules: Paginated<AllergyRuleRow>;
    interactions: Paginated<InteractionRow>;
    filters: {
        search: string;
        severity: string;
    };
    stats: {
        total_allergy_rules: number;
        severe_allergy_rules: number;
        total_interactions: number;
        severe_interactions: number;
        patients_with_allergies: number;
        patient_protection_percent: number;
        last_updated: string | null;
    };
    medicines: MedicineOption[];
}

interface AllergyForm {
    active_ingredient: string;
    drug_group: string;
    allergen_name: string;
    severity: Severity;
    example_medicines: string;
}

interface InteractionForm {
    medicine_a_id: number | '';
    medicine_b_id: number | '';
    severity: Severity;
    recommendation: string;
}

interface RuleModalState {
    type: RuleTab;
    editingId: number | null;
}

interface DeleteTarget {
    type: RuleTab;
    id: number;
    label: string;
}

const numberFormatter = new Intl.NumberFormat('id-ID');

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none';

const selectClass = `${inputClass} cursor-pointer appearance-none pr-9`;

const defaultAllergyForm: AllergyForm = {
    active_ingredient: '',
    drug_group: '',
    allergen_name: '',
    severity: 'sedang',
    example_medicines: '',
};

const defaultInteractionForm: InteractionForm = {
    medicine_a_id: '',
    medicine_b_id: '',
    severity: 'sedang',
    recommendation: '',
};

const severityOptions: { value: Severity; label: string }[] = [
    { value: 'ringan', label: 'Ringan (Notifikasi)' },
    { value: 'sedang', label: 'Sedang (Konfirmasi)' },
    { value: 'berat', label: 'Berat (Hard Stop)' },
];

export default function Aturan({
    activeTab,
    allergyRules,
    interactions,
    filters,
    stats,
    medicines,
}: PageProps) {
    const { flash } = usePage<SharedProps>().props;

    const [search, setSearch] = useState(filters.search);
    const [severity, setSeverity] = useState(filters.severity);
    const [ruleModal, setRuleModal] = useState<RuleModalState | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const allergyForm = useForm<AllergyForm>(defaultAllergyForm);
    const interactionForm = useForm<InteractionForm>(defaultInteractionForm);

    const navigate = (next: {
        tab?: RuleTab;
        search?: string;
        severity?: string;
    }) => {
        const nextTab = next.tab ?? activeTab;
        const nextSearch = next.search ?? search;
        const nextSeverity = next.severity ?? severity;

        const params: Record<string, string> = { tab: nextTab };

        if (nextSearch !== '') {
            params.search = nextSearch;
        }

        if (nextSeverity !== '') {
            params.severity = nextSeverity;
        }

        router.get('/admin/aturan', params, {
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
            const params: Record<string, string> = { tab: activeTab };

            if (search !== '') {
                params.search = search;
            }

            if (severity !== '') {
                params.severity = severity;
            }

            router.get('/admin/aturan', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    const switchTab = (tab: RuleTab) => {
        if (tab === activeTab) {
            return;
        }

        setSearch('');
        setSeverity('');
        navigate({ tab, search: '', severity: '' });
    };

    const openAllergyModal = (rule?: AllergyRuleRow) => {
        allergyForm.clearErrors();

        if (rule) {
            allergyForm.setData({
                active_ingredient: rule.active_ingredient,
                drug_group: rule.drug_group ?? '',
                allergen_name: rule.allergen_name,
                severity: rule.severity,
                example_medicines: rule.example_medicines.join(', '),
            });
            setRuleModal({ type: 'alergi', editingId: rule.id });
        } else {
            allergyForm.reset();
            setRuleModal({ type: 'alergi', editingId: null });
        }
    };

    const openInteractionModal = (interaction?: InteractionRow) => {
        interactionForm.clearErrors();

        if (interaction) {
            interactionForm.setData({
                medicine_a_id: interaction.medicine_a_id,
                medicine_b_id: interaction.medicine_b_id,
                severity: interaction.severity,
                recommendation: interaction.recommendation,
            });
            setRuleModal({ type: 'interaksi', editingId: interaction.id });
        } else {
            interactionForm.reset();
            setRuleModal({ type: 'interaksi', editingId: null });
        }
    };

    const closeRuleModal = () => {
        if (allergyForm.processing || interactionForm.processing) {
            return;
        }

        setRuleModal(null);
        allergyForm.reset();
        allergyForm.clearErrors();
        interactionForm.reset();
        interactionForm.clearErrors();
    };

    const submitAllergy = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!ruleModal) {
            return;
        }

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setRuleModal(null);
                allergyForm.reset();
            },
        };

        if (ruleModal.editingId) {
            allergyForm.put(`/admin/aturan/alergi/${ruleModal.editingId}`, options);
        } else {
            allergyForm.post('/admin/aturan/alergi', options);
        }
    };

    const submitInteraction = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!ruleModal) {
            return;
        }

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setRuleModal(null);
                interactionForm.reset();
            },
        };

        if (ruleModal.editingId) {
            interactionForm.put(`/admin/aturan/interaksi/${ruleModal.editingId}`, options);
        } else {
            interactionForm.post('/admin/aturan/interaksi', options);
        }
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        const url =
            deleteTarget.type === 'alergi'
                ? `/admin/aturan/alergi/${deleteTarget.id}`
                : `/admin/aturan/interaksi/${deleteTarget.id}`;

        router.delete(url, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const hasFilters = search !== '' || severity !== '';
    const activeRules = activeTab === 'alergi' ? allergyRules : interactions;
    const searchPlaceholder =
        activeTab === 'alergi'
            ? 'Filter nama alergen / senyawa...'
            : 'Cari obat atau rekomendasi...';

    return (
        <>
            <Head title="Aturan Alergi & Interaksi" />

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
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                            <span className="text-[11px] font-bold tracking-[0.18em] text-brand-600 uppercase">
                                Protokol Validasi Klinis
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">
                            Aturan Klinis
                        </h1>
                        <p className="mt-0.5 max-w-2xl text-sm text-slate-600">
                            Kelola aturan peringatan alergi dan interaksi obat untuk mendukung
                            keputusan peresepan yang aman.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={`/admin/aturan/export?tab=${activeTab}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-brand-600"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            <span>Ekspor Aturan</span>
                        </a>
                        <button
                            type="button"
                            onClick={() =>
                                activeTab === 'alergi'
                                    ? openAllergyModal()
                                    : openInteractionModal()
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-[0.99]"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>Tambah Aturan</span>
                        </button>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatPanel
                        label="Total Aturan Alergen"
                        value={stats.total_allergy_rules}
                        suffix="aturan"
                        tone="brand"
                        badge="Terverifikasi Farmasi"
                        footer="Dipakai untuk peringatan merah"
                        icon={<MedicalInfoIcon className="h-6 w-6" />}
                    />
                    <StatPanel
                        label="Reaksi Tingkat Berat"
                        value={stats.severe_allergy_rules}
                        suffix="aturan"
                        tone="danger"
                        badge="Hard Stop"
                        footer="Interupsi otomatis peresepan"
                        icon={<DangerIcon className="h-6 w-6" />}
                    />
                    <StatPanel
                        label="Peringatan Interaksi"
                        value={stats.total_interactions}
                        suffix="pasangan"
                        tone="violet"
                        badge={`${numberFormatter.format(stats.severe_interactions)} berat`}
                        footer="Pasangan senyawa aktif"
                        icon={<SwapIcon className="h-6 w-6" />}
                    />
                    <StatPanel
                        label="Pasien Terlindungi"
                        value={stats.patients_with_allergies}
                        suffix="pasien"
                        tone="teal"
                        badge={`${numberFormatter.format(stats.patient_protection_percent)}% populasi`}
                        footer="Alergi tercatat di rekam medis"
                        icon={<ShieldCheckIcon className="h-6 w-6" />}
                    />
                </div>

                <div className="mb-4 flex items-center gap-6 border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => switchTab('alergi')}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
                            activeTab === 'alergi'
                                ? 'border-brand-500 font-bold text-brand-600'
                                : 'border-transparent font-medium text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <AllergyIcon className="h-5 w-5" />
                        <span>Alergi</span>
                        <span
                            className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                activeTab === 'alergi'
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            {numberFormatter.format(stats.total_allergy_rules)}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => switchTab('interaksi')}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
                            activeTab === 'interaksi'
                                ? 'border-brand-500 font-bold text-brand-600'
                                : 'border-transparent font-medium text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <SwapIcon className="h-5 w-5" />
                        <span>Interaksi Obat</span>
                        <span
                            className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                activeTab === 'interaksi'
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            {numberFormatter.format(stats.total_interactions)}
                        </span>
                    </button>
                </div>

                <div className="mb-4 flex items-start gap-3 rounded-xl bg-slate-100/80 p-4 text-sm text-slate-600">
                    <InfoIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
                    <p className="leading-relaxed">
                        {activeTab === 'alergi'
                            ? 'Aturan ini akan memunculkan peringatan merah saat dokter meresepkan obat yang sesuai dengan alergi pasien.'
                            : 'Aturan interaksi memicu dialog peringatan kontraindikasi saat dua atau lebih resep aktif berinteraksi secara biologis.'}
                    </p>
                </div>

                <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft-card">
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-4 lg:flex-row lg:items-center">
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative w-full max-w-md flex-1">
                                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                />
                            </div>

                            <div className="relative min-w-[190px] sm:w-auto">
                                <select
                                    value={severity}
                                    onChange={(event) => {
                                        setSeverity(event.target.value);
                                        navigate({ severity: event.target.value });
                                    }}
                                    className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                                >
                                    <option value="">Semua Tingkat Reaksi</option>
                                    <option value="berat">Berat (Hard Stop)</option>
                                    <option value="sedang">Sedang (Konfirmasi)</option>
                                    <option value="ringan">Ringan (Notifikasi)</option>
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setSeverity('');
                                        navigate({ search: '', severity: '' });
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        <span className="text-xs text-slate-500">
                            {activeRules.total === 0 ? (
                                'Tidak ada data'
                            ) : (
                                <>
                                    Menampilkan{' '}
                                    <span className="font-semibold text-slate-800">
                                        {activeRules.from}–{activeRules.to}
                                    </span>{' '}
                                    dari{' '}
                                    <span className="font-semibold text-slate-800">
                                        {numberFormatter.format(activeRules.total)}
                                    </span>{' '}
                                    aturan {activeTab === 'alergi' ? 'alergi' : 'interaksi'}
                                </>
                            )}
                        </span>
                    </div>

                    <div className="w-full overflow-x-auto">
                        {activeTab === 'alergi' ? (
                            <table className="w-full min-w-[980px] text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                        <th className="px-4 py-3.5">Bahan Aktif / Golongan</th>
                                        <th className="px-4 py-3.5">Nama Alergen</th>
                                        <th className="px-4 py-3.5">Tingkat Reaksi</th>
                                        <th className="px-4 py-3.5">Contoh Obat Terkait</th>
                                        <th className="px-4 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allergyRules.data.map((rule) => (
                                        <tr
                                            key={rule.id}
                                            className="transition-colors hover:bg-slate-50/80"
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                                        <FlaskIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {rule.active_ingredient}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {rule.drug_group ?? 'Golongan belum diisi'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 font-medium text-slate-700">
                                                {rule.allergen_name}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <SeverityBadge
                                                    severity={rule.severity}
                                                    label={rule.severity_label}
                                                />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <ExampleTags examples={rule.example_medicines} />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openAllergyModal(rule)}
                                                        title="Edit Aturan"
                                                        className="rounded-lg p-1.5 text-brand-600 transition-colors hover:bg-brand-50"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteTarget({
                                                                type: 'alergi',
                                                                id: rule.id,
                                                                label: rule.allergen_name,
                                                            })
                                                        }
                                                        title="Hapus Aturan"
                                                        className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {allergyRules.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-16 text-center">
                                                <EmptyState
                                                    hasFilters={hasFilters}
                                                    title="Belum ada aturan alergi"
                                                    description="Tambahkan aturan alergi pertama untuk memulai validasi klinis."
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full min-w-[980px] text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                        <th className="px-4 py-3.5">Obat Primer</th>
                                        <th className="px-4 py-3.5">Obat Sekunder</th>
                                        <th className="px-4 py-3.5">Tingkat Keparahan</th>
                                        <th className="px-4 py-3.5">Efek Klinis / Rekomendasi</th>
                                        <th className="px-4 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {interactions.data.map((interaction) => (
                                        <tr
                                            key={interaction.id}
                                            className="transition-colors hover:bg-slate-50/80"
                                        >
                                            <td className="px-4 py-3.5 font-semibold text-slate-900">
                                                {interaction.medicine_a}
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-slate-900">
                                                {interaction.medicine_b}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <SeverityBadge
                                                    severity={interaction.severity}
                                                    label={interaction.severity_label}
                                                />
                                            </td>
                                            <td className="max-w-md px-4 py-3.5 text-xs leading-relaxed text-slate-600">
                                                {interaction.recommendation}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openInteractionModal(interaction)
                                                        }
                                                        title="Edit Aturan"
                                                        className="rounded-lg p-1.5 text-brand-600 transition-colors hover:bg-brand-50"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteTarget({
                                                                type: 'interaksi',
                                                                id: interaction.id,
                                                                label: `${interaction.medicine_a} + ${interaction.medicine_b}`,
                                                            })
                                                        }
                                                        title="Hapus Aturan"
                                                        className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {interactions.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-16 text-center">
                                                <EmptyState
                                                    hasFilters={hasFilters}
                                                    title="Belum ada aturan interaksi"
                                                    description="Tambahkan pasangan obat yang berinteraksi untuk memulai peringatan kontraindikasi."
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 p-4 sm:flex-row">
                        <span className="text-xs text-slate-500">
                            Pembaruan aturan terakhir:{' '}
                            <strong className="font-semibold text-slate-800">
                                {formatDateTime(stats.last_updated)}
                            </strong>
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <PaginationArrow href={activeRules.prev_page_url} direction="prev" />
                            {activeRules.links
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
                            <PaginationArrow href={activeRules.next_page_url} direction="next" />
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <GuidelineCard
                        tone="danger"
                        icon={<GavelIcon className="h-5 w-5" />}
                        title="Tingkat Berat (Hard Stop)"
                        description="Dokter tidak dapat melanjutkan peresepan tanpa verifikasi ganda kepala komite farmasi atau pengubahan item resep terkait."
                        footer="Regulasi KARS Bab PKPO 5.1"
                        footerIcon={<PriorityIcon className="h-4 w-4" />}
                    />
                    <GuidelineCard
                        tone="amber"
                        icon={<BellAlertIcon className="h-5 w-5" />}
                        title="Tingkat Sedang (Konfirmasi)"
                        description="Dokter wajib mengisi alasan klinis sebelum sistem e-Resep meneruskan berkas ke bagian peracikan."
                        footer="Rekam jejak audit otomatis"
                        footerIcon={<EditNoteIcon className="h-4 w-4" />}
                    />
                    <GuidelineCard
                        tone="brand"
                        icon={<SyncIcon className="h-5 w-5" />}
                        title="Sinkronisasi Database"
                        description="Kamus terminologi alergen dan interaksi diperbarui bersama data formularium rumah sakit."
                        footer="Terhubung dengan master data obat"
                        footerIcon={<CloudCheckIcon className="h-4 w-4" />}
                    />
                </div>
            </AdminLayout>

            {ruleModal && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={closeRuleModal}
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
                                    {ruleModal.type === 'alergi' ? (
                                        <AllergyIcon className="h-6 w-6" />
                                    ) : (
                                        <SwapIcon className="h-6 w-6" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        {ruleModal.type === 'alergi'
                                            ? ruleModal.editingId
                                                ? 'Edit Aturan Alergi'
                                                : 'Tambah Aturan Alergi'
                                            : ruleModal.editingId
                                              ? 'Edit Aturan Interaksi'
                                              : 'Tambah Aturan Interaksi'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {ruleModal.type === 'alergi'
                                            ? 'Tentukan bahan aktif dan tingkat reaksi alergi yang harus diperingatkan.'
                                            : 'Tentukan pasangan obat dan rekomendasi klinis saat interaksi terdeteksi.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeRuleModal}
                                disabled={allergyForm.processing || interactionForm.processing}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {ruleModal.type === 'alergi' ? (
                            <form onSubmit={submitAllergy} className="space-y-4 p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field
                                        label="Bahan Aktif / Senyawa"
                                        required
                                        error={allergyForm.errors.active_ingredient}
                                    >
                                        <input
                                            type="text"
                                            value={allergyForm.data.active_ingredient}
                                            onChange={(event) =>
                                                allergyForm.setData(
                                                    'active_ingredient',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Contoh: Penisilin"
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field
                                        label="Golongan / Kelas"
                                        error={allergyForm.errors.drug_group}
                                    >
                                        <input
                                            type="text"
                                            value={allergyForm.data.drug_group}
                                            onChange={(event) =>
                                                allergyForm.setData('drug_group', event.target.value)
                                            }
                                            placeholder="Contoh: Golongan Beta-Laktam"
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field
                                        label="Nama Alergen"
                                        required
                                        error={allergyForm.errors.allergen_name}
                                    >
                                        <input
                                            type="text"
                                            value={allergyForm.data.allergen_name}
                                            onChange={(event) =>
                                                allergyForm.setData('allergen_name', event.target.value)
                                            }
                                            placeholder="Contoh: Alergi Penisilin"
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field
                                        label="Tingkat Reaksi"
                                        required
                                        error={allergyForm.errors.severity}
                                    >
                                        <div className="relative">
                                            <select
                                                value={allergyForm.data.severity}
                                                onChange={(event) =>
                                                    allergyForm.setData(
                                                        'severity',
                                                        event.target.value as Severity,
                                                    )
                                                }
                                                className={selectClass}
                                            >
                                                {severityOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </Field>
                                </div>

                                <Field
                                    label="Contoh Obat Terkait"
                                    error={allergyForm.errors.example_medicines}
                                    hint="Pisahkan beberapa obat dengan tanda koma, contoh: Amoxicillin, Ampicillin."
                                >
                                    <textarea
                                        rows={2}
                                        value={allergyForm.data.example_medicines}
                                        onChange={(event) =>
                                            allergyForm.setData(
                                                'example_medicines',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Amoxicillin, Ampicillin"
                                        className={`${inputClass} resize-none`}
                                    />
                                </Field>

                                <FormActions
                                    processing={allergyForm.processing}
                                    onCancel={closeRuleModal}
                                    submitLabel="Simpan Aturan"
                                />
                            </form>
                        ) : (
                            <form onSubmit={submitInteraction} className="space-y-4 p-6">
                                {medicines.length === 0 && (
                                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-xs text-amber-700">
                                        <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                        <p className="leading-relaxed">
                                            Belum ada data obat. Tambahkan obat terlebih dahulu di
                                            menu{' '}
                                            <a
                                                href="/admin/obat"
                                                className="font-semibold underline underline-offset-2"
                                            >
                                                Data Obat
                                            </a>{' '}
                                            sebelum membuat aturan interaksi.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field
                                        label="Obat Primer"
                                        required
                                        error={interactionForm.errors.medicine_a_id}
                                    >
                                        <div className="relative">
                                            <select
                                                value={interactionForm.data.medicine_a_id}
                                                onChange={(event) =>
                                                    interactionForm.setData(
                                                        'medicine_a_id',
                                                        event.target.value === ''
                                                            ? ''
                                                            : Number(event.target.value),
                                                    )
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">Pilih Obat Primer</option>
                                                {medicines.map((medicine) => (
                                                    <option key={medicine.id} value={medicine.id}>
                                                        {medicine.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </Field>
                                    <Field
                                        label="Obat Sekunder"
                                        required
                                        error={interactionForm.errors.medicine_b_id}
                                    >
                                        <div className="relative">
                                            <select
                                                value={interactionForm.data.medicine_b_id}
                                                onChange={(event) =>
                                                    interactionForm.setData(
                                                        'medicine_b_id',
                                                        event.target.value === ''
                                                            ? ''
                                                            : Number(event.target.value),
                                                    )
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">Pilih Obat Sekunder</option>
                                                {medicines.map((medicine) => (
                                                    <option key={medicine.id} value={medicine.id}>
                                                        {medicine.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </Field>
                                </div>

                                <Field
                                    label="Tingkat Keparahan"
                                    required
                                    error={interactionForm.errors.severity}
                                >
                                    <div className="relative">
                                        <select
                                            value={interactionForm.data.severity}
                                            onChange={(event) =>
                                                interactionForm.setData(
                                                    'severity',
                                                    event.target.value as Severity,
                                                )
                                            }
                                            className={selectClass}
                                        >
                                            {severityOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </Field>

                                <Field
                                    label="Efek Klinis / Rekomendasi"
                                    required
                                    error={interactionForm.errors.recommendation}
                                >
                                    <textarea
                                        rows={3}
                                        value={interactionForm.data.recommendation}
                                        onChange={(event) =>
                                            interactionForm.setData(
                                                'recommendation',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Contoh: Peningkatan risiko perdarahan. Hindari kombinasi tanpa pemantauan INR ketat."
                                        className={`${inputClass} resize-none`}
                                    />
                                </Field>

                                <FormActions
                                    processing={interactionForm.processing}
                                    onCancel={closeRuleModal}
                                    submitLabel="Simpan Aturan"
                                />
                            </form>
                        )}
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
                        <h3 className="text-lg font-bold text-slate-900">Hapus Aturan Klinis?</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            Aturan{' '}
                            <span className="font-semibold text-slate-800">
                                {deleteTarget.label}
                            </span>{' '}
                            akan dihapus permanen dan tidak lagi memicu peringatan saat peresepan.
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

function FormActions({
    processing,
    onCancel,
    submitLabel,
}: {
    processing: boolean;
    onCancel: () => void;
    submitLabel: string;
}) {
    return (
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
                type="button"
                onClick={onCancel}
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
                <span>{processing ? 'Menyimpan...' : submitLabel}</span>
            </button>
        </div>
    );
}

function SeverityBadge({ severity, label }: { severity: Severity; label: string }) {
    const styles: Record<Severity, string> = {
        berat: 'bg-red-50 text-red-600',
        sedang: 'bg-amber-50 text-amber-700',
        ringan: 'bg-sky-50 text-sky-700',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${styles[severity]}`}
        >
            {severity === 'berat' ? (
                <DangerIcon className="h-3.5 w-3.5" />
            ) : severity === 'sedang' ? (
                <AlertIcon className="h-3.5 w-3.5" />
            ) : (
                <InfoIcon className="h-3.5 w-3.5" />
            )}
            {label}
        </span>
    );
}

function ExampleTags({ examples }: { examples: string[] }) {
    if (examples.length === 0) {
        return <span className="text-xs text-slate-400 italic">Tidak ada contoh</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {examples.slice(0, 3).map((example) => (
                <span
                    key={example}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                >
                    {example}
                </span>
            ))}
            {examples.length > 3 && (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    +{examples.length - 3}
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
    tone: 'brand' | 'danger' | 'violet' | 'teal';
    badge: string;
    footer: string;
    icon: ReactNode;
}) {
    const tones = {
        brand: {
            icon: 'bg-brand-50 text-brand-600',
            value: 'text-slate-900',
            badge: 'bg-slate-100 text-slate-500',
        },
        danger: {
            icon: 'bg-red-50 text-red-600',
            value: 'text-red-600',
            badge: 'bg-red-50 text-red-600',
        },
        violet: {
            icon: 'bg-violet-50 text-violet-600',
            value: 'text-slate-900',
            badge: 'bg-violet-50 text-violet-700',
        },
        teal: {
            icon: 'bg-emerald-50 text-emerald-600',
            value: 'text-emerald-600',
            badge: 'bg-emerald-50 text-emerald-700',
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
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                    {badge}
                </span>
                <span className="text-[11px] text-slate-500">{footer}</span>
            </div>
        </div>
    );
}

function GuidelineCard({
    tone,
    icon,
    title,
    description,
    footer,
    footerIcon,
}: {
    tone: 'danger' | 'amber' | 'brand';
    icon: ReactNode;
    title: string;
    description: string;
    footer: string;
    footerIcon: ReactNode;
}) {
    const tones = {
        danger: {
            icon: 'bg-red-50 text-red-600',
            footer: 'text-red-600',
        },
        amber: {
            icon: 'bg-amber-50 text-amber-600',
            footer: 'text-amber-600',
        },
        brand: {
            icon: 'bg-brand-50 text-brand-600',
            footer: 'text-brand-600',
        },
    } as const;

    const style = tones[tone];

    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft-card">
            <div>
                <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${style.icon}`}
                >
                    {icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3">
                <span
                    className={`flex items-center gap-1.5 text-[11px] font-semibold ${style.footer}`}
                >
                    {footerIcon}
                    {footer}
                </span>
            </div>
        </div>
    );
}

function EmptyState({
    hasFilters,
    title,
    description,
}: {
    hasFilters: boolean;
    title: string;
    description: string;
}) {
    return (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <p className="text-xs text-slate-500">
                {hasFilters
                    ? 'Tidak ada aturan yang cocok dengan filter. Coba ubah kata kunci atau tingkat reaksi.'
                    : description}
            </p>
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
            <span className="flex cursor-not-allowed items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-400 opacity-60">
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

function formatDateTime(value: string | null): string {
    if (!value) {
        return 'Belum ada pembaruan';
    }

    const formatted = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value));

    return `${formatted} WIB`;
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

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 11v5m0-8h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function DangerIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l9 5v5c0 4.6-3.6 8.4-9 10-5.4-1.6-9-5.4-9-10V8l9-5z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 8v5m0 3h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ShieldCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6l7-3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function MedicalInfoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M7 3h10a2 2 0 012 2v16l-7-4-7 4V5a2 2 0 012-2z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 8v5m0-8h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function AllergyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path
                d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10l2.1 2.1m0-14.2l-2.1 2.1m-10 10l-2.1 2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SwapIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M4 7h13l-3-3m3 3l-3 3M20 17H7l3-3m-3 3l3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function FlaskIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 006.2 21h11.6a2 2 0 001.7-2.5L14 9V3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M7.5 15h9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function GavelIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M13 5l6 6M9 9l6 6M3 21h12M5 17l6-6 4 4-6 6H5v-4z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function BellAlertIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 2v1" strokeLinecap="round" />
        </svg>
    );
}

function SyncIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M21 12a9 9 0 01-15.5 6.2M3 12A9 9 0 0118.5 5.8M3 18v-4h4M21 6v4h-4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PriorityIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v9m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function EditNoteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M4 6h10M4 11h6M4 16h5M14 20h6M17 14l3 3-5 3h-3v-3l5-3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CloudCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M7 18a4 4 0 01-.8-7.9A5.5 5.5 0 0117 9a4 4 0 011 7.9M9 14l2 2 4-4"
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
