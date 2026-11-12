import React from 'react';

export default function TermsOfServicePage() {
    return (
        <main className="max-w-4xl mx-auto px-6 py-16 text-slate-800">
            <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
            <p className="text-sm text-slate-500 mb-8">Effective Date: November 12, 2026</p>

            <section className="space-y-6 leading-relaxed">
                <div>
                    <h2 className="text-2xl font-semibold mb-2">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using Nexus Core at{' '}
                        <a href="https://nexusthecore.com" className="text-blue-600 underline">
                            https://nexusthecore.com
                        </a>
                        , you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not access or use the platform.
                    </p>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">2. Description of Service</h2>
                    <p>
                        Nexus Core provides an AI workforce orchestration and workflow automation platform enabling users to configure, deploy, and manage autonomous software agents across connected workspaces and APIs.
                    </p>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">3. User Accounts &amp; Authorization</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>You are responsible for maintaining the confidentiality of your account credentials and API keys.</li>
                        <li>When connecting third-party integrations (such as Google OAuth), you represent that you have full authority to grant Nexus Core access to those accounts and data.</li>
                        <li>You must notify us immediately of any unauthorized use of your account.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">4. Acceptable Use</h2>
                    <p>You agree not to use Nexus Core to:</p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                        <li>Violate any applicable laws, regulations, or third-party terms of service.</li>
                        <li>Send unsolicited bulk communications (spam), conduct unauthorized scraping, or deploy malicious automation.</li>
                        <li>Attempt to bypass authentication boundaries, rate limits, or security controls on the platform.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">5. AI-Generated Outputs &amp; Autonomous Actions</h2>
                    <p>
                        Nexus Core executes automated workflows based on your configuration and prompts. Because AI models and autonomous agents operate probabilistically, you are responsible for reviewing and verifying outputs and actions taken on your connected accounts before relying on them for critical business decisions.
                    </p>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">6. Intellectual Property</h2>
                    <p>
                        Nexus Core retains all rights, title, and interest in the platform software, architecture, and branding. You retain all ownership rights to your input data, custom configurations, and outputs generated through your workflows.
                    </p>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">7. Limitation of Liability &amp; Disclaimers</h2>
                    <p>
                        The service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind. To the maximum extent permitted by law, Nexus Core shall not be liable for any indirect, incidental, consequential, or punitive damages, including loss of data, profits, or business interruption resulting from your use of the platform.
                    </p>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">8. Termination</h2>
                    <p>
                        We reserve the right to suspend or terminate your access to Nexus Core at any time if you breach these Terms or if required to protect the security and integrity of the platform.
                    </p>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">9. Contact Information</h2>
                    <p>
                        For questions regarding these Terms of Service, contact us at:{' '}
                        <a href="mailto:support@nexusthecore.com" className="text-blue-600 underline">
                            support@nexusthecore.com
                        </a>
                    </p>
                </div>
            </section>
        </main>
    );
}