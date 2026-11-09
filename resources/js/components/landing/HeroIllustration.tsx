export default function HeroIllustration() {
    return (
        <div className="relative flex min-h-[500px] items-end justify-center lg:col-span-6 lg:min-h-[580px]">
            <div className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-end pb-8 opacity-40">
                <div className="flex h-72 w-full flex-col justify-around rounded-3xl border-b-8 border-brand-200/60 bg-linear-to-b from-brand-50/50 to-brand-100/40 p-4">
                    <div className="flex items-end gap-4 opacity-70">
                        <span className="h-12 w-8 rounded-lg bg-amber-200" />
                        <span className="h-10 w-6 rounded-lg bg-teal-200" />
                        <span className="h-14 w-9 rounded-lg bg-blue-200" />
                        <span className="h-8 w-5 rounded-lg bg-red-200" />
                        <span className="h-11 w-10 rounded-lg bg-indigo-200" />
                        <span className="h-[3.25rem] w-7 rounded-lg bg-emerald-200" />
                    </div>
                    <div className="h-1 w-full bg-brand-200" />
                    <div className="flex items-end gap-3 opacity-80">
                        <span className="h-10 w-7 rounded-lg bg-blue-300" />
                        <span className="h-14 w-9 rounded-lg bg-red-300" />
                        <span className="h-12 w-6 rounded-lg bg-teal-300" />
                        <span className="h-9 w-8 rounded-lg bg-purple-300" />
                        <span className="h-12 w-7 rounded-lg bg-amber-300" />
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 z-10 h-12 w-full rounded-2xl border-t-2 border-brand-100 bg-white/90 shadow-md backdrop-blur" />

            <div className="absolute -top-3 left-4 z-20 max-w-[220px] animate-float rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-soft-card backdrop-blur-md sm:left-12 sm:max-w-[240px]">
                <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600">
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">Resep Elektronik</span>
                </div>
                <div className="space-y-2">
                    <ChecklistRow width="w-24" />
                    <ChecklistRow width="w-28" />
                    <ChecklistRow width="w-20" />
                </div>
            </div>

            <div className="absolute top-10 -right-2 z-20 w-44 animate-float-delayed rounded-2xl border border-brand-100 bg-white/95 p-3.5 shadow-soft-card backdrop-blur-md sm:right-2 sm:w-48">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Stok Obat</span>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <svg
                            className="h-2.5 w-2.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M5 13l4 4L19 7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-10 items-center justify-center rounded-xl border border-brand-200 bg-brand-50">
                        <div className="flex h-5 w-4 items-center justify-center rounded border border-brand-500 bg-white">
                            <span className="text-[8px] font-bold text-brand-600">+</span>
                        </div>
                    </div>
                    <div className="flex h-10 items-end gap-1.5 pb-1">
                        <div className="h-4 w-2.5 rounded-t bg-brand-300" />
                        <div className="h-7 w-2.5 rounded-t bg-brand-400" />
                        <div className="h-9 w-2.5 rounded-t bg-brand-600" />
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex w-64 select-none flex-col items-center sm:w-80 lg:w-96">
                <div className="absolute -top-3 left-14 flex gap-1 text-amber-400">
                    <span className="h-3 w-1 rotate-[-30deg] rounded-full bg-amber-400" />
                    <span className="h-3 w-1 rounded-full bg-amber-400" />
                    <span className="h-3 w-1 rotate-[30deg] rounded-full bg-amber-400" />
                </div>
                <svg
                    className="w-full drop-shadow-md"
                    fill="none"
                    viewBox="0 0 400 450"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M125 150C105 100 135 45 200 45C265 45 295 100 275 150C295 140 310 170 300 200C290 225 270 230 255 220C240 250 160 250 145 220C130 230 110 225 100 200C90 170 105 140 125 150Z"
                        fill="#3D2314"
                    />
                    <circle cx="200" cy="180" fill="#FFDFC4" r="70" />
                    <path
                        d="M130 175C122 175 118 185 125 195C130 202 140 200 140 190C140 180 135 175 130 175Z"
                        fill="#FFDFC4"
                    />
                    <path
                        d="M270 175C278 175 282 185 275 195C270 202 260 200 260 190C260 180 265 175 270 175Z"
                        fill="#FFDFC4"
                    />
                    <path
                        d="M135 130C165 145 185 115 205 135C225 115 245 135 265 130C275 155 255 165 245 155C215 165 185 160 160 150C145 160 130 150 135 130Z"
                        fill="#2C1810"
                    />
                    <circle cx="170" cy="175" fill="#1E293B" r="9" />
                    <circle cx="168" cy="172" fill="#FFFFFF" r="3" />
                    <path
                        d="M222 176C227 170 237 170 242 176"
                        stroke="#1E293B"
                        strokeLinecap="round"
                        strokeWidth="4.5"
                    />
                    <circle cx="155" cy="192" fill="#FF8A8A" opacity="0.4" r="10" />
                    <circle cx="245" cy="192" fill="#FF8A8A" opacity="0.4" r="10" />
                    <path d="M188 198C188 208 212 208 212 198" fill="#B91C1C" />
                    <path d="M188 198C194 205 206 205 212 198H188Z" fill="#FFFFFF" />
                    <path d="M185 235H215V265H185V235Z" fill="#F8C8A6" />
                    <path d="M165 260L200 285L235 260V310H165V260Z" fill="#93C5FD" />
                    <path d="M195 275L205 275L208 340L200 355L192 340L195 275Z" fill="#1D4ED8" />
                    <path
                        d="M110 320C110 270 160 260 170 265L190 350L130 450H80L110 320Z"
                        fill="#FFFFFF"
                    />
                    <path
                        d="M290 320C290 270 240 260 230 265L210 350L270 450H320L290 320Z"
                        fill="#FFFFFF"
                    />
                    <path
                        d="M170 265L200 340L230 265H270L240 450H160L130 265H170Z"
                        fill="#F8FAFC"
                    />
                    <path
                        d="M170 265L192 335H208L230 265"
                        stroke="#CBD5E1"
                        strokeWidth="2"
                    />
                    <rect
                        fill="#E2E8F0"
                        height="18"
                        rx="3"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                        width="28"
                        x="235"
                        y="325"
                    />
                    <rect fill="#1D72FE" height="6" rx="2" width="22" x="238" y="328" />
                    <path
                        d="M115 285C105 280 95 260 102 245C108 230 120 230 122 245L120 260"
                        fill="#FFDFC4"
                        stroke="#E29D76"
                        strokeWidth="2"
                    />
                    <rect
                        fill="#FFDFC4"
                        height="35"
                        rx="8"
                        stroke="#E29D76"
                        strokeWidth="2"
                        transform="rotate(-15 105 220)"
                        width="16"
                        x="105"
                        y="220"
                    />
                    <g id="laptop">
                        <rect fill="#64748B" height="105" rx="10" width="160" x="160" y="335" />
                        <rect fill="#475569" height="95" rx="7" width="150" x="165" y="340" />
                        <circle cx="240" cy="385" fill="#94A3B8" opacity="0.6" r="14" />
                        <path d="M237 377H243V393H237V377Z" fill="#F8FAFC" />
                        <path d="M232 382H248V388H232V382Z" fill="#F8FAFC" />
                        <path
                            d="M140 435L160 430H320L340 435C345 440 335 445 325 445H155C145 445 135 440 140 435Z"
                            fill="#94A3B8"
                        />
                    </g>
                </svg>
            </div>

            <div className="absolute bottom-6 left-2 z-20 flex select-none flex-col items-center sm:left-14">
                <div className="relative h-40 w-24 animate-bounce [animation-duration:3s]">
                    <div className="absolute top-14 -left-3 flex h-8 w-5 items-start justify-center rounded-full border-[3px] border-slate-700 bg-white pt-1 shadow-sm -rotate-45">
                        <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    </div>
                    <div className="absolute top-14 -right-3 flex h-8 w-5 items-start justify-center rounded-full border-[3px] border-slate-700 bg-white pt-1 shadow-sm rotate-45">
                        <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    </div>
                    <div className="flex h-36 w-24 flex-col overflow-hidden rounded-full border-4 border-slate-800 shadow-mascot-glow">
                        <div className="relative flex h-1/2 w-full flex-col items-center justify-end bg-white pb-1">
                            <div className="mb-1 flex items-center gap-4">
                                <div className="h-3 w-2.5 rounded-full bg-slate-900" />
                                <div className="h-3 w-2.5 rounded-full bg-slate-900" />
                            </div>
                            <div className="absolute bottom-2 flex items-center gap-7">
                                <span className="h-1.5 w-2.5 rounded-full bg-pink-300" />
                                <span className="h-1.5 w-2.5 rounded-full bg-pink-300" />
                            </div>
                            <div className="h-2.5 w-4 rounded-b-full border border-slate-800 bg-red-500" />
                        </div>
                        <div className="relative h-1/2 w-full bg-[#1D72FE]">
                            <span className="absolute top-2 left-4 h-8 w-2 -rotate-12 rounded-full bg-white/30" />
                        </div>
                    </div>
                    <div className="-mt-1 flex justify-center gap-3">
                        <div className="h-3 w-5 rounded-full bg-slate-800" />
                        <div className="h-3 w-5 rounded-full bg-slate-800" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChecklistRow({ width }: { width: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white">
                <svg
                    className="h-2.5 w-2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                >
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <div className={`h-2 rounded-full bg-brand-100 ${width}`} />
        </div>
    );
}
