import React, { useMemo } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Download, BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
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

export default function AdminReportsPage() {
  const { clubs, events, expenses, memberships } = useManagement();

  // Club finance data
  const financeData = useMemo(() => {
    return clubs.map((c) => {
      const clubExps = expenses.filter((e) => e.clubId === c.clubId);
      const spent = clubExps.reduce((sum, e) => sum + e.amount, 0);
      return {
        name: c.name.length > 14 ? c.name.substring(0, 12) + '...' : c.name,
        allocated: c.allocatedBudget,
        disbursed: spent,
      };
    });
  }, [clubs, expenses]);

  const handleExport = () => {
    const data = `Campus Event & Club Management - Institutional Report
Generated: ${new Date().toLocaleString('en-IN')}
Total Clubs: ${clubs.length}
Total Events: ${events.length}
Total Budget Allocated: ₹${clubs.reduce((sum, c) => sum + c.allocatedBudget, 0).toLocaleString('en-IN')}
Total Spent: ₹${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Campus_System_Report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'System Reports' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Analytics & Audits</h1>
          <p className="text-sm text-slate-500">
            University-wide performance, student engagement index, and club financial solvency reports.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download size={16} className="mr-2" />
          Export System Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Club Budget Allocation vs Disbursements</h2>
          <p className="text-xs text-slate-500 mb-6">Financial utilization across campus student organizations.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="allocated" fill="#1b3b57" name="Allocated Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disbursed" fill="#0d9488" name="Disbursements" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Club Leaderboards */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Club Participation Leaderboard</h2>
          <p className="text-xs text-slate-500 mb-4">Rankings based on active membership roster count.</p>
          <div className="space-y-3">
            {clubs.map((c, idx) => {
              const membersCount = memberships.filter((m) => m.clubId === c.clubId && m.status === 'approved').length;
              return (
                <div key={c.clubId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.category}</p>
                    </div>
                  </div>
                  <span className="font-bold text-brand-800 text-xs">{membersCount} Students</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
