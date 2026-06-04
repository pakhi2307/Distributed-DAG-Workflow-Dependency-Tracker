"use client";

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import api from '../../../lib/api';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/audit/notifications');
      setNotifications(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'ERROR': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PENDING': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Bell className="w-6 h-6 mr-3 text-blue-600" />
            Notifications
          </h1>
          <p className="text-slate-500 mt-1">Stay updated on your workflow tasks.</p>
        </div>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Mark all as read
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p>You have no new notifications.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <li key={notif.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start">
                <div className="mr-4 mt-0.5">{getIcon(notif.type)}</div>
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notif.date).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
