export const SEX_OPTIONS = [
  { value: "", label: "Keine Angabe" },
  { value: "male", label: "Männlich" },
  { value: "female", label: "Weiblich" },
];

export const EXPERIENCE_OPTIONS = [
  { value: "", label: "Keine Angabe" },
  { value: "beginner", label: "Unter 1 Jahr" },
  { value: "intermediate", label: "1 bis 3 Jahre" },
  { value: "advanced", label: "Über 3 Jahre" },
];

export const MACROS = [
  { key: "protein", label: "Protein", shortLabel: "P", kcalPerGram: 4 },
  { key: "carbs", label: "Kohlenhydrate", shortLabel: "KH", kcalPerGram: 4 },
  { key: "fat", label: "Fett", shortLabel: "F", kcalPerGram: 9 },
];

export const ACTIVITY_OPTIONS = [
  { value: "", label: "Keine Angabe", factor: 1.5 },
  { value: "sitting", label: "Überwiegend sitzend", factor: 1.4 },
  { value: "mixed", label: "Sitzend, viel zu Fuß", factor: 1.55 },
  { value: "standing", label: "Viel stehend oder gehend", factor: 1.7 },
  { value: "physical", label: "Körperlich schwer", factor: 1.9 },
];

export const GOAL_OPTIONS = [
  { value: "", label: "Kein Ziel" },
  { value: "lose", label: "Abnehmen" },
  { value: "maintain", label: "Gewicht halten" },
  { value: "gain", label: "Muskelaufbau" },
];

export const PACE_OPTIONS = [
  { value: "slow", label: "Gemächlich", factor: 0.5 },
  { value: "steady", label: "Empfohlen", factor: 1 },
  { value: "fast", label: "Zügig", factor: 1.5 },
];

export const MEASUREMENT_FIELDS = {
  waist: { label: "Taille", min: 40, max: 200 },
  neck: { label: "Hals", min: 20, max: 70 },
  hip: { label: "Hüfte", min: 50, max: 200 },
};

export function isOptionValue(options, value) {
  return options.some((option) => option.value === value);
}

export function optionOf(options, value) {
  return options.find((option) => option.value === value) ?? options[0];
}
