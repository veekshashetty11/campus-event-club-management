import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  Receipt,
  PlusCircle,
  DollarSign,
  TrendingDown,
  Wallet,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  PieChart as PieIcon,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { ExpenseCategory } from '../../types/club';

const CHART_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

export default function CoordinatorBudgetPage() {
  const { user } = useAuth();
  const { clubs, expenses, sponsors, addExpense, deleteExpense } = useManagement();

  const club = clubs.find((c) => c.clubId === user?.clubId) || clubs[0];

  const clubExpenses = useMemo(() => {
    return expenses.filter((exp) => exp.clubId === club.clubId);
  }, [expenses, club.clubId]);

  const totalSpent = clubExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = Math.max(0, club.allocatedBudget - totalSpent);
  const budgetUtilization = Math.round((totalSpent / club.allocatedBudget) * 100);

  // 1. Budget utilization ring data
  const utilizationRingData = useMemo(() => [
    { name: 'Disbursed', value: totalSpent, color: '#4F46E5' },
    { name: 'Remaining Balance', value: remainingBudget, color: '#10B981' },
  ], [totalSpent, remainingBudget]);

  // 2. Expense category breakdown
  const categoryBreakdownData = useMemo(() => {
    const cats: Record<string, number> = {};
    clubExpenses.forEach((exp) => {
      cats[exp.category] = (cats[exp.category] || 0) + exp.amount;
    });
    return Object.entries(cats).map(([name, value], idx) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [clubExpenses]);

  // 3. Sponsorship contribution data
  const clubSponsorshipData = useMemo(() => {
    return sponsors.map((s) => ({
      name: s.name.length > 14 ? s.name.substring(0, 12) + '...' : s.name,
      amount: s.amount,
      tier: s.tier,
    }));
  }, [sponsors]);

  // 4. Budget comparison data
  const comparisonData = useMemo(() => [
    {
      category: 'Financial Ledger',
      Allocated: club.allocatedBudget,
      Disbursed: totalSpent,
      Remaining: remainingBudget,
    },
  ], [club, totalSpent, remainingBudget]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'catering' as ExpenseCategory,
    amount: 100,
    incurredDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.amount <= 0) {
      setMessage({ text: 'Expense amount must be greater than 0.', isError: true });
      return;
    }

    if (formData.amount > remainingBudget) {
      setMessage({
        text: `Budget Exceeded: Expense ($${formData.amount}) exceeds remaining club budget ($${remainingBudget}).`,
        isError: true,
      });
      return;
    }

    try {
      const res = await addExpense({
        clubId: club.clubId,
        title: formData.title,
        category: formData.category,
        amount: Number(formData.amount),
        incurredDate: formData.incurredDate,
        notes: formData.notes,
        submittedBy: user?.fullName || 'Club Coordinator',
        status: 'approved',
      });
      setMessage({ text: res.message, isError: !res.success });
      setIsModalOpen(false);
      setFormData({
        title: '',
        category: 'catering',
        amount: 100,
        incurredDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to record expense',
        isError: true,
      });
    }
  };

  const handleDelete = async (expenseId: number) => {
    try {
      const res = await deleteExpense(expenseId);
      setMessage({ text: res.message, isError: !res.success });
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to delete expense',
        isError: true,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Budget & Expenses' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Budget & Expense Ledger</h1>
          <p className="text-sm text-slate-500">
            Track annual allocations, log disbursements, and maintain financial compliance for {club.name}.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <PlusCircle size={16} className="mr-2" />
          Log New Expense
        </Button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !message.isError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {!message.isError ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 bg-[#111C32] border-[#263650]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Annual Allocated Budget</p>
              <p className="text-2xl font-black text-white mt-1">${club.allocatedBudget.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Wallet size={22} />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-[#111C32] border-[#263650]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Disbursements</p>
              <p className="text-2xl font-black text-rose-400 mt-1">${totalSpent.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <TrendingDown size={22} />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-[#111C32] border-[#263650]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Remaining Balance</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">${remainingBudget.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Financial Analytics Bento Grid ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Budget Utilization Ring */}
        <Card className="p-6 bg-[#111C32] border-[#263650]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieIcon size={18} className="text-indigo-400" />
                Budget Utilization Ring
              </h3>
              <p className="text-xs text-slate-400">Real-time expenditure vs remaining allocations</p>
            </div>
            <Badge variant={budgetUtilization > 90 ? 'danger' : 'success'} size="sm">
              {budgetUtilization}% Utilized
            </Badge>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={utilizationRingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#4F46E5" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#111C32', borderColor: '#263650', color: '#F1F5F9', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white">{budgetUtilization}%</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Spent</span>
            </div>
          </div>

          <div className="flex items-center justify-around pt-3 border-t border-[#263650] text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4F46E5]" />
              <span className="text-slate-300 font-medium">Disbursed: ${totalSpent.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-slate-300 font-medium">Available: ${remainingBudget.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* B. Expense Category Breakdown Donut */}
        <Card className="p-6 bg-[#111C32] border-[#263650]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-cyan-400" />
                Expense Breakdown by Category
              </h3>
              <p className="text-xs text-slate-400">Distribution across catering, AV equipment, and publicity</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{clubExpenses.length} entries</span>
          </div>

          {categoryBreakdownData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs">
              No categorized expenses recorded yet.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`$${val.toLocaleString()}`, 'Expenses']}
                    contentStyle={{ backgroundColor: '#111C32', borderColor: '#263650', color: '#F1F5F9', borderRadius: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span className="text-slate-300 text-xs">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* C. Sponsorship Contribution Chart */}
        <Card className="p-6 bg-[#111C32] border-[#263650]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                Corporate & Alumni Sponsorship Contributions
              </h3>
              <p className="text-xs text-slate-400">Direct event funding and corporate grants</p>
            </div>
            <Badge variant="amber" size="sm">
              {clubSponsorshipData.length} Sponsors
            </Badge>
          </div>

          {clubSponsorshipData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs">
              No active sponsor grants recorded.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clubSponsorshipData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263650" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    formatter={(val: number) => [`$${val.toLocaleString()}`, 'Contribution']}
                    contentStyle={{ backgroundColor: '#111C32', borderColor: '#263650', color: '#F1F5F9', borderRadius: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Funding ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* D. Budget Comparison Bar Chart */}
        <Card className="p-6 bg-[#111C32] border-[#263650]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingDown size={18} className="text-emerald-400" />
                Annual Allocation vs Disbursements
              </h3>
              <p className="text-xs text-slate-400">Fiscal solvency and remaining balance comparison</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              ${remainingBudget.toLocaleString()} Reserve
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263650" />
                <XAxis dataKey="category" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#111C32', borderColor: '#263650', color: '#F1F5F9', borderRadius: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(val) => <span className="text-slate-300 text-xs">{val}</span>}
                />
                <Bar dataKey="Allocated" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Disbursed" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Remaining" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recorded Expenses</h2>
          <span className="text-xs text-slate-500 font-medium">{clubExpenses.length} transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Expense Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Incurred Date</th>
                <th className="py-3.5 px-4">Submitted By</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {clubExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-600">No expenses recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Log New Expense" to record a club disbursement.</p>
                  </td>
                </tr>
              ) : (
                clubExpenses.map((exp) => (
                  <tr key={exp.expenseId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900">{exp.title}</p>
                      {exp.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{exp.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="neutral" className="capitalize">
                        {exp.category}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {new Date(exp.incurredDate || exp.date || exp.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{exp.submittedBy}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="success" className="capitalize">
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ${exp.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setDeleteConfirmId(exp.expenseId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Club Expense">
        <form onSubmit={handleAddExpense} className="space-y-4 pt-2">
          <Input
            label="Expense Title / Description"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Refreshments for Workshop Attendees"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Expense Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="catering">Catering & Refreshments</option>
                <option value="equipment">Equipment & Hardware</option>
                <option value="marketing">Marketing & Printing</option>
                <option value="prizes">Prizes & Certificates</option>
                <option value="venue">Venue & Logistics</option>
                <option value="other">Other Incidentals</option>
              </select>
            </div>

            <Input
              label="Amount ($ USD)"
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              required
            />
          </div>

          <Input
            label="Incurred Date"
            type="date"
            value={formData.incurredDate}
            onChange={(e) => setFormData({ ...formData, incurredDate: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Receipt Reference or Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Invoice #, vendor contact, or approval notes..."
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex justify-between">
            <span>Remaining Club Balance:</span>
            <span className="font-bold text-emerald-700">${remainingBudget.toLocaleString()}</span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Delete Expense Record">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this expense record? The funds will be credited back to your remaining club budget balance.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
