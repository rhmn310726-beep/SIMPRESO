import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import DokterLayout from '@/layouts/DokterLayout';
import type { SharedProps } from '@/types';

type GenderValue = 'L' | 'P';
type PrescriptionStatusValue =
    | 'menunggu'
    | 'diterima'
    | 'disiapkan'
    | 'siap_diambil'
    | 'diserahkan'
    | 'dibatalkan';

interface PatientDetail {
    id: number;
    medical_record_number: string;
    nik: string | null;
    name: string;
    date_of_birth: string | null;
    date_of_birth_label: string | null;
    age: number;
    gender: GenderValue;
    gender_label: string;
    phone: string | null;
    address: string | null;
    registered_at_label: string | null;
}

interface AllergyRow {
    id: number;
    allergen: string;
    note: string | null;
}

interface PrescriptionItemRow {
    id: number;
    medicine_name: string;
    unit: string | null;
    dosage: string;
    quantity: number;
    instructions: string;
}

interface PrescriptionRow {
    id: number;
    number: string;
    status: PrescriptionStatusValue;
    status_label: string;
    created_at_label: string | null;
    created_at_time: string | null;
    doctor_name: string | null;
    notes: string | null;
    handover_at_label: string | null;
    items: PrescriptionItemRow[];
}

interface MedicineOption {
    id: number;
    name: string;
    active_ingredient: string;
    unit: string;
    strength: string | null;
    stock: number;
}

interface PageProps {
    patient: PatientDetail;
    allergies: AllergyRow[];
    prescriptions: PrescriptionRow[];
    medicines: MedicineOption[];
}

interface EditPatientForm {
    nik: string;
    name: string;
    date_of_birth: string;
    gender: GenderValue;
    phone: string;
    address: string;
}

interface AllergyForm {
    allergen: string;
    note: string;
}

interface PrescriptionForm {
    medicine_id: string;
    dosage: string;
    quantity: string;
    instructions: string;
    notes: string;
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

const STATUS_FLOW: { value: PrescriptionStatusValue; label: string }[] = [
    { value: 'menunggu', label: 'Menunggu Telaah' },
    { value: 'diterima', label: 'Diterima' },
    { value: 'disiapkan', label: 'Disiapkan' },
    { value: 'siap_diambil', label: 'Siap Diambil' },
    { value: 'diserahkan', label: 'Diserahkan' },
];

const inputClass =
    'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline border-0 focus:outline-none focus:ring-2 focus:ring-primary';

export default function DetailPasien({ patient, allergies, prescriptions, medicines }: PageProps) {
    const { flash } = usePage<SharedProps>().props;

    const [editOpen, setEditOpen] = useState(false);
    const [allergyOpen, setAllergyOpen] = useState(false);
    const [resepOpen, setResepOpen] = useState(false);
    const [detailTarget, setDetailTarget] = useState<PrescriptionRow | null>(null);

    const editForm = useForm<EditPatientForm>({
        nik: patient.nik ?? '',
        name: patient.name,
        date_of_birth: patient.date_of_birth ?? '',
        gender: patient.gender,
        phone: patient.phone ?? '',
        address: patient.address ?? '',
    });

    const allergyForm = useForm<AllergyForm>({
        allergen: '',
        note: '',
    });

    const resepForm = useForm<PrescriptionForm>({
        medicine_id: '',
        dosage: '',
        quantity: '1',
        instructions: '',
        notes: '',
    });

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            if (detailTarget !== null) {
                setDetailTarget(null);
            } else if (resepOpen) {
                setResepOpen(false);
            } else if (allergyOpen) {
                setAllergyOpen(false);
            } else if (editOpen) {
                setEditOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [detailTarget, resepOpen, allergyOpen, editOpen]);

    const openEdit = () => {
        editForm.clearErrors();
        editForm.setData({
            nik: patient.nik ?? '',
            name: patient.name,
            date_of_birth: patient.date_of_birth ?? '',
            gender: patient.gender,
            phone: patient.phone ?? '',
            address: patient.address ?? '',
        });
        setEditOpen(true);
    };

    const closeEdit = () => {
        setEditOpen(false);
        editForm.clearErrors();
    };

    const submitEdit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        editForm.put(`/dokter/pasien/${patient.id}`, {
            preserveScroll: true,
            onSuccess: closeEdit,
        });
    };

    const openAllergy = () => {
        allergyForm.reset();
        allergyForm.clearErrors();
        setAllergyOpen(true);
    };

    const closeAllergy = () => {
        setAllergyOpen(false);
        allergyForm.clearErrors();
    };

    const submitAllergy = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        allergyForm.post(`/dokter/pasien/${patient.id}/alergi`, {
            preserveScroll: true,
            onSuccess: () => {
                closeAllergy();
                allergyForm.reset();
            },
        });
    };

    const removeAllergy = (allergy: AllergyRow) => {
        if (!window.confirm(`Hapus data alergi "${allergy.allergen}"?`)) {
            return;
        }

        router.delete(`/dokter/pasien/${patient.id}/alergi/${allergy.id}`, {
            preserveScroll: true,
        });
    };

    const openResep = () => {
        resepForm.reset();
        resepForm.clearErrors();
        setResepOpen(true);
    };

    const closeResep = () => {
        setResepOpen(false);
        resepForm.clearErrors();
    };

    const submitResep = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        resepForm.post(`/dokter/pasien/${patient.id}/resep`, {
            preserveScroll: true,
            onSuccess: () => {
                closeResep();
                resepForm.reset();
            },
        });
    };

    const selectedMedicine = medicines.find(
        (medicine) => medicine.id.toString() === resepForm.data.medicine_id,
    );

    const detailStepIndex = detailTarget === null ? -1 : statusStepIndex(detailTarget.status);

    return (
        <>
            <Head title={`Detail Pasien - ${patient.name}`} />
            <DokterLayout>
                <div className="mx-auto flex w-full max-w-[1440px] flex-col">
                    {flash.success && (
                        <div className="mb-space-md flex items-start gap-3 rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container">
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            <p className="font-body-md text-body-md leading-relaxed">{flash.success}</p>
                        </div>
                    )}

                    {flash.error && (
                        <div className="mb-space-md flex items-start gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
                            <span className="material-symbols-outlined text-[20px]">error</span>
                            <p className="font-body-md text-body-md leading-relaxed">{flash.error}</p>
                        </div>
                    )}

                    <div className="mb-space-md flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
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
                                <span className="font-semibold text-on-surface">Detail Pasien</span>
                            </div>
                        </div>
                        <span className="flex items-center gap-1.5 self-start rounded-full bg-secondary-container/40 px-2.5 py-1 font-label-sm text-label-sm font-semibold text-secondary sm:self-auto">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                            Status Rekam Medis: Aktif
                        </span>
                    </div>

                    <div className="relative mb-space-lg flex flex-col justify-between gap-space-md overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm md:flex-row md:items-center">
                        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary-fixed/30 blur-2xl" />
                        <div className="relative z-10 flex items-center gap-space-md">
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed font-headline-lg text-headline-lg font-bold text-primary shadow-inner">
                                {initials(patient.name)}
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                                        {patient.name}
                                    </h1>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 font-body-md text-body-md text-on-surface-variant">
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
                            </div>
                        </div>
                        <div className="relative z-10 flex flex-shrink-0 flex-wrap items-center gap-space-sm">
                            <button
                                type="button"
                                onClick={openEdit}
                                className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-container-low px-space-md py-2.5 font-label-md text-label-md font-medium text-on-surface shadow-sm transition-colors hover:bg-surface-container-high"
                            >
                                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                Edit Data Pasien
                            </button>
                            <button
                                type="button"
                                onClick={openResep}
                                disabled={medicines.length === 0}
                                title={
                                    medicines.length === 0
                                        ? 'Belum ada obat aktif di formularium'
                                        : undefined
                                }
                                className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-container px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">medication</span>
                                + Buat Resep untuk Pasien Ini
                            </button>
                        </div>
                    </div>

                    <div className="mb-space-lg grid grid-cols-1 items-stretch gap-space-lg lg:grid-cols-12">
                        <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-lg shadow-sm lg:col-span-7">
                            <div>
                                <div className="mb-space-md flex items-center justify-between rounded-lg bg-gradient-to-r from-surface-container-low/80 to-transparent p-3 pb-space-sm">
                                    <div className="flex items-center gap-2 text-primary">
                                        <span className="material-symbols-outlined text-[22px]">badge</span>
                                        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                            Informasi Pasien
                                        </h2>
                                    </div>
                                    <span className="font-label-sm text-label-sm text-outline">
                                        Terdaftar Sejak: {patient.registered_at_label ?? '-'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                                    <InfoItem label="No. Rekam Medis" value={patient.medical_record_number} />
                                    <InfoItem label="NIK" value={patient.nik ?? '-'} />
                                    <InfoItem label="Nama Lengkap" value={patient.name} />
                                    <InfoItem
                                        label="Tanggal Lahir"
                                        value={`${patient.date_of_birth_label ?? '-'} (${patient.age} tahun)`}
                                    />
                                    <InfoItem label="Jenis Kelamin" value={patient.gender_label} />
                                    <InfoItem label="No. Telepon" value={patient.phone ?? '-'} />
                                    <div className="flex flex-col md:col-span-2">
                                        <span className="font-label-sm text-label-sm font-medium tracking-wider text-outline uppercase">
                                            Alamat Tinggal
                                        </span>
                                        <span className="mt-0.5 font-body-md text-body-md leading-relaxed text-on-surface">
                                            {patient.address ?? 'Belum tercatat'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low/50 p-3 pt-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px] text-primary">
                                        verified_user
                                    </span>
                                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                                        Data identitas tersinkronisasi dengan rekam medis elektronik RS.
                                    </span>
                                </div>
                                <span className="font-label-sm text-label-sm font-semibold text-secondary">
                                    Terverifikasi
                                </span>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm lg:col-span-5">
                            <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-error-container/40 blur-xl" />
                            <div>
                                <div className="mb-space-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-error">
                                        <span className="material-symbols-outlined text-[24px]">warning</span>
                                        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                            Informasi Alergi
                                        </h2>
                                    </div>
                                    <span className="rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-error">
                                        {allergies.length} Alergen Aktif
                                    </span>
                                </div>
                                <p className="mb-space-md font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                                    Alergi akan otomatis memunculkan peringatan kontraindikasi saat dokter
                                    menyusun resep obat yang sesuai.
                                </p>

                                <div className="mb-space-md flex flex-col gap-2.5">
                                    {allergies.map((allergy) => (
                                        <div
                                            key={allergy.id}
                                            className="flex items-center justify-between gap-2 rounded-lg bg-error-container/30 p-3 transition-colors hover:bg-error-container/50"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-error" />
                                                <div className="flex min-w-0 flex-col">
                                                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                                                        {allergy.allergen}
                                                    </span>
                                                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                                                        {allergy.note ?? 'Tidak ada catatan manifestasi'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-shrink-0 items-center gap-2">
                                                <span className="rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container">
                                                    Tercatat
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAllergy(allergy)}
                                                    title={`Hapus alergi ${allergy.allergen}`}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full text-outline transition-colors hover:bg-error-container/50 hover:text-error"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        close
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {allergies.length === 0 && (
                                        <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-container-low px-4 py-6 text-center">
                                            <span className="material-symbols-outlined text-[28px] text-secondary">
                                                verified_user
                                            </span>
                                            <span className="font-label-md text-label-md font-semibold text-on-surface">
                                                Belum ada alergi terdata
                                            </span>
                                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                                Tambahkan alergi jika pasien memiliki riwayat hipersensitivitas.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={openAllergy}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-error-container/30 px-space-md py-2.5 font-label-md text-label-md font-semibold text-error shadow-sm transition-all hover:bg-error-container/60"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                    + Tambah Alergi Pasien
                                </button>
                            </div>

                            <div className="mt-4 flex items-center gap-2 pt-3 text-outline">
                                <span className="material-symbols-outlined flex-shrink-0 text-[16px] text-secondary">
                                    verified_user
                                </span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                    Tersinkronisasi otomatis dengan Database Farmakologi RS
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                        <div className="mb-space-md flex flex-col justify-between gap-space-sm pb-space-md sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-container/50 text-secondary">
                                    <span className="material-symbols-outlined text-[20px]">history_edu</span>
                                </div>
                                <div>
                                    <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                        Riwayat Resep Pasien
                                    </h2>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Daftar resep elektronik yang diterbitkan selama 12 bulan terakhir
                                    </p>
                                </div>
                            </div>
                            <span className="self-start rounded-full bg-surface-container-low px-3 py-1 font-label-sm text-label-sm font-medium text-outline sm:self-auto">
                                Total {prescriptions.length} Resep
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-surface-container-low text-on-surface-variant">
                                        <th className="rounded-l-lg px-4 py-3 font-label-sm text-label-sm font-semibold">
                                            Tanggal Resep
                                        </th>
                                        <th className="px-4 py-3 font-label-sm text-label-sm font-semibold">
                                            Dokter Pemeriksa
                                        </th>
                                        <th className="px-4 py-3 font-label-sm text-label-sm font-semibold">
                                            Item Obat
                                        </th>
                                        <th className="px-4 py-3 font-label-sm text-label-sm font-semibold">
                                            Status Farmasi
                                        </th>
                                        <th className="rounded-r-lg px-4 py-3 text-right font-label-sm text-label-sm font-semibold">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescriptions.map((prescription) => (
                                        <tr
                                            key={prescription.id}
                                            className="transition-colors hover:bg-surface-container-low"
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2 font-body-md text-body-md font-semibold text-on-surface">
                                                    <span className="material-symbols-outlined text-[18px] text-outline">
                                                        calendar_today
                                                    </span>
                                                    <span>{prescription.created_at_label ?? '-'}</span>
                                                    <span className="ml-1 font-body-sm font-normal text-outline">
                                                        {prescription.created_at_time ?? ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 font-body-md text-body-md text-on-surface">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[10px] font-bold text-primary">
                                                        dr
                                                    </span>
                                                    <span className="font-medium">
                                                        {prescription.doctor_name ?? '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="rounded bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-surface">
                                                    {prescription.items.length} item obat
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label-sm text-label-sm font-semibold ${STATUS_STYLES[prescription.status]}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[prescription.status]}`}
                                                    />
                                                    {prescription.status_label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailTarget(prescription)}
                                                    className="cursor-pointer rounded-lg bg-surface-container-high px-3.5 py-1.5 font-label-md text-label-md font-medium text-primary shadow-sm transition-all hover:bg-primary hover:text-on-primary"
                                                >
                                                    Lihat Detail
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {prescriptions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10 text-center">
                                                <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[32px] text-outline">
                                                        history_edu
                                                    </span>
                                                    <p className="font-headline-sm text-body-md font-semibold text-on-surface">
                                                        Belum ada riwayat resep
                                                    </p>
                                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                                        Resep elektronik yang diterbitkan akan muncul di sini.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {editOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
                        onClick={closeEdit}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="edit-patient-title"
                            className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-surface-container-high p-space-md">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                                        <span className="material-symbols-outlined text-[22px]">edit_note</span>
                                    </div>
                                    <div>
                                        <h3
                                            id="edit-patient-title"
                                            className="font-headline-md text-headline-md font-bold text-on-surface"
                                        >
                                            Edit Data Pasien
                                        </h3>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                                            Perbarui data demografis &amp; rekam medis pasien
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-space-md">
                                <form onSubmit={submitEdit} className="flex flex-col gap-4">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <Field label="No. Rekam Medis">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={patient.medical_record_number}
                                                    readOnly
                                                    className="w-full cursor-not-allowed rounded-lg bg-surface-container-high/60 px-3.5 py-2.5 font-body-md text-body-md text-outline focus:outline-none"
                                                />
                                                <span className="material-symbols-outlined absolute right-3 text-[18px] text-outline">
                                                    lock
                                                </span>
                                            </div>
                                        </Field>
                                        <Field label="NIK" error={editForm.errors.nik}>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={16}
                                                value={editForm.data.nik}
                                                onChange={(event) =>
                                                    editForm.setData('nik', event.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </Field>
                                    </div>

                                    <Field
                                        label="Nama Lengkap"
                                        required
                                        error={editForm.errors.name}
                                    >
                                        <input
                                            type="text"
                                            value={editForm.data.name}
                                            onChange={(event) =>
                                                editForm.setData('name', event.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <Field
                                            label="Tanggal Lahir"
                                            required
                                            error={editForm.errors.date_of_birth}
                                        >
                                            <input
                                                type="date"
                                                value={editForm.data.date_of_birth}
                                                onChange={(event) =>
                                                    editForm.setData(
                                                        'date_of_birth',
                                                        event.target.value,
                                                    )
                                                }
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field
                                            label="Jenis Kelamin"
                                            required
                                            error={editForm.errors.gender}
                                        >
                                            <div className="relative">
                                                <select
                                                    value={editForm.data.gender}
                                                    onChange={(event) =>
                                                        editForm.setData(
                                                            'gender',
                                                            event.target.value as GenderValue,
                                                        )
                                                    }
                                                    className={`${inputClass} cursor-pointer appearance-none pr-10`}
                                                >
                                                    <option value="L">Laki-laki</option>
                                                    <option value="P">Perempuan</option>
                                                </select>
                                                <span className="material-symbols-outlined pointer-events-none absolute top-2.5 right-3 text-[20px] text-outline">
                                                    arrow_drop_down
                                                </span>
                                            </div>
                                        </Field>
                                    </div>

                                    <Field
                                        label="No. Telepon / WhatsApp"
                                        required
                                        error={editForm.errors.phone}
                                    >
                                        <input
                                            type="text"
                                            value={editForm.data.phone}
                                            onChange={(event) =>
                                                editForm.setData('phone', event.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Alamat Domisili" error={editForm.errors.address}>
                                        <textarea
                                            rows={2}
                                            value={editForm.data.address}
                                            onChange={(event) =>
                                                editForm.setData('address', event.target.value)
                                            }
                                            className={`${inputClass} resize-none`}
                                        />
                                    </Field>

                                    <div className="flex items-center justify-end gap-2.5 border-t border-surface-container-high pt-3">
                                        <button
                                            type="button"
                                            onClick={closeEdit}
                                            className="cursor-pointer rounded-lg bg-surface-container-low px-space-md py-2.5 font-label-md text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={editForm.processing}
                                            className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-container px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                check
                                            </span>
                                            Simpan Perubahan
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {allergyOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
                        onClick={closeAllergy}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="allergy-modal-title"
                            className="relative w-full max-w-lg rounded-xl bg-surface-container-lowest p-space-lg shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-space-md flex items-center justify-between pb-space-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error-container text-error">
                                        <span className="material-symbols-outlined text-[20px]">
                                            notification_important
                                        </span>
                                    </div>
                                    <div>
                                        <h3
                                            id="allergy-modal-title"
                                            className="font-headline-md text-headline-md text-on-surface"
                                        >
                                            Tambah Data Alergi
                                        </h3>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            Pasien: {patient.name} ({patient.medical_record_number})
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeAllergy}
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <form onSubmit={submitAllergy} className="flex flex-col gap-4">
                                <Field
                                    label="Nama Alergen / Golongan Obat"
                                    required
                                    error={allergyForm.errors.allergen}
                                >
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={allergyForm.data.allergen}
                                            onChange={(event) =>
                                                allergyForm.setData('allergen', event.target.value)
                                            }
                                            placeholder="Contoh: Penisilin, Amoxicillin, NSAID..."
                                            className={inputClass}
                                        />
                                        <span className="material-symbols-outlined absolute top-2.5 right-3 text-[20px] text-outline">
                                            search
                                        </span>
                                    </div>
                                </Field>

                                <Field
                                    label="Catatan Manifestasi Klinis"
                                    error={allergyForm.errors.note}
                                >
                                    <textarea
                                        rows={3}
                                        value={allergyForm.data.note}
                                        onChange={(event) =>
                                            allergyForm.setData('note', event.target.value)
                                        }
                                        placeholder="Reaksi gatal ruam dan sesak ringan saat konsumsi antibiotik..."
                                        className={`${inputClass} resize-none`}
                                    />
                                </Field>

                                <div className="flex items-start gap-2.5 rounded-lg bg-error-container/40 p-3">
                                    <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[20px] text-error">
                                        report
                                    </span>
                                    <p className="font-body-sm text-body-sm leading-relaxed text-on-error-container">
                                        Data alergi akan <strong>tersimpan permanen</strong> dan muncul
                                        sebagai peringatan merah berprioritas tinggi saat dokter
                                        meresepkan obat terkait.
                                    </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeAllergy}
                                        className="cursor-pointer rounded-lg bg-surface-container-low px-space-md py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={allergyForm.processing}
                                        className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-container px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            save
                                        </span>
                                        Simpan Data Alergi
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {resepOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
                        onClick={closeResep}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="resep-modal-title"
                            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-surface-container-lowest p-space-lg shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-space-sm flex items-center justify-between border-b border-surface-container-high pb-space-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                                        <span className="material-symbols-outlined text-[24px]">
                                            prescriptions
                                        </span>
                                    </div>
                                    <div>
                                        <h3
                                            id="resep-modal-title"
                                            className="font-headline-md text-headline-md font-bold text-on-surface"
                                        >
                                            Buat Resep Elektronik
                                        </h3>
                                        <p className="mt-0.5 flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                                            <span>
                                                Pasien:{' '}
                                                <strong className="font-semibold text-on-surface">
                                                    {patient.name} ({patient.medical_record_number})
                                                </strong>
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeResep}
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                                {allergies.length > 0 ? (
                                    <div className="flex items-start gap-2.5 rounded-lg border border-error-container bg-error-container/40 p-3">
                                        <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[20px] text-error">
                                            warning
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-label-md text-label-md font-semibold text-on-error-container">
                                                Peringatan Alergi Pasien Aktif
                                            </span>
                                            <p className="font-body-sm text-body-sm leading-relaxed text-on-error-container">
                                                Pasien memiliki alergi terhadap{' '}
                                                <strong className="font-semibold underline decoration-error">
                                                    {allergies.map((allergy) => allergy.allergen).join(', ')}
                                                </strong>
                                                . Mohon hindari peresepan obat terkait dan konfirmasi
                                                kembali riwayat alergi sebelum mengirim resep.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2.5 rounded-lg bg-secondary-container/30 p-3">
                                        <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[20px] text-secondary">
                                            verified_user
                                        </span>
                                        <p className="font-body-sm text-body-sm leading-relaxed text-on-secondary-container">
                                            Tidak ada data alergi aktif untuk pasien ini.
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={submitResep} className="flex flex-col gap-4">
                                    <Field
                                        label="Pilihan Obat dari Formularium RS"
                                        required
                                        error={resepForm.errors.medicine_id}
                                    >
                                        <div className="relative">
                                            <select
                                                value={resepForm.data.medicine_id}
                                                onChange={(event) =>
                                                    resepForm.setData(
                                                        'medicine_id',
                                                        event.target.value,
                                                    )
                                                }
                                                className={`${inputClass} cursor-pointer appearance-none pr-10`}
                                            >
                                                <option value="">Pilih obat...</option>
                                                {medicines.map((medicine) => {
                                                    const allergyMatch = allergyMatchLabel(
                                                        medicine,
                                                        allergies,
                                                    );
                                                    const unavailable = medicine.stock <= 0;

                                                    return (
                                                        <option
                                                            key={medicine.id}
                                                            value={medicine.id}
                                                            disabled={unavailable}
                                                        >
                                                            {medicine.name}
                                                            {medicine.strength
                                                                ? ` ${medicine.strength}`
                                                                : ''}{' '}
                                                            ({medicine.unit}) — Stok:{' '}
                                                            {medicine.stock}
                                                            {unavailable ? ' (Stok habis)' : ''}
                                                            {allergyMatch
                                                                ? ` ⚠ Alergi terdata: ${allergyMatch}`
                                                                : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <span className="material-symbols-outlined pointer-events-none absolute top-2.5 right-3 text-[20px] text-outline">
                                                arrow_drop_down
                                            </span>
                                        </div>
                                        <p className="mt-1 font-body-sm text-body-sm text-outline">
                                            Hanya obat berstatus aktif yang tampil di formularium.
                                        </p>
                                    </Field>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <Field
                                            label="Dosis / Kekuatan"
                                            required
                                            error={resepForm.errors.dosage}
                                        >
                                            <input
                                                type="text"
                                                value={resepForm.data.dosage}
                                                onChange={(event) =>
                                                    resepForm.setData('dosage', event.target.value)
                                                }
                                                placeholder="Contoh: 500 mg, 10 mg"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field
                                            label="Kuantitas / Jumlah"
                                            required
                                            error={resepForm.errors.quantity}
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={resepForm.data.quantity}
                                                    onChange={(event) =>
                                                        resepForm.setData(
                                                            'quantity',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={`${inputClass} rounded-r-none`}
                                                />
                                                <span className="rounded-r-lg border-l border-surface-container bg-surface-container-high px-3.5 py-2.5 font-label-md text-label-md text-on-surface-variant">
                                                    {selectedMedicine?.unit ?? 'unit'}
                                                </span>
                                            </div>
                                        </Field>
                                    </div>

                                    {selectedMedicine && (
                                        <p
                                            className={`font-body-sm text-body-sm ${
                                                Number(resepForm.data.quantity) > selectedMedicine.stock
                                                    ? 'text-error'
                                                    : 'text-outline'
                                            }`}
                                        >
                                            Stok tersedia: {selectedMedicine.stock}{' '}
                                            {selectedMedicine.unit}
                                            {Number(resepForm.data.quantity) > selectedMedicine.stock
                                                ? ' — jumlah melebihi stok.'
                                                : ''}
                                        </p>
                                    )}

                                    <Field
                                        label="Aturan Pakai (Signa)"
                                        required
                                        error={resepForm.errors.instructions}
                                    >
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={resepForm.data.instructions}
                                                onChange={(event) =>
                                                    resepForm.setData(
                                                        'instructions',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Contoh: 3 x 1 tablet sesudah makan"
                                                className={inputClass}
                                            />
                                            <span className="material-symbols-outlined absolute top-2.5 right-3 text-[20px] text-outline">
                                                schedule
                                            </span>
                                        </div>
                                    </Field>

                                    <Field
                                        label="Catatan untuk Apoteker / Farmasi"
                                        error={resepForm.errors.notes}
                                    >
                                        <textarea
                                            rows={2}
                                            value={resepForm.data.notes}
                                            onChange={(event) =>
                                                resepForm.setData('notes', event.target.value)
                                            }
                                            placeholder="Contoh: Bila demam sudah reda dapat dihentikan. Berikan edukasi alergi..."
                                            className={`${inputClass} resize-none`}
                                        />
                                    </Field>

                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container/50 text-secondary">
                                                <span className="material-symbols-outlined text-[18px]">
                                                    verified
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-label-md text-label-md font-semibold text-on-surface">
                                                    Ringkasan Resep: 1 item obat terpilih
                                                </span>
                                                <span className="font-body-sm text-body-sm text-outline">
                                                    Status farmasi estimasi: Menunggu telaah apoteker
                                                </span>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-secondary-fixed/50 px-2.5 py-1 font-label-sm text-label-sm font-semibold text-secondary">
                                            Klinis Terverifikasi
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-container-high pt-2">
                                        <button
                                            type="button"
                                            onClick={closeResep}
                                            className="cursor-pointer rounded-lg bg-surface-container-low px-space-md py-2.5 font-label-md text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={
                                                resepForm.processing || medicines.length === 0
                                            }
                                            className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-container px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                send
                                            </span>
                                            Kirim Resep ke Farmasi
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {detailTarget && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
                        onClick={() => setDetailTarget(null)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="detail-resep-title"
                            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-surface-container-high bg-surface-container-lowest p-space-lg shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-space-sm flex items-center justify-between border-b border-surface-container-high pb-space-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                                        <span className="material-symbols-outlined text-[24px]">
                                            receipt_long
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3
                                                id="detail-resep-title"
                                                className="font-headline-md text-headline-md font-bold text-on-surface"
                                            >
                                                Detail Resep Elektronik {detailTarget.number}
                                            </h3>
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold ${STATUS_STYLES[detailTarget.status]}`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[detailTarget.status]}`}
                                                />
                                                {detailTarget.status_label}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[16px] text-outline">
                                                calendar_today
                                            </span>
                                            {detailTarget.created_at_label ?? '-'}
                                            {detailTarget.created_at_time
                                                ? `, ${detailTarget.created_at_time}`
                                                : ''}
                                            <span className="text-outline-variant">•</span>
                                            <span className="text-outline">
                                                Instalasi Farmasi Rawat Jalan
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetailTarget(null)}
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                                <div className="grid grid-cols-1 gap-3 rounded-xl bg-surface-container-low p-3.5 sm:grid-cols-2">
                                    <div className="flex flex-col">
                                        <span className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                            Identitas Pasien
                                        </span>
                                        <span className="mt-1 font-body-md text-body-md font-bold text-on-surface">
                                            {patient.name}
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            No. RM: {patient.medical_record_number} • {patient.age}{' '}
                                            tahun • {patient.gender_label}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:border-l sm:border-surface-container-high sm:pl-3">
                                        <span className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                            Dokter Pemeriksa
                                        </span>
                                        <span className="mt-1 font-body-md text-body-md font-bold text-primary">
                                            {detailTarget.doctor_name ?? '-'}
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            Rawat Jalan RS
                                        </span>
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
                                            {detailTarget.items.length} Item Obat
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {detailTarget.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-surface-container-high bg-surface-container-lowest p-3 transition-colors hover:bg-surface-container-low/60"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed/50 text-primary">
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            pill
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-label-md text-label-md font-bold text-on-surface">
                                                            {item.medicine_name}
                                                        </span>
                                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                                            Dosis:{' '}
                                                            <strong className="font-semibold text-on-surface">
                                                                {item.dosage}
                                                            </strong>
                                                        </span>
                                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                                            Signa:{' '}
                                                            <strong className="font-semibold text-on-surface">
                                                                {item.instructions}
                                                            </strong>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 text-right">
                                                    <span className="rounded bg-surface-container-high px-2.5 py-1 font-code-sm text-code-sm font-semibold text-on-surface">
                                                        {item.quantity} {item.unit ?? 'unit'}
                                                    </span>
                                                    <span className="mt-1 block font-label-sm text-label-sm font-semibold text-secondary">
                                                        FORNAS
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {detailTarget.items.length === 0 && (
                                            <div className="rounded-xl bg-surface-container-low p-4 text-center font-body-sm text-body-sm text-on-surface-variant">
                                                Tidak ada item obat pada resep ini.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {detailTarget.notes && (
                                    <div className="rounded-xl bg-surface-container-low p-3.5">
                                        <span className="font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                            Catatan untuk Farmasi
                                        </span>
                                        <p className="mt-1 font-body-md text-body-md leading-relaxed text-on-surface">
                                            {detailTarget.notes}
                                        </p>
                                    </div>
                                )}

                                <div className="rounded-xl border border-surface-container-high/60 bg-surface-container-low p-3.5">
                                    <span className="mb-3 block font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                                        Pelacakan Alur &amp; Telaah Farmasi
                                    </span>

                                    {detailTarget.status === 'dibatalkan' ? (
                                        <div className="flex items-center gap-2 rounded-lg bg-error-container/40 p-3 text-on-error-container">
                                            <span className="material-symbols-outlined text-[20px]">
                                                cancel
                                            </span>
                                            <span className="font-label-md text-label-md font-semibold">
                                                Resep ini telah dibatalkan.
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-5">
                                            {STATUS_FLOW.map((step, index) => {
                                                const completed =
                                                    detailStepIndex >= 0 &&
                                                    index <= detailStepIndex;
                                                const active = index === detailStepIndex;

                                                return (
                                                    <div
                                                        key={step.value}
                                                        className="flex flex-col items-center gap-1"
                                                    >
                                                        <div
                                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                                completed
                                                                    ? 'bg-secondary text-on-secondary shadow-sm'
                                                                    : 'bg-surface-container-high text-outline'
                                                            } ${active ? 'ring-2 ring-secondary/30' : ''}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                {completed ? 'check' : index + 1}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={`font-label-sm text-label-sm ${
                                                                active
                                                                    ? 'font-semibold text-secondary'
                                                                    : completed
                                                                      ? 'font-semibold text-on-surface'
                                                                      : 'text-outline'
                                                            }`}
                                                        >
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-surface-container-high pt-2 font-body-sm text-body-sm text-on-surface-variant">
                                        <span>
                                            Dibuat:{' '}
                                            <strong className="font-semibold text-on-surface">
                                                {detailTarget.created_at_label ?? '-'}
                                                {detailTarget.created_at_time
                                                    ? `, ${detailTarget.created_at_time}`
                                                    : ''}
                                            </strong>
                                        </span>
                                        {detailTarget.handover_at_label && (
                                            <span>
                                                Diserahkan:{' '}
                                                <strong className="font-semibold text-on-surface">
                                                    {detailTarget.handover_at_label}
                                                </strong>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-container-high pt-3">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-container-high px-space-md py-2.5 font-label-md text-label-md font-semibold text-primary transition-colors hover:bg-surface-container-highest"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        print
                                    </span>
                                    Cetak Salinan Resep
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetailTarget(null)}
                                    className="cursor-pointer rounded-lg bg-surface-container-low px-space-md py-2.5 font-label-md text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DokterLayout>
        </>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col">
            <span className="font-label-sm text-label-sm font-medium tracking-wider text-outline uppercase">
                {label}
            </span>
            <span className="mt-0.5 font-body-md text-body-md font-semibold text-on-surface">
                {value}
            </span>
        </div>
    );
}

function Field({
    label,
    required = false,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md font-semibold text-on-surface">
                {label} {required && <span className="text-error">*</span>}
            </label>
            {children}
            {error && <p className="font-body-sm text-body-sm font-medium text-error">{error}</p>}
        </div>
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

function statusStepIndex(status: PrescriptionStatusValue): number {
    return STATUS_FLOW.findIndex((step) => step.value === status);
}

function allergyMatchLabel(medicine: MedicineOption, allergies: AllergyRow[]): string | null {
    const haystack = `${medicine.name} ${medicine.active_ingredient}`.toLowerCase();
    const match = allergies.find((allergy) => {
        const needle = allergy.allergen.trim().toLowerCase();

        return needle !== '' && haystack.includes(needle);
    });

    return match?.allergen ?? null;
}
