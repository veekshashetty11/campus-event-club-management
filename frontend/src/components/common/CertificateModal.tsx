import type { Certificate } from '../../types/registration';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Award, Download, Printer, ShieldCheck, GraduationCap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: Certificate | null;
}

export default function CertificateModal({ isOpen, onClose, certificate }: CertificateModalProps) {
  const { user } = useAuth();

  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate clean prototype certificate text/html download
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${certificate.eventTitle}</title>
        <style>
          body { font-family: 'Times New Roman', serif; text-align: center; padding: 40px; background: #fff; }
          .border { border: 8px double #1b3b57; padding: 40px; margin: auto; max-width: 800px; }
          h1 { color: #1b3b57; font-size: 32px; letter-spacing: 2px; }
          h2 { font-size: 24px; color: #333; margin-top: 20px; }
          .name { font-size: 28px; font-weight: bold; color: #0d9488; text-decoration: underline; margin: 20px 0; }
          .desc { font-size: 16px; color: #555; line-height: 1.6; }
          .hash { font-family: monospace; font-size: 11px; color: #888; margin-top: 30px; }
          .footer { margin-top: 40px; font-size: 13px; color: #777; }
        </style>
      </head>
      <body>
        <div class="border">
          <h1>CAMPUS EVENT & CLUB MANAGEMENT</h1>
          <h3>OFFICIAL CERTIFICATE OF ${certificate.certificateType.toUpperCase()}</h3>
          <p class="desc">This certifies that</p>
          <div class="name">${user?.fullName || 'Samara Jenkins'}</div>
          <p class="desc">has successfully participated in and completed all academic requirements for</p>
          <h2>${certificate.eventTitle}</h2>
          <p class="desc">Organized by <strong>${certificate.clubName}</strong> on ${certificate.issueDateFormatted || 'October 2026'}.</p>
          <div class="hash">Verification Hash: ${certificate.verificationHash || 'VERIFIED-ACADEMIC-HASH'}</div>
          <div class="footer">Certificate ID: ${certificate.certificateId} · Prototype Certificate (Academic DBMS Project)</div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${certificate.certificateId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Certificate Verification & Preview" size="xl">
      <div className="flex flex-col gap-4">
        {/* Certificate Canvas */}
        <div className="bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30 border-8 border-double border-brand-900 rounded-xl p-6 sm:p-10 shadow-md text-center relative overflow-hidden">
          {/* Watermark Crest */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <GraduationCap size={320} />
          </div>

          {/* Institutional Header */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-900 text-amber-400 flex items-center justify-center shadow-md mb-2">
              <Award size={26} />
            </div>
            <h4 className="text-xs tracking-[0.25em] font-bold text-slate-500 uppercase">
              Campus Event & Club Management System
            </h4>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-brand-900 tracking-wide mt-1">
              Certificate of {certificate.certificateType.charAt(0).toUpperCase() + certificate.certificateType.slice(1)}
            </h2>
          </div>

          <p className="text-xs text-slate-500 italic mt-3">This credential is proudly awarded to</p>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 my-2 tracking-wide text-brand-800">
            {certificate.studentName ?? user?.fullName ?? 'Samara Jenkins'}
          </h3>
          <p className="text-xs font-mono text-slate-500 mb-3">
            Student ID: {certificate.studentId ?? user?.studentId ?? 'STU-2026-8841'}
          </p>

          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            for meritorious engagement and successful completion of all programmatic requirements for
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-800 my-2">
            "{certificate.eventTitle}"
          </p>
          <p className="text-xs text-slate-500">
            Organized by <strong>{certificate.clubName}</strong> · Awarded on{' '}
            {certificate.issueDateFormatted ?? 'October 2026'}
          </p>

          {/* Verification Hash Badge */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 font-mono gap-2">
            <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <ShieldCheck size={13} />
              <span className="font-sans font-semibold">Cryptographically Verified</span>
            </div>
            <div className="truncate max-w-xs">
              ID: {certificate.certificateId}
            </div>
          </div>
        </div>

        {/* Prototype notice */}
        <p className="text-xs text-center text-slate-400 italic">
          Note: This is a verified prototype certificate generated from academic mock data.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" leftIcon={<Printer size={15} />} onClick={handlePrint}>
            Print Certificate
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Download size={15} />} onClick={handleDownload}>
            Download Certificate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
