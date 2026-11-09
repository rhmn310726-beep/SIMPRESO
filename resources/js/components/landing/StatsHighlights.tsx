export default function StatsHighlights() {
    return (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
            <div className="rounded-3xl border border-brand-100 bg-white/90 p-6 shadow-soft-card backdrop-blur-md sm:p-8">
                <div className="grid grid-cols-1 gap-6 divide-y divide-slate-100 sm:gap-8 md:grid-cols-3 md:divide-x md:divide-y-0">
                    <div className="flex items-center gap-4 pt-4 md:pt-0">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-600">
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">
                                100% Digital &amp; Paperless
                            </h2>
                            <p className="text-xs text-slate-500 sm:text-sm">
                                Hilangkan resep kertas tak terbaca dan percepat antrean.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-8">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">
                                Validasi Alergi &amp; Interaksi
                            </h2>
                            <p className="text-xs text-slate-500 sm:text-sm">
                                Peringatan otomatis saat ada kontraindikasi obat pasien.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-8">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-600">
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">
                                Sinkronisasi Stok Real-Time
                            </h2>
                            <p className="text-xs text-slate-500 sm:text-sm">
                                Pengurangan stok otomatis saat serah terima obat, stok selalu akurat.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
