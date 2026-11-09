import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/reset-password');
    };

    const tokenError = errors.token;

    return (
        <>
            <Head title="Buat Password Baru" />

            <main className="pharmacy-bg-gradient flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
                <div className="flex min-h-[680px] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl lg:flex-row">
                    <section className="relative flex w-full flex-col justify-between overflow-hidden bg-linear-to-br from-brand-500 via-brand-600 to-pharmacy-teal p-8 text-white lg:w-[55%] lg:p-12">
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
                                <circle cx="400" cy="400" r="210" stroke="currentColor" strokeWidth="2" />
                                <path d="M100 400H700M400 100V700" stroke="currentColor" strokeWidth="1" />
                                <path
                                    d="M280 400H330L350 360L380 450L410 330L440 430L460 380L480 400H520"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                />
                            </svg>
                        </div>

                        <div className="relative z-10 flex items-center gap-3">
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
                                <p className="text-xl leading-tight font-bold tracking-tight">SIMPRESO</p>
                                <p className="text-[11px] font-semibold tracking-wide text-white/80">
                                    Sehat Lebih Mudah
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 my-auto max-w-lg py-10">
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-sm backdrop-blur-md">
                                <KeyIcon className="h-7 w-7" />
                            </div>
                            <h1 className="mb-4 text-[30px] leading-tight font-bold tracking-tight">
                                Amankan Kembali Akses Akun Anda
                            </h1>
                            <p className="mb-8 text-base leading-relaxed text-brand-100/90">
                                Buat password baru yang kuat dan rahasia. Jangan gunakan password
                                yang sama dengan akun lain, dan jangan bagikan kepada siapa pun.
                            </p>

                            <ul className="space-y-3 text-sm text-brand-100/90">
                                <li className="flex items-center gap-2.5">
                                    <CheckIcon className="h-4 w-4 text-pharmacy-teal" />
                                    Minimal 8 karakter, disarankan campuran huruf dan angka
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckIcon className="h-4 w-4 text-pharmacy-teal" />
                                    Tautan reset hanya dapat dipakai satu kali
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckIcon className="h-4 w-4 text-pharmacy-teal" />
                                    Password lama tidak berlaku setelah password diganti
                                </li>
                            </ul>
                        </div>

                        <div className="relative z-10 flex flex-wrap gap-3 pt-4">
                            <TrustBadge icon={<LockIcon className="h-5 w-5" />} label="Terenkripsi & Aman" />
                            <TrustBadge icon={<ShieldIcon className="h-5 w-5" />} label="Verifikasi Ketat" />
                        </div>
                    </section>

                    <section className="flex w-full flex-col justify-between bg-white p-8 lg:w-[45%] lg:p-12">
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
                                    <KeyIcon className="h-6 w-6" />
                                </div>
                                <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
                                    Buat Password Baru
                                </h2>
                                <p className="text-sm leading-relaxed text-slate-600">
                                    Password baru akan menggantikan password lama akun Anda.
                                </p>
                            </div>

                            {tokenError && (
                                <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                                    <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <p className="leading-relaxed">{tokenError}</p>
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-5">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-slate-800"
                                    >
                                        Email Akun
                                    </label>
                                    <div className="relative flex items-center">
                                        <MailIcon className="pointer-events-none absolute left-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="username"
                                            required
                                            readOnly={Boolean(email)}
                                            value={data.email}
                                            onChange={(event) => setData('email', event.target.value)}
                                            className="w-full rounded-lg bg-slate-50 py-3 pr-4 pl-11 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 read-only:text-slate-500 focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-xs font-medium text-red-600">{errors.email}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-medium text-slate-800"
                                    >
                                        Password Baru
                                    </label>
                                    <div className="relative flex items-center">
                                        <LockIcon className="pointer-events-none absolute left-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            value={data.password}
                                            onChange={(event) => setData('password', event.target.value)}
                                            placeholder="Minimal 8 karakter"
                                            className="w-full rounded-lg bg-slate-50 py-3 pr-12 pl-11 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            aria-label={
                                                showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                                            }
                                            className="absolute right-3.5 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <EyeOffIcon className="h-5 w-5" />
                                            ) : (
                                                <EyeIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-xs font-medium text-red-600">{errors.password}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="password_confirmation"
                                        className="block text-sm font-medium text-slate-800"
                                    >
                                        Konfirmasi Password Baru
                                    </label>
                                    <div className="relative flex items-center">
                                        <LockIcon className="pointer-events-none absolute left-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type={showConfirmation ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            value={data.password_confirmation}
                                            onChange={(event) =>
                                                setData('password_confirmation', event.target.value)
                                            }
                                            placeholder="Ulangi password baru"
                                            className="w-full rounded-lg bg-slate-50 py-3 pr-12 pl-11 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmation((value) => !value)}
                                            aria-label={
                                                showConfirmation
                                                    ? 'Sembunyikan konfirmasi password'
                                                    : 'Tampilkan konfirmasi password'
                                            }
                                            className="absolute right-3.5 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                                        >
                                            {showConfirmation ? (
                                                <EyeOffIcon className="h-5 w-5" />
                                            ) : (
                                                <EyeIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {processing ? (
                                        <SpinnerIcon className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <KeyIcon className="h-5 w-5" />
                                    )}
                                    <span>
                                        {processing ? 'Menyimpan Password...' : 'Simpan Password Baru'}
                                    </span>
                                </button>
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

function KeyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="8" cy="15" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.8 12.2L20 3m-4 4l3 3m-6 0l3 3" strokeLinecap="round" strokeLinejoin="round" />
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

function ShieldIcon({ className }: { className?: string }) {
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

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
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

function EyeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
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
                d="M3 3l18 18M10.6 6.1A9.9 9.9 0 0112 6c6 0 9.5 6 9.5 6a17 17 0 01-3.2 3.9M6.6 6.7A17 17 0 002.5 12S6 18 12 18c1.4 0 2.7-.3 3.8-.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9.9 9.9a3 3 0 004.2 4.2" strokeLinecap="round" strokeLinejoin="round" />
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
