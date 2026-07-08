import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { AccessGateModal } from './AccessGateModal';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MetricsSection } from './components/MetricsSection';
import { PlatformSection } from './components/PlatformSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { AcademicCertification } from './components/AcademicCertification';
import { PricingSection } from './components/PricingSection';
import { CTASection } from './components/CTASection';
import { FooterSection } from './components/FooterSection';
import { FloatingCountdown } from './components/FloatingCountdown';

export function LandingPage() {
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();
  const [showGate, setShowGate] = useState(false);

  const handleAccessClick = () => {
    if (accessToken) {
      navigate({ to: user?.role === 'EMPRESA_OPERATOR' ? '/portal' : '/dashboard' });
    } else {
      setShowGate(true);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-ink antialiased selection:bg-granate selection:text-white">
      {/* --- HEADER / NAVBAR --- */}
      <Navbar onAccessClick={handleAccessClick} />

      {/* --- HERO --- */}
      <HeroSection onAccessClick={handleAccessClick} accessToken={accessToken} />

      {/* --- MÉTRICAS --- */}
      <MetricsSection />

      {/* --- DISPONIBILIDAD MULTIPLATAFORMA --- */}
      <PlatformSection />

      {/* --- CARACTERÍSTICAS (LOS 3 ELEMENTOS DEL COSTO) --- */}
      <FeaturesSection />

      {/* --- SECCIÓN CÓMO FUNCIONA --- */}
      <HowItWorksSection />

      {/* --- CERTIFICACIÓN ACADÉMICA UNT --- */}
      <AcademicCertification />

      {/* --- PLANES DE MEMBRESÍA --- */}
      <PricingSection onAccessClick={handleAccessClick} />

      {/* --- SECCIÓN CTA --- */}
      <CTASection onAccessClick={handleAccessClick} />

      {/* --- FOOTER --- */}
      <FooterSection />

      {/* --- MODAL ACCESO --- */}
      {showGate && (
        <AccessGateModal
          onClose={() => setShowGate(false)}
          onSuccess={() => navigate({ to: '/login' })}
        />
      )}

      {/* --- CONTADOR DE LANZAMIENTO FLOTANTE --- */}
      <FloatingCountdown />
    </div>
  );
}
