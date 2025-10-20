import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Mail, Clock, FileText, TrendingUp, Calendar } from 'lucide-react';
import { api } from '../services/api';

interface DashboardStats {
  today: {
    totalEmails: number;
    hohePrioritaet: number;
    mandantenanfragen: number;
    rechnungenFinanzen: number;
    draftsCreated: number;
    eventsCreated: number;
  };
  week: {
    totalEmails: number;
    avgPerDay: number;
  };
  timeline: Array<{
    date: string;
    hohePrioritaet: number;
    mandantenanfragen: number;
    rechnungenFinanzen: number;
  }>;
}

const COLORS = {
  hohePrioritaet: '#ef4444',
  mandantenanfragen: '#3b82f6',
  rechnungenFinanzen: '#10b981'
};

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/api/stats/dashboard').then(res => res.data),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading || !stats) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const categoryDistribution = [
    { name: 'Hohe Priorität', value: stats.today.hohePrioritaet, color: COLORS.hohePrioritaet },
    { name: 'Mandantenanfragen', value: stats.today.mandantenanfragen, color: COLORS.mandantenanfragen },
    { name: 'Rechnungen & Finanzen', value: stats.today.rechnungenFinanzen, color: COLORS.rechnungenFinanzen }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Übersicht über E-Mail-Klassifikationen</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Mail className="w-5 h-5" />}
          title="Gesamt Heute"
          value={stats.today.totalEmails}
          subtitle="E-Mails verarbeitet"
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Hohe Priorität"
          value={stats.today.hohePrioritaet}
          subtitle="Dringende Anfragen"
          color="red"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          title="Entwürfe"
          value={stats.today.draftsCreated}
          subtitle="Automatisch erstellt"
          color="green"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          title="Termine"
          value={stats.today.eventsCreated}
          subtitle="Fristen erkannt"
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Verlauf (7 Tage)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hohePrioritaet" name="Hohe Priorität" fill={COLORS.hohePrioritaet} />
              <Bar dataKey="mandantenanfragen" name="Mandantenanfragen" fill={COLORS.mandantenanfragen} />
              <Bar dataKey="rechnungenFinanzen" name="Rechnungen & Finanzen" fill={COLORS.rechnungenFinanzen} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Kategorien Heute</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Diese Woche</h2>
            <p className="text-gray-600 mt-1">Gesamtstatistik der letzten 7 Tage</p>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="w-5 h-5" />
            <span className="text-2xl font-bold">{stats.week.totalEmails}</span>
          </div>
        </div>
        <div className="mt-4 text-gray-600">
          Durchschnitt: <span className="font-semibold">{stats.week.avgPerDay.toFixed(1)}</span> E-Mails pro Tag
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'red' | 'green' | 'purple';
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
