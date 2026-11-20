import React, { useState } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  Boxes,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit,
  Tag,
} from 'lucide-react';
import type { Equipment } from '../../types/event';

export default function EquipmentPage() {
  const { equipment, addEquipment, updateEquipment } = useManagement();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Audio',
    quantityTotal: 10,
    condition: 'good' as 'excellent' | 'good' | 'fair',
    location: 'Central AV Depot',
  });

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const filteredEquipment = equipment.filter((eq) =>
    eq.name.toLowerCase().includes(search.toLowerCase()) ||
    eq.category.toLowerCase().includes(search.toLowerCase()) ||
    (eq.location && eq.location.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Audio',
      quantityTotal: 10,
      condition: 'good',
      location: 'Central AV Depot',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantityTotal: item.quantityTotal,
      condition: (item.condition === 'poor' || item.condition === 'retired' ? 'fair' : item.condition) as 'excellent' | 'good' | 'fair',
      location: item.location || 'Central AV Depot',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (editingItem) {
        const res = await updateEquipment(editingItem.equipmentId, {
          name: formData.name,
          category: formData.category,
          quantityTotal: Number(formData.quantityTotal),
          condition: formData.condition,
          location: formData.location,
        });
        setMessage({ text: res.message, isError: !res.success });
      } else {
        const res = await addEquipment({
          name: formData.name,
          category: formData.category,
          quantityTotal: Number(formData.quantityTotal),
          quantityAvailable: Number(formData.quantityTotal),
          condition: formData.condition,
          location: formData.location,
        });
        setMessage({ text: res.message, isError: !res.success });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Save failed',
        isError: true,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Equipment Inventory' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audio-Visual & Event Equipment</h1>
          <p className="text-sm text-slate-500">
            Track hardware assets, loan allocations, and depot inventory levels.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <PlusCircle size={16} className="mr-2" />
          Add Equipment Item
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

      {/* Equipment Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search equipment, depot location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">{equipment.length} items logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Equipment Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Available / Total</th>
                <th className="py-3.5 px-4">Condition</th>
                <th className="py-3.5 px-4">Depot Location</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquipment.map((eq) => (
                <tr key={eq.equipmentId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{eq.name}</td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-600">{eq.category}</td>
                  <td className="py-3.5 px-4 text-xs">
                    <span className="font-bold text-teal-800">{eq.quantityAvailable}</span>
                    <span className="text-slate-400"> / {eq.quantityTotal} units</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={eq.condition === 'excellent' ? 'success' : eq.condition === 'good' ? 'info' : 'warning'}
                      className="capitalize text-[11px]"
                    >
                      {eq.condition}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{eq.location}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleOpenEdit(eq)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition-colors"
                      title="Edit Item"
                    >
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Equipment Item' : 'Add New Equipment'}
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <Input
            label="Equipment Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Wireless Handheld Microphone"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800"
              >
                <option value="Audio">Audio</option>
                <option value="Visual">Visual</option>
                <option value="Lighting">Lighting</option>
                <option value="Staging">Staging</option>
                <option value="Seating">Seating</option>
              </select>
            </div>

            <Input
              label="Total Units Quantity"
              type="number"
              min="1"
              value={formData.quantityTotal}
              onChange={(e) => setFormData({ ...formData, quantityTotal: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>

            <Input
              label="Depot Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Storage Room 104"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingItem ? 'Save Updates' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
