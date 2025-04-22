import React from 'react';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CookiePolicy() {
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

        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        
        <div className="prose prose-lg">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2>What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit our website. They help us provide and improve our services by:
          </p>
          <ul>
            <li>Remembering your preferences</li>
            <li>Understanding how you use our platform</li>
            <li>Keeping your session secure</li>
            <li>Providing personalized features</li>
          </ul>

          <h2>Types of Cookies We Use</h2>
          <h3>Essential Cookies</h3>
          <p>Required for basic platform functionality:</p>
          <ul>
            <li>Authentication</li>
            <li>Security</li>
            <li>User preferences</li>
          </ul>

          <h3>Analytics Cookies</h3>
          <p>Help us understand platform usage:</p>
          <ul>
            <li>Google Analytics</li>
            <li>Usage patterns</li>
            <li>Performance metrics</li>
          </ul>

          <h2>Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Note that disabling certain cookies may limit platform functionality.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about our cookie policy? Contact{' '}
            <a href="mailto:privacy@novexpro.com">privacy@novexpro.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}