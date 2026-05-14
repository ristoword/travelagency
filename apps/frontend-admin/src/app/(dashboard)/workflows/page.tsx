'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get, post, patch, PaginatedResponse } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { CheckSquare, Clock, AlertTriangle, Plus, CheckCircle, Circle, X } from 'lucide-react';

const PRIORITY_LABELS: Record<string, string> = { LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' };
const PRIORITY_COLORS: Record<string, string> = { LOW: 'badge-gray', MEDIUM: 'badge-blue', HIGH: 'badge-yellow', URGENT: 'badge-red' };
const STATUS_LABELS: Record<string, string> = { TODO: 'Da fare', IN_PROGRESS: 'In corso', DONE: 'Fatto', CANCELLED: 'Annullato' };
const STATUS_COLORS: Record<string, string> = { TODO: 'badge-gray', IN_PROGRESS: 'badge-blue', DONE: 'badge-green', CANCELLED: 'badge-gray' };

interface Task {
  id: string; title: string; status: string; priority: string; dueDate?: string;
  description?: string; isOverdue?: boolean;
  assignedTo?: { firstName: string; lastName: string };
}
interface MyTasks {
  todo: number; overdue: number; dueToday: number; dueThisWeek: number;
  tasks: Task[];
}

export default function WorkflowsPage() {
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const qc = useQueryClient();

  const { data: mine } = useQuery({
    queryKey: ['tasks-mine'],
    queryFn: () => get<MyTasks>('/workflows/tasks/mine'),
    enabled: tab === 'mine',
  });

  const { data: allPaginated, isLoading } = useQuery({
    queryKey: ['tasks-all', { status, priority }],
    queryFn: () => get<PaginatedResponse<Task>>('/workflows/tasks', {
      status: status || undefined, priority: priority || undefined, limit: 50,
    }),
    enabled: tab === 'all',
    placeholderData: (prev) => prev,
  });

  const createTask = useMutation({
    mutationFn: (data: object) => post('/workflows/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-mine'] }); qc.invalidateQueries({ queryKey: ['tasks-all'] }); setShowNew(false); setNewTitle(''); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patch(`/workflows/tasks/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-mine'] }); qc.invalidateQueries({ queryKey: ['tasks-all'] }); },
  });

  const tasks = tab === 'mine' ? (mine?.tasks ?? []) : (allPaginated?.data ?? []);

  return (
    <>
      <Header title="Workflows & Tasks" subtitle={`${tasks.length} task`} action={{ label: 'Nuovo task', onClick: () => setShowNew(true) }} />
      <div className="p-6 space-y-6">

        {/* My tasks summary */}
        {tab === 'mine' && mine && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Da fare', value: mine.todo, icon: Circle, color: '#3b82f6' },
              { label: 'Scaduti', value: mine.overdue, icon: AlertTriangle, color: '#ef4444' },
              { label: 'Oggi', value: mine.dueToday, icon: Clock, color: '#f59e0b' },
              { label: 'Questa settimana', value: mine.dueThisWeek, icon: CheckSquare, color: '#10b981' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-glow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>{label}</p>
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-secondary)' }}>
          {(['mine', 'all'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-blue-600 text-white' : 'text-[#8ca4c8] hover:text-white'}`}>
              {t === 'mine' ? 'I miei task' : 'Tutti i task'}
            </button>
          ))}
        </div>

        {/* Filters (all tab) */}
        {tab === 'all' && (
          <div className="flex gap-3">
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-dark">
              <option value="">Tutti gli stati</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input-dark">
              <option value="">Tutte le priorità</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}

        {/* New task form */}
        {showNew && (
          <div className="card p-4 border-blue-500/30">
            <p className="text-sm font-semibold text-white mb-3">Nuovo task</p>
            <div className="flex gap-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titolo del task..."
                className="input-dark flex-1" onKeyDown={e => e.key === 'Enter' && newTitle && createTask.mutate({ title: newTitle, priority: newPriority })} />
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="input-dark w-36">
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={() => newTitle && createTask.mutate({ title: newTitle, priority: newPriority })}
                className="btn-primary flex items-center gap-1.5" disabled={!newTitle}>
                <Plus size={14} /> Crea
              </button>
              <button onClick={() => setShowNew(false)} className="btn-ghost p-2"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="card divide-y" style={{ borderColor: 'var(--border)', '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {isLoading && tab === 'all' ? (
            <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>Caricamento...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>
              <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p>Nessun task trovato</p>
            </div>
          ) : tasks.map(t => (
            <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-[#1a2740] transition-colors">
              <button onClick={() => updateStatus.mutate({ id: t.id, status: t.status === 'DONE' ? 'TODO' : 'DONE' })}
                className="flex-shrink-0 transition-colors hover:text-blue-400" style={{ color: t.status === 'DONE' ? '#10b981' : 'var(--text-3)' }}>
                {t.status === 'DONE' ? <CheckCircle size={18} /> : <Circle size={18} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${t.status === 'DONE' ? 'line-through' : 'text-white'}`}
                  style={t.status === 'DONE' ? { color: 'var(--text-3)' } : {}}>
                  {t.title}
                </p>
                {t.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {t.isOverdue && (
                  <span className="flex items-center gap-1 text-xs badge-red px-2 py-0.5 rounded-full border">
                    <AlertTriangle size={9} /> Scaduto
                  </span>
                )}
                {t.dueDate && !t.isOverdue && (
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                    <Clock size={10} /> {formatDate(t.dueDate)}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[t.priority] ?? 'badge-gray'}`}>
                  {PRIORITY_LABELS[t.priority] ?? t.priority}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status] ?? 'badge-gray'}`}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
                {t.assignedTo && (
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {t.assignedTo.firstName} {t.assignedTo.lastName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
