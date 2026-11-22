import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import FarmasiLayout from '@/layouts/FarmasiLayout';
import type { SharedProps } from '@/types';

interface PrescriptionItem {
    id: number;
    medicine_name: string;
    active_ingredient: string | null;
    category: string | null;
    strength: string | null;
    unit: string | null;
    dosage: string;
    quantity: number;
    instructions: string;
    stock: number;
    min_stock: number;
    stock_sufficient: boolean;
    medicine_active: boolean;
}

interface Props {
    prescription: {
        id: number;
        number: string;
        status: string;
        status_label: string;
        created_at_label: string;
        notes: string | null;
        verification_checklist: Record<string, unknown> | null;
        recipient_name: string | null;
        recipient_relationship: string | null;
        handover_confirmed_at: string | null;
        patient: {
            id: number;
            medical_record_number: string;
            nik: string | null;
            name: string;
            age: number;
            date_of_birth_label: string | null;
            gender_label: string;
            phone: string | null;
            address: string | null;
        };
        doctor_name: string;
        pharmacist_name: string | null;
        allergies: { allergen: string; note: string | null }[];
        interactions: { medicine_a: string; medicine_b: string; severity: string; severity_label: string; recommendation: string }[];
        items: PrescriptionItem[];
        next_action: { key: string; label: string; href: string } | null;
    };
}

const checklistItems = [
    { key: 'patient_identity', label: 'Identitas pasien sesuai (nama/No. RM & data resep).' },
    { key: 'medicine_match', label: 'Kesesuaian nama obat & sediaan dengan resep.' },
    { key: 'dose_instruction', label: 'Dosis, jumlah, dan aturan pakai (signa) jelas & wajar.' },
    { key: 'allergy_interaction', label: 'Alergi & interaksi obat telah diperiksa/ditindaklanjuti.' },
    { key: 'availability_condition', label: 'Ketersediaan & kondisi obat memadai untuk disiapkan.' },
] as const;

const steps = [
    { key: 'menunggu', label: 'Menunggu Telaah' },
    { key: 'diterima', label: 'Diterima' },
    { key: 'disiapkan', label: 'Disiapkan' },
    { key: 'siap_diambil', label: 'Siap Diambil' },
    { key: 'diserahkan', label: 'Diserahkan' },
];

export default function DetailResep({ prescription: p }: Props) {
    const { auth } = usePage<SharedProps>().props;
    const [showCancel, setShowCancel] = useState(false);

    const acceptForm = useForm({
        checklist: {
            patient_identity: false,
            medicine_match: false,
            dose_instruction: false,
            allergy_interaction: false,
            availability_condition: false,
        },
        note: '',
    });

    const cancelForm = useForm({ reason: '' });

    const stepIndex = steps.findIndex((s) => s.key === p.status);
    const allChecked = checklistItems.every((c) => acceptForm.data.checklist[c.key]);
    const hasInsufficient = p.items.some((i) => !i.stock_sufficient);

    const submitAccept = (e: FormEvent) => {
        e.preventDefault();
        acceptForm.post(`/farmasi/antrean-resep/${p.id}/terima`, { preserveScroll: true });
    };

    const submitPrepare = () => router.post(`/farmasi/antrean-resep/${p.id}/siapkan`, {}, { preserveScroll: true });
    const submitReady = () => router.post(`/farmasi/antrean-resep/${p.id}/siap-diambil`, {}, { preserveScroll: true });

    const submitCancel = (e: FormEvent) => {
        e.preventDefault();
        cancelForm.post(`/farmasi/antrean-resep/${p.id}/batalkan`, {
            preserveScroll: true,
            onSuccess: () => setShowCancel(false),
        });
    };

    return (
        <>
            <Head title={`Telaah ${p.number}`} />
            <FarmasiLayout>
                <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-space-lg">
                    <div className="flex flex-wrap items-center justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                        <div className="flex min-w-0 items-center gap-space-sm">
                            <Link href="/farmasi/antrean-resep" className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container hover:text-primary">
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </Link>
                            <div className="flex min-w-0 flex-wrap items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                                <Link href="/farmasi/antrean-resep" className="hover:text-primary">Antrean Resep</Link>
                                <span className="text-outline-variant">/</span>
                                <span className="font-code-sm text-code-sm font-semibold text-on-surface">{p.number}</span>
                                <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-primary">Telaah & Proses</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low px-3 py-1.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary">
                                <span className="material-symbols-outlined text-[16px]">person</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm font-semibold text-on-surface">{auth.user?.name ?? 'Petugas Farmasi'}</span>
                                <span className="font-code-sm text-code-sm text-secondary">Petugas aktif</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
                        <div className="flex flex-col gap-space-lg lg:col-span-8">
                            <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-space-md">
                                    <div>
                                        <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline">Identifikasi e-Resep</span>
                                        <div className="mt-1 flex items-center gap-space-sm">
                                            <span className="font-display-lg text-display-lg font-bold tracking-tight text-on-surface">{p.number}</span>
                                            <span className="rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-surface-variant">Resep Elektronik</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-label-sm text-label-sm text-outline">Status</span>
                                        <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1 font-label-sm text-label-sm font-semibold text-on-surface">
                                            <span className="h-2 w-2 rounded-full bg-primary-container" /> {p.status_label}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-space-md grid grid-cols-1 gap-space-sm rounded-xl bg-surface-container-low p-space-md sm:grid-cols-3">
                                    <Info label="Waktu Terbit" value={p.created_at_label} icon="schedule" />
                                    <Info label="Dokter Penulis" value={p.doctor_name} icon="stethoscope" />
                                    <Info label="Penanggung Jawab Farmasi" value={p.pharmacist_name ?? 'Belum ditetapkan'} icon="verified_user" />
                                </div>
                            </section>

                            <section className="space-y-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-space-md">
                                    <div className="flex items-center gap-space-md">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container font-headline-lg text-headline-lg font-bold text-on-primary shadow-sm">
                                            {initials(p.patient.name)}
                                        </div>
                                        <div>
                                            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">{p.patient.name}</h2>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                                                <span className="font-code-sm text-code-sm font-semibold text-primary">No. RM: {p.patient.medical_record_number}</span>
                                                {p.patient.nik && <><span>•</span><span>NIK: {p.patient.nik}</span></>}
                                                <span>•</span><span>{p.patient.age} Tahun{p.patient.date_of_birth_label ? ` (${p.patient.date_of_birth_label})` : ''}</span>
                                                <span>•</span><span>{p.patient.gender_label}</span>
                                            </div>
                                            {p.patient.phone && <p className="mt-0.5 font-body-sm text-body-sm text-outline">Telp: {p.patient.phone}</p>}
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm font-medium text-on-surface-variant">
                                        <span className="material-symbols-outlined text-[18px]">clinical_notes</span> Data Pasien
                                    </div>
                                </div>
                                <div className="space-y-space-xs pt-1">
                                    <span className="flex items-center gap-1 font-label-sm text-label-sm font-semibold uppercase tracking-wider text-error">
                                        <span className="material-symbols-outlined text-[16px]">notification_important</span> Riwayat Alergi Pasien
                                    </span>
                                    {p.allergies.length === 0 ? (
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">Tidak ada alergi tercatat.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-space-sm">
                                            {p.allergies.map((a) => (
                                                <div key={a.allergen} className="flex items-center gap-2 rounded-lg bg-error-container px-3 py-1.5 font-label-md text-label-md font-bold text-on-error-container shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px] text-error">dangerous</span>
                                                    <span>{a.allergen}</span>
                                                    {a.note && <span className="font-body-sm text-body-sm font-normal">— {a.note}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {p.allergies.length > 0 && (
                                <div className="rounded-xl bg-error-container p-space-lg text-on-error-container shadow-sm">
                                    <div className="flex items-start gap-space-md">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-error text-on-error"><span className="material-symbols-outlined text-[28px]">gpp_maybe</span></div>
                                        <div>
                                            <h3 className="font-headline-sm text-headline-sm font-bold">Peringatan Alergi Pasien</h3>
                                            <p className="mt-1 font-body-md text-body-md">Pasien memiliki riwayat alergi: <strong>{p.allergies.map((a) => a.allergen).join(', ')}</strong>. Pastikan setiap item resep aman dan tindak lanjuti bila ada potensi reaksi silang sebelum melanjutkan proses.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {p.interactions.length > 0 && (
                                <div className="space-y-space-sm rounded-xl bg-surface-container-highest p-space-lg shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Peringatan Interaksi Obat</h3>
                                        <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">{p.interactions.length} interaksi</span>
                                    </div>
                                    <div className="space-y-space-sm">
                                        {p.interactions.map((i, idx) => (
                                            <div key={idx} className="rounded-lg bg-surface-container-lowest p-space-md">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-label-md text-label-md font-semibold text-on-surface">{i.medicine_a} + {i.medicine_b}</p>
                                                    <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-tertiary-fixed">{i.severity_label}</span>
                                                </div>
                                                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{i.recommendation}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <section className="space-y-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                                    <div>
                                        <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Daftar Obat yang Diresepkan</h3>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">Telaah item, signa, dan ketersediaan stok saat ini.</p>
                                    </div>
                                    <span className="rounded-full bg-surface-container px-3 py-1 font-code-sm text-code-sm font-semibold text-on-surface-variant">{p.items.length} item</span>
                                </div>
                                <div className="-mx-space-xs overflow-x-auto px-space-xs">
                                    <table className="min-w-[720px] w-full text-left">
                                        <thead>
                                            <tr className="bg-surface-container-low font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                                                <th className="px-space-md py-3">Obat & Sediaan</th>
                                                <th className="px-space-sm py-3">Dosis</th>
                                                <th className="px-space-sm py-3">Jumlah</th>
                                                <th className="px-space-md py-3">Aturan Pakai</th>
                                                <th className="px-space-md py-3">Stok</th>
                                                <th className="px-space-md py-3 text-right">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-body-md text-body-md">
                                            {p.items.map((item) => (
                                                <tr key={item.id} className={`hover:bg-surface-container-low/60 ${!item.stock_sufficient ? 'bg-error-container/10' : ''}`}>
                                                    <td className="px-space-md py-space-md">
                                                        <div className="flex items-center gap-space-sm">
                                                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${!item.stock_sufficient ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-primary'}`}>
                                                                <span className="material-symbols-outlined text-[18px]">pill</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-headline-sm text-headline-sm text-on-surface">{item.medicine_name}</p>
                                                                <p className="font-code-sm text-code-sm text-outline">{[item.strength, item.unit, item.category].filter(Boolean).join(' • ') || item.active_ingredient || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-space-sm py-space-md font-code-sm text-code-sm font-semibold">{item.dosage}</td>
                                                    <td className="px-space-sm py-space-md font-code-sm text-code-sm font-semibold">{item.quantity} {item.unit ?? ''}</td>
                                                    <td className="px-space-md py-space-md font-label-sm text-label-sm text-on-surface">{item.instructions}</td>
                                                    <td className="px-space-md py-space-md">
                                                        <span className={`inline-flex items-center gap-1 font-code-sm text-code-sm font-bold ${item.stock_sufficient ? 'text-secondary' : 'text-error'}`}>
                                                            <span className={`h-2 w-2 rounded-full ${item.stock_sufficient ? 'bg-secondary' : 'bg-error'}`} /> {item.stock} {item.unit ?? ''}
                                                        </span>
                                                        <p className="font-code-sm text-code-sm text-outline">Min: {item.min_stock}</p>
                                                    </td>
                                                    <td className="px-space-md py-space-md text-right">
                                                        {item.stock_sufficient ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-fixed"><span className="material-symbols-outlined text-[16px]">check_circle</span> Stok cukup</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-error text-on-error px-2.5 py-1 font-label-sm text-label-sm font-semibold"><span className="material-symbols-outlined text-[16px]">inventory_2</span> Stok kurang</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {hasInsufficient && p.status === 'siap_diambil' && (
                                    <div className="rounded-lg bg-error-container px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container">
                                        Terdapat stok yang tidak mencukupi. Serah terima akan ditolak hingga stok memenuhi jumlah resep.
                                    </div>
                                )}
                                {p.notes && (
                                    <div className="rounded-lg bg-surface-container-low p-space-md">
                                        <p className="font-label-sm text-label-sm font-semibold text-outline uppercase">Catatan Resep</p>
                                        <p className="mt-1 font-body-md text-body-md text-on-surface">{p.notes}</p>
                                    </div>
                                )}
                            </section>

                            {p.status === 'menunggu' && (
                                <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Checklist Verifikasi Resep</h3>
                                    <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Centang seluruh kriteria berikut sebelum menerima resep.</p>
                                    <form onSubmit={submitAccept} className="mt-space-md space-y-space-sm">
                                        {checklistItems.map((item) => (
                                            <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-lg bg-surface-container-low p-3">
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 h-4 w-4 accent-primary"
                                                    checked={acceptForm.data.checklist[item.key]}
                                                    onChange={(e) => acceptForm.setData('checklist', { ...acceptForm.data.checklist, [item.key]: e.target.checked })}
                                                />
                                                <span className="font-body-md text-body-md text-on-surface">{item.label}</span>
                                            </label>
                                        ))}
                                        {(acceptForm.errors as Record<string, string>)['checklist'] && <p className="font-body-sm text-body-sm text-error">{(acceptForm.errors as Record<string, string>)['checklist']}</p>}
                                        {Object.entries(acceptForm.errors).filter(([k]) => k.startsWith('checklist.')).map(([k, v]) => (
                                            <p key={k} className="font-body-sm text-body-sm text-error">{String(v)}</p>
                                        ))}
                                        <div className="pt-2">
                                            <button type="submit" disabled={!allChecked || acceptForm.processing} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-space-md py-3 font-headline-sm text-headline-sm font-bold text-on-primary shadow-md hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50">
                                                <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                                                Terima & Simpan Verifikasi
                                            </button>
                                            {!allChecked && <p className="mt-2 text-center font-body-sm text-body-sm text-on-surface-variant">Lengkapi seluruh checklist untuk mengaktifkan tombol.</p>}
                                        </div>
                                    </form>
                                </section>
                            )}
                        </div>

                        <div className="flex flex-col gap-space-lg lg:sticky lg:top-20 lg:col-span-4">
                            <section className="space-y-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-md">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Progres Klinis</span>
                                        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Status Alur Resep</h3>
                                    </div>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary"><span className="material-symbols-outlined text-[20px]">account_tree</span></span>
                                </div>
                                <div className="relative space-y-5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-surface-container-highest before:content-['']">
                                    {steps.map((s, idx) => {
                                        const active = idx <= stepIndex;
                                        const current = s.key === p.status;
                                        return (
                                            <div key={s.key} className={`relative flex items-start gap-space-sm ${active ? '' : 'opacity-50'}`}>
                                                <span className={`absolute -left-[27px] top-0 flex h-6 w-6 items-center justify-center rounded-full font-code-sm text-code-sm font-bold ${current ? 'bg-primary-container text-on-primary ring-4 ring-primary-container/20' : active ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{idx + 1}</span>
                                                <div>
                                                    <p className={`font-label-md text-label-md ${current ? 'font-bold text-primary' : 'font-semibold text-on-surface'}`}>{s.label}</p>
                                                    {current && <p className="font-body-sm text-body-sm text-on-surface-variant">Status saat ini</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="h-px w-full bg-surface-container-high" />
                                <div className="space-y-space-sm">
                                    {p.status === 'diterima' && (
                                        <button type="button" onClick={submitPrepare} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-space-md py-3 font-label-md text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary">
                                            <span className="material-symbols-outlined text-[20px]">inventory_2</span> Tandai Disiapkan
                                        </button>
                                    )}
                                    {p.status === 'disiapkan' && (
                                        <button type="button" onClick={submitReady} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary-container px-space-md py-3 font-label-md text-label-md font-semibold text-on-secondary-container shadow-sm hover:bg-secondary hover:text-on-secondary">
                                            <span className="material-symbols-outlined text-[20px]">done_all</span> Tandai Siap Diambil
                                        </button>
                                    )}
                                    {p.status === 'siap_diambil' && (
                                        <Link href={`/farmasi/antrean-resep/${p.id}/serah-terima`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-space-md py-3 font-label-md text-label-md font-semibold text-on-secondary shadow-sm hover:bg-on-secondary-fixed-variant">
                                            <span className="material-symbols-outlined text-[20px]">how_to_reg</span> Konfirmasi Serah Terima
                                        </Link>
                                    )}
                                    {['menunggu', 'diterima', 'disiapkan', 'siap_diambil'].includes(p.status) && (
                                        <button type="button" onClick={() => setShowCancel(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-error-container px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-error-container hover:bg-error-container/80">
                                            <span className="material-symbols-outlined text-[20px] text-error">assignment_return</span> Tolak / Batalkan Resep
                                        </button>
                                    )}
                                    <div className="rounded-lg bg-surface-container-low p-space-sm text-center font-body-sm text-body-sm text-on-surface-variant">
                                        Perubahan status dicatat berurutan. Pengurangan stok hanya terjadi saat konfirmasi serah terima.
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {showCancel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-space-md backdrop-blur-sm">
                        <form onSubmit={submitCancel} className="w-full max-w-lg space-y-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-2xl">
                            <div className="flex items-center justify-between">
                                <h4 className="font-headline-md text-headline-md font-bold text-on-surface">Batalkan / Tolak Resep</h4>
                                <button type="button" onClick={() => setShowCancel(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-[18px]">close</span></button>
                            </div>
                            <p className="font-body-md text-body-md text-on-surface-variant">Resep <strong>{p.number}</strong> akan dibatalkan. Masukkan alasan yang jelas (mis. permintaan revisi dokter, masalah klinis, atau kendala lain).</p>
                            <div>
                                <label className="font-label-sm text-label-sm font-semibold text-on-surface">Alasan pembatalan <span className="text-error">*</span></label>
                                <textarea value={cancelForm.data.reason} onChange={(e) => cancelForm.setData('reason', e.target.value)} rows={4} className="mt-1 w-full rounded-lg bg-surface-container-low p-space-sm font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary" placeholder="Tuliskan alasan pembatalan/revisi..." />
                                {cancelForm.errors.reason && <p className="mt-1 font-body-sm text-body-sm text-error">{cancelForm.errors.reason}</p>}
                            </div>
                            <div className="flex items-center justify-end gap-space-sm">
                                <button type="button" onClick={() => setShowCancel(false)} className="rounded-lg bg-surface-container-high px-space-md py-2 font-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container">Batal</button>
                                <button type="submit" disabled={cancelForm.processing} className="inline-flex items-center gap-1.5 rounded-lg bg-error px-space-md py-2 font-label-md text-label-md font-semibold text-on-error hover:bg-error/90 disabled:opacity-60">
                                    <span className="material-symbols-outlined text-[18px]">send</span> Konfirmasi Pembatalan
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </FarmasiLayout>
        </>
    );
}

function Info({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="flex flex-col">
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant"><span className="material-symbols-outlined text-[16px] text-outline">{icon}</span>{label}</span>
            <span className="mt-0.5 font-label-md text-label-md font-semibold text-on-surface">{value}</span>
        </div>
    );
}

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'P';
}