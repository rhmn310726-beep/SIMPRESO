import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import FarmasiLayout from '@/layouts/FarmasiLayout';

interface PrescriptionRow {
    id: number;
    number: string;
    status: string;
    status_label: string;
    created_at_label: string;
    patient: {
        id: number;
        medical_record_number: string;
        name: string;
        age: number;
        gender_label: string;
    };
    doctor_name: string;
    items_count: number;
    has_alerts: boolean;
    allergy_count: number;
    interaction_count: number;
    next_action: { key: string; label: string; href: string } | null;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
}

interface Props {
    prescriptions: Paginated<PrescriptionRow>;
    filters: { search: string; status: string; doctor_id: string };
    counts: { menunggu: number; diterima: number; disiapkan: number; siap_diambil: number };
    doctor_options: { id: number; name: string }[];
}

const statusStyles: Record<string, string> = {
    menunggu: 'bg-surface-container-highest text-on-surface-variant',
    diterima: 'bg-primary-fixed text-on-primary-fixed-variant',
    disiapkan: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    siap_diambil: 'bg-secondary-fixed-dim text-on-secondary-fixed',
};

export default function AntreanResep({ prescriptions, filters, counts, doctor_options }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [doctorId, setDoctorId] = useState(filters.doctor_id);

    useEffect(() => {
        setSearch(filters.search);
        setStatus(filters.status);
        setDoctorId(filters.doctor_id);
    }, [filters]);

    const apply = (next: { search?: string; status?: string; doctor_id?: string }) => {
        const params: Record<string, string> = {};
        const s = (next.search ?? search).trim();
        const st = next.status ?? status;
        const d = next.doctor_id ?? doctorId;
        if (s) params.search = s;
        if (st) params.status = st;
        if (d) params.doctor_id = d;
        router.get('/farmasi/antrean-resep', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    const total = counts.menunggu + counts.diterima + counts.disiapkan + counts.siap_diambil;

    return (
        <>
            <Head title="Antrean Resep" />
            <FarmasiLayout>
                <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-space-lg">
                    <section className="flex flex-col justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row sm:items-center">
                        <div>
                            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">Antrean Resep</h1>
                            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                                Kelola telaah, penyiapan, dan serah terima resep aktif ({total} antrean).
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <CountPill label="Menunggu" value={counts.menunggu} tone="neutral" />
                            <CountPill label="Diterima" value={counts.diterima} tone="primary" />
                            <CountPill label="Disiapkan" value={counts.disiapkan} tone="secondary" />
                            <CountPill label="Siap Diambil" value={counts.siap_diambil} tone="ready" />
                        </div>
                    </section>

                    <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                        <div className="grid grid-cols-1 gap-space-sm md:grid-cols-4">
                            <div className="relative md:col-span-2">
                                <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline">search</span>
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && apply({ search: e.currentTarget.value })}
                                    placeholder="Cari No. Resep, pasien, No. RM, dokter..."
                                    className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low py-2.5 pr-3 pl-10 font-body-md text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); apply({ status: e.target.value }); }}
                                className="rounded-lg bg-surface-container-low px-3 py-2.5 font-label-sm text-label-sm shadow-sm focus:ring-2 focus:ring-primary-container"
                            >
                                <option value="">Semua Status Aktif</option>
                                <option value="menunggu">Menunggu</option>
                                <option value="diterima">Diterima</option>
                                <option value="disiapkan">Disiapkan</option>
                                <option value="siap_diambil">Siap Diambil</option>
                            </select>
                            <select
                                value={doctorId}
                                onChange={(e) => { setDoctorId(e.target.value); apply({ doctor_id: e.target.value }); }}
                                className="rounded-lg bg-surface-container-low px-3 py-2.5 font-label-sm text-label-sm shadow-sm focus:ring-2 focus:ring-primary-container"
                            >
                                <option value="">Semua Dokter</option>
                                {doctor_options.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => apply({})} className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-3 py-2 font-label-sm text-label-sm font-semibold text-on-primary hover:bg-primary">
                                <span className="material-symbols-outlined text-[16px]">search</span> Terapkan
                            </button>
                            {(filters.search || filters.status || filters.doctor_id) && (
                                <button type="button" onClick={() => { setSearch(''); setStatus(''); setDoctorId(''); router.get('/farmasi/antrean-resep', {}, { preserveState: true, replace: true }); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-label-sm text-label-sm font-semibold text-primary hover:bg-primary-fixed">
                                    <span className="material-symbols-outlined text-[16px]">filter_alt_off</span> Reset
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                        {prescriptions.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-space-lg py-16 text-center">
                                <span className="material-symbols-outlined text-[48px] text-outline-variant">inbox</span>
                                <h2 className="mt-2 font-headline-sm text-headline-sm text-on-surface">Tidak ada antrean</h2>
                                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">Tidak ada resep aktif yang cocok dengan filter saat ini.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-outline-variant/60">
                                    <thead className="bg-surface-container-low">
                                        <tr className="text-left font-label-sm text-label-sm text-on-surface-variant">
                                            <th className="px-space-md py-3 font-semibold">Resep</th>
                                            <th className="px-space-md py-3 font-semibold">Pasien</th>
                                            <th className="px-space-md py-3 font-semibold">Dokter</th>
                                            <th className="px-space-md py-3 font-semibold">Item / Peringatan</th>
                                            <th className="px-space-md py-3 font-semibold">Status</th>
                                            <th className="px-space-md py-3 text-right font-semibold">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/40">
                                        {prescriptions.data.map((item) => (
                                            <tr key={item.id} className="hover:bg-surface-container-low/60">
                                                <td className="px-space-md py-3">
                                                    <p className="font-code-sm text-code-sm font-bold text-primary">{item.number}</p>
                                                    <p className="font-label-sm text-label-sm text-outline">{item.created_at_label}</p>
                                                </td>
                                                <td className="px-space-md py-3">
                                                    <p className="font-label-md text-label-md font-semibold text-on-surface">{item.patient.name}</p>
                                                    <p className="font-label-sm text-label-sm text-on-surface-variant">{item.patient.medical_record_number} · {item.patient.age} th · {item.patient.gender_label}</p>
                                                </td>
                                                <td className="px-space-md py-3 font-label-sm text-label-sm text-on-surface-variant">{item.doctor_name}</td>
                                                <td className="px-space-md py-3">
                                                    <div className="flex flex-wrap items-center gap-2 font-label-sm text-label-sm">
                                                        <span className="rounded bg-surface-container px-2 py-0.5 text-on-surface-variant">{item.items_count} item</span>
                                                        {item.has_alerts ? (
                                                            <span className="inline-flex items-center gap-1 font-semibold text-error">
                                                                <span className="material-symbols-outlined text-[15px]">warning</span>
                                                                {item.allergy_count > 0 && `${item.allergy_count} alergi`}
                                                                {item.allergy_count > 0 && item.interaction_count > 0 && ' · '}
                                                                {item.interaction_count > 0 && `${item.interaction_count} interaksi`}
                                                            </span>
                                                        ) : (
                                                            <span className="text-secondary">Aman</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-space-md py-3">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold ${statusStyles[item.status] ?? 'bg-surface-container text-on-surface-variant'}`}>
                                                        {item.status_label}
                                                    </span>
                                                </td>
                                                <td className="px-space-md py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link href={`/farmasi/antrean-resep/${item.id}`} className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-primary hover:bg-surface-container">
                                                            <span className="material-symbols-outlined text-[16px]">visibility</span> Detail
                                                        </Link>
                                                        {item.status === 'siap_diambil' && item.next_action && (
                                                            <Link href={item.next_action.href} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-on-secondary hover:bg-on-secondary-fixed-variant">
                                                                <span className="material-symbols-outlined text-[16px]">how_to_reg</span> Serah Terima
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {prescriptions.links.length > 3 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/40 px-space-md py-3">
                                <p className="font-label-sm text-label-sm text-on-surface-variant">Total {prescriptions.total} resep</p>
                                <div className="flex flex-wrap gap-1">
                                    {prescriptions.links.map((link, idx) => (
                                        <Link
                                            key={idx}
                                            href={link.url ?? '#'}
                                            preserveState
                                            className={`rounded px-2.5 py-1 font-label-sm text-label-sm ${link.active ? 'bg-primary-container text-on-primary' : link.url ? 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container' : 'cursor-not-allowed text-outline-variant'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </FarmasiLayout>
        </>
    );
}

function CountPill({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'primary' | 'secondary' | 'ready' }) {
    const cls = tone === 'neutral'
        ? 'bg-surface-container-highest text-on-surface-variant'
        : tone === 'primary'
          ? 'bg-primary-fixed text-on-primary-fixed-variant'
          : tone === 'secondary'
            ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
            : 'bg-secondary-fixed-dim text-on-secondary-fixed';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold ${cls}`}>
            {label} <span className="font-code-sm text-code-sm">{value}</span>
        </span>
    );
}