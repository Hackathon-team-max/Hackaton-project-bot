export interface Profile {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
  snils: string;
  inn: string;
  phone: string;
  email: string;
  address: string;
}

const KEY = "max_profile";

export const emptyProfile: Profile = {
  lastName: "",
  firstName: "",
  middleName: "",
  birthDate: "",
  passportSeries: "",
  passportNumber: "",
  passportIssuedBy: "",
  passportIssueDate: "",
  snils: "",
  inn: "",
  phone: "",
  email: "",
  address: "",
};

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyProfile, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    /* ignore */
  }
  return { ...emptyProfile };
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function isProfileEmpty(profile: Profile): boolean {
  return Object.values(profile).every((v) => v.trim() === "");
}
