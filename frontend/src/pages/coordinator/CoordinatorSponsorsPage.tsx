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
  HandCoins,
  PlusCircle,
  Building,
  Mail,
  User,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Award,
} from 'lucide-react';
import type { SponsorTier } from '../../types/club';

export default function CoordinatorSponsorsPage() {
  const { user } = useAuth();
  const { clubs, sponsors, addSponsor, deleteSponsor } = useManagement();

  const club = clubs.find((c) => c.clubId === user?.clubId) || clubs[0];

  const clubSponsors = useMemo(() => {
    return sponsors.filter((s) => s.clubId === club.clubId);
  }, [sponsors, club.clubId]);

  const totalRaised = clubSponsors.reduce((sum, s) => sum + s.amount, 0);
  const totalReceived = clubSponsors
    .filter((s) => s.paymentStatus === 'received')
    .reduce((sum, s) => sum + s.amount, 0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tier: 'gold' as SponsorTier,
    amount: 1000,
    contactPerson: '',
    contactEmail: '',
    logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=200&q=80',
    paymentStatus: 'received' as 'pledged' | 'received',
  });
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await addSponsor({
        clubId: club.clubId,
        name: formData.name,
        tier: formData.tier,
        amount: Number(formData.amount),
        contactPerson: formData.contactPerson,
        contactEmail: formData.contactEmail,
        logoUrl: formData.logoUrl,
        paymentStatus: formData.paymentStatus,
      });
      setMessage({ text: res.message, isError: !res.success });
      setIsModalOpen(false);
      setFormData({
        name: '',
        tier: 'gold',
        amount: 1000,
        contactPerson: '',
        contactEmail: '',
        logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=200&q=80',
        paymentStatus: 'received',
      });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to add sponsor',
        isError: true,
      });
    }
  };

  const handleDelete = async (sponsorId: number) => {
    try {
      const res = await deleteSponsor(sponsorId);
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to delete sponsor',
        isError: true,
      });
    }
  };

  const getTierBadge = (tier?: SponsorTier) => {
    switch (tier) {
      case 'title':
        return <Badge variant="danger" className="uppercase font-bold">Title Partner</Badge>;
      case 'platinum':
        return <Badge variant="info" className="uppercase font-bold">Platinum</Badge>;
      case 'gold':
        return <Badge variant="warning" className="uppercase font-bold">Gold</Badge>;
      case 'silver':
        return <Badge variant="neutral" className="uppercase font-bold">Silver</Badge>;
      default:
        return <Badge variant="neutral" className="uppercase">Bronze</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Sponsors' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sponsorship & External Partners</h1>
          <p className="text-sm text-slate-500">
            Track corporate sponsors, pledged contributions, and deliverables for {club.name}.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <PlusCircle size={16} className="mr-2" />
          Add New Sponsor
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sponsorship Pledged</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">${totalRaised.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <HandCoins size={22} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Disbursed / Received</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">${totalReceived.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign size={22} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Corporate Partners</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{clubSponsors.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Award size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Sponsors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clubSponsors.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-200/80 rounded-2xl">
            <HandCoins size={36} className="mx-auto mb-2 opacity-50 text-slate-300" />
            <p className="font-semibold text-slate-700">No sponsors added yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add New Sponsor" to record a funding partner.</p>
          </div>
        ) : (
          clubSponsors.map((s) => (
            <Card key={s.sponsorId} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={s.logoUrl}
                      alt={s.name}
                      className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1 border border-slate-100 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{s.name}</h3>
                      <div className="mt-1">{getTierBadge(s.tier)}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(s.sponsorId)}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove Sponsor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{s.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{s.contactEmail}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-2">
                <div>
                  <span className="text-xs text-slate-400 block">Sponsorship</span>
                  <span className="text-lg font-bold text-slate-900">${s.amount.toLocaleString()}</span>
                </div>
                <Badge variant={s.paymentStatus === 'received' ? 'success' : 'warning'} className="capitalize">
                  {s.paymentStatus}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Sponsor Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Club Sponsor">
        <form onSubmit={handleAddSponsor} className="space-y-4 pt-2">
          <Input
            label="Company / Sponsor Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Acme Tech Innovations"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Sponsorship Tier
              </label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as SponsorTier })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="title">Title Sponsor</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
              </select>
            </div>

            <Input
              label="Amount Sponsored ($ USD)"
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. Sarah Jenkins"
              required
            />

            <Input
              label="Contact Email"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              placeholder="s.jenkins@company.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Logo URL"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://..."
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Payment Status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'pledged' | 'received' })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="received">Received / Deposited</option>
                <option value="pledged">Pledged (Pending Payment)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Sponsor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
