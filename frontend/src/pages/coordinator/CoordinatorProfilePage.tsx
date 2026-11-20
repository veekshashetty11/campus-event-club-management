import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import {
  UserCircle,
  Building2,
  Mail,
  Phone,
  Shield,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function CoordinatorProfilePage() {
  const { user } = useAuth();
  const { clubs } = useManagement();
  const club = clubs.find((c) => c.clubId === user?.clubId) || clubs[0];

  const [fullName, setFullName] = useState(user?.fullName || 'Alex Rivera');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [department, setDepartment] = useState('Computer Science & Engineering');
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
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Profile Settings' },
        ]}
      />

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-800 text-white font-bold text-2xl flex items-center justify-center shadow-sm">
          {fullName.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
          <p className="text-sm text-slate-500">Club Coordinator • {club.name}</p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>Profile preferences saved successfully.</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Campus Email Address"
              value={user?.email || 'coordinator@campus.edu'}
              disabled
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Academic Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Assigned Club:</span>
              <span className="font-bold text-slate-800">{club.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Role Authority:</span>
              <Badge variant="info">Club Coordinator / President</Badge>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button type="submit" variant="primary">
              <Save size={16} className="mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
