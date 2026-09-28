import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  FileText, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Appointment } from '../../types';

interface DoctorVideoRoomModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onCompleteAndPrescribe: (appointmentId: string) => void;
}

export const DoctorVideoRoomModal: React.FC<DoctorVideoRoomModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onCompleteAndPrescribe
}) => {
  if (!isOpen || !appointment) return null;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(84); // simulated active call
  const [activeNotes, setActiveNotes] = useState(appointment.consultationNotes || '');
  const [isSavedNotes, setIsSavedNotes] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
        {/* Top Video Header */}
        <div className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <div className="text-white text-xs font-bold flex items-center gap-2">
                Telehealth HD Room • {appointment.patientName}
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  AES-256 Encrypted
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {appointment.patientAge} Years, {appointment.patientGender} • Phone: {appointment.patientPhone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-mono font-bold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Area + Notes Split */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Main Video Screen */}
          <div className="lg:col-span-8 bg-slate-900 relative p-4 flex flex-col items-center justify-center">
            {/* Patient simulated feed */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1000"
                alt="Patient Video Feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none"></div>

              {/* Patient Name Badge */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/10">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>{appointment.patientName} (Remote)</span>
              </div>

              {/* Doctor PiP (Picture in Picture) */}
              <div className="absolute top-4 right-4 w-36 sm:w-44 aspect-[4/3] rounded-xl overflow-hidden border-2 border-teal-500 shadow-xl bg-slate-900">
                {!isVideoOff ? (
                  <img
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400"
                    alt="Dr. Rohan Gupta Feed"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs font-semibold">
                    <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                    Camera Muted
                  </div>
                )}
                <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                  You (Dr. Rohan Gupta)
                </div>
              </div>
            </div>

            {/* In-Call Controls Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl z-20">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-full transition-all cursor-pointer ${
                  isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-3 rounded-full transition-all cursor-pointer ${
                  isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <div className="w-px h-6 bg-slate-700 mx-1"></div>

              <button
                type="button"
                onClick={() => onCompleteAndPrescribe(appointment.id)}
                className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold tracking-wide flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> End & Prescribe
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
                title="Disconnect Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Clinical Sidebar */}
          <div className="lg:col-span-4 bg-slate-950 border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Patient Consultation Info
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Chief Complaint / Symptoms</span>
                    <span className="font-semibold text-slate-200">{appointment.visitReason}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Consultation Fee</span>
                    <span className="font-bold text-emerald-400">₹{appointment.totalINR} Paid</span>
                  </div>
                </div>
              </div>

              {/* Real-time Consultation Clinical Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Doctor's Live Clinical Notes
                </label>
                <textarea
                  rows={8}
                  value={activeNotes}
                  onChange={(e) => {
                    setActiveNotes(e.target.value);
                    setIsSavedNotes(false);
                  }}
                  placeholder="Record patient history, vitals, observed symptoms, differential diagnosis, and instructions here during the call..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-500 leading-relaxed font-sans"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      appointment.consultationNotes = activeNotes;
                      setIsSavedNotes(true);
                      setTimeout(() => setIsSavedNotes(false), 2000);
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                  >
                    {isSavedNotes ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : null}
                    {isSavedNotes ? 'Notes Saved' : 'Save Notes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick action to issue prescription */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => onCompleteAndPrescribe(appointment.id)}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <FileText className="w-4 h-4 text-[#FAE58D]" /> Complete & Open Prescription
              </button>
              <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Compliant with Telemedicine Practice Guidelines (NMC 2020)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
