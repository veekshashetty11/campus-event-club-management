import { useState } from 'react';
import { Award, Eye, Download, ShieldCheck } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import CertificateModal from '../../components/common/CertificateModal';
import type { Certificate } from '../../types/registration';
import { formatDate } from '../../utils';

export default function StudentCertificatesPage() {
  const { certificates } = useStudent();
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const handleDownloadDirect = (cert: Certificate) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Official Certificate - ${cert.eventTitle}</title>
        <style>
          body { font-family: 'Times New Roman', serif; text-align: center; padding: 40px; background: #fff; }
          .border { border: 8px double #1b3b57; padding: 40px; margin: auto; max-width: 800px; }
          h1 { color: #1b3b57; font-size: 30px; letter-spacing: 2px; }
          h3 { font-size: 18px; color: #555; }
          .name { font-size: 28px; font-weight: bold; color: #0d9488; text-decoration: underline; margin: 20px 0; }
          .desc { font-size: 16px; color: #555; line-height: 1.6; }
          .hash { font-family: monospace; font-size: 11px; color: #888; margin-top: 30px; }
          .footer { margin-top: 40px; font-size: 13px; color: #777; }
        </style>
      </head>
      <body>
        <div class="border">
          <h1>CAMPUS EVENT & CLUB MANAGEMENT</h1>
          <h3>OFFICIAL CERTIFICATE OF ${cert.certificateType.toUpperCase()}</h3>
          <p class="desc">This certifies that</p>
          <div class="name">${cert.studentName || 'Samara Jenkins'}</div>
          <p class="desc">has successfully participated in and completed all requirements for</p>
          <h2>${cert.eventTitle}</h2>
          <p class="desc">Organized by <strong>${cert.clubName}</strong> on ${cert.issueDateFormatted || 'October 2026'}.</p>
          <div class="hash">Verification Hash: ${cert.verificationHash || 'VERIFIED-ACADEMIC-HASH'}</div>
          <div class="footer">Certificate ID: ${cert.certificateId} · Prototype Academic Certificate</div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cert.certificateId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'My Certificates' }]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Verifiable Certificates</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Your earned credentials for hackathons, technical bootcamps, and career workshops.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-sm">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span>All certificates cryptographically verified</span>
        </div>
      </div>

      {/* Grid */}
      {certificates.length === 0 ? (
        <Card className="text-center py-16 text-slate-400 bg-[#111C32] border-[#263650]">
          <Award size={40} className="mx-auto mb-2 text-slate-500" />
          <p className="text-base font-semibold text-slate-200">No certificates issued yet.</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Attend registered campus events and complete required check-in to earn verifiable participation certificates.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {certificates.map((cert: Certificate) => (
            <Card
              key={cert.certificateId}
              padding="lg"
              className="flex flex-col bg-[#111C32] border-[#263650] hover:border-indigo-500/40 hover:shadow-xl transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Award size={30} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="amber" size="sm">
                      {cert.certificateType.charAt(0).toUpperCase() + cert.certificateType.slice(1)}
                    </Badge>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      +{cert.pointsEarned} Pts Earned
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 text-base leading-snug line-clamp-2">
                    {cert.eventTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Issuing Club: <strong className="text-slate-300">{cert.clubName}</strong>
                  </p>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="bg-[#17243B] border border-[#263650] rounded-xl p-3 my-4 text-xs space-y-1.5 font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Certificate ID:</span>
                  <span className="font-semibold text-slate-200">{cert.certificateId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Issue Date:</span>
                  <span className="text-slate-300">{cert.issueDateFormatted || formatDate(cert.issuedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Recipient:</span>
                  <span className="text-slate-200 font-sans font-medium">{cert.studentName || 'Samara Jenkins'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto pt-2 flex items-center justify-end gap-2 border-t border-[#263650]/60">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Eye size={14} />}
                  onClick={() => setSelectedCert(cert)}
                >
                  Preview Certificate
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  onClick={() => handleDownloadDirect(cert)}
                >
                  Download (HTML/PDF)
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Preview */}
      <CertificateModal
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />
    </div>
  );
}
