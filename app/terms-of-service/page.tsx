import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using NOVEX PRO, you agree to be bound by these Terms of Service.
          </p>

          <h2>2. Service Description</h2>
          <p>
            NOVEX PRO provides real-time metal market insights, price alerts, and procurement optimization tools.
          </p>

          <h2>3. User Obligations</h2>
          <ul>
            <li>Maintain accurate account information</li>
            <li>Protect account credentials</li>
            <li>Use the service in compliance with applicable laws</li>
            <li>Not engage in unauthorized access or use</li>
          </ul>

          <h2>4. Limitation of Liability</h2>
          <p>
            NOVEX PRO provides market data and insights for informational purposes only. We are not liable for:
          </p>
          <ul>
            <li>Trading decisions made using our platform</li>
            <li>Market data accuracy or timeliness</li>
            <li>Service interruptions or technical issues</li>
          </ul>

          <h2>5. Contact</h2>
          <p>
            For questions about these terms, please contact{' '}
            <a href="mailto:legal@novexpro.com">legal@novexpro.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}