import type { Metadata } from 'next';
import NewCertificateWizard from './NewCertificateWizard';

export const metadata: Metadata = {
  title: 'New Certificate · MVAutoAssist',
};

// Server Component shell — all state lives in the client wizard below.
export default function NewCertificatePage() {
  return <NewCertificateWizard />;
}
