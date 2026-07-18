"use client";

import { useState } from "react";
import {
  ALLERGY_OPTIONS,
  GOAL_OPTIONS,
  ONBOARDING_COPY,
  peopleLabel,
} from "../lib/copy";
import {
  createOnboardingProfile,
  type OnboardingGoal,
  type OnboardingProfile,
} from "../lib/onboarding";
import type { Allergen } from "../types/contracts";
import FoodIllustration from "./FoodIllustration";

interface OnboardingProps {
  initialProfile?: OnboardingProfile | null;
  onComplete: (profile: OnboardingProfile) => void;
  onCancel?: () => void;
}

export default function Onboarding({
  initialProfile = null,
  onComplete,
  onCancel,
}: OnboardingProps) {
  const [step, setStep] = useState(initialProfile ? 1 : 0);
  const [goals, setGoals] = useState<OnboardingGoal[]>(initialProfile?.goals ?? []);
  const [people, setPeople] = useState(initialProfile?.people ?? 2);
  const [allergies, setAllergies] = useState<Allergen[]>(initialProfile?.allergies ?? []);

  function toggleGoal(goal: OnboardingGoal) {
    setGoals((current) =>
      current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]
    );
  }

  function toggleAllergy(allergen: Allergen) {
    setAllergies((current) =>
      current.includes(allergen)
        ? current.filter((item) => item !== allergen)
        : [...current, allergen]
    );
  }

  function goBack() {
    if (step === 1 && initialProfile && onCancel) {
      onCancel();
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  }

  function finish() {
    onComplete(createOnboardingProfile(goals, people, allergies));
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <div className="mini-brand" aria-label="FridgeMap">
          <span className="mini-brand-mark">FM</span>
          <span>FridgeMap</span>
        </div>

        {step > 0 ? (
          <button type="button" className="onboarding-back" onClick={goBack}>
            <span aria-hidden="true">←</span>
            Tilbage
          </button>
        ) : null}
      </header>

      {step === 0 ? (
        <section className="welcome-screen">
          <div className="welcome-copy">
            <p className="onboarding-kicker">{ONBOARDING_COPY.welcomeEyebrow}</p>
            <h1>{ONBOARDING_COPY.welcomeHeadline}</h1>
            <p>{ONBOARDING_COPY.welcomeLead}</p>

            <div className="welcome-benefits" aria-label="Fordele">
              {ONBOARDING_COPY.benefits.map((benefit) => (
                <span key={benefit}>{benefit}</span>
              ))}
            </div>

            <button type="button" className="onboarding-primary" onClick={() => setStep(1)}>
              {ONBOARDING_COPY.start}
            </button>
            <p className="welcome-note">{ONBOARDING_COPY.welcomeNote}</p>
          </div>

          <div className="welcome-visual">
            <FoodIllustration />
            <div className="visual-caption visual-caption--top">
              <strong>Se, hvad du har</strong>
              <span>2–4 billeder</span>
            </div>
            <div className="visual-caption visual-caption--bottom">
              <strong>Få ét konkret bud</strong>
              <span>uden madspild</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="question-screen">
          <div className="onboarding-progress" aria-label={`Trin ${step} af 3`}>
            {[1, 2, 3].map((item) => (
              <span key={item} className={item <= step ? "is-active" : ""} />
            ))}
          </div>

          {step === 1 ? (
            <div className="question-card">
              <p className="onboarding-kicker">1 af 3 · Vælg gerne flere</p>
              <h1>{ONBOARDING_COPY.goalHeadline}</h1>
              <p className="question-lead">{ONBOARDING_COPY.goalLead}</p>

              <div className="choice-grid choice-grid--goals">
                {GOAL_OPTIONS.map((option) => {
                  const selected = goals.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`choice-card${selected ? " is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => toggleGoal(option.value)}
                    >
                      <span className="choice-icon" aria-hidden="true">{option.icon}</span>
                      <span className="choice-copy">
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      <span className="choice-check" aria-hidden="true">✓</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="onboarding-primary"
                disabled={goals.length === 0}
                onClick={() => setStep(2)}
              >
                Fortsæt
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="question-card question-card--centered">
              <p className="onboarding-kicker">2 af 3</p>
              <h1>{ONBOARDING_COPY.peopleHeadline}</h1>
              <p className="question-lead">{ONBOARDING_COPY.peopleLead}</p>

              <div className="people-picker" role="group" aria-label="Antal personer">
                {[1, 2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={people === count ? "is-selected" : ""}
                    aria-pressed={people === count}
                    onClick={() => setPeople(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="people-summary">Opskrifterne tilpasses til {peopleLabel(people)}.</p>

              <button type="button" className="onboarding-primary" onClick={() => setStep(3)}>
                Fortsæt
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="question-card">
              <p className="onboarding-kicker">3 af 3 · Valgfrit</p>
              <h1>{ONBOARDING_COPY.allergyHeadline}</h1>
              <p className="question-lead">{ONBOARDING_COPY.allergyLead}</p>

              <div className="allergy-grid">
                <button
                  type="button"
                  className={`allergy-pill${allergies.length === 0 ? " is-selected" : ""}`}
                  aria-pressed={allergies.length === 0}
                  onClick={() => setAllergies([])}
                >
                  Ingen særlige hensyn
                </button>
                {ALLERGY_OPTIONS.map((option) => {
                  const selected = allergies.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`allergy-pill${selected ? " is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => toggleAllergy(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="onboarding-finish-copy">
                <strong>{ONBOARDING_COPY.finishHeadline}</strong>
                <span>{ONBOARDING_COPY.finishLead}</span>
              </div>

              <button type="button" className="onboarding-primary" onClick={finish}>
                {initialProfile ? "Gem ændringer" : ONBOARDING_COPY.finish}
              </button>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
