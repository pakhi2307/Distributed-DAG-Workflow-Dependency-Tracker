"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '../../../../lib/api';
import { useAuth } from '../../../../components/AuthProvider';
import Link from 'next/link';
import { ArrowLeft, GitPullRequest, CheckCircle2, XCircle, Clock } from 'lucide-react';
import CollaborativeEditor from '../../../../components/CollaborativeEditor';

const RenderSlaStatus = ({ createdAt, status }: { createdAt: string; status: string }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (status !== 'PENDING' && status !== 'ESCALATED') return null;

  const createdTime = new Date(createdAt).getTime();
  const elapsedMs = now - createdTime;
  const totalMs = 24 * 60 * 60 * 1000;
  
  const remainingHours = Math.max(0, (totalMs - elapsedMs) / (1000 * 60 * 60));
  const percentElapsed = Math.min(100, (elapsedMs / totalMs) * 100);
  
  let barColor = 'bg-green-500';
  let badgeColor = 'text-green-700 bg-green-50 border-green-200';
  let label = `${Math.ceil(remainingHours)}h remaining`;

  if (status === 'ESCALATED' || remainingHours <= 0) {
    barColor = 'bg-red-500';
    badgeColor = 'text-red-700 bg-red-50 border-red-200 animate-pulse';
    label = 'SLA BREACHED / ESCALATED';
  } else if (remainingHours < 6) {
    barColor = 'bg-red-500';
    badgeColor = 'text-red-700 bg-red-50 border-red-200';
  } else if (remainingHours < 12) {
    barColor = 'bg-yellow-500';
    badgeColor = 'text-yellow-700 bg-yellow-50 border-yellow-200';
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SLA Timer</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {label}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${100 - percentElapsed}%` }}></div>
      </div>
    </div>
  );
};

export default function ModulePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [moduleData, setModuleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Handshake Modal State
  const [isHandshakeModalOpen, setIsHandshakeModalOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const fetchModule = async () => {
    try {
      const response = await api.get(`/modules/${id}`);
      setModuleData(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModule();
  }, [id]);

  const handleHandshakeAction = async (handshakeId: string, action: 'accept' | 'reject') => {
    setActionLoading(true);
    try {
      await api.patch(`/handshakes/${handshakeId}/${action}`);
      await fetchModule(); // Refresh data
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} handshake`);
    } finally {
      setActionLoading(false);
    }
  };

  const initiateHandshake = async () => {
    try {
      const response = await api.get(`/modules/project/${moduleData.projectId}`);
      // Filter out current module
      const otherModules = response.data.filter((m: any) => m.id !== id);
      setAvailableModules(otherModules);
      setIsHandshakeModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch modules for handshake", err);
      alert("Failed to load modules");
    }
  };

  const submitHandshake = async () => {
    if (!selectedModuleId) return;
    setActionLoading(true);
    try {
      await api.post('/handshakes', {
        fromModuleId: id,
        toModuleId: selectedModuleId,
      });
      setIsHandshakeModalOpen(false);
      setSelectedModuleId('');
      await fetchModule(); // Refresh data
    } catch (err) {
      console.error(err);
      alert('Failed to initiate handshake');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div>Loading module...</div>;
  if (!moduleData) return <div>Module not found</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/projects/${moduleData.projectId}`} className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Project
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{moduleData.title}</h1>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                moduleData.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                moduleData.status === 'PENDING_HANDSHAKE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {moduleData.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-slate-500">Owned by {moduleData.owner?.name}</p>
          </div>
          
          {moduleData.status === 'IN_PROGRESS' && moduleData.ownerId === user?.id && (
            <button 
              onClick={initiateHandshake}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
            >
              <GitPullRequest className="w-4 h-4 mr-2" />
              Initiate Handshake
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Module Specification */}
      <CollaborativeEditor moduleId={id as string} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Incoming Handshakes (Requires my approval) */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <GitPullRequest className="w-5 h-5 mr-2 text-slate-500" />
            Incoming Handshakes
          </h2>
          <div className="space-y-4">
            {moduleData.incomingHandshakes?.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 border-dashed text-center text-slate-500 text-sm">
                No incoming handshakes to review.
              </div>
            ) : (
              moduleData.incomingHandshakes?.map((hs: any) => (
                <div key={hs.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-slate-900">From: {hs.fromModule?.title}</p>
                      <p className="text-sm text-slate-500">Initiated by {hs.initiatedBy?.name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      hs.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                      hs.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {hs.status}
                    </span>
                  </div>
                  
                  {(hs.status === 'PENDING' || hs.status === 'ESCALATED') && (
                    <RenderSlaStatus createdAt={hs.createdAt} status={hs.status} />
                  )}

                  {hs.status === 'PENDING' && (
                    <div className="flex space-x-3 mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleHandshakeAction(hs.id, 'accept')}
                        disabled={actionLoading}
                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center border border-green-200"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleHandshakeAction(hs.id, 'reject')}
                        disabled={actionLoading}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center border border-red-200"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outgoing Handshakes (Waiting on others) */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-slate-500" />
            Outgoing Handshakes
          </h2>
          <div className="space-y-4">
            {moduleData.outgoingHandshakes?.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 border-dashed text-center text-slate-500 text-sm">
                No outgoing handshakes.
              </div>
            ) : (
              moduleData.outgoingHandshakes?.map((hs: any) => (
                <div key={hs.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">To: {hs.toModule?.title}</p>
                      <p className="text-sm text-slate-500">Sent on {new Date(hs.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      hs.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                      hs.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {hs.status}
                    </span>
                  </div>
                  {(hs.status === 'PENDING' || hs.status === 'ESCALATED') && (
                    <RenderSlaStatus createdAt={hs.createdAt} status={hs.status} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Initiate Handshake Modal */}
      {isHandshakeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Initiate Handshake</h3>
            <p className="text-sm text-slate-500 mb-4">Select a module to hand off your work to.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Target Module</label>
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
              >
                <option value="">-- Select Module --</option>
                {availableModules.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setIsHandshakeModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                onClick={submitHandshake}
                disabled={!selectedModuleId || actionLoading}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Sending...' : 'Initiate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
