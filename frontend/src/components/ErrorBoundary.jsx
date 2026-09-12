import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.handleReset);
      }
      return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg p-6 rounded-2xl glass-panel border border-rose-500/40 bg-slate-950 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                {this.props.title || 'Dossier Rendering Guard'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {this.state.error?.message || 'An unexpected rendering error occurred while mounting this forensic view.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 flex items-center gap-1.5 transition-all shadow-glow-cyan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Loading</span>
              </button>
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  Close Window
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
