import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { SharedProps } from '@/types';

export default function ForgotPassword() {
    const { flash } = usePage<SharedProps>().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const hasError = Boolean(flash.error);

    const submitted = Boolean(flash.success);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/forgot-password');
    };

    return (
        <>
            <Head title="Lupa Password" />

            <main className="pharmacy-bg-gradient flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
                <div className="flex min-h-[720px] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl lg:flex-row">
                    <section className="relative flex w-full flex-col justify-between overflow-hidden bg-linear-to-br from-brand-500 via-brand-600 to-pharmacy-teal p-8 text-white lg:w-[60%] lg:p-14">
                        <div className="pointer-events-none absolute inset-0 opacity-10">
                            <svg
                                className="h-full w-full"
                                fill="none"
                                viewBox="0 0 800 800"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <circle
                                    cx="400"
                                    cy="400"
                                    r="300"
                                    stroke="currentColor"
                                    strokeDasharray="8 8"
                                    strokeWidth="1.5"
                                />
                                <circle cx="400" cy="400" r="220" stroke="currentColor" strokeWidth="2" />
                                <path d="M100 400H700M400 100V700" stroke="currentColor" strokeWidth="1" />
                                <path
                                    d="M250 400C250 317.157 317.157 250 400 250C482.843 250 550 317.157 550 400"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                />
                                <path
                                    d="M280 400H330L350 360L380 450L410 330L440 430L460 380L480 400H520"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                />
                            </svg>
                        </div>

                        <div className="relative z-10 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 shadow-sm backdrop-blur-md">
                                    <svg
                                        className="h-7 w-7 -rotate-45"
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
                                    <p className="text-xl leading-tight font-bold tracking-tight">
                                        SIMPRESO
                                    </p>
                                    <p className="text-[11px] font-semibold tracking-wide text-white/80">
                                        Sehat Lebih Mudah
                                    </p>
                                </div>
                            </div>

                            <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md sm:flex">
                                <span className="h-2 w-2 animate-ping rounded-full bg-pharmacy-teal" />
                                <span>Sistem Aktif &amp; Terlindungi</span>
                            </div>
                        </div>

                        <div className="relative z-10 my-10 max-w-xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-brand-100">
                                <StethoscopeIcon className="h-4 w-4" />
                                <span>Sistem Informasi Resep Digital Terstandarisasi</span>
                            </div>

                            <h1 className="mb-4 text-[32px] leading-10 font-bold tracking-tight text-white">
                                Satu akun untuk Dokter, Farmasi, dan Admin
                            </h1>
                            <p className="mb-8 text-base leading-relaxed text-brand-100/90">
                                Pengendalian alur peresepan klinik terpadu dengan standar kepatuhan
                                farmasi dan validasi otentikasi ketat antar-profesi kesehatan.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <TrustBadge icon={<LockIcon className="h-5 w-5" />} label="Terenkripsi & Aman" />
                                <TrustBadge icon={<HubIcon className="h-5 w-5" />} label="Alur Terintegrasi" />
                                <TrustBadge icon={<BoltIcon className="h-5 w-5" />} label="Validasi Cepat & Akurat" />
                            </div>
                        </div>

                        <div className="relative z-10 flex flex-col gap-2 pt-6 text-xs text-brand-100/90 sm:flex-row sm:items-center sm:justify-between">
                            <span className="flex items-center gap-1.5">
                                <VerifiedUserIcon className="h-4 w-4" />
                                Standar Keamanan Data Resep Elektronik
                            </span>
                            <span className="font-medium">v1.0.0</span>
                        </div>
                    </section>

                    <section className="flex w-full flex-col justify-between bg-white p-8 lg:w-[40%] lg:p-12">
                        <div className="flex w-full justify-start">
                            <Link
                                href="/login"
                                className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600"
                            >
                                <ArrowLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                                <span>Kembali ke Login</span>
                            </Link>
                        </div>

                        <div className="mx-auto my-auto w-full max-w-md py-6">
                            <div className="mb-8">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-sm">
                                    <LockResetIcon className="h-6 w-6" />
                                </div>
                                <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
                                    Lupa Password
                                </h2>
                                <p className="text-sm leading-relaxed text-slate-600">
                                    Masukkan email resmi Anda. Kami akan mengirimkan tautan aman
                                    untuk membuat password baru. Tautan berlaku terbatas demi
                                    keamanan akun.
                                </p>
                            </div>

                            <form onSubmit={submit} className="space-y-6">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-slate-800"
                                    >
                                        Email Rumah Sakit / Terdaftar
                                    </label>
                                    <div className="relative flex items-center">
                                        <MailIcon className="pointer-events-none absolute left-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            disabled={submitted}
                                            value={data.email}
                                            onChange={(event) => setData('email', event.target.value)}
                                            placeholder="nama.dokter@hospital.id"
                                            className="w-full rounded-lg bg-slate-50 py-3 pr-4 pl-11 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none disabled:opacity-70"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-xs font-medium text-red-600">
                                            {errors.email}
                                        </p>
                                    )}
                                    <p className="flex items-center gap-1 text-xs text-slate-500">
                                        <InfoIcon className="h-3.5 w-3.5" />
                                        Gunakan email instansi yang terdaftar pada Admin.
                                    </p>
                                </div>

                                {hasError && (
                                    <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                                        <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                        <p className="leading-relaxed">{flash.error}</p>
                                    </div>
                                )}

                                {!submitted && (
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                                    >
                                        {processing ? (
                                            <SpinnerIcon className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <SendIcon className="h-5 w-5" />
                                        )}
                                        <span>
                                            {processing
                                                ? 'Memproses Permintaan...'
                                                : 'Kirim Permintaan Reset'}
                                        </span>
                                    </button>
                                )}

                                {submitted && (
                                    <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
                                        <div className="flex items-start gap-3">
                                            <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                            <div>
                                                <p className="mb-1 text-sm font-semibold text-slate-900">
                                                    Tautan Reset Dikirim
                                                </p>
                                                <p className="mb-3 text-xs leading-relaxed text-slate-600">
                                                    {flash.success}
                                                </p>
                                                <Link
                                                    href="/login"
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                                                >
                                                    <ArrowLeftIcon className="h-3.5 w-3.5" />
                                                    <span>Lanjut ke Login</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2 text-center">
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                                    >
                                        <ArrowLeftIcon className="h-5 w-5" />
                                        <span>Kembali ke Login</span>
                                    </Link>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <ShieldLockIcon className="h-5 w-5 flex-shrink-0 text-brand-600" />
                                        <div className="space-y-1">
                                            <span className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Prosedur Keamanan Khusus
                                            </span>
                                            <p className="text-xs leading-relaxed text-slate-600">
                                                Demi keamanan resep obat keras dan psikotropika, tautan
                                                reset hanya dikirim ke email resmi yang terdaftar. Jika
                                                email tidak Anda terima, hubungi Admin Sistem untuk
                                                verifikasi identitas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="pt-6 text-center text-xs text-slate-400">
                            © 2025 SIMPRESO. Seluruh Hak Cipta Dilindungi.
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

function TrustBadge({ icon, label }: { icon: ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 text-white shadow-sm backdrop-blur-md">
            <span className="text-pharmacy-teal">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
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

function LockResetIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 15v2" strokeLinecap="round" strokeLinejoin="round" />
            <path
                d="M8 11V7a4 4 0 118 0v1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M5 11h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M20 7a8 8 0 00-13-3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function MailIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M3 7l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z"
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

function SendIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
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

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ShieldLockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 11v3m-2-3V9.5a2 2 0 114 0V11" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
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

function HubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="5" cy="19" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="19" cy="19" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 7.5v4m0 0L6.5 17M12 11.5L17.5 17" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function BoltIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function StethoscopeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M6 3v6a4 4 0 008 0V3M6 5H4m12 0h2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M10 17v1a4 4 0 008 0v-2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="18" cy="13" r="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function VerifiedUserIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
