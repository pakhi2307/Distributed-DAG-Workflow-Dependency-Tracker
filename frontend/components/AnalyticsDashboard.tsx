'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import api from '../lib/api';

export default function AnalyticsDashboard() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.orgId) {
            fetchAnalytics();
        }
    }, [user]);

    const fetchAnalytics = async () => {
        try {
            const response = await api.get(`/analytics/org/${user?.orgId}`);
            setAnalytics(response.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading Predictive Analytics...</div>;
    }

    if (!analytics) {
        return <div className="p-8 text-center text-red-500">Failed to load analytics.</div>;
    }

    // Chart data for at risk modules
    const chartData = analytics.atRiskModules.map((m: any) => {
        const expected = new Date(m.expectedCompletionDate).getTime();
        const predicted = new Date(m.createdAt).getTime() + (analytics.historicalAverageDays * 1000 * 60 * 60 * 24);
        
        // Days difference
        const delayDays = Math.ceil((predicted - expected) / (1000 * 60 * 60 * 24));
        
        return {
            name: m.title.length > 15 ? m.title.substring(0, 15) + '...' : m.title,
            delayDays: delayDays > 0 ? delayDays : 0,
            originalTitle: m.title
        };
    }).filter((d: any) => d.delayDays > 0);

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Predictive Analytics</h2>
                    <p className="text-sm text-slate-500">Forecasted bottlenecks based on historical data</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 rounded-lg p-5 flex items-center border border-slate-100">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-4">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Historical Avg. Completion</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.historicalAverageDays} Days</p>
                    </div>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-5 flex items-center border border-slate-100">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mr-4">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Modules At Risk</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.atRiskModules.length}</p>
                    </div>
                </div>
            </div>

            {chartData.length > 0 ? (
                <div className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Predicted Delay (Days)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#f1f5f9'}}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="delayDays" radius={[4, 4, 0, 0]}>
                                    {
                                        chartData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill="#ef4444" />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-lg mb-8 border border-slate-100 border-dashed">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p>No modules are currently forecasted to be delayed.</p>
                </div>
            )}

            {analytics.atRiskModules.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">At-Risk Details</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Module</th>
                                    <th className="px-4 py-3">Project</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3 rounded-tr-lg">Expected Deadline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.atRiskModules.map((m: any) => (
                                    <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{m.title}</td>
                                        <td className="px-4 py-3 text-slate-600">{m.projectName}</td>
                                        <td className="px-4 py-3 text-slate-600">{m.ownerName}</td>
                                        <td className="px-4 py-3 text-red-600 font-medium">
                                            {new Date(m.expectedCompletionDate).toLocaleDateString()}
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
