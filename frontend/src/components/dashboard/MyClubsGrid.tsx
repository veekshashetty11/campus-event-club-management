import { Link } from 'react-router-dom';
import type { ClubMembership } from '../../types/club';
import Badge from '../common/Badge';
import Card from '../common/Card';
import { Users, ArrowRight } from 'lucide-react';

function roleBadge(role: ClubMembership['memberRole']): string {
  switch (role) {
    case 'president': return 'President';
    case 'co_president': return 'Co-President';
    case 'officer': return 'Officer';
    case 'faculty_advisor': return 'Faculty Advisor';
    default: return 'Member';
  }
}

interface MyClubsGridProps {
  clubs: ClubMembership[];
}

export default function MyClubsGrid({ clubs }: MyClubsGridProps) {
  if (clubs.length === 0) {
    return (
      <Card className="text-center py-8 text-slate-400 text-sm">
        You are not a member of any clubs yet.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {clubs.map((club) => (
        <div
          key={club.membershipId}
          className="bg-[#111C32] rounded-xl border border-[#263650] shadow-md px-4 py-3.5 flex items-center gap-3 hover:border-[#3B82F6]/50 transition-all duration-150"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-700/50 flex items-center justify-center shrink-0">
            <span className="text-sm font-black text-indigo-300">
              {club.clubName.charAt(0)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{club.clubName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-400">{club.clubCategory}</span>
              <Badge variant="primary" size="sm">{roleBadge(club.memberRole)}</Badge>
            </div>
          </div>

          {/* Member count */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Users size={13} className="text-slate-500" />
            <span className="font-semibold text-slate-300">{club.memberCount}</span>
          </div>

          {/* Action */}
          <Link
            to="/student/clubs"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#17243B] transition-colors shrink-0"
            title="View Club details"
          >
            <ArrowRight size={14} />
          </Link>
        </div>
      ))}
    </div>
  );
}
