import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { SharedProps } from '@/types';

export default function Login() {
    const { flash } = usePage<SharedProps>().props;
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Masuk" />

            <main className="pharmacy-bg-gradient flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
                <div className="grid min-h-[720px] w-full max-w-7xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-xl lg:grid-cols-12">
                    <section className="relative flex flex-col justify-between overflow-hidden bg-linear-to-br from-brand-400 via-brand-500 to-pharmacy-teal p-8 text-white lg:col-span-7 lg:p-12">
                        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                        <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

                        <div className="relative z-10 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-sm backdrop-blur-md">
                                <svg
                                    className="h-8 w-8 -rotate-45"
                                    fill="none"
                                    viewBox="0 0 48 48"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M14 10C8.47715 10 4 14.4772 4 20V28C4 33.5228 8.47715 38 14 38H24V10H14Z"
                                        fill="#FFFFFF"
                                        stroke="#FFFFFF"
                                        strokeLinejoin="round"
                                        strokeWidth="3.5"
                                    />
                                    <path
                                        d="M24 10H34C39.5228 10 44 14.4772 44 20V28C44 33.5228 39.5228 38 34 38H24V10Z"
                                        fill="#BAE0FD"
                                        stroke="#FFFFFF"
                                        strokeLinejoin="round"
                                        strokeWidth="3.5"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl leading-tight font-bold tracking-tight">
                                    SIMPRESO
                                </p>
                                <p className="text-xs font-semibold tracking-wide text-white/80">
                                    Sehat Lebih Mudah
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 my-auto flex flex-col items-center py-8 text-center">
                            <div className="relative mb-8 flex h-52 w-full max-w-md items-center justify-center">
                                <svg
                                    className="h-full w-full text-white/90 drop-shadow-md"
                                    fill="none"
                                    viewBox="0 0 460 220"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M230 20 L275 42 V94 C275 125 255 152 230 162 C205 152 185 125 185 94 V42 L230 20 Z"
                                        fill="rgba(255,255,255,0.08)"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2.5"
                                    />
                                    <path
                                        d="M216 88 L227 99 L246 80"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="3"
                                    />
                                    <rect
                                        fill="rgba(255,255,255,0.06)"
                                        height="114"
                                        rx="8"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        width="82"
                                        x="75"
                                        y="45"
                                    />
                                    <line
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="2.5"
                                        x1="93"
                                        x2="139"
                                        y1="70"
                                        y2="70"
                                    />
                                    <line
                                        stroke="currentColor"
                                        strokeDasharray="2 4"
                                        strokeLinecap="round"
                                        strokeWidth="2"
                                        x1="93"
                                        x2="139"
                                        y1="88"
                                        y2="88"
                                    />
                                    <line
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="2"
                                        x1="93"
                                        x2="128"
                                        y1="104"
                                        y2="104"
                                    />
                                    <line
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="2"
                                        x1="93"
                                        x2="134"
                                        y1="120"
                                        y2="120"
                                    />
                                    <circle
                                        cx="116"
                                        cy="138"
                                        r="8"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                    <path
                                        d="M116 134 V142 M112 138 H120"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="2"
                                    />
                                    <path
                                        d="M320 88 C320 125 340 142 375 142 C410 142 430 125 430 88 H320 Z"
                                        fill="rgba(255,255,255,0.06)"
                                        stroke="currentColor"
                                        strokeLinejoin="round"
                                        strokeWidth="2.5"
                                    />
                                    <line
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="2.5"
                                        x1="335"
                                        x2="330"
                                        y1="142"
                                        y2="155"
                                    />
                                    <line
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="2.5"
                                        x1="415"
                                        x2="420"
                                        y1="142"
                                        y2="155"
                                    />
                                    <line
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="2.5"
                                        x1="322"
                                        x2="428"
                                        y1="155"
                                        y2="155"
                                    />
                                    <path
                                        d="M392 50 L362 108"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="3"
                                    />
                                    <path
                                        d="M45 110 C45 160 115 178 185 178"
                                        stroke="currentColor"
                                        strokeDasharray="4 4"
                                        strokeLinecap="round"
                                        strokeWidth="2.5"
                                    />
                                    <path
                                        d="M275 178 C335 178 405 165 410 115"
                                        stroke="currentColor"
                                        strokeDasharray="4 4"
                                        strokeLinecap="round"
                                        strokeWidth="2.5"
                                    />
                                    <circle
                                        cx="45"
                                        cy="105"
                                        fill="rgba(255,255,255,0.2)"
                                        r="9"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    />
                                    <circle
                                        cx="410"
                                        cy="110"
                                        fill="rgba(255,255,255,0.2)"
                                        r="9"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    />
                                    <rect
                                        fill="rgba(255,255,255,0.1)"
                                        height="42"
                                        rx="4"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        width="28"
                                        x="150"
                                        y="125"
                                    />
                                    <rect
                                        height="6"
                                        rx="2"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        width="16"
                                        x="156"
                                        y="119"
                                    />
                                    <path
                                        d="M164 139 V153 M157 146 H171"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth="1.8"
                                    />
                                    <circle cx="295" cy="50" fill="currentColor" r="3" />
                                    <circle cx="165" cy="35" fill="currentColor" r="2.5" />
                                    <circle cx="305" cy="145" fill="currentColor" r="3" />
                                </svg>
                            </div>

                            <h1 className="mb-3 max-w-lg text-2xl leading-8 font-bold text-white">
                                Satu akun untuk Dokter, Farmasi, dan Admin
                            </h1>
                            <p className="mx-auto max-w-md text-sm leading-relaxed text-white/85">
                                Akses terpusat untuk peresepan elektronik, telaah obat, dan tata
                                kelola stok farmasi rumah sakit.
                            </p>
                        </div>

                        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pt-4">
                            <TrustBadge icon={<LockIcon className="h-4 w-4" />} label="Terenkripsi & Aman" />
                            <TrustBadge icon={<LinkIcon className="h-4 w-4" />} label="Alur Terintegrasi" />
                            <TrustBadge icon={<BoltIcon className="h-4 w-4" />} label="Validasi Cepat & Akurat" />
                        </div>
                    </section>

                    <section className="flex flex-col justify-between bg-white p-8 lg:col-span-5 lg:p-10">
                        <div className="flex w-full items-center justify-between">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-brand-600"
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                                <span>Kembali ke Beranda</span>
                            </Link>
                            <div className="h-2.5 w-2.5 rounded-full bg-pharmacy-teal" />
                        </div>

                        <div className="mx-auto my-auto w-full max-w-md py-6">
                            <div className="mb-7">
                                <h2 className="text-2xl font-bold text-slate-900">Masuk ke Sistem</h2>
                                <p className="mt-1.5 text-sm text-slate-600">
                                    Akun dibuat dan diverifikasi oleh Admin rumah sakit.
                                </p>
                            </div>

                            {flash.success && (
                                <div className="mb-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                                    <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <p className="leading-relaxed">{flash.success}</p>
                                </div>
                            )}

                            {flash.error && (
                                <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                                    <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <p className="leading-relaxed">{flash.error}</p>
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-1.5 block text-sm font-medium text-slate-800"
                                    >
                                        Email
                                    </label>
                                    <div className="relative flex items-center rounded-lg bg-slate-50 transition-all focus-within:bg-white focus-within:shadow-sm">
                                        <BadgeIcon className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="username"
                                            required
                                            value={data.email}
                                            onChange={(event) => setData('email', event.target.value)}
                                            placeholder="Masukkan email resmi"
                                            className="w-full rounded-lg bg-transparent py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="mt-1 text-xs font-medium text-red-600">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="mb-1.5 block text-sm font-medium text-slate-800"
                                    >
                                        Password
                                    </label>
                                    <div className="relative flex items-center rounded-lg bg-slate-50 transition-all focus-within:bg-white focus-within:shadow-sm">
                                        <LockIcon className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            required
                                            value={data.password}
                                            onChange={(event) =>
                                                setData('password', event.target.value)
                                            }
                                            placeholder="••••••••"
                                            className="w-full rounded-lg bg-transparent py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            aria-label="Tampilkan atau sembunyikan password"
                                            className="absolute right-3 flex items-center justify-center rounded p-1 text-slate-400 transition-colors hover:text-slate-700"
                                        >
                                            {showPassword ? (
                                                <EyeOffIcon className="h-5 w-5" />
                                            ) : (
                                                <EyeIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1 text-xs font-medium text-red-600">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-1 pb-1">
                                    <label className="flex cursor-pointer items-center gap-2 select-none">
                                        <input
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(event) =>
                                                setData('remember', event.target.checked)
                                            }
                                            className="h-4 w-4 cursor-pointer rounded accent-brand-500"
                                        />
                                        <span className="text-xs text-slate-600">Ingat saya</span>
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                                    >
                                        Lupa password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
                                >
                                    <LoginIcon className="h-5 w-5" />
                                    <span>
                                        {processing ? 'Memverifikasi kredensial...' : 'Masuk'}
                                    </span>
                                </button>
                            </form>

                            <div className="mt-6 flex items-start gap-3 rounded-lg bg-slate-50 p-3.5">
                                <InfoIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Belum memiliki akun? Hubungi Admin Sistem atau Kepala Instalasi
                                    Farmasi untuk penerbitan akun dinas.
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 text-center">
                            <p className="text-xs text-slate-400">
                                © 2025 SIMPRESO • Sistem Informasi Resep &amp; Stok Obat
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

function TrustBadge({ icon, label }: { icon: ReactNode; label: string }) {
    return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
            {icon}
            <span>{label}</span>
        </div>
    );
}

function ArrowLeftIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5m0 0l7 7m-7-7l7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function BadgeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function LinkIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m8.656-1.5l1.5-1.5a4 4 0 00-5.656-5.656l-3 3a4 4 0 000 5.656"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function BoltIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function EyeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function EyeOffIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.785 9.785 0 01-4.293 5.128M6.228 6.228A9.79 9.79 0 002.458 12c1.274 4.057 5.064 7 9.542 7a9.47 9.47 0 004.293-1.028"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function LoginIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m-5-4l4-4-4-4m4 4H3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 11v5m0-8h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function AlertIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 9v4m0 4h.01M10.3 4.3L2.7 17.6A1.5 1.5 0 004 20h16a1.5 1.5 0 001.3-2.4L13.7 4.3a2 2 0 00-3.4 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
