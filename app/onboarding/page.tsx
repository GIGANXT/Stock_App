"use client";


import { useRouter } from "next/navigation";
import OnboardingForm from "../../components/Dashboard/OnboardingForm";

export default function OnboardingPage() {
  const router = useRouter();

  const handleOnboardingComplete = () => {
    // Store the onboarding status in localStorage
    localStorage.setItem('onboardingCompleted', 'true');
    // Redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingForm onClose={handleOnboardingComplete} />
    </div>
  );
} 