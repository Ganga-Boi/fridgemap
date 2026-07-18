import { useMemo, useState } from "react";
import type { Allergen, Household, Supermarket } from "../types/contracts";

const ALLERGIES: { value: Allergen; label: string }[] = [
  { value: "gluten", label: "Gluten" },
  { value: "laktose", label: "Laktose" },
  { value: "nødder", label: "Nødder" },
  { value: "æg", label: "Æg" },
  { value: "fisk", label: "Fisk" },
  { value: "skaldyr", label: "Skaldyr" },
  { value: "soja", label: "Soja" },
];

const SUPERMARKETS: { value: Supermarket; label: string }[] = [
  { value: "rema", label: "REMA 1000" },
  { value: "netto", label: "Netto" },
  { value: "føtex", label: "Føtex" },
  { value: "lidl", label: "Lidl" },
  { value: "coop", label: "Coop" },
  { value: "andet", label: "Andet" },
];

interface OnboardingProps {
  initial: Household;
  open: boolean;
  canClose: boolean;
  onClose: () => void;
  onSave: (household: Household) => void;
}

export default function Onboarding({
  initial,
  open,
  canClose,
  onClose,
  onSave,
}: OnboardingProps) {
  const [adults, setAdults] = useState(initial.adults);
  const [children, setChildren] = useState(initial.children);
  const [allergies, setAllergies] = useState<Allergen[]>(initial.allergies);
  const [supermarket, setSupermarket] = useState<Supermarket>(initial.supermarket);

  const householdLabel = useMemo(() => {
    const people = adults + children;
    return `${people} ${people === 1 ? "person" : "personer"}`;
  }, [adults, children]);

  if (!open) return null;

  function toggleAllergy(allergy: Allergen) {
    setAllergies((current) =>
      current.includes(allergy)
        ? current.filter((item) => item !== allergy)
        : [...current, allergy]
    );
  }

  function save() {
    onSave({
      ...initial,
      adults,
      children,
      allergies,
      supermarket,
      createdAt: canClose && initial.createdAt ? initial.createdAt : new Date().toISOString(),
    });
  }

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section className="onboarding-sheet" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-topline">
          <div className="mini-brand" aria-hidden="true">F</div>
          {canClose ? (
            <button type="button" className="onboarding-close" onClick={onClose} aria-label="Luk">
              ×
            </button>
          ) : null}
        </div>

        <p className="panel-label">Gør FridgeMap til jeres</p>
        <h2 id="onboarding-title">Bedre forslag på under ét minut.</h2>
        <p className="onboarding-intro">
          Jeg bruger kun svarene til portionsstørrelser og til at sortere retter fra, I ikke kan spise.
        </p>

        <div className="onboarding-section">
          <div className="onboarding-section-head">
            <div>
              <strong>Hvem spiser med?</strong>
              <span>{householdLabel}</span>
            </div>
          </div>
          <div className="counter-grid">
            <Counter label="Voksne" value={adults} min={1} max={4} onChange={setAdults} />
            <Counter label="Børn" value={children} min={0} max={5} onChange={setChildren} />
          </div>
        </div>

        <div className="onboarding-section">
          <strong>Allergier i husstanden</strong>
          <span className="section-helper">Vælg kun det, der helt skal undgås.</span>
          <div className="choice-grid">
            {ALLERGIES.map((allergy) => (
              <button
                key={allergy.value}
                type="button"
                className={`choice-chip${allergies.includes(allergy.value) ? " is-selected" : ""}`}
                aria-pressed={allergies.includes(allergy.value)}
                onClick={() => toggleAllergy(allergy.value)}
              >
                {allergy.label}
              </button>
            ))}
          </div>
        </div>

        <div className="onboarding-section">
          <label htmlFor="supermarket"><strong>Hvor handler I oftest?</strong></label>
          <select
            id="supermarket"
            className="onboarding-select"
            value={supermarket}
            onChange={(event) => setSupermarket(event.target.value as Supermarket)}
          >
            {SUPERMARKETS.map((store) => (
              <option key={store.value} value={store.value}>{store.label}</option>
            ))}
          </select>
        </div>

        <button type="button" className="onboarding-save" onClick={save}>
          Gem og se mit køkken
          <span aria-hidden="true">→</span>
        </button>
        <p className="onboarding-footnote">Kan altid ændres senere.</p>
      </section>
    </div>
  );
}

interface CounterProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function Counter({ label, value, min, max, onChange }: CounterProps) {
  return (
    <div className="counter-card">
      <span>{label}</span>
      <div className="counter-actions">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}
