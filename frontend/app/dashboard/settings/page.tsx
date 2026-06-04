"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthProvider';
import { Settings as SettingsIcon, User, Shield, Key, Link as LinkIcon, Plus } from 'lucide-react';
import api from '../../../lib/api';

interface Invite {
  id: string;
  code: string;
  role: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('MEMBER');

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      fetchInvites();
    }
  }, [user]);

  const fetchInvites = async () => {
    try {
      const res = await api.get('/invites');
      setInvites(res.data);
    } catch (err) {
      console.error('Failed to fetch invites');
    }
  };

  const generateInvite = async () => {
    setLoading(true);
    try {
      await api.post('/invites', { role });
      fetchInvites();
    } catch (err) {
      console.error('Failed to generate invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <SettingsIcon className="w-6 h-6 mr-3 text-blue-600" />
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your account and organization preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200 flex items-center">
          <User className="w-5 h-5 text-slate-400 mr-3" />
          <h2 className="text-lg font-semibold text-slate-900">Profile Settings</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" disabled value={user?.name || ''} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input type="text" disabled value={user?.role || ''} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200 flex items-center">
          <Shield className="w-5 h-5 text-slate-400 mr-3" />
          <h2 className="text-lg font-semibold text-slate-900">Security</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600 mb-4">Update your password or configure two-factor authentication.</p>
          <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Change Password
          </button>
        </div>
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center">
              <Key className="w-5 h-5 text-slate-400 mr-3" />
              <h2 className="text-lg font-semibold text-slate-900">Invite Members</h2>
            </div>
            <div className="flex items-center space-x-2">
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-sm px-3 py-2"
              >
                <option value="MEMBER">Member</option>
                {user.role === 'ADMIN' && <option value="MANAGER">Manager</option>}
              </select>
              <button 
                onClick={generateInvite} 
                disabled={loading}
                className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center disabled:opacity-70"
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Generating...' : 'Generate Code'}
              </button>
            </div>
          </div>
          <div className="p-0">
            {invites.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No active invites. Generate one to add members.</div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {invites.map((invite) => (
                  <li key={invite.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-mono text-lg font-bold text-slate-900 tracking-wider bg-slate-100 px-2 py-1 rounded inline-block mb-1">
                        {invite.code}
                      </div>
                      <div className="text-xs text-slate-500">
                        Grants {invite.role} access • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(invite.code)}
                      className="text-blue-600 hover:text-blue-700 bg-blue-50 p-2 rounded-lg transition-colors"
                      title="Copy Code"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
