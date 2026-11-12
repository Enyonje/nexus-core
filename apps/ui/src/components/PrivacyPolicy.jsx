import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-800">
      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Effective Date: November 12, 2026</p>

      <section className="space-y-6 leading-relaxed">
        <div>
          <h2 className="text-2xl font-semibold mb-2">1. Overview</h2>
          <p>
            Nexus Core (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the Nexus Core platform at{' '}
            <a href="https://nexusthecore.com" className="text-blue-600 underline">
              https://nexusthecore.com
            </a>
            . This Privacy Policy explains how we collect, use, store, and protect your information when you access our autonomous AI workforce orchestration platform and related services.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account &amp; Profile Information:</strong> Name, email address, and profile metadata provided when you register or authenticate via OAuth providers (such as Google Sign-In).
            </li>
            <li>
              <strong>Workspace &amp; Integration Data:</strong> When you explicitly connect third-party services (e.g., Google Workspace, Gmail, Google Drive, or Calendar), we access only the specific data authorized by the OAuth scopes you grant to execute your configured agentic workflows.
            </li>
            <li>
              <strong>Usage &amp; Telemetry Data:</strong> System logs, workflow execution states, API latency metrics, and session cookies necessary to maintain security and platform stability.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">3. How We Use Your Information</h2>
          <p>We use collected information strictly to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Authenticate your identity and manage isolated user sessions.</li>
            <li>Execute autonomous agent tasks and workspace automations initiated by you.</li>
            <li>Monitor system health, prevent unauthorized access, and troubleshoot errors.</li>
            <li>Communicate essential service updates, billing notices, and security alerts.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">4. Google API Services User Data Policy</h2>
          <p>
            Nexus Core&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>We only use Google user data to provide or improve user-facing features that are prominent in the Nexus Core interface.</li>
            <li>We do not sell Google user data or use it for serving advertisements.</li>
            <li>We do not allow humans to read Google user data unless we have your explicit affirmative agreement, it is necessary for security purposes (such as investigating abuse), or it is required to comply with applicable law.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">5. Data Security &amp; Retention</h2>
          <p>
            Authentication tokens and credentials are encrypted in transit (TLS) and at rest using HTTP-only secure cookies and encrypted storage. We retain your data only as long as your account remains active or as needed to provide our services. You may revoke third-party OAuth access at any time via your Google Account permissions page or delete your Nexus Core account by contacting us.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">6. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:{' '}
            <a href="mailto:support@nexusthecore.com" className="text-blue-600 underline">
              support@nexusthecore.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}