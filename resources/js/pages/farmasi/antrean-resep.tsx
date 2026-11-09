import { Head } from '@inertiajs/react';
import RoleLayout from '@/layouts/RoleLayout';

export default function AntreanResep() {
    return (
        <>
            <Head title="Antrean Resep" />
            <RoleLayout title="Antrean Resep">
                <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center shadow-soft-card">
                    <p className="text-sm text-slate-600">
                        Halaman antrean resep akan dibangun dari desain Stitch berikutnya.
                    </p>
                </div>
            </RoleLayout>
        </>
    );
}
