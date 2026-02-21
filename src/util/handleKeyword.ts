import { CHOSEONG } from "@/const/consonants";

export const getInitialConsonant = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "#";
  const code = trimmed.codePointAt(0);
  if (!code) return "#";
  const base = 0xac00;
  const end = 0xd7a3;
  if (code < base || code > end) return "#";
  const index = Math.floor((code - base) / 588);
  return CHOSEONG[index] ?? "#";
};

export const getGroupLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "#";
  const consonant = getInitialConsonant(trimmed);
  if (consonant !== "#") return consonant;
  const first = trimmed[0];
  if (/[A-Za-z]/.test(first)) return first.toUpperCase();
  return "#";
};

export const getGroupOrder = (label: string) => {
  if (label === "#") return { tier: 2, order: 0 };
  const consonantIndex = CHOSEONG.indexOf(label);
  if (consonantIndex >= 0) return { tier: 0, order: consonantIndex };
  if (/^[A-Z]$/.test(label))
    return { tier: 1, order: label.charCodeAt(0) - 65 };
  return { tier: 2, order: 0 };
};
