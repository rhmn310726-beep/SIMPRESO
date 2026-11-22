import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import FarmasiLayout from '@/layouts/FarmasiLayout';

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
        patient: {
            id: number;
            medical_record_number: string;
            name: string;
            age: number;
            date_of_birth_label: string | null;
            gender_label: string;
            phone: string | null;
        };
        doctor_name: string;
        allergies: { allergen: string; note: string | null }[];
        interactions: { medicine_a: string; medicine_b: string; severity_label: string }[];
        items: PrescriptionItem[];
    };
}

export default function SerahTerima({ prescription: p }: Props) {
    const form = useForm({
        recipient_name: '',
        recipient_relationship: '',
        notes: p.notes ?? '',
        confirmation: false as boolean,
    });

    const hasInsufficient = p.items.some((i) => !i.stock_sufficient);
    const totalUnits = p.items.reduce((sum, i) => sum + i.quantity, 0);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(`/farmasi/antrean-resep/${p.id}/serah-terima`);
    };

    return (
        <>
            <Head title={`Serah Terima ${p.number}`} />
            <FarmasiLayout>
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-space-lg">
                    <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                        <div className="flex items-center gap-space-sm">
                            <Link href={`/farmasi/antrean-resep/${p.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container hover:text-primary">
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </Link>
                            <div className="flex flex-wrap items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                                <Link href="/farmasi/antrean-resep" className="hover:text-primary">Antrean Resep</Link>
                                <span className="text-outline-variant">/</span>
                                <Link href={`/farmasi/antrean-resep/${p.id}`} className="hover:text-primary">{p.number}</Link>
                                <span className="text-outline-variant">/</span>
                                <span className="rounded bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-fixed">Konfirmasi Serah Terima</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-space-xs text-center">
                        <div className="mx-auto inline-flex items-center gap-space-xs rounded-full bg-surface-container px-space-sm py-0.5 font-label-sm text-label-sm text-primary shadow-sm">
                            <span className="material-symbols-outlined text-[16px]">verified_user</span>
                            <span>Tahap Akhir Penyerahan Obat</span>
                        </div>
                        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Konfirmasi Serah Terima Obat</h1>
                        <p className="mx-auto max-w-2xl font-body-md text-body-md text-on-surface-variant">
                            Pastikan identitas penerima diverifikasi dan edukasi/aturan pakai telah disampaikan sebelum menyelesaikan proses.
                        </p>
                    </div>

                    <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                        <div className="mb-space-md flex flex-col justify-between gap-space-sm rounded-lg bg-surface-container-low p-space-md md:flex-row md:items-center">
                            <div className="flex items-center gap-space-md">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-sm"><span className="material-symbols-outlined text-[26px]">receipt</span></div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-space-xs">
                                        <span className="font-headline-md text-headline-md tracking-wide text-on-surface">{p.number}</span>
                                        <span className="font-code-sm text-code-sm text-outline">•</span>
                                        <span className="font-label-sm text-label-sm font-medium text-on-surface-variant">Instalasi Farmasi</span>
                                    </div>
                                    <span className="mt-0.5 flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-[14px]">schedule</span> {p.created_at_label}</span>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-3 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-fixed shadow-sm">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span> {p.status_label}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-space-md pt-space-xs sm:grid-cols-2">
                            <div className="rounded-lg bg-surface-container-low/60 p-space-sm">
                                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Pasien</span>
                                <p className="mt-0.5 font-headline-sm text-headline-sm text-on-surface">{p.patient.name}</p>
                                <p className="font-code-sm text-code-sm font-medium text-primary">No. RM: {p.patient.medical_record_number}</p>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">{p.patient.age} th · {p.patient.gender_label}</p>
                            </div>
                            <div className="rounded-lg bg-surface-container-low/60 p-space-sm">
                                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Dokter Penulis</span>
                                <p className="mt-0.5 font-headline-sm text-headline-sm text-on-surface">{p.doctor_name}</p>
                                {p.allergies.length > 0 ? (
                                    <p className="mt-1 inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold text-error"><span className="material-symbols-outlined text-[14px]">warning</span> Alergi: {p.allergies.map((a) => a.allergen).join(', ')}</p>
                                ) : (
                                    <p className="font-body-sm text-body-sm text-secondary">Tidak ada alergi tercatat</p>
                                )}
                                {p.interactions.length > 0 && <p className="font-label-sm text-label-sm text-tertiary">{p.interactions.length} interaksi obat terdeteksi</p>}
                            </div>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                        <div className="flex items-center justify-between bg-surface-container-high/40 px-space-lg py-space-md">
                            <div className="flex items-center gap-space-sm">
                                <span className="material-symbols-outlined text-[20px] text-primary">medication_liquid</span>
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">Obat yang Akan Diserahkan</h2>
                            </div>
                            <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-surface-variant">{p.items.length} item · {totalUnits} unit</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-surface-container-low font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                                        <th className="px-space-md py-space-sm">Nama Obat</th>
                                        <th className="px-space-md py-space-sm">Dosis</th>
                                        <th className="px-space-md py-space-sm text-center">Jumlah</th>
                                        <th className="px-space-md py-space-sm">Aturan Pakai</th>
                                        <th className="px-space-md py-space-sm text-right">Ketersediaan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                                    {p.items.map((item) => (
                                        <tr key={item.id} className={`hover:bg-surface-container-low/40 ${!item.stock_sufficient ? 'bg-error-container/10' : ''}`}>
                                            <td className="px-space-md py-space-md">
                                                <div className="font-headline-sm text-headline-sm text-on-surface">{item.medicine_name}</div>
                                                <div className="font-code-sm text-code-sm text-outline">{[item.strength, item.unit, item.active_ingredient].filter(Boolean).join(' • ')}</div>
                                            </td>
                                            <td className="px-space-md py-space-md text-on-surface-variant">{item.dosage}</td>
                                            <td className="px-space-md py-space-md text-center font-headline-sm text-headline-sm text-on-surface">{item.quantity} <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">{item.unit ?? ''}</span></td>
                                            <td className="px-space-md py-space-md text-on-surface">{item.instructions}</td>
                                            <td className="px-space-md py-space-md text-right">
                                                {item.stock_sufficient ? (
                                                    <span className="inline-flex items-center gap-1 rounded bg-secondary-fixed px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-fixed"><span className="material-symbols-outlined text-[14px]">done_all</span> Siap ({item.stock} tersedia)</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded bg-error px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-error"><span className="material-symbols-outlined text-[14px]">inventory_2</span> Kurang (stok {item.stock})</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {hasInsufficient && (
                            <div className="border-t border-error/20 bg-error-container/40 px-space-lg py-space-sm font-body-sm text-body-sm text-on-error-container">
                                <strong>Serah terima tidak dapat diproses:</strong> stok sebagian obat tidak mencukupi jumlah yang diresepkan. Lengkapi/penyesuaian stok harus dilakukan terlebih dahulu (penyerahan parsial/copy resep tidak didukung pada alur ini).
                            </div>
                        )}
                    </section>

                    <div className="relative overflow-hidden rounded-xl bg-amber-50 p-space-md shadow-sm">
                        <div className="absolute top-0 bottom-0 left-0 w-2 bg-amber-500" />
                        <div className="flex items-start gap-space-md pl-space-xs">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800"><span className="material-symbols-outlined text-[24px]">warning</span></div>
                            <div>
                                <span className="font-headline-sm text-headline-sm text-amber-950">PERHATIAN — TRANSAKSI PERMANEN (IDEMPOTEN)</span>
                                <p className="mt-1 font-body-md text-body-md leading-relaxed text-amber-900">
                                    Konfirmasi serah terima bersifat permanen dan hanya dapat diproses satu kali. Sistem akan memotong stok obat dan mencatat transaksi keluar secara atomik. Pastikan obat fisik telah diterima dengan benar sebelum konfirmasi.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-space-lg">
                        <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                            <div className="mb-space-md flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
                                <span className="material-symbols-outlined text-[22px] text-primary">badge</span>
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">Data Penerima Obat & Catatan Edukasi (PIO)</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
                                <div className="flex flex-col gap-space-xs">
                                    <label className="font-label-md text-label-md font-semibold text-on-surface">Nama Penerima Obat <span className="text-error">*</span></label>
                                    <input value={form.data.recipient_name} onChange={(e) => form.setData('recipient_name', e.target.value)} className="h-11 rounded-lg bg-surface-container-low px-space-md font-body-md text-body-md shadow-sm outline-none focus:ring-2 focus:ring-primary-container" placeholder="Nama lengkap penerima" />
                                    {form.errors.recipient_name && <p className="font-body-sm text-body-sm text-error">{form.errors.recipient_name}</p>}
                                </div>
                                <div className="flex flex-col gap-space-xs">
                                    <label className="font-label-md text-label-md font-semibold text-on-surface">Hubungan dengan Pasien <span className="text-error">*</span></label>
                                    <select value={form.data.recipient_relationship} onChange={(e) => form.setData('recipient_relationship', e.target.value)} className="h-11 rounded-lg bg-surface-container-low px-space-md font-body-md text-body-md shadow-sm outline-none focus:ring-2 focus:ring-primary-container">
                                        <option value="">Pilih hubungan</option>
                                        <option value="Pasien Sendiri">Pasien Sendiri</option>
                                        <option value="Istri/Suami">Istri / Suami</option>
                                        <option value="Anak">Anak</option>
                                        <option value="Orang Tua">Orang Tua</option>
                                        <option value="Saudara">Saudara</option>
                                        <option value="Pendamping/Keluarga Lain">Pendamping / Keluarga Lain</option>
                                    </select>
                                    {form.errors.recipient_relationship && <p className="font-body-sm text-body-sm text-error">{form.errors.recipient_relationship}</p>}
                                </div>
                                <div className="flex flex-col gap-space-xs md:col-span-2">
                                    <label className="font-label-md text-label-md font-semibold text-on-surface">Catatan Edukasi / PIO (opsional)</label>
                                    <textarea value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={3} className="rounded-lg bg-surface-container-low p-space-md font-body-md text-body-md shadow-sm outline-none focus:ring-2 focus:ring-primary-container" placeholder="Catatan informasi obat yang disampaikan ke penerima..." />
                                    {form.errors.notes && <p className="font-body-sm text-body-sm text-error">{form.errors.notes}</p>}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl bg-surface-container-low p-space-lg shadow-sm">
                            <label className="flex cursor-pointer items-start gap-space-md select-none">
                                <input type="checkbox" checked={form.data.confirmation} onChange={(e) => form.setData('confirmation', e.target.checked)} className="mt-1 h-5 w-5 accent-primary" />
                                <div>
                                    <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">Pernyataan Tanggung Jawab Petugas Farmasi</span>
                                    <p className="mt-0.5 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                                        Saya menyatakan identitas penerima telah dicocokkan, obat telah diserahkan dengan benar, dan informasi/aturan pakai telah disampaikan kepada penerima.
                                    </p>
                                </div>
                            </label>
                            {form.errors.confirmation && <p className="mt-2 font-body-sm text-body-sm text-error">{form.errors.confirmation}</p>}
                            {(form.errors as Record<string, string>).handover && <p className="mt-2 font-body-sm text-body-sm text-error">{(form.errors as Record<string, string>).handover}</p>}
                            {(form.errors as Record<string, string>).stock && <p className="mt-2 font-body-sm text-body-sm text-error">{(form.errors as Record<string, string>).stock}</p>}
                        </section>

                        <div className="flex flex-col items-center justify-between gap-space-md pt-space-xs sm:flex-row">
                            <div className="flex w-full items-center gap-space-sm sm:w-auto">
                                <Link href={`/farmasi/antrean-resep/${p.id}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-space-lg py-3 font-label-md text-label-md font-medium text-on-surface-variant shadow-sm hover:bg-surface-container hover:text-on-surface sm:w-auto">
                                    <span className="material-symbols-outlined text-[18px]">close</span> Batal
                                </Link>
                                <button type="button" onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-space-lg py-3 font-label-md text-label-md font-semibold text-secondary shadow-sm hover:bg-surface-container-low sm:w-auto">
                                    <span className="material-symbols-outlined text-[18px]">print</span> Cetak
                                </button>
                            </div>
                            <button type="submit" disabled={form.processing || hasInsufficient || !form.data.confirmation} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-space-xl py-3.5 font-headline-sm text-headline-sm font-semibold text-on-primary shadow-md transition-all hover:bg-primary hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                                <span className="material-symbols-outlined text-[20px]">task_alt</span> {form.processing ? 'Memproses...' : 'Konfirmasi Serah Terima'}
                            </button>
                        </div>
                    </form>
                </div>
            </FarmasiLayout>
        </>
    );
}