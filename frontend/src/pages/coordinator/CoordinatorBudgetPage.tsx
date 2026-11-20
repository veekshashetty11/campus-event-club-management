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
} from 'lucide-react';
import type { ExpenseCategory } from '../../types/club';

export default function CoordinatorBudgetPage() {
  const { user } = useAuth();
  const { clubs, expenses, addExpense, deleteExpense } = useManagement();

  const club = clubs.find((c) => c.clubId === user?.clubId) || clubs[0];

  const clubExpenses = useMemo(() => {
    return expenses.filter((exp) => exp.clubId === club.clubId);
  }, [expenses, club.clubId]);

  const totalSpent = clubExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = Math.max(0, club.allocatedBudget - totalSpent);
  const budgetUtilization = Math.round((totalSpent / club.allocatedBudget) * 100);

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
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Annual Allocated Budget</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">${club.allocatedBudget.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Wallet size={22} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Disbursements</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">${totalSpent.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={22} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Remaining Balance</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">${remainingBudget.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Utilization Progress Card */}
      <Card className="p-5">
        <div className="flex items-center justify-between text-sm font-semibold mb-2">
          <span className="text-slate-700">Budget Utilization Rate</span>
          <span className={`${budgetUtilization > 90 ? 'text-rose-600' : 'text-brand-800'}`}>
            {budgetUtilization}% Used (${totalSpent} of ${club.allocatedBudget})
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetUtilization > 90
                ? 'bg-rose-500'
                : budgetUtilization > 75
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          />
        </div>
      </Card>

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
