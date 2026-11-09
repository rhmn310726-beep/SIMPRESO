import { Link } from '@inertiajs/react';

export default function FeatureCards() {
    return (
        <section id="resep" className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center">
                <span className="rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-bold tracking-wider text-brand-600 uppercase">
                    Fitur Utama Sistem
                </span>
                <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    Alur Terintegrasi Dari Dokter Hingga Apotek
                </h2>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    Dukungan alur kerja resep digital dan inventaris obat yang akurat tanpa celah.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Link
                    href="/login"
                    className="group block cursor-pointer rounded-3xl border border-brand-100 bg-white p-6 shadow-soft-card transition-all hover:shadow-lg"
                >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white transition-transform group-hover:scale-110">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-brand-600">
                        E-Prescribing Dokter
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-slate-600">
                        Dokter meresepkan obat dari formularium terstandar dengan dosis dan aturan
                        pakai yang jelas, serta riwayat resep pasien.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition-all group-hover:gap-2">
                        Pelajari Format Resep →
                    </span>
                </Link>

                <Link
                    href="/login"
                    className="group block cursor-pointer rounded-3xl border border-brand-100 bg-white p-6 shadow-soft-card transition-all hover:shadow-lg"
                >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 text-white transition-transform group-hover:scale-110">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-teal-600">
                        Verifikasi Apoteker
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-slate-600">
                        Antarmuka telaah resep cepat dengan indikator otomatis penyiapan obat serta
                        aturan pakai.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 transition-all group-hover:gap-2">
                        Lihat Alur Telaah →
                    </span>
                </Link>

                <Link
                    id="stok-obat"
                    href="/login"
                    className="group block cursor-pointer rounded-3xl border border-brand-100 bg-white p-6 shadow-soft-card transition-all hover:shadow-lg"
                >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white transition-transform group-hover:scale-110">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                        Manajemen Stok &amp; Formularium
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-slate-600">
                        Pengurangan stok otomatis saat serah terima, pengaturan stok minimum, dan
                        peringatan stok kritis.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition-all group-hover:gap-2">
                        Sistem Gudang Obat →
                    </span>
                </Link>
            </div>
        </section>
    );
}
