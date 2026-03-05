'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ConnectionStatus } from '@/components/dev/connection-status';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import {
  COMPETENCE_PRESETS,
  createCompetenceEntry,
  isCompetenceExpired,
  parseLinesToList,
  profileStorageKey,
  readEmployeeProfile,
  type EmployeeCompetenceEntry,
  type EmployeeCompetenceKind,
  type EmployeeProfileData,
  writeEmployeeProfile,
} from '@/lib/employee-profile-store';

type DevAuthUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

type MeResponse = {
  user: { id: string; email: string; displayName: string; organizationId: string };
  roles: string[];
  organizationId: string;
};

const CUSTOM_PRESET_VALUE = '__custom__';

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const token = getDevToken();
  const params = useParams<{ id: string }>();
  const employeeId = params?.id ?? '';

  const [me, setMe] = useState<MeResponse | null>(null);
  const [users, setUsers] = useState<DevAuthUser[]>([]);
  const [employee, setEmployee] = useState<DevAuthUser | null>(null);
  const [skillsText, setSkillsText] = useState('');
  const [coursesText, setCoursesText] = useState('');
  const [notes, setNotes] = useState('');
  const [competences, setCompetences] = useState<EmployeeCompetenceEntry[]>([]);
  const [presetId, setPresetId] = useState(COMPETENCE_PRESETS[0]?.id ?? '');
  const [customCompetenceName, setCustomCompetenceName] = useState('');
  const [customCompetenceKind, setCustomCompetenceKind] = useState<EmployeeCompetenceKind>('COURSE');
  const [competenceExpiresAt, setCompetenceExpiresAt] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);

  const selectedPreset = useMemo(
    () => COMPETENCE_PRESETS.find((preset) => preset.id === presetId) ?? null,
    [presetId],
  );

  const canEdit = useMemo(() => {
    if (!me || !employeeId) return false;
    if (me.user.id === employeeId) return true;
    return me.roles.some(
      (role) => role === 'planner' || role === 'org_admin' || role === 'system_admin',
    );
  }, [employeeId, me]);

  const canDelete = useMemo(() => {
    if (!me || !employeeId) return false;
    if (me.user.id === employeeId) return false;
    return me.roles.some(
      (role) => role === 'planner' || role === 'org_admin' || role === 'system_admin',
    );
  }, [employeeId, me]);

  const sortedCompetences = useMemo(
    () =>
      [...competences].sort((a, b) => {
        const byName = a.name.localeCompare(b.name, 'no');
        if (byName !== 0) return byName;
        return (a.expiresAt ?? '9999-12-31').localeCompare(b.expiresAt ?? '9999-12-31');
      }),
    [competences],
  );

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('Mangler token. Logg inn på nytt.');
        return;
      }

      try {
        const [meRes, userRes] = await Promise.all([
          apiClient(token)
            .me()
            .then((res) => res as MeResponse),
          apiClient(token)
            .listDevUsers()
            .then((res) => res as DevAuthUser[]),
        ]);

        setMe(meRes);
        setUsers(userRes);
        setEmployee(userRes.find((u) => u.id === employeeId) ?? null);

        const profile = readEmployeeProfile(employeeId);
        setSkillsText(profile.skills.join('\n'));
        setCoursesText(profile.courses.join('\n'));
        setNotes(profile.notes ?? '');
        setCompetences(profile.competences ?? []);
        setUpdatedAt(profile.updatedAt || null);
        setError(null);
      } catch (err) {
        setError(toErrorMessage(err, 'Kunne ikke hente ansattdata.'));
      }
    }

    if (employeeId) {
      void load();
    }
  }, [employeeId, token]);

  function saveProfile() {
    if (!canEdit || !employeeId) return;

    const payload: EmployeeProfileData = {
      skills: parseLinesToList(skillsText),
      courses: parseLinesToList(coursesText),
      notes: notes.trim(),
      competences,
      updatedAt: new Date().toISOString(),
    };
    writeEmployeeProfile(employeeId, payload);
    setUpdatedAt(payload.updatedAt);
    setSuccess('Ansattprofil lagret lokalt.');
    setError(null);
  }

  function addCompetence() {
    if (!canEdit) return;
    const name = (presetId === CUSTOM_PRESET_VALUE ? customCompetenceName : selectedPreset?.label) ?? '';
    const kind = (presetId === CUSTOM_PRESET_VALUE ? customCompetenceKind : selectedPreset?.kind) ?? 'COURSE';
    const entry = createCompetenceEntry({
      name,
      kind,
      expiresAt: competenceExpiresAt || null,
    });
    if (!entry) {
      setError('Velg eller skriv inn kompetanse før du legger til.');
      return;
    }

    const exists = competences.some(
      (item) =>
        item.name.toLowerCase() === entry.name.toLowerCase() &&
        item.kind === entry.kind &&
        (item.expiresAt ?? '') === (entry.expiresAt ?? ''),
    );
    if (exists) {
      setError('Kompetansen finnes allerede med samme utløpsdato.');
      return;
    }

    setCompetences((current) => [...current, entry]);
    setCustomCompetenceName('');
    setCompetenceExpiresAt('');
    setError(null);
    setSuccess(null);
  }

  function removeCompetence(competenceId: string) {
    if (!canEdit) return;
    setCompetences((current) => current.filter((item) => item.id !== competenceId));
  }

  async function removeEmployee() {
    if (!token || !employeeId || deletingEmployee || !canDelete) return;
    const ok = window.confirm('Er du sikker på at du vil slette denne personen?');
    if (!ok) return;

    setDeletingEmployee(true);
    try {
      await apiClient(token).deleteDevUser(employeeId);
      window.localStorage.removeItem(profileStorageKey(employeeId));
      router.push('/mannskap');
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette person.'));
    } finally {
      setDeletingEmployee(false);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link className="text-sm text-sky-700 hover:underline" href="/overview">
            ← Tilbake til Oversikt
          </Link>
          <h1 className="text-2xl font-semibold">Ansattprofil</h1>
        </div>
        <ConnectionStatus />
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <section className="rounded border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg">Ansatt</h2>
          {canDelete ? (
            <button
              className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              onClick={() => void removeEmployee()}
              disabled={deletingEmployee}
            >
              {deletingEmployee ? 'Sletter...' : 'Slett person'}
            </button>
          ) : null}
        </div>
        {employee ? (
          <div className="space-y-1 text-sm">
            <p>
              <strong>{employee.displayName}</strong>
            </p>
            <p>{employee.email}</p>
            <div className="flex flex-wrap gap-1">
              {employee.roles.map((role) => (
                <span key={role} className="rounded bg-slate-100 px-2 py-1 text-xs">
                  {role}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Fant ikke ansatt med denne ID-en.</p>
        )}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Ferdigheter og kompetanse/kurs</h2>
        <p className="mb-3 text-xs text-slate-600">
          Redigering er tillatt for egen profil og for admin/planner. Data lagres lokalt i
          nettleseren (pilotmodus).
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ferdigheter (en per linje)</label>
            <textarea
              className="min-h-40 w-full rounded border px-3 py-2 text-sm"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              disabled={!canEdit}
              placeholder="F.eks. Fiberterminering&#10;Sveis&#10;Servicebil"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Kurs/kompetanse (en per linje)</label>
            <textarea
              className="min-h-40 w-full rounded border px-3 py-2 text-sm"
              value={coursesText}
              onChange={(e) => setCoursesText(e.target.value)}
              disabled={!canEdit}
              placeholder="F.eks. FSE 2026&#10;Fallsikring&#10;Varme arbeider"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded border border-slate-200 p-3">
          <h3 className="text-sm font-semibold">Strukturert kompetanse med utløpsdato</h3>
          <div className="grid gap-2 md:grid-cols-4">
            <select
              className="rounded border px-3 py-2 text-sm md:col-span-2"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              disabled={!canEdit}
            >
              {COMPETENCE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
              <option value={CUSTOM_PRESET_VALUE}>Annen kompetanse (egendefinert)</option>
            </select>
            <input
              className="rounded border px-3 py-2 text-sm"
              type="date"
              value={competenceExpiresAt}
              onChange={(e) => setCompetenceExpiresAt(e.target.value)}
              disabled={!canEdit}
            />
            <button
              className="rounded border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              type="button"
              onClick={addCompetence}
              disabled={!canEdit}
            >
              Legg til
            </button>
          </div>

          {presetId === CUSTOM_PRESET_VALUE ? (
            <div className="grid gap-2 md:grid-cols-3">
              <input
                className="rounded border px-3 py-2 text-sm md:col-span-2"
                value={customCompetenceName}
                onChange={(e) => setCustomCompetenceName(e.target.value)}
                placeholder="Navn på kompetanse/kurs"
                disabled={!canEdit}
              />
              <select
                className="rounded border px-3 py-2 text-sm"
                value={customCompetenceKind}
                onChange={(e) => setCustomCompetenceKind(e.target.value as EmployeeCompetenceKind)}
                disabled={!canEdit}
              >
                <option value="COURSE">Kurs</option>
                <option value="LICENSE">Førerkort/sertifikat</option>
              </select>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-600">
                  <th className="py-2">Kompetanse</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Utløper</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Handling</th>
                </tr>
              </thead>
              <tbody>
                {sortedCompetences.map((entry) => {
                  const expired = isCompetenceExpired(entry);
                  return (
                    <tr key={entry.id} className="border-b">
                      <td className="py-2">{entry.name}</td>
                      <td className="py-2">{entry.kind === 'LICENSE' ? 'Førerkort/sertifikat' : 'Kurs'}</td>
                      <td className="py-2">{entry.expiresAt ?? '-'}</td>
                      <td className={`py-2 text-xs ${expired ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {expired ? 'Utløpt' : 'Gyldig'}
                      </td>
                      <td className="py-2">
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                          type="button"
                          onClick={() => removeCompetence(entry.id)}
                          disabled={!canEdit}
                        >
                          Slett
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sortedCompetences.length === 0 ? (
                  <tr>
                    <td className="py-2 text-slate-500" colSpan={5}>
                      Ingen strukturert kompetanse registrert enda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium">Notater</label>
          <textarea
            className="min-h-24 w-full rounded border px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit}
            placeholder="Frivillige notater om erfaring, sertifiseringer, begrensninger osv."
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            className="rounded bg-accent px-3 py-2 text-sm text-white disabled:opacity-40"
            onClick={saveProfile}
            disabled={!canEdit}
          >
            Lagre profil
          </button>
          {updatedAt ? (
            <span className="text-xs text-slate-600">
              Sist oppdatert: {new Date(updatedAt).toLocaleString('no-NO')}
            </span>
          ) : null}
          {!canEdit ? (
            <span className="text-xs text-amber-700">
              Du har ikke redigeringstilgang for denne profilen.
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Mannskap</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Navn</th>
                <th className="py-2">E-post</th>
                <th className="py-2">Roller</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-2">
                    <Link className="text-sky-700 hover:underline" href={`/employees/${user.id}`}>
                      {user.displayName}
                    </Link>
                  </td>
                  <td className="py-2">{user.email}</td>
                  <td className="py-2 text-xs">{user.roles.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
