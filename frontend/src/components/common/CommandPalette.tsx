import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  ClipboardList,
  Users,
  Award,
  Bell,
  UserCircle,
  Building2,
  PlusCircle,
  CheckSquare,
  Receipt,
  HandCoins,
  BarChart3,
  FileCheck2,
  ShieldAlert,
  Settings,
  MapPin,
  BookOpen,
  CalendarRange,
  Boxes,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(() => {
    if (!user) return [];

    const role = user.role;
    const items: CommandItem[] = [];

    // STUDENT
    if (role === 'student') {
      items.push(
        { id: 'stu-dash', title: 'Student Dashboard', description: 'Overview of events, clubs, and stats', path: '/student/dashboard', icon: <Sparkles size={16} className="text-indigo-400" />, category: 'Navigation' },
        { id: 'stu-events', title: 'Browse Campus Events', description: 'Explore workshops, hackathons, and cultural meets', path: '/student/events', icon: <Calendar size={16} className="text-blue-400" />, category: 'Events' },
        { id: 'stu-reg', title: 'My Registrations & Passes', description: 'View active registrations and tickets', path: '/student/registrations', icon: <ClipboardList size={16} className="text-cyan-400" />, category: 'Events' },
        { id: 'stu-clubs', title: 'Campus Clubs & Societies', description: 'Discover clubs and membership status', path: '/student/clubs', icon: <Users size={16} className="text-emerald-400" />, category: 'Clubs' },
        { id: 'stu-cert', title: 'Official Certificates', description: 'Download cryptographically issued credentials', path: '/student/certificates', icon: <Award size={16} className="text-amber-400" />, category: 'Academic' },
        { id: 'stu-notif', title: 'Notification Alerts', description: 'View real-time campus notifications', path: '/student/notifications', icon: <Bell size={16} className="text-rose-400" />, category: 'System' },
        { id: 'stu-profile', title: 'Student Profile', description: 'Academic details, roll number, and department', path: '/student/profile', icon: <UserCircle size={16} className="text-slate-400" />, category: 'Account' },
      );
    }

    // COORDINATOR
    if (role === 'event_coordinator' || role === 'club_president') {
      items.push(
        { id: 'coord-dash', title: 'Coordinator Dashboard', description: 'Club metrics, upcoming events, and quick tasks', path: '/coordinator/dashboard', icon: <Sparkles size={16} className="text-indigo-400" />, category: 'Navigation' },
        { id: 'coord-club', title: 'Club Management', description: 'Club profile, advisor details, and settings', path: '/coordinator/club', icon: <Building2 size={16} className="text-blue-400" />, category: 'Club' },
        { id: 'coord-members', title: 'Member Roster', description: 'Approve, reject, or assign member roles', path: '/coordinator/members', icon: <Users size={16} className="text-emerald-400" />, category: 'Club' },
        { id: 'coord-events', title: 'Organized Events', description: 'Manage and track event proposals and statuses', path: '/coordinator/events', icon: <Calendar size={16} className="text-blue-400" />, category: 'Events' },
        { id: 'coord-create', title: 'Create New Event Proposal', description: 'Draft and submit multi-level approval requests', path: '/coordinator/events/create', icon: <PlusCircle size={16} className="text-indigo-400" />, category: 'Events' },
        { id: 'coord-reg', title: 'Event Registrations & CSV', description: 'Inspect attendee lists and export data', path: '/coordinator/registrations', icon: <ClipboardList size={16} className="text-cyan-400" />, category: 'Attendees' },
        { id: 'coord-att', title: 'Attendance Check-in', description: 'Mark attendees present, late, or absent', path: '/coordinator/attendance', icon: <CheckSquare size={16} className="text-emerald-400" />, category: 'Attendees' },
        { id: 'coord-budget', title: 'Budget & Expense Ledger', description: 'Track club finances, allocations, and receipts', path: '/coordinator/budget', icon: <Receipt size={16} className="text-amber-400" />, category: 'Finance' },
        { id: 'coord-sponsors', title: 'Sponsorship Partners', description: 'Manage corporate funding and brand tiers', path: '/coordinator/sponsors', icon: <HandCoins size={16} className="text-yellow-400" />, category: 'Finance' },
        { id: 'coord-reports', title: 'Analytics & Performance', description: 'Participation charts and budget utilization', path: '/coordinator/reports', icon: <BarChart3 size={16} className="text-rose-400" />, category: 'Reports' },
      );
    }

    // ADVISOR
    if (role === 'club_advisor') {
      items.push(
        { id: 'adv-dash', title: 'Faculty Advisor Dashboard', description: 'Pending reviews and advised student chapters', path: '/advisor/dashboard', icon: <Sparkles size={16} className="text-indigo-400" />, category: 'Navigation' },
        { id: 'adv-appr', title: 'Level 1 Event Approvals', description: 'Review, approve, or request changes on proposals', path: '/advisor/approvals', icon: <FileCheck2 size={16} className="text-amber-400" />, category: 'Approvals' },
        { id: 'adv-clubs', title: 'Assigned Clubs', description: 'Active rosters and advised faculty bodies', path: '/advisor/clubs', icon: <Users size={16} className="text-emerald-400" />, category: 'Clubs' },
        { id: 'adv-reports', title: 'Advisor Reports & Analytics', description: 'Club engagement and capacity metrics', path: '/advisor/reports', icon: <BarChart3 size={16} className="text-cyan-400" />, category: 'Reports' },
      );
    }

    // ADMIN / STUDENT AFFAIRS
    if (role === 'student_affairs' || role === 'administrator') {
      items.push(
        { id: 'adm-dash', title: 'University Admin Dashboard', description: 'Campus-wide metrics, events, and audit logs', path: '/admin/dashboard', icon: <Sparkles size={16} className="text-indigo-400" />, category: 'Navigation' },
        { id: 'adm-appr', title: 'Multi-Level Approval Queue', description: 'Dean Review (L2) and Final Admin (L3) sign-offs', path: '/admin/approvals', icon: <FileCheck2 size={16} className="text-amber-400" />, category: 'Approvals' },
        { id: 'adm-events', title: 'University Event Directory', description: 'All departmental and campus events', path: '/admin/events', icon: <Calendar size={16} className="text-blue-400" />, category: 'Events' },
        { id: 'adm-clubs', title: 'All Campus Organizations', description: 'Full registry of student clubs and chapters', path: '/admin/clubs', icon: <Building2 size={16} className="text-indigo-400" />, category: 'Clubs' },
        { id: 'adm-users', title: 'User Management & RBAC', description: 'Modify roles, statuses, and user accounts', path: '/admin/users', icon: <Users size={16} className="text-emerald-400" />, category: 'Admin' },
        { id: 'adm-audit', title: 'System Audit Trail', description: 'Immutable activity log of approvals and actions', path: '/admin/audit', icon: <ShieldAlert size={16} className="text-rose-400" />, category: 'Security' },
        { id: 'adm-reports', title: 'Institutional Analytics', description: 'Campus-wide attendance and participation charts', path: '/admin/reports', icon: <BarChart3 size={16} className="text-cyan-400" />, category: 'Reports' },
        { id: 'adm-settings', title: 'System Configuration', description: 'Term dates, capacities, and email triggers', path: '/admin/settings', icon: <Settings size={16} className="text-slate-400" />, category: 'System' },
      );
    }

    // VENUE MANAGER
    if (role === 'venue_manager') {
      items.push(
        { id: 'vm-dash', title: 'Facilities Dashboard', description: 'Auditoriums, booking queues, and equipment alerts', path: '/venue-manager/dashboard', icon: <Sparkles size={16} className="text-indigo-400" />, category: 'Navigation' },
        { id: 'vm-venues', title: 'Campus Venues Directory', description: 'Capacities, AV equipment, and maintenance state', path: '/venue-manager/venues', icon: <MapPin size={16} className="text-blue-400" />, category: 'Facilities' },
        { id: 'vm-bookings', title: 'Venue Booking Requests', description: 'Approve or reject reservation slots', path: '/venue-manager/bookings', icon: <BookOpen size={16} className="text-emerald-400" />, category: 'Bookings' },
        { id: 'vm-cal', title: 'Visual Facilities Calendar', description: 'Timeline grid of venue allocations', path: '/venue-manager/calendar', icon: <CalendarRange size={16} className="text-cyan-400" />, category: 'Bookings' },
        { id: 'vm-equip', title: 'Equipment Inventory', description: 'Projectors, microphones, and staging gear', path: '/venue-manager/equipment', icon: <Boxes size={16} className="text-amber-400" />, category: 'Equipment' },
        { id: 'vm-eq-book', title: 'Equipment Requests', description: 'Approve and issue gear to student clubs', path: '/venue-manager/equipment-bookings', icon: <ClipboardList size={16} className="text-indigo-400" />, category: 'Equipment' },
        { id: 'vm-reports', title: 'Facility Utilization Reports', description: 'Building occupancy and peak hours analytics', path: '/venue-manager/reports', icon: <BarChart3 size={16} className="text-rose-400" />, category: 'Reports' },
      );
    }

    return items;
  }, [user]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open
          const event = new CustomEvent('open-command-palette');
          window.dispatchEvent(event);
        }
      }

      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        navigate(filteredCommands[selectedIndex].path);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredCommands, selectedIndex, navigate]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ background: 'rgba(8, 13, 27, 0.75)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#111C32] border border-[#263650] shadow-2xl overflow-hidden animate-fade-in text-slate-100 flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#263650] gap-3 bg-[#17243B]/60">
          <Search size={18} className="text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, and sections... (Type to filter)"
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[#0D1426] text-slate-400 rounded border border-[#263650]">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Command size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold text-slate-300">No matching routes found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different keyword or category name</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    navigate(cmd.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={[
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-900/50 to-blue-900/30 border border-indigo-500/40 shadow-sm'
                      : 'hover:bg-[#17243B]/50 border border-transparent',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#17243B] border border-[#263650] flex items-center justify-center shrink-0">
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {cmd.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{cmd.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#0D1426] text-slate-400 border border-[#263650]">
                      {cmd.category}
                    </span>
                    <ArrowRight size={14} className={`transition-transform ${isSelected ? 'translate-x-0.5 text-indigo-400' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#0D1426] border-t border-[#263650] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-[#17243B] rounded text-slate-300 font-mono text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-[#17243B] rounded text-slate-300 font-mono text-[10px]">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-[#17243B] rounded text-slate-300 font-mono text-[10px]">↵</kbd> Select
            </span>
          </div>
          <span>Role: <strong className="text-indigo-400 uppercase font-bold">{user?.roleDisplayName}</strong></span>
        </div>
      </div>
    </div>
  );
}
