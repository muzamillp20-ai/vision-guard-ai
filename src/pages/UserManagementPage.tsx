import { useEffect, useState } from 'react';
import { getAllUsers, createUser, updateUserRole, deactivateUser, activateUser } from '../services/auth';
import { logAction, AuditActions } from '../services/audit';
import { useAuth } from '../contexts/AuthContext';
import type { User, UserRole } from '../types/auth';
import { Users, Plus, Shield, UserCheck, UserX } from 'lucide-react';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const user = await createUser(newEmail, newPassword, newName, newRole);
      await logAction(AuditActions.USER_CREATED, 'user', user.id, `User created: ${newEmail}`, currentUser?.id || null, currentUser?.email || null);
      
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('operator');
      setShowAdd(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    await updateUserRole(userId, role);
    await logAction(AuditActions.ROLE_CHANGED, 'user', userId, `Role changed to ${role}`, currentUser?.id || null, currentUser?.email || null);
    await loadUsers();
  }

  async function handleToggleActive(userId: string, currentlyActive: boolean) {
    if (currentlyActive) {
      await deactivateUser(userId);
      await logAction(AuditActions.USER_DEACTIVATED, 'user', userId, 'User deactivated', currentUser?.id || null, currentUser?.email || null);
    } else {
      await activateUser(userId);
      await logAction(AuditActions.USER_ACTIVATED, 'user', userId, 'User activated', currentUser?.id || null, currentUser?.email || null);
    }
    await loadUsers();
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{users.length} users</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" />
          Add User
        </button>
      </div>

      {showAdd && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-3 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              >
                <option value="admin">Administrator</option>
                <option value="operator">Safety Operator</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {error && (
              <div className="col-span-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800">
                Create User
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-500">Loading users…</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Last Login</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-700">{u.displayName.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-gray-900">{u.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                      disabled={u.id === currentUser?.id}
                      className="text-xs border border-gray-200 rounded px-2 py-1 disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleActive(u.id, u.active)}
                        className={`p-1 rounded ${u.active ? 'hover:bg-red-50' : 'hover:bg-green-50'}`}
                        title={u.active ? 'Deactivate' : 'Activate'}
                      >
                        {u.active ? (
                          <UserX className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-gray-400 hover:text-green-500" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
