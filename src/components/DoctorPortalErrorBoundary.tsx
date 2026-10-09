import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// @ts-ignore
export class DoctorPortalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // @ts-ignore
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DoctorPortal ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    // @ts-ignore
    if (this.state?.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F4EE] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[#032F31]">Demo Profile Load Error</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unable to render this doctor's profile due to a runtime data mismatch:
              </p>
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-mono p-3 rounded-xl text-left overflow-x-auto max-h-32">
                {/* @ts-ignore */}
                {this.state?.error?.message || 'Unknown render error'}
              </div>
            </div>
            <button
              onClick={() => {
                // @ts-ignore
                this.setState({ hasError: false, error: null });
                // @ts-ignore
                if (this.props?.onReset) this.props.onReset();
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Demo Doctors List
            </button>
          </div>
        </div>
      );
    }
    // @ts-ignore
    return this.props?.children;
  }
}
