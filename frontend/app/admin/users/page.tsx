'use client';

import { useEffect, useState, useCallback } from 'react';
import { userApi } from '@/lib/api';
import type { User } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'master' | 'user'>('user');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userApi.list();
      setUsers((res.data as User[]) || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    try {
      setCreating(true);
      setMsg(null);
      await userApi.create({ name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      setRole('user');
      setMsg({ type: 'success', text: 'User created successfully!' });
      await fetchUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create user' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await userApi.update(user.id, { is_active: !user.is_active });
      setMsg({ type: 'success', text: `User ${user.name} status updated to ${!user.is_active ? 'Active' : 'Disabled'}` });
      await fetchUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Update failed' });
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await userApi.update(userId, { role: newRole });
      setMsg({ type: 'success', text: `User role updated to ${newRole}` });
      await fetchUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Role change failed' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          User & Access Management
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Manage user accounts and assign roles (<strong>Admin</strong>, <strong>Master</strong>, <strong>User</strong>).
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm ${
            msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Create User Form */}
      <form onSubmit={handleCreate} className="p-6 rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Add New User
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'master' | 'user')}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <option value="user">User (Chat only)</option>
              <option value="master">Master (Knowledge + Chat)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {creating && <div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />}
            Create User
          </button>
        </div>
      </form>

      {/* Users Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Registered Accounts ({users.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-medium" style={{ color: 'var(--foreground)' }}>
                      {u.name}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      {u.email}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded border outline-none font-medium capitalize"
                        style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      >
                        <option value="user">User</option>
                        <option value="master">Master</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className="px-3 py-1 text-xs rounded-lg border hover:bg-white/[0.05] cursor-pointer"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
