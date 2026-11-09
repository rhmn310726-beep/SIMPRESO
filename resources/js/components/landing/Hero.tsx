import { Link } from '@inertiajs/react';
import HeroIllustration from '@/components/landing/HeroIllustration';

export default function Hero() {
    return (
        <main
            id="beranda"
            className="relative mx-auto max-w-7xl overflow-hidden px-4 pt-8 pb-16 sm:px-8 md:pt-14"
        >
            <div className="pointer-events-none absolute top-20 left-10 select-none text-brand-200 opacity-60">
                <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 2H15V9H22V15H15V22H9V15H2V9H9V2Z" />
                </svg>
            </div>
            <div className="pointer-events-none absolute top-12 right-24 hidden select-none text-brand-100 opacity-80 lg:block">
                <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 2H15V9H22V15H15V22H9V15H2V9H9V2Z" />
                </svg>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
                <div className="z-10 flex flex-col items-start lg:col-span-6">
                    <div className="mb-2 ml-1 flex items-center gap-1.5">
                        <span className="inline-block h-5 w-2 rotate-[-25deg] rounded-full bg-amber-400 shadow-sm" />
                        <span className="-mt-2 inline-block h-6 w-2.5 rotate-[-10deg] rounded-full bg-amber-400 shadow-sm" />
                        <span className="inline-block h-4 w-2 rotate-[15deg] rounded-full bg-amber-400 shadow-sm" />
                    </div>

                    <h1 className="mb-4 text-3xl leading-[1.18] font-black tracking-tight text-[#163668] sm:text-4xl lg:text-[40px]">
                        PERANCANGAN SISTEM INFORMASI RESEP ELEKTRONIK DAN PENGELOLAAN STOK OBAT
                        BERBASIS{' '}
                        <span className="relative inline-block text-[#1D72FE]">
                            WEB APPLICATION
                            <svg
                                className="absolute -bottom-2.5 left-0 h-3 w-full text-[#1D72FE]/40"
                                preserveAspectRatio="none"
                                viewBox="0 0 100 20"
                            >
                                <path
                                    d="M0 12 C30 22, 70 2, 100 12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeWidth="4"
                                />
                            </svg>
                        </span>
                    </h1>

                    <p className="mt-2 mb-8 max-w-xl text-base leading-relaxed font-medium text-slate-600 sm:text-lg">
                        Kelola resep dan stok obat dengan lebih mudah, cepat, dan terintegrasi dalam
                        satu sistem farmasi terpadu!
                    </p>

                    <div className="relative mb-10 inline-flex items-center gap-3">
                        <Link
                            href="/login"
                            className="group inline-flex items-center gap-3 rounded-full bg-brand-500 px-8 py-4 text-lg font-bold text-white shadow-pill-btn transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-xl focus:ring-4 focus:ring-brand-200"
                        >
                            <span>Mulai Sekarang</span>
                            <svg
                                className="h-5 w-5 transition-transform group-hover:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </Link>
                        <div className="flex items-center gap-1 text-amber-400 select-none">
                            <span className="inline-block h-3 w-1.5 rotate-45 rounded-full bg-amber-400" />
                            <span className="inline-block h-4 w-2 rotate-90 rounded-full bg-amber-400" />
                            <span className="inline-block h-3 w-1.5 rotate-[135deg] rounded-full bg-amber-400" />
                        </div>
                    </div>

                    <div className="flex items-end gap-3 pt-2 select-none">
                        <div className="relative flex flex-col items-center">
                            <div className="h-4 w-9 rounded-t-md border-2 border-brand-700 bg-brand-600 shadow-inner" />
                            <div className="h-1.5 w-7 bg-brand-400" />
                            <div className="relative flex h-20 w-16 items-center justify-center rounded-2xl border-2 border-brand-700 bg-linear-to-br from-brand-400 to-brand-600 shadow-md">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 shadow-inner">
                                    <div className="relative flex h-6 w-6 items-center justify-center">
                                        <span className="absolute h-6 w-2 rounded-sm bg-brand-500" />
                                        <span className="absolute h-2 w-6 rounded-sm bg-brand-500" />
                                    </div>
                                </div>
                                <span className="absolute top-1 left-2 h-7 w-2 rotate-12 rounded-full bg-white/30" />
                            </div>
                        </div>

                        <div className="relative flex flex-col items-center">
                            <div className="h-3.5 w-8 rounded-t-md border border-slate-300 bg-slate-200" />
                            <div className="h-1 w-6 bg-slate-300" />
                            <div className="relative flex h-16 w-14 items-center justify-center rounded-2xl border-2 border-slate-300 bg-linear-to-b from-white to-slate-100 shadow-sm">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50">
                                    <div className="relative flex h-5 w-5 items-center justify-center">
                                        <span className="absolute h-5 w-1.5 rounded-sm bg-red-500" />
                                        <span className="absolute h-1.5 w-5 rounded-sm bg-red-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ml-1 flex items-center gap-2 pb-1">
                            <div className="flex h-4 w-8 rotate-[-15deg] overflow-hidden rounded-full border border-red-600 bg-linear-to-r from-red-500 to-red-400 shadow-sm">
                                <span className="h-full w-1/2 bg-red-500" />
                                <span className="h-full w-1/2 bg-red-400" />
                            </div>
                            <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-300 bg-white shadow-sm">
                                <span className="h-0.5 w-2.5 bg-slate-300" />
                            </div>
                            <div className="flex h-3.5 w-7 rotate-[10deg] overflow-hidden rounded-full border border-brand-500 shadow-sm">
                                <span className="h-full w-1/2 bg-white" />
                                <span className="h-full w-1/2 bg-brand-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <HeroIllustration />
            </div>
        </main>
    );
}
