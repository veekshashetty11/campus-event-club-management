import { Link } from 'react-router-dom';
import type { ClubMembership } from '../../types/club';
import Badge from '../common/Badge';
import Button from '../common/Button';
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
          className="bg-white rounded-xl border border-slate-200 shadow-soft px-4 py-3.5 flex items-center gap-3 hover:border-brand-300 hover:shadow-card transition-all duration-150"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-brand-800">
              {club.clubName.charAt(0)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{club.clubName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-500">{club.clubCategory}</span>
              <Badge variant="primary" size="sm">{roleBadge(club.memberRole)}</Badge>
            </div>
          </div>

          {/* Member count */}
          <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <Users size={12} />
            {club.memberCount}
          </div>

          {/* Action */}
          <Link to="/student/clubs">
            <Button variant="ghost" size="xs" rightIcon={<ArrowRight size={12} />}>
              View
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
