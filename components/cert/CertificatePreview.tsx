'use client';

// Phase 1 stub — confirms data pipeline (cert + agent + helpline) is wired.
// Full PDF layout replaces this in Phase 2.

export type CertData = {
  id: string;
  cert_number: string;
  customer_name: string;
  customer_dob: string | null;
  customer_mobile: string;
  customer_email: string | null;
  customer_address: string | null;
  vehicle_type: string;
  registration_no: string | null;
  make_model: string;
  variant: string | null;
  engine_no: string;
  chassis_no: string;
  fuel_type: string | null;
  manufacturing_year: number | null;
  start_date: string;
  end_date: string;
  insurance_amount: number;
  rsa_amount: number;
  total_amount: number;
  status: string;
  agent_id: string;
};

export type AgentData = {
  full_name: string;
  email: string;
  location: string | null;
};

type Props = {
  cert:      CertData;
  agent:     AgentData;
  helpline:  string;
  backHref:  string;
};

export default function CertificatePreview({ cert, agent, helpline, backHref }: Props) {
  return (
    <div className="min-h-screen bg-stone-200 p-4 sm:p-8">
      {/* Stub — Phase 1 scaffolding, full layout in Phase 2 */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl p-10 space-y-4">
        <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
          Phase 1 scaffolding — full PDF layout in Phase 2
        </p>
        <p className="font-bold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {cert.cert_number}
        </p>
        <p className="text-sm text-stone-600">Customer: {cert.customer_name}</p>
        <p className="text-sm text-stone-600">Agent: {agent.full_name}</p>
        <p className="text-sm text-stone-600">
          Helpline (from DB): <span className="font-semibold">{helpline}</span>
        </p>
        <p className="text-sm text-stone-600">
          Pricing: ₹{cert.insurance_amount.toLocaleString('en-IN')} insurance
          + ₹{cert.rsa_amount.toLocaleString('en-IN')} RSA
          = ₹{cert.total_amount.toLocaleString('en-IN')} total
        </p>
        <a href={backHref} className="inline-block text-sm font-semibold text-slate-900 underline">
          ← Back
        </a>
      </div>
    </div>
  );
}
