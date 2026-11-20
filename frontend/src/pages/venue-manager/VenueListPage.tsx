import React, { useState } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  MapPin,
  PlusCircle,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit,
  Power,
} from 'lucide-react';
import type { Venue } from '../../types/event';

export default function VenueListPage() {
  const { venues, addVenue, updateVenue, toggleVenueActive } = useManagement();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: 1,
    capacity: 100,
    amenities: 'Projector, Sound System, Wi-Fi',
    hourlyRate: 0,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
  });

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.building.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingVenue(null);
    setFormData({
      name: '',
      building: '',
      floor: 1,
      capacity: 100,
      amenities: 'Projector, Sound System, Wi-Fi',
      hourlyRate: 0,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Venue) => {
    setEditingVenue(v);
    setFormData({
      name: v.name,
      building: v.building,
      floor: Number(v.floor) || 1,
      capacity: v.capacity,
      amenities: v.amenities.join(', '),
      hourlyRate: v.hourlyRate || 0,
      status: v.status || (v.isActive ? 'active' : 'maintenance'),
    });
    setIsModalOpen(true);
  };

  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const amenitiesList = formData.amenities
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingVenue) {
        const res = await updateVenue(editingVenue.venueId, {
          name: formData.name,
          building: formData.building,
          floor: Number(formData.floor),
          capacity: Number(formData.capacity),
          amenities: amenitiesList,
          hourlyRate: Number(formData.hourlyRate),
          status: formData.status,
        });
        setMessage({ text: res.message, isError: !res.success });
      } else {
        const res = await addVenue({
          name: formData.name,
          building: formData.building,
          floor: Number(formData.floor),
          capacity: Number(formData.capacity),
          amenities: amenitiesList,
          hourlyRate: Number(formData.hourlyRate),
          status: formData.status,
        });
        setMessage({ text: res.message, isError: !res.success });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Operation failed',
        isError: true,
      });
    }
  };

  const handleToggle = async (venueId: number) => {
    try {
      const res = await toggleVenueActive(venueId);
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Toggle failed',
        isError: true,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Campus Venues' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Campus Facility Directory</h1>
          <p className="text-sm text-slate-400">
            Configure room seating capacities, technical amenities, and active booking availability.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <PlusCircle size={16} className="mr-2" />
          Add New Venue
        </Button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !message.isError
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
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

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVenues.map((v) => (
          <Card key={v.venueId} className="p-5 flex flex-col justify-between border border-[#263650] hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-100 text-base">{v.name}</h3>
                <Badge variant={v.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                  {v.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-3">
                <MapPin size={14} className="text-teal-600 shrink-0" />
                <span>{v.building}, Floor {v.floor}</span>
              </p>

              <div className="p-3 rounded-xl bg-[#17243B] border border-[#263650] mb-3 flex justify-between text-xs">
                <span className="text-slate-400">Maximum Capacity:</span>
                <span className="font-bold text-slate-100">{v.capacity} seats</span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Equipped Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {v.amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-[#17243B] text-slate-300 text-[11px] font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#263650]/60 flex items-center justify-between">
              <button
                onClick={() => handleToggle(v.venueId)}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  v.status === 'active'
                    ? 'text-rose-600 hover:bg-rose-500/10'
                    : 'text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <Power size={13} />
                <span>{v.status === 'active' ? 'Set Maintenance' : 'Set Active'}</span>
              </button>

              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(v)}>
                <Edit size={13} className="mr-1" />
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVenue ? 'Edit Campus Facility' : 'Register New Campus Venue'}
      >
        <form onSubmit={handleSaveVenue} className="space-y-4 pt-2">
          <Input
            label="Venue Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Science Auditorium"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Building"
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              placeholder="e.g. Academic Block B"
              required
            />
            <Input
              label="Floor Number"
              type="number"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Seating Capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              required
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Facility Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-sm rounded-xl border border-[#263650] p-2.5 bg-[#17243B] text-slate-100"
              >
                <option value="active">Active (Available)</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Amenities (Comma-separated)
            </label>
            <textarea
              rows={2}
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
              placeholder="Projector, PA System, Wi-Fi, Stage Lighting"
              className="w-full text-sm rounded-xl border border-[#263650] p-2.5 text-slate-100 bg-[#17243B]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#263650]/60">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingVenue ? 'Update Venue' : 'Create Venue'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
