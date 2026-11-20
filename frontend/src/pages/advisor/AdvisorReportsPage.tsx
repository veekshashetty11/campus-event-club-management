import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  BarChart3,
  Download,
  Users,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AdvisorReportsPage() {
  const { user } = useAuth();
  const { clubs, events, approvals } = useManagement();

  const advisedClubs = useMemo(() => {
    return clubs.filter(
      (c) =>
        c.advisorEmail === user?.email ||
        c.facultyAdvisorEmail === user?.email ||
        (c.advisorName || c.facultyAdvisorName || '').toLowerCase().includes('finch')
    );
  }, [clubs, user?.email]);

  const advisedClubIds = useMemo(() => advisedClubs.map((c) => c.clubId), [advisedClubs]);

  const chartData = useMemo(() => {
    return advisedClubs.map((c) => {
      const clubEvts = events.filter((e) => e.clubId === c.clubId);
      const totalCapacity = clubEvts.reduce((sum, e) => sum + (e.capacity || e.maxCapacity || 0), 0);
      const totalRegistered = clubEvts.reduce((sum, e) => sum + e.registeredCount, 0);
      return {
        name: c.name.length > 15 ? c.name.substring(0, 13) + '...' : c.name,
        events: clubEvts.length,
        registrations: totalRegistered,
        capacity: totalCapacity,
      };
    });
  }, [advisedClubs, events]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Advisor', path: '/advisor/dashboard' },
          { label: 'Reports & Analytics' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Advisory Reports</h1>
          <p className="text-sm text-slate-500">
            Participation metrics and event performance across advised student chapters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Club Event Registrations vs Capacity</h2>
          <p className="text-xs text-slate-500 mb-6">Aggregated student interest across your advised organizations.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="capacity" fill="#cbd5e1" name="Capacity" radius={[4, 4, 0, 0]} />
                <Bar dataKey="registrations" fill="#0d9488" name="Registrations" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Events Organized Per Club</h2>
          <p className="text-xs text-slate-500 mb-6">Activity frequency for the current academic session.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="events" fill="#1b3b57" name="Total Events" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
