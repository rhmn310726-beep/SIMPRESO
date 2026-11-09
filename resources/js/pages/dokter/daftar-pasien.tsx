import { Head } from '@inertiajs/react';
import RoleLayout from '@/layouts/RoleLayout';

export default function DaftarPasien() {
    return (
        <>
            <Head title="Daftar Pasien" />
            <RoleLayout title="Daftar Pasien">
                <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center shadow-soft-card">
                    <p className="text-sm text-slate-600">
                        Halaman daftar pasien akan dibangun dari desain Stitch berikutnya.
                    </p>
                </div>
            </RoleLayout>
        </>
    );
}
