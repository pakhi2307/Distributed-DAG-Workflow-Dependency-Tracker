'use client';
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts';
import { AlertCircle, Clock, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import api from '../lib/api';

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.orgId) {
      Promise.all([
        api.get(`/analytics/org/${user.orgId}`),
        api.get('/projects/stats'),
      ]).then(([analyticsRes, statsRes]) => {
        setAnalytics(analyticsRes.data);
        setStats(statsRes.data);
      }).catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading Predictive Analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-10 text-center text-red-500">
        Failed to load analytics.
      </div>
    );
  }

  // Bar chart data — at-risk modules and their predicted delay
  const delayChartData = analytics.atRiskModules.map((m: any) => {
    const expected = new Date(m.expectedCompletionDate).getTime();
    const predicted = new Date(m.createdAt).getTime() + (analytics.historicalAverageDays * 86400000);
    const delayDays = Math.max(0, Math.ceil((predicted - expected) / 86400000));
    return {
      name: m.title.length > 14 ? m.title.substring(0, 14) + '…' : m.title,
      delayDays,
      originalTitle: m.title,
    };
  }).filter((d: any) => d.delayDays > 0);

  // Pie chart data — module status breakdown
  const pieData = stats ? [
    { name: 'Completed', value: stats.completedModules || 0, color: '#22c55e' },
    { name: 'Pending Handshake', value: stats.pendingHandshakes || 0, color: '#f59e0b' },
    { name: 'In Progress', value: Math.max(0, (stats.activeProjects || 0) - (stats.pendingHandshakes || 0)), color: '#3b82f6' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Predictive Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Forecasted bottlenecks based on historical completion data</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Historical Avg</p>
            <p className="text-2xl font-bold text-slate-900">
              {analytics.historicalAverageDays > 0 ? `${analytics.historicalAverageDays}d` : '—'}
            </p>
            <p className="text-xs text-slate-400">per module</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">At Risk</p>
            <p className="text-2xl font-bold text-slate-900">{analytics.atRiskModules.length}</p>
            <p className="text-xs text-slate-400">modules forecasted to delay</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-green-100 text-green-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-slate-900">{analytics.completedCount ?? stats?.completedModules ?? 0}</p>
            <p className="text-xs text-slate-400">modules finished</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Delay Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">
            Predicted Delay by Module (Days)
          </h3>
          {delayChartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delayChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: any) => [`${value} days`, 'Predicted Delay']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="delayDays" radius={[4, 4, 0, 0]}>
                    {delayChartData.map((_: any, i: number) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#ef4444' : '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <ShieldCheck className="w-10 h-10 text-green-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">All modules on track!</p>
              <p className="text-xs text-slate-400 mt-1">No predicted delays detected.</p>
            </div>
          )}
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">
            Workflow Status Breakdown
          </h3>
          {pieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value: any, name: any) => [value, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: '#64748b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-sm text-slate-400">No module data available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* At-Risk Detail Table */}
      {analytics.atRiskModules.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">At-Risk Module Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                <tr>
                  <th className="px-6 py-3">Module</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Expected Deadline</th>
                </tr>
              </thead>
              <tbody>
                {analytics.atRiskModules.map((m: any) => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-amber-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900">{m.title}</td>
                    <td className="px-6 py-3 text-slate-600">{m.projectName}</td>
                    <td className="px-6 py-3 text-slate-600">{m.ownerName}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {new Date(m.expectedCompletionDate).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
