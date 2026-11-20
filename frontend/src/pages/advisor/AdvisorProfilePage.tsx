import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { Save, CheckCircle2 } from 'lucide-react';

export default function AdvisorProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || 'Prof. Arthur Finch');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <Breadcrumbs items={[{ label: 'Advisor', path: '/advisor/dashboard' }, { label: 'Profile' }]} />

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-800 text-white font-bold text-2xl flex items-center justify-center shadow-sm">
          {fullName.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
          <p className="text-sm text-slate-500">Faculty Advisor • Department of Computer Science</p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>Profile changes saved successfully.</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Faculty Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Academic Email" value={user?.email || 'advisor@campus.edu'} disabled />
          <Input label="Department" value="School of Computer Science & Engineering" disabled />
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button type="submit" variant="primary">
              <Save size={16} className="mr-2" />
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
