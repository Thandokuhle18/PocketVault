import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { BUSINESS_STAGES, BUSINESS_TYPES, parseBusinessBalance, validateBusinessSetup, type BusinessSetupErrors, type BusinessSetupValues } from "../lib/business-setup-validation";
import { supabase } from "../lib/supabase";

const controlClass = "mt-1 min-h-12 w-full rounded-control border border-sage bg-white px-4 py-3 text-body text-ink outline-none focus:border-vault focus:ring-2 focus:ring-lime focus:ring-offset-1";
const errorControlClass = "border-danger focus:border-danger focus:ring-danger";
const buttonClass = "flex h-12 w-full items-center justify-center gap-3 rounded-control bg-vault px-5 font-semibold text-white hover:bg-vault-dark focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-2 disabled:cursor-wait";

const initialValues: BusinessSetupValues = {
  name: "", type: BUSINESS_TYPES[0], description: "", stage: "Idea", openingBalance: "0.00", availableCapital: "0.00",
};

export default function BusinessSetup() {
  const { membership, membershipLoading, loadMembership } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<BusinessSetupErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    if (!membershipLoading && membership) navigate(membership.role === "Staff" ? "/ledger" : "/dashboard", { replace: true });
  }, [membership, membershipLoading, navigate]);

  function update<K extends keyof BusinessSetupValues>(key: K, value: BusinessSetupValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (attempted) setErrors(validateBusinessSetup(next));
    setServerError(false);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const nextErrors = validateBusinessSetup(values);
    setErrors(nextErrors);
    setAttempted(true);
    setServerError(false);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const { error } = await supabase.rpc("create_business", {
        p_name: values.name.trim(),
        p_business_type: values.type,
        p_description: values.description.trim(),
        p_stage: values.stage,
        p_opening_balance: parseBusinessBalance(values.openingBalance),
        p_available_capital: values.availableCapital.trim() === "" ? 0 : parseBusinessBalance(values.availableCapital),
      });
      if (error) throw error;
      await loadMembership();
      navigate("/dashboard", { replace: true, state: { toast: "Business created. Start your plan." } });
    } catch {
      setBusy(false);
      setServerError(true);
    }
  }

  function fieldError(key: keyof BusinessSetupValues) {
    return attempted ? errors[key] : undefined;
  }

  return <main className="flex min-h-screen flex-col bg-cream px-5 pb-8 pt-6 sm:justify-center sm:py-8">
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col sm:flex-none">
      <header className="mb-6 text-center sm:text-left">
        <h1 className="text-title text-ink">Set up your business</h1>
        <p className="mt-2 text-body text-moss">This takes about a minute.</p>
      </header>

      {serverError && <div role="alert" className="mb-4 rounded-control border border-danger/30 bg-danger/5 p-3 text-body text-danger">
        <p>Something went wrong. Try again.</p>
        <button type="button" className="mt-1 min-h-11 font-semibold underline" onClick={() => void submit()}>Try again</button>
      </div>}

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col sm:flex-none">
        <div className="space-y-4">
          <label className="block text-small font-semibold text-ink" htmlFor="business-name">Business name
            <input id="business-name" className={`${controlClass} ${fieldError("name") ? errorControlClass : ""}`} placeholder="e.g. Zodwa's Home Bakery" value={values.name} maxLength={60} aria-invalid={!!fieldError("name")} aria-describedby={fieldError("name") ? "business-name-error" : undefined} onChange={event => update("name", event.target.value)} />
            {fieldError("name") && <FieldError id="business-name-error">{fieldError("name")}</FieldError>}
          </label>

          <label className="block text-small font-semibold text-ink" htmlFor="business-type">Business type
            <select id="business-type" className={`${controlClass} ${fieldError("type") ? errorControlClass : ""}`} value={values.type} aria-invalid={!!fieldError("type")} onChange={event => update("type", event.target.value)}>
              {BUSINESS_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
            {fieldError("type") && <FieldError>{fieldError("type")}</FieldError>}
          </label>

          <label className="block text-small font-semibold text-ink" htmlFor="business-description">Short description (optional)
            <textarea id="business-description" className={`${controlClass} min-h-[90px] resize-y`} placeholder="Short description" value={values.description} maxLength={200} aria-invalid={!!fieldError("description")} onChange={event => update("description", event.target.value)} />
            {fieldError("description") && <FieldError>{fieldError("description")}</FieldError>}
          </label>

          <label className="block text-small font-semibold text-ink" htmlFor="business-stage">Business stage
            <select id="business-stage" className={`${controlClass} ${fieldError("stage") ? errorControlClass : ""}`} value={values.stage} aria-invalid={!!fieldError("stage")} onChange={event => update("stage", event.target.value)}>
              {BUSINESS_STAGES.map(stage => <option key={stage}>{stage}</option>)}
            </select>
            {fieldError("stage") && <FieldError>{fieldError("stage")}</FieldError>}
          </label>

          <MoneyField id="opening-balance" label="Opening balance" value={values.openingBalance} error={fieldError("openingBalance")} onChange={value => update("openingBalance", value)} />
          <MoneyField id="available-capital" label="Available capital (optional)" value={values.availableCapital} error={fieldError("availableCapital")} onChange={value => update("availableCapital", value)} />
        </div>

        <div className="mt-auto pt-8 sm:mt-[128px]">
          <button className={buttonClass} type="submit" disabled={busy}>
            {busy && <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />}
            {busy ? "Creating business" : "Create business"}
          </button>
        </div>
      </form>
    </section>
  </main>;
}

function FieldError({ children, id }: { children: React.ReactNode; id?: string }) {
  return <span id={id} className="mt-1 flex items-center gap-1 text-small font-normal text-danger"><span aria-hidden="true">ⓘ</span>{children}</span>;
}

function MoneyField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return <label className="block text-small font-semibold text-ink" htmlFor={id}>{label}
    <input id={id} className={`${controlClass} ${error ? errorControlClass : ""}`} type="text" inputMode="decimal" placeholder="R0.00" value={value} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={event => onChange(event.target.value)} />
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
  </label>;
}
