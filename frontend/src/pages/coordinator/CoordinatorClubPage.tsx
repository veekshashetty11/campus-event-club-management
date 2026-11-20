import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import {
  Building2,
  Users,
  Calendar,
  Mail,
  MapPin,
  Clock,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function CoordinatorClubPage() {
  const { user } = useAuth();
  const { clubs, memberships, updateClubDetails } = useManagement();

  // Find coordinator's club
  const club = clubs.find((c) => c.clubId === user?.clubId) || clubs[0];
  const clubMembers = memberships.filter((m) => m.clubId === club.clubId && m.status === 'approved');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    description: club.description,
    contactEmail: club.contactEmail,
    meetingSchedule: club.meetingSchedule || 'Every Wednesday at 5:00 PM',
    roomLocation: club.roomLocation || 'Engineering Block B, Room 204',
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await updateClubDetails(club.clubId, formData);
      if (res.success) {
        setSaveStatus('Club details updated successfully.');
        setIsEditing(false);
      } else {
        setSaveStatus(res.message);
      }
    } catch (err: unknown) {
      setSaveStatus(err instanceof Error ? err.message : 'Failed to update club');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Club Management' },
        ]}
      />

      {/* Top Banner / Hero Card */}
      <Card className="p-6 md:p-8 border border-slate-200/80 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-2 flex items-center justify-center shrink-0">
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80';
                }}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">{club.name}</h1>
                <Badge variant="neutral" className="bg-white/20 text-white border-transparent">
                  {club.category}
                </Badge>
                <Badge variant={club.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                  {club.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-200 line-clamp-2 max-w-2xl">{club.tagline || club.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <Button
              variant={isEditing ? 'outline' : 'secondary'}
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? 'bg-white/10 text-white border-white/30 hover:bg-white/20' : 'bg-white text-brand-900 hover:bg-slate-100'}
            >
              <Edit3 size={16} className="mr-2" />
              {isEditing ? 'Cancel Edit' : 'Edit Club Profile'}
            </Button>
          </div>
        </div>
      </Card>

      {saveStatus && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-sm ${
            saveStatus.includes('success')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {saveStatus.includes('success') ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editable Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-brand-700" />
              Club Information
            </h2>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Club Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full text-sm rounded-xl border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Official Contact Email"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    required
                  />
                  <Input
                    label="Meeting Schedule"
                    value={formData.meetingSchedule}
                    onChange={(e) => setFormData({ ...formData, meetingSchedule: e.target.value })}
                    placeholder="e.g. Every Wednesday at 5:00 PM"
                    required
                  />
                </div>

                <Input
                  label="Meeting Room / Location"
                  value={formData.roomLocation}
                  onChange={(e) => setFormData({ ...formData, roomLocation: e.target.value })}
                  placeholder="e.g. Science Block Room 102"
                  required
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    <Save size={16} className="mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">About the Club</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{club.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Mail size={18} className="text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Contact Email</p>
                      <p className="text-sm font-semibold text-slate-800 break-all">{club.contactEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Clock size={18} className="text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Meeting Schedule</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {club.meetingSchedule || 'Wednesdays at 5:00 PM'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <MapPin size={18} className="text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Meeting Room</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {club.roomLocation || 'Engineering Block B, 204'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Calendar size={18} className="text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Founded</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {club.foundedYear || 2024}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Key Details & Stats */}
        <div className="space-y-6">
          {/* Key Figures */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Club Snapshot</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Users size={16} className="text-slate-400" /> Total Active Members
                </span>
                <span className="text-base font-bold text-slate-900">{clubMembers.length}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Faculty Advisor</span>
                <span className="text-sm font-semibold text-slate-800">{club.advisorName}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Club President</span>
                <span className="text-sm font-semibold text-slate-800">{club.presidentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Annual Budget</span>
                <span className="text-sm font-bold text-emerald-700">${club.allocatedBudget.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6 bg-slate-50/50 border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <a
                href="/coordinator/members"
                className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:text-brand-700 hover:border-brand-200 transition-colors"
              >
                <span>Manage Club Members</span>
                <ExternalLink size={14} className="text-slate-400" />
              </a>
              <a
                href="/coordinator/events"
                className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:text-brand-700 hover:border-brand-200 transition-colors"
              >
                <span>View Club Events</span>
                <ExternalLink size={14} className="text-slate-400" />
              </a>
              <a
                href="/coordinator/budget"
                className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:text-brand-700 hover:border-brand-200 transition-colors"
              >
                <span>Budget & Expense Tracker</span>
                <ExternalLink size={14} className="text-slate-400" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
