import { Head } from '@inertiajs/react';

export default function Welcome() {
    return (
        <>
            <Head title="Welcome" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
                <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
                    SIMPRESO
                </h1>

                <p className="mt-4 max-w-xl text-lg text-gray-600">
                    Laravel + Inertia + React + TypeScript berhasil disiapkan.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                    <a
                        href="https://laravel.com/docs"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                    >
                        Laravel Docs
                    </a>
                    <a
                        href="https://inertiajs.com"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white transition hover:bg-gray-800"
                    >
                        Inertia Docs
                    </a>
                    <a
                        href="https://react.dev"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-cyan-600 px-4 py-2 font-medium text-white transition hover:bg-cyan-700"
                    >
                        React Docs
                    </a>
                </div>
            </div>
        </>
    );
}
