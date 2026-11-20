import React, { useState } from 'react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [term, setTerm] = useState('Fall Semester');
  const [approvalCutoffDays, setApprovalCutoffDays] = useState(7);
  const [allowPublicGuests, setAllowPublicGuests] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'System Settings' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Workflow Configuration</h1>
        <p className="text-sm text-slate-500">
          Manage campus-wide parameters, term schedules, and multi-tier approval policy thresholds.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>System configuration parameters saved successfully.</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">Academic Session Parameters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Academic Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
              />
              <Input
                label="Current Term / Semester"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-3">Approval Workflow Policy</h2>
            <div className="space-y-4">
              <Input
                label="Minimum Lead Time for Event Submission (Days before event date)"
                type="number"
                min="1"
                value={approvalCutoffDays}
                onChange={(e) => setApprovalCutoffDays(Number(e.target.value))}
                required
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPublicGuests}
                  onChange={(e) => setAllowPublicGuests(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Permit external non-campus attendees for published open category events
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button type="submit" variant="primary">
              <Save size={16} className="mr-2" />
              Save Configuration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
