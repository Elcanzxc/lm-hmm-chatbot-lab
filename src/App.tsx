import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Sigma,
  Bot,
  Sparkles,
  Terminal,
  BookOpen,
} from 'lucide-react';
import { AtmosphericBackground } from './components/ui/PrecisionControls';
import { Tab1LMPipeline } from './components/Tab1LMPipeline';
import { Tab2HMMNextWord } from './components/Tab2HMMNextWord';
import { Tab3InteractiveChatbot } from './components/Tab3InteractiveChatbot';

const NAV_TABS = [
  {
    id: 0,
    code: 'MOD-01',
    label: 'Dil Modellərinin Mərhələləri',
    sublabel: '6-Mərhələli LM Konveyeri',
    icon: Layers,
  },
  {
    id: 1,
    code: 'MOD-02',
    label: 'HMM Düsturları ilə Növbəti Söz',
    sublabel: 'Keçid, Emissiya & Viterbi',
    icon: Sigma,
  },
  {
    id: 2,
    code: 'MOD-03',
    label: 'İnteraktiv Chat-Bot Laboratoriyası',
    sublabel: 'BMU AI + X-Ray Telemetriya',
    icon: Bot,
  },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 relative selection:bg-sky-500/30 selection:text-sky-200">
      {/* Atmospheric Depth & Texture Layer */}
      <AtmosphericBackground activeTab={activeTab} />

      {/* Top Sticky Engineering Workbench Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#090D16]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Title & Academic Badge */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[11px] font-mono font-semibold">
                  <Sparkles className="w-3 h-3" />
                  NLP &amp; STOXASTİK DİL MODELLƏŞDİRMƏSİ LABORATORİYASI
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  AZ-CORPUS // v2.4
                </span>
              </div>

              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-white">
                Dil Modelləri (LM), HMM Riyaziyyatı və Chat-Bot Arxitekturası
              </h1>
            </div>

            {/* 3 Interactive Navigation Tabs with Framer Motion layoutId Floating Pill */}
            <nav
              aria-label="Əsas Bölmələr"
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#060911]/90 p-1.5 rounded-2xl border border-white/10 shadow-inner"
            >
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3.5 py-2.5 rounded-xl text-left transition-colors duration-200 flex items-center gap-2.5 ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mainNavFloatingPill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-emerald-500/15 border border-sky-400/50 shadow-[0_0_24px_rgba(56,189,248,0.2)]"
                        transition={{
                          type: 'spring',
                          stiffness: 360,
                          damping: 30,
                        }}
                      />
                    )}

                    <div
                      className={`relative z-10 p-2 rounded-lg border transition-colors ${
                        isActive
                          ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="relative z-10">
                      <div className="text-xs font-bold leading-tight">{tab.label}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {tab.sublabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Interactive Workbench Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 0 && <Tab1LMPipeline />}
            {activeTab === 1 && <Tab2HMMNextWord />}
            {activeTab === 2 && <Tab3InteractiveChatbot />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Academic Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#070A12]/80 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Təbii Dilin Emalı (NLP): Dil Modelləri (LM), Gizli Markov Modelləri (HMM) və İntellektual Dialoq Sistemləri
            </span>
          </div>
          <div className="text-slate-500">
            React 18 • TypeScript • Tailwind CSS • Framer Motion • KaTeX
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
