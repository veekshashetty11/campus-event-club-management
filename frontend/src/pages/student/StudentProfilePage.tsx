import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  Mail,
  Phone,
  Hash,
  Building,
  GraduationCap,
  Calendar,
  Award,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
} from 'lucide-react';

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { updateStudentProfile, memberships } = useStudent();

  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '+1-555-0106');
  const [department, setDepartment] = useState(user?.department || 'Information Technology');
  const [yearSemester, setYearSemester] = useState(user?.yearAndSemester || '3rd Year / 6th Semester');
  const [bio, setBio] = useState(
    user?.bio || 'Passionate full-stack developer, open-source enthusiast, and active member of CodeCraft Society.'
  );
  const [emergencyContact, setEmergencyContact] = useState(
    user?.emergencyContact || 'Robert Jenkins (+1-555-0199)'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!user) return null;

  const handleCancel = () => {
    setPhone(user?.phone || '+1-555-0106');
    setDepartment(user?.department || 'Information Technology');
    setYearSemester(user?.yearAndSemester || '3rd Year / 6th Semester');
    setBio(user?.bio || '');
    setEmergencyContact(user?.emergencyContact || '');
    setIsEditing(false);
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setFeedback({ type: 'error', message: 'Phone number cannot be empty.' });
      return;
    }
    if (!department.trim()) {
      setFeedback({ type: 'error', message: 'Department field is required.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await updateStudentProfile({
        phone: phone.trim(),
        department: department.trim(),
        yearAndSemester: yearSemester.trim(),
        bio: bio.trim(),
        emergencyContact: emergencyContact.trim(),
      });
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Profile details saved successfully!' });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'Student Profile' }]}
      />

      {/* Header Profile Hero Card */}
      <Card padding="none" className="overflow-hidden border-slate-200">
        <div className="h-28 bg-gradient-to-r from-brand-900 via-brand-800 to-teal-800 relative">
          <div className="absolute top-4 right-4">
            {!isEditing && (
              <Button
                variant="outline"
                size="xs"
                className="bg-white/90 text-brand-900 hover:bg-white border-none shadow-sm"
                leftIcon={<Edit2 size={13} />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-brand-800 border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-black shrink-0">
                {user.fullName.charAt(0)}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{user.fullName}</h1>
                  <Badge variant="primary" size="sm">
                    {user.roleDisplayName}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {user.studentId || 'STU-2026-8841'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl self-start sm:self-auto text-xs font-semibold shadow-sm">
              <Award size={16} className="text-amber-600" />
              <span>{user.points} Activity Points</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            {bio}
          </p>
        </div>
      </Card>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={[
            'p-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 shadow-sm border',
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800',
          ].join(' ')}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Profile Form (Edit Mode vs. View Mode) */}
      <Card padding="lg">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Edit Academic Profile Details</h2>
              <span className="text-xs text-slate-400">Institutional ID & Email are verified and locked</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name (Verified Institutional Record)"
                value={user.fullName}
                disabled
              />

              <Input
                label="Student USN / ID"
                value={user.studentId || 'STU-2026-8841'}
                disabled
              />

              <Input
                label="Campus Email Address"
                value={user.email}
                disabled
              />

              <Input
                label="Contact Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0100"
                required
              />

              <Input
                label="Academic Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />

              <Input
                label="Year & Semester"
                value={yearSemester}
                onChange={(e) => setYearSemester(e.target.value)}
                placeholder="e.g. 3rd Year / 6th Semester"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Contact Person & Phone
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Name (+1-555-xxxx)"
                className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bio & Technical Interests
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" leftIcon={<X size={14} />} onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" leftIcon={<Save size={14} />} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100">
              Academic & Identity Profile
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Hash size={16} className="text-brand-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">USN / Student ID</span>
                  <span className="font-semibold text-slate-800 text-sm">{user.studentId || 'STU-2026-8841'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Mail size={16} className="text-brand-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Verified Email</span>
                  <span className="font-semibold text-slate-800 text-sm truncate block">{user.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Building size={16} className="text-brand-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Department</span>
                  <span className="font-semibold text-slate-800 text-sm">{department}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <GraduationCap size={16} className="text-brand-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Academic Standing</span>
                  <span className="font-semibold text-slate-800 text-sm">{yearSemester}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Phone size={16} className="text-brand-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                  <span className="font-semibold text-slate-800 text-sm">{phone}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar size={16} className="text-brand-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
                  <span className="font-semibold text-slate-800 text-sm">{emergencyContact}</span>
                </div>
              </div>
            </div>

            {/* Club Memberships Summary */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Active Campus Club Affiliations ({memberships.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {memberships.map((m) => (
                  <div
                    key={m.membershipId}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs"
                  >
                    <span className="font-semibold text-slate-800">{m.clubName}</span>
                    <Badge variant={m.membershipStatus === 'approved' ? 'teal' : 'amber'} size="sm">
                      {m.memberRole}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
