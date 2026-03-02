'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type TodoItem = {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  dueDate: string | null;
  description: string | null;
};

const statuses: TodoItem['status'][] = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('no-NO');
}

export default function TodosPage() {
  const token = getDevToken();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [mineOnly, setMineOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }

    try {
      const query = mineOnly ? 'mineOnly=true' : '';
      const items = (await apiClient(token).listTodos(query)) as TodoItem[];
      setTodos(items);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente todos.'));
    }
  }

  useEffect(() => {
    void load();
  }, [mineOnly]);

  async function createTodo() {
    if (!token || !title.trim()) return;
    try {
      await apiClient(token).createTodo({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setSuccess('Todo opprettet.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette todo.'));
    }
  }

  async function updateStatus(todo: TodoItem, status: TodoItem['status']) {
    if (!token) return;
    try {
      await apiClient(token).updateTodo(todo.id, {
        title: todo.title,
        description: todo.description,
        dueDate: todo.dueDate,
        status,
      });
      setSuccess('Todo oppdatert.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke oppdatere todo.'));
    }
  }

  async function removeTodo(id: string) {
    if (!token) return;
    try {
      await apiClient(token).deleteTodo(id);
      setSuccess('Todo slettet.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette todo.'));
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Todos</h1>
        <ConnectionStatus />
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      {success ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div> : null}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Ny todo</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded border px-3 py-2 md:col-span-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tittel" />
          <input className="rounded border px-3 py-2" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <textarea className="rounded border px-3 py-2 md:col-span-3" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beskrivelse (valgfri)" />
          <button className="rounded bg-accent px-3 py-2 text-white md:col-span-3" onClick={() => void createTodo()} disabled={!title.trim()}>
            Opprett
          </button>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg">Todo-liste</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Kun mine/team
          </label>
        </div>

        <div className="space-y-2">
          {todos.map((todo) => (
            <article key={todo.id} className="rounded border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{todo.title}</strong>
                <div className="flex gap-2">
                  <select className="rounded border px-2 py-1 text-xs" value={todo.status} onChange={(e) => void updateStatus(todo, e.target.value as TodoItem['status'])}>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button className="rounded border px-2 py-1 text-xs hover:bg-slate-50" onClick={() => void removeTodo(todo.id)}>
                    Slett
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-600">Forfall: {formatDate(todo.dueDate)}</div>
              <p className="mt-1 text-xs text-slate-700">{todo.description ?? '-'}</p>
            </article>
          ))}
          {todos.length === 0 ? <div className="text-sm text-slate-500">Ingen todo funnet.</div> : null}
        </div>
      </section>
    </main>
  );
}
