"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardIndex from "../../components/Dashboard/DashboardIndex";
import { useAuth } from "@clerk/nextjs";

export default function MarketDashboard() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      const onboardingCompleted = localStorage.getItem('onboardingCompleted');
      if (!onboardingCompleted) {
        router.push('/onboarding');
      }
    } else {
      router.push('/auth/sign-in');
    }
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return null;
  }

  return <DashboardIndex />;
}