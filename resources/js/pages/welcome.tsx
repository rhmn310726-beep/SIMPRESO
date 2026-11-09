import { Head } from '@inertiajs/react';
import FeatureCards from '@/components/landing/FeatureCards';
import Footer from '@/components/landing/Footer';
import Hero from '@/components/landing/Hero';
import Navbar from '@/components/landing/Navbar';
import StatsHighlights from '@/components/landing/StatsHighlights';

export default function Welcome() {
    return (
        <>
            <Head title="SIMPRESO - Sistem Resep Elektronik & Stok Obat" />

            <div className="pharmacy-bg-gradient min-h-screen">
                <Navbar />
                <Hero />
                <StatsHighlights />
                <FeatureCards />
                <Footer />
            </div>
        </>
    );
}
