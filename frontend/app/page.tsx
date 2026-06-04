import Link from 'next/link';
import { ArrowRight, BarChart3, Lock, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-slate-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Glassboard</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto py-20">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
          Enterprise Workflow & <br className="hidden sm:block" />
          <span className="text-blue-600">Dependency Tracker</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-3xl">
          Stop cascading delays. Map tasks as a Directed Acyclic Graph (DAG) and enforce strict, cryptographically verifiable handoffs between teams.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-20">
          <Link href="/register" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center">
            Create Workspace <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto bg-white text-slate-900 border border-slate-200 px-8 py-3 rounded-lg text-lg font-medium hover:bg-slate-50 transition-colors">
            Sign in
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Digital Handshake</h3>
            <p className="text-slate-500">Strict state machine protocols for inter-team handoffs. No more finger-pointing.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">DAG Engine</h3>
            <p className="text-slate-500">Visualize complex dependencies and calculate the critical path instantly.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4 text-amber-600">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Immutable Audit Logs</h3>
            <p className="text-slate-500">Every state transition is securely recorded. Know exactly who approved what, and when.</p>
          </div>
        </div>
      </main>
    </div>
  );
}