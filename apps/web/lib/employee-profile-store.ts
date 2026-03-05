'use client';

export type EmployeeCompetenceKind = 'LICENSE' | 'COURSE';

export type EmployeeCompetenceEntry = {
  id: string;
  kind: EmployeeCompetenceKind;
  name: string;
  expiresAt: string | null;
};

export type EmployeeProfileData = {
  skills: string[];
  courses: string[];
  notes: string;
  competences: EmployeeCompetenceEntry[];
  updatedAt: string;
};

export type CompetencePreset = {
  id: string;
  kind: EmployeeCompetenceKind;
  label: string;
};

export const COMPETENCE_PRESETS: CompetencePreset[] = [
  { id: 'license-c', kind: 'LICENSE', label: 'Førerkort klasse C' },
  { id: 'license-be', kind: 'LICENSE', label: 'Førerkort klasse BE' },
  { id: 'course-fse', kind: 'COURSE', label: 'FSE' },
  { id: 'course-varme-arbeider', kind: 'COURSE', label: 'Varme arbeider' },
  { id: 'course-aus-2', kind: 'COURSE', label: 'AUS klasse 2' },
  { id: 'course-aus-3', kind: 'COURSE', label: 'AUS klasse 3' },
];

function parseLines(raw: string) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function asDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function profileStorageKey(userId: string) {
  return `employee_profile_${userId}`;
}

export function createEmptyEmployeeProfile(): EmployeeProfileData {
  return {
    skills: [],
    courses: [],
    notes: '',
    competences: [],
    updatedAt: '',
  };
}

export function normalizeEmployeeProfile(raw: unknown): EmployeeProfileData {
  if (!raw || typeof raw !== 'object') return createEmptyEmployeeProfile();
  const row = raw as Record<string, unknown>;

  const skills = Array.isArray(row.skills)
    ? row.skills.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const courses = Array.isArray(row.courses)
    ? row.courses.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const notes = typeof row.notes === 'string' ? row.notes : '';
  const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : '';

  const parsedCompetences = Array.isArray(row.competences)
    ? row.competences
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const one = item as Record<string, unknown>;
          const name = typeof one.name === 'string' ? one.name.trim() : '';
          if (!name) return null;
          const kind = one.kind === 'LICENSE' ? 'LICENSE' : 'COURSE';
          const id = typeof one.id === 'string' && one.id.trim() ? one.id : makeId();
          const expiresAt = asDateOnly(
            typeof one.expiresAt === 'string' ? one.expiresAt : one.expiresAt == null ? null : '',
          );
          return { id, kind, name, expiresAt } satisfies EmployeeCompetenceEntry;
        })
        .filter((item): item is EmployeeCompetenceEntry => Boolean(item))
    : [];

  const competences =
    parsedCompetences.length > 0
      ? parsedCompetences
      : courses.map((name, index) => ({
          id: `legacy-course-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
          kind: 'COURSE' as const,
          name,
          expiresAt: null,
        }));

  return {
    skills,
    courses,
    notes,
    competences,
    updatedAt,
  };
}

export function readEmployeeProfile(userId: string): EmployeeProfileData {
  if (typeof window === 'undefined') return createEmptyEmployeeProfile();
  try {
    const raw = window.localStorage.getItem(profileStorageKey(userId));
    if (!raw) return createEmptyEmployeeProfile();
    return normalizeEmployeeProfile(JSON.parse(raw));
  } catch {
    return createEmptyEmployeeProfile();
  }
}

export function writeEmployeeProfile(userId: string, profile: EmployeeProfileData) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(profileStorageKey(userId), JSON.stringify(profile));
}

export function profileHasCompetence(
  profile: EmployeeProfileData,
  competenceName: string,
  includeExpired = false,
) {
  const needle = competenceName.trim().toLowerCase();
  if (!needle || needle === 'all') return true;

  return profile.competences.some((entry) => {
    if (!includeExpired && isCompetenceExpired(entry)) return false;
    return entry.name.trim().toLowerCase() === needle;
  });
}

export function getCompetenceFilterOptions(profiles: EmployeeProfileData[]) {
  const set = new Set<string>(COMPETENCE_PRESETS.map((preset) => preset.label));
  profiles.forEach((profile) => {
    profile.competences.forEach((entry) => {
      if (entry.name.trim()) set.add(entry.name.trim());
    });
  });
  return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'no'))];
}

export function getCompetenceNames(profile: EmployeeProfileData, includeExpired = true) {
  const set = new Set<string>();
  profile.competences.forEach((entry) => {
    if (!includeExpired && isCompetenceExpired(entry)) return;
    set.add(entry.name);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'no'));
}

export function isCompetenceExpired(entry: EmployeeCompetenceEntry, now = new Date()) {
  if (!entry.expiresAt) return false;
  const expiry = new Date(`${entry.expiresAt}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() < now.getTime();
}

export function nextCompetenceExpiry(profile: EmployeeProfileData) {
  const dates = profile.competences
    .map((entry) => entry.expiresAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(`${value}T23:59:59`))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return dates.at(0) ?? null;
}

export function createCompetenceEntry(params: {
  name: string;
  kind: EmployeeCompetenceKind;
  expiresAt?: string | null;
}): EmployeeCompetenceEntry | null {
  const name = params.name.trim();
  if (!name) return null;
  return {
    id: makeId(),
    name,
    kind: params.kind,
    expiresAt: asDateOnly(params.expiresAt),
  };
}

export function parseLinesToList(raw: string) {
  return parseLines(raw);
}
