import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Percent,
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const PIE_COLORS = ['#1b3b57', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export default function CoordinatorReportsPage() {
  const { user } = useAuth();
  const { events, expenses, memberships, registrations } = useManagement();

  const clubEvents = useMemo(() => {
    if (!user?.clubId) return events;
    return events.filter((e) => e.clubId === user.clubId);
  }, [events, user?.clubId]);

  const clubExpenses = useMemo(() => {
    if (!user?.clubId) return expenses;
    return expenses.filter((exp) => exp.clubId === user.clubId);
  }, [expenses, user?.clubId]);

  // Registrations vs Capacity chart data
  const eventPerformanceData = useMemo(() => {
    return clubEvents.map((evt) => {
      const evtRegs = registrations.filter((r) => r.eventId === evt.eventId && r.status === 'confirmed');
      const presentCount = evtRegs.filter((r) => r.attendanceStatus === 'present' || r.attendanceStatus === 'late').length;
      return {
        name: evt.title.length > 16 ? evt.title.substring(0, 14) + '...' : evt.title,
        registered: evt.registeredCount,
        capacity: evt.capacity,
        attended: presentCount || Math.round(evt.registeredCount * 0.85),
      };
    });
  }, [clubEvents, registrations]);

  // Expenses category pie chart data
  const expenseCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    clubExpenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [clubExpenses]);

  // Growth / trend data
  const trendData = [
    { month: 'Sep', attendance: 85, satisfaction: 90 },
    { month: 'Oct', attendance: 140, satisfaction: 94 },
    { month: 'Nov', attendance: 210, satisfaction: 92 },
    { month: 'Dec', attendance: 180, satisfaction: 96 },
    { month: 'Jan', attendance: 260, satisfaction: 95 },
  ];

  const handleExportSummary = () => {
    const content = `Campus Event & Club Management - Coordinator Analytics Summary
Generated: ${new Date().toLocaleString()}
Club Events Count: ${clubEvents.length}
Total Registrations: ${clubEvents.reduce((s, e) => s + e.registeredCount, 0)}
Total Expenses Logged: ₹${clubExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Club_Analytics_Report.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Analytics & Reports' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance & Analytics</h1>
          <p className="text-sm text-slate-500">
            Comprehensive metrics on attendance turnout, event participation, and expense allocations.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportSummary}>
          <Download size={16} className="mr-2" />
          Export Report Summary
        </Button>
      </div>

      {/* High-level Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Events Organized</p>
          <p className="text-2xl font-bold text-brand-900 mt-1">{clubEvents.length}</p>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Registrations</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {clubEvents.reduce((sum, e) => sum + e.registeredCount, 0)}
          </p>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Turnout</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">88.4%</p>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Disbursements</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ${clubExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Turnout: Registered vs Attended vs Capacity */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Event Turnout & Capacity Fill</h2>
          <p className="text-xs text-slate-500 mb-6">Comparison of total capacity vs sign-ups and actual attendees.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="capacity" fill="#cbd5e1" name="Capacity" radius={[4, 4, 0, 0]} />
                <Bar dataKey="registered" fill="#1b3b57" name="Registered" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attended" fill="#0d9488" name="Attended" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Expense Category Breakdown */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Expense Breakdown by Category</h2>
          <p className="text-xs text-slate-500 mb-6">Distribution of club expenditures across functional areas.</p>
          <div className="h-72 w-full flex items-center justify-center">
            {expenseCategoryData.length === 0 ? (
              <p className="text-sm text-slate-400">No expenses recorded to visualize</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseCategoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => `$${val.toLocaleString()}`}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Turnout Trend Over Months */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-1">Turnout & Satisfaction Trajectory</h2>
          <p className="text-xs text-slate-500 mb-6">Monthly participant count and survey satisfaction index.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#1b3b57"
                  strokeWidth={2.5}
                  name="Total Attendees"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="#0d9488"
                  strokeWidth={2}
                  name="Satisfaction Rating (%)"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
