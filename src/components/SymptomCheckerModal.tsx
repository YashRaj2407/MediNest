import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  UserCheck, 
  RefreshCw, 
  Star, 
  MapPin, 
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { COMMON_SYMPTOM_TAGS, analyzeSymptomsEngine, SymptomTag } from '../data/symptomsKnowledge';
import { Doctor } from '../types';

interface SymptomCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  onSelectDoctorForBooking: (doctor: Doctor) => void;
  onFilterSpecialty: (specialtyId: string) => void;
}

export const SymptomCheckerModal: React.FC<SymptomCheckerModalProps> = ({
  isOpen,
  onClose,
  doctors,
  onSelectDoctorForBooking,
  onFilterSpecialty
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(['Fever & Chills']);
  const [customText, setCustomText] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [duration, setDuration] = useState<string>('2-3 days');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof analyzeSymptomsEngine> | null>(null);

  // Find matching doctors for the suggested specialty (all matching, no slice)
  const matchingDoctors = React.useMemo(() => {
    if (!analysisResult) return [];
    const targetSpecId = analysisResult.specialtyId.toLowerCase().replace(/[^a-z]/g, '');
    const targetSpecName = analysisResult.primarySpecialty.toLowerCase();

    return doctors.filter(d => {
      const dSpecId = (d.specialtyId || '').toLowerCase().replace(/[^a-z]/g, '');
      const dSpec = (d.specialty || '').toLowerCase();
      return (
        dSpecId === targetSpecId ||
        dSpec.includes(targetSpecName) ||
        targetSpecName.includes(dSpec) ||
        (targetSpecId.includes('general') && dSpecId.includes('general')) ||
        (targetSpecId.includes('ortho') && dSpecId.includes('ortho')) ||
        (targetSpecId.includes('derma') && dSpecId.includes('derma')) ||
        (targetSpecId.includes('cardio') && dSpecId.includes('cardio'))
      );
    });
  }, [analysisResult, doctors]);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeSymptomsEngine(selectedTags, customText, severity);
      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setSelectedTags(['Fever & Chills']);
    setCustomText('');
    setSeverity('moderate');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 animate-fadeIn pt-8 sm:pt-12">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0C182B] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            AI-Powered Clinical Guide
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-medium">
            Symptom-Based Doctor Recommendation
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Select or describe what you're experiencing to receive instant specialty recommendations and verified doctors.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {!analysisResult ? (
            <>
              {/* Common Symptoms Cloud */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  1. Select Common Symptoms (Tap to add)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOM_TAGS.map((tag: SymptomTag) => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-teal-700 text-white font-semibold shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free Text Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  2. Describe in your own words (Optional)
                </label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. Woke up with severe itching, rash on both forearms and mild fever since yesterday..."
                  rows={3}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Severity & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Severity Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['mild', 'moderate', 'severe'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSeverity(lvl)}
                        className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                          severity === lvl
                            ? 'bg-[#0C182B] text-white border-[#0C182B]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Since today">Started today</option>
                    <option value="2-3 days">2 - 3 days</option>
                    <option value="1-2 weeks">1 - 2 weeks</option>
                    <option value="More than a month">Chronic (1+ month)</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || (selectedTags.length === 0 && !customText.trim())}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#0C182B] hover:bg-[#162C4E] disabled:bg-slate-300 text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                    Analyzing clinical indications...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-300" />
                    Find Recommended Doctor Specialty
                  </>
                )}
              </button>
            </>
          ) : (
            /* Results View */
            <div className="space-y-6">
              {/* Emergency Alert Banner if Emergency */}
              {analysisResult.urgency === 'emergency' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Urgent Medical Alert</h4>
                    <p className="text-xs mt-1 text-rose-800">
                      Emergency symptoms detected. Please do not wait for an online appointment. Call <strong>112</strong> or <strong>108</strong> immediately or visit your nearest hospital emergency room.
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Specialty Recommendation Card */}
              <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200/80">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                    Recommended Specialty
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    analysisResult.urgency === 'emergency'
                      ? 'bg-rose-100 text-rose-800'
                      : analysisResult.urgency === 'soon'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {analysisResult.urgency === 'emergency' ? 'Emergency Level' : analysisResult.urgency === 'soon' ? 'Consult within 24h' : 'Routine Consultation'}
                  </span>
                </div>

                <div className="text-2xl font-bold font-display text-[#0C182B] mb-2">
                  {analysisResult.primarySpecialty}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  {analysisResult.summary}
                </p>

                {analysisResult.possibleCauses.length > 0 && (
                  <div className="pt-2 border-t border-teal-200/50">
                    <span className="text-[11px] font-semibold text-teal-900 block mb-1">
                      Potential Clinical Considerations to Discuss:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.possibleCauses.map((cause, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white text-slate-700 rounded-md text-[11px] border border-teal-200/60">
                          {cause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mandatory Medical Disclaimer (Explicitly Requested) */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  <strong>Disclaimer:</strong> {analysisResult.disclaimer}
                </p>
              </div>

              {/* Matching Doctors List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#0C182B]">
                    Recommended {analysisResult.primarySpecialty}s
                  </h3>
                  <button
                    onClick={() => {
                      onFilterSpecialty(analysisResult.specialtyId);
                      onClose();
                    }}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    View all ({analysisResult.primarySpecialty}) <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {matchingDoctors.length > 0 ? (
                  <div className="space-y-3">
                    {matchingDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={doc.photo}
                            alt={doc.name}
                            className="w-12 h-12 rounded-xl object-cover object-top border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-[#0C182B]">{doc.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                Verified
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">{doc.qualifications}</div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                              <span className="flex items-center gap-1 text-amber-600 font-bold">
                                <Star className="w-3 h-3 fill-current" /> {doc.rating}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" /> {doc.city}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Fee in INR</span>
                            <span className="text-base font-bold text-[#0C182B]">₹{doc.feeINR}</span>
                          </div>
                          <button
                            onClick={() => {
                              onSelectDoctorForBooking(doc);
                              onClose();
                            }}
                            className="px-4 py-2 rounded-xl bg-[#0C182B] hover:bg-[#152B4D] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                          >
                            <Calendar className="w-3.5 h-3.5 text-teal-300" />
                            Book Slot
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                    No exact city match; explore all verified {analysisResult.primarySpecialty} specialists available for video consultation.
                  </p>
                )}
              </div>

              {/* Reset / Check Another Button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Check Different Symptoms
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
