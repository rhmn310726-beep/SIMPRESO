import { Head } from '@inertiajs/react';
import FarmasiLayout from '@/layouts/FarmasiLayout';

export default function AntreanResep() {
    return (
        <>
            <Head title="Antrean Resep" />
            <FarmasiLayout>
                <div className="mx-auto w-full max-w-[1720px]">
                    <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-sm">
                        <span className="material-symbols-outlined text-[40px] text-outline-variant">
                            queue
                        </span>
                        <h1 className="mt-2 font-headline-sm text-headline-sm text-on-surface">
                            Antrean Resep
                        </h1>
                        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                            Halaman kerja antrean resep akan dibangun pada tahap berikutnya.
                        </p>
                    </div>
                </div>
            </FarmasiLayout>
        </>
    );
}
