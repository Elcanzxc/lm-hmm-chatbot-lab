import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  GitBranch,
  Trophy,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Sigma,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { MathFormula, PrecisionSlider } from './ui/PrecisionControls';

type PosTag = 'Feil' | 'Sifət' | 'İsim';

interface CandidateConfig {
  word: string;
  dominantState: PosTag;
  roleDescription: string;
  secondaryEmissions: Record<PosTag, number>;
}

export const Tab2HMMNextWord: React.FC = () => {
  // Transition probabilities from current hidden state S_t = İsim ("dərsi")
  const [transFeil, setTransFeil] = useState<number>(0.70);
  const [transSifet, setTransSifet] = useState<number>(0.20);
  const [transIsim, setTransIsim] = useState<number>(0.10);

  // Primary Emission probabilities P(w_{t+1} | S_{t+1})
  const [emitOxuyurFeil, setEmitOxuyurFeil] = useState<number>(0.45);
  const [emitSuretliSifet, setEmitSuretliSifet] = useState<number>(0.50);
  const [emitKitabIsim, setEmitKitabIsim] = useState<number>(0.40);

  // Calculation mode: 'viterbi' (Single dominant hidden state path A_ij * B_j(w)) vs 'forward' (Sum over all hidden states)
  const [calcMode, setCalcMode] = useState<'viterbi' | 'forward'>('viterbi');
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null);

  const transitionSum = transFeil + transSifet + transIsim;

  const handleNormalizeTransitions = () => {
    const sum = transFeil + transSifet + transIsim || 1;
    setTransFeil(Number((transFeil / sum).toFixed(2)));
    setTransSifet(Number((transSifet / sum).toFixed(2)));
    setTransIsim(
      Number((1 - Number((transFeil / sum).toFixed(2)) - Number((transSifet / sum).toFixed(2))).toFixed(2))
    );
  };

  const handleResetDefaults = () => {
    setTransFeil(0.70);
    setTransSifet(0.20);
    setTransIsim(0.10);
    setEmitOxuyurFeil(0.45);
    setEmitSuretliSifet(0.50);
    setEmitKitabIsim(0.40);
  };

  const candidates = useMemo(() => {
    const rawList: CandidateConfig[] = [
      {
        word: 'oxuyur',
        dominantState: 'Feil',
        roleDescription: 'Xəbər (SOV cümlə sonluğu — ən təbii qrammatik keçid)',
        secondaryEmissions: {
          Feil: emitOxuyurFeil,
          Sifət: 0.01,
          İsim: 0.01,
        },
      },
      {
        word: 'sürətli',
        dominantState: 'Sifət',
        roleDescription: 'Təyin / Zərf funksiyalı əlamət sözü',
        secondaryEmissions: {
          Feil: 0.02,
          Sifət: emitSuretliSifet,
          İsim: 0.02,
        },
      },
      {
        word: 'kitab',
        dominantState: 'İsim',
        roleDescription: 'Ardıcıl isim birləşməsi (Tamamlıqdan sonra isim)',
        secondaryEmissions: {
          Feil: 0.01,
          Sifət: 0.03,
          İsim: emitKitabIsim,
        },
      },
    ];

    const transMap: Record<PosTag, number> = {
      Feil: transFeil,
      Sifət: transSifet,
      İsim: transIsim,
    };

    const computed = rawList.map((item) => {
      const domTrans = transMap[item.dominantState];
      const domEmit = item.secondaryEmissions[item.dominantState];
      const viterbiScore = domTrans * domEmit;

      const forwardTerms = (['Feil', 'Sifət', 'İsim'] as PosTag[]).map((state) => ({
        state,
        a: transMap[state],
        b: item.secondaryEmissions[state],
        product: transMap[state] * item.secondaryEmissions[state],
      }));
      const forwardScore = forwardTerms.reduce((acc, t) => acc + t.product, 0);

      const finalScore = calcMode === 'viterbi' ? viterbiScore : forwardScore;

      return {
        ...item,
        domTrans,
        domEmit,
        viterbiScore,
        forwardScore,
        forwardTerms,
        finalScore,
      };
    });

    const totalScore = computed.reduce((acc, c) => acc + c.finalScore, 0) || 1;
    const sorted = [...computed]
      .map((c) => ({
        ...c,
        normalizedShare: c.finalScore / totalScore,
      }))
      .sort((a, b) => b.finalScore - a.finalScore);

    return sorted;
  }, [
    transFeil,
    transSifet,
    transIsim,
    emitOxuyurFeil,
    emitSuretliSifet,
    emitKitabIsim,
    calcMode,
  ]);

  const winner = candidates[0];

  return (
    <div className="space-y-6">
      {/* Top Concept & Formula Inspector Card */}
      <div className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/25 text-indigo-300 text-xs font-mono mb-2">
              <Sigma className="w-3.5 h-3.5" />
              <span>GİZLİ MARKOV MODELİ (HMM) // NÖVBƏTİ SÖZÜN RİYAZİ PROQNOZU</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              HMM Düsturlarına Görə Növbəti Sözün Hesablanması (<MathFormula math="w_{t+1}" />)
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Müşahidə olunan <span className="text-sky-300 font-mono">&laquo;Tələbə dərsi ...&raquo;</span> cümlə başlanğıcından sonra gələn növbəti sözün (<MathFormula math="w_{t+1}" />) gizli nitq hissəsi keçidləri (<MathFormula math="A_{ij}" />) və söz emissiya ehtimalları (<MathFormula math="B_j(w)" />) əsasında addım-addım hesablanması.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              Standart Qiymətlər (0.70 × 0.45)
            </button>
          </div>
        </div>

        {/* 3 Core Mathematical Formula Inspector Cards (KaTeX) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Transition Probability */}
          <div className="rounded-xl bg-[#080C16] border border-sky-500/25 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                1. Keçid Ehtimalı (Transition A_ij)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Gizli Qat (POS)
              </span>
            </div>
            <div className="py-2 px-3 rounded-lg bg-[#050811] border border-white/5 my-2">
              <MathFormula
                block
                math="A_{ij} = P(S_{t+1} = s_j \mid S_t = s_i)"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cari gizli vəziyyətdən (<MathFormula math="S_t = \text{İsim}" />) növbəti gizli qrammatik vəziyyətə keçid ehtimalı. Məsələn:{' '}
              <span className="text-sky-300 font-mono">
                P(Feil | İsim) = {transFeil.toFixed(2)}
              </span>
            </p>
          </div>

          {/* Card 2: Emission Probability */}
          <div className="rounded-xl bg-[#080C16] border border-indigo-500/25 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                2. Emissiya Ehtimalı (Emission B_j)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Müşahidə Qatı
              </span>
            </div>
            <div className="py-2 px-3 rounded-lg bg-[#050811] border border-white/5 my-2">
              <MathFormula
                block
                math="B_j(w) = P(W_{t+1} = w \mid S_{t+1} = s_j)"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seçilmiş gizli nitq hissəsi vəziyyətinin konkret müşahidə olunan sözü generasiya etmə ehtimalı. Məsələn:{' '}
              <span className="text-indigo-300 font-mono">
                P(&quot;oxuyur&quot; | Feil) = {emitOxuyurFeil.toFixed(2)}
              </span>
            </p>
          </div>

          {/* Card 3: Joint Next-Word Score */}
          <div className="rounded-xl bg-[#080C16] border border-emerald-500/30 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                3. Birgə Növbəti Söz Ehtimalı
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Yekun Hasil
              </span>
            </div>
            <div className="py-2 px-3 rounded-lg bg-[#050811] border border-white/5 my-2">
              <MathFormula
                block
                math="P(w_{t+1}, S_{t+1} \mid S_t) = P(S_{t+1} \mid S_t) \times P(w_{t+1} \mid S_{t+1})"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Növbəti sözün yekun reytinqi keçid və emissiya ehtimallarının hasilinə bərabərdir:{' '}
              <span className="text-emerald-300 font-mono font-bold">
                {transFeil.toFixed(2)} × {emitOxuyurFeil.toFixed(2)} = {(transFeil * emitOxuyurFeil).toFixed(3)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Sandbox: Left Sliders + Right Live Trellis & Arithmetic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Precision Sliders for Transition & Emission Probabilities */}
        <div className="lg:col-span-5 space-y-5">
          {/* Transition Probabilities Box */}
          <div className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-sky-400" />
                  Keçid Ehtimalları Matrisi (<MathFormula math="A_{ij}" />)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cari söz: <span className="text-sky-300 font-mono">&quot;dərsi&quot; (S_t = İsim)</span> → Növbəti gizli vəziyyət <MathFormula math="S_{t+1}" />
                </p>
              </div>

              <button
                onClick={handleNormalizeTransitions}
                className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all ${
                  Math.abs(transitionSum - 1) < 0.005
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
                }`}
              >
                ∑ A_ij = {transitionSum.toFixed(2)} {Math.abs(transitionSum - 1) > 0.005 && '(Normallaşdır)'}
              </button>
            </div>

            <div className="space-y-3">
              <PrecisionSlider
                label="P(S_{t+1} = Feil | S_t = İsim)"
                sublabel="İsimdən sonra Xəbər (Feil) gəlmə ehtimalı (Azərbaycan SOV sırası)"
                value={transFeil}
                min={0.05}
                max={0.95}
                step={0.01}
                onChange={setTransFeil}
                accent="sky"
                badgeText="A_{İsim→Feil}"
              />

              <PrecisionSlider
                label="P(S_{t+1} = Sifət | S_t = İsim)"
                sublabel="İsimdən sonra əlamət/təyin (Sifət) gəlmə ehtimalı"
                value={transSifet}
                min={0.05}
                max={0.95}
                step={0.01}
                onChange={setTransSifet}
                accent="indigo"
                badgeText="A_{İsim→Sifət}"
              />

              <PrecisionSlider
                label="P(S_{t+1} = İsim | S_t = İsim)"
                sublabel="İsimdən sonra başqa bir İsim gəlmə ehtimalı"
                value={transIsim}
                min={0.05}
                max={0.95}
                step={0.01}
                onChange={setTransIsim}
                accent="amber"
                badgeText="A_{İsim→İsim}"
              />
            </div>
          </div>

          {/* Emission Probabilities Box */}
          <div className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                Emissiya Ehtimalları Matrisi (<MathFormula math="B_j(w_{t+1})" />)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gizli nitq hissəsindən konkret namizəd sözün generasiya olunması ehtimalı
              </p>
            </div>

            <div className="space-y-3">
              <PrecisionSlider
                label='P("oxuyur" | S_{t+1} = Feil)'
                sublabel="Feil vəziyyətində «oxuyur» sözünün emissiya çəkisi"
                value={emitOxuyurFeil}
                min={0.05}
                max={0.95}
                step={0.01}
                onChange={setEmitOxuyurFeil}
                accent="emerald"
                badgeText='B_Feil("oxuyur")'
              />

              <PrecisionSlider
                label='P("sürətli" | S_{t+1} = Sifət)'
                sublabel="Sifət vəziyyətində «sürətli» sözünün emissiya çəkisi"
                value={emitSuretliSifet}
                min={0.05}
                max={0.95}
                step={0.01}
                onChange={setEmitSuretliSifet}
                accent="indigo"
                badgeText='B_Sifət("sürətli")'
              />

              <PrecisionSlider
                label='P("kitab" | S_{t+1} = İsim)'
                sublabel="İsim vəziyyətində «kitab» sözünün emissiya çəkisi"
                value={emitKitabIsim}
                min={0.05}
                max={0.95}
                step={0.01}
                onChange={setEmitKitabIsim}
                accent="amber"
                badgeText='B_İsim("kitab")'
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Sentence Preview, SVG HMM Trellis & Step-by-Step Arithmetic Ranking */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live Sentence Context Banner */}
          <div className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-mono text-slate-400 uppercase">
                Müşahidə Olunan Cümlə Konteksti və Proqnozlaşdırılan Növbəti Söz:
              </span>
              <div className="flex items-center gap-1 bg-[#080C16] p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => setCalcMode('viterbi')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    calcMode === 'viterbi'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Viterbi (Dominant Yol)
                </button>
                <button
                  onClick={() => setCalcMode('forward')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    calcMode === 'forward'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Forward (Tam Cəm ∑)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#070B14] border border-white/10">
              <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                <span className="text-[10px] font-mono text-slate-400">w₁ (S₁ = İsim)</span>
                <span className="text-base font-bold text-slate-200">Tələbə</span>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500" />

              <div className="px-3.5 py-2 rounded-xl bg-sky-500/15 border border-sky-400/40 flex flex-col">
                <span className="text-[10px] font-mono text-sky-300">w₂ (Cari S_t = İsim)</span>
                <span className="text-base font-bold text-white">dərsi</span>
              </div>

              <ArrowRight className="w-4 h-4 text-emerald-400 animate-pulse" />

              <motion.div
                key={winner.word}
                initial={{ scale: 0.92, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.28)] flex flex-col"
              >
                <span className="text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> w₃ (Proqnoz: {winner.dominantState})
                </span>
                <span className="text-lg font-extrabold text-emerald-200 font-mono">
                  &laquo;{winner.word}&raquo; ({(winner.finalScore * 100).toFixed(1)}%)
                </span>
              </motion.div>
            </div>
          </div>

          {/* Interactive SVG HMM State-to-Emission Trellis Diagram */}
          <div className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                HMM İkiqatlı Keçid və Emissiya Qrafı (Canlı Trellis Diaqramı)
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Qalib yol yaşıl işıqla vurğulanır
              </span>
            </div>

            <svg
              viewBox="0 0 650 230"
              className="w-full h-56 bg-[#070B14] rounded-xl border border-white/10"
            >
              {/* Layer Headers */}
              <text x="75" y="24" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                CARİ VƏZİYYƏT (S_t)
              </text>
              <text x="310" y="24" fill="#38BDF8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                NÖVBƏTİ GİZLİ VƏZİYYƏT (S_&#123;t+1&#125;)
              </text>
              <text x="555" y="24" fill="#10B981" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                MÜŞAHİDƏ OLUNAN SÖZ (w_&#123;t+1&#125;)
              </text>

              {/* Edges from S_t (75, 125) to S_{t+1} states */}
              {[
                { state: 'Feil', y: 65, prob: transFeil, word: 'oxuyur', emit: emitOxuyurFeil },
                { state: 'Sifət', y: 125, prob: transSifet, word: 'sürətli', emit: emitSuretliSifet },
                { state: 'İsim', y: 185, prob: transIsim, word: 'kitab', emit: emitKitabIsim },
              ].map((row) => {
                const isWinnerRow = winner.word === row.word;
                const strokeColor = isWinnerRow ? '#10B981' : '#38BDF8';
                const strokeOpacity = isWinnerRow ? 0.95 : 0.35;
                const strokeW = Math.max(1.5, row.prob * 6);
                const emitW = Math.max(1.5, row.emit * 6);

                return (
                  <g key={row.state}>
                    {/* Transition Edge S_t -> S_{t+1} */}
                    <line
                      x1="130"
                      y1="125"
                      x2="250"
                      y2={row.y}
                      stroke={strokeColor}
                      strokeOpacity={strokeOpacity}
                      strokeWidth={strokeW}
                    />
                    <rect
                      x="168"
                      y={(125 + row.y) / 2 - 10}
                      width="46"
                      height="18"
                      rx="4"
                      fill="#090D16"
                      stroke="rgba(255,255,255,0.15)"
                    />
                    <text
                      x="191"
                      y={(125 + row.y) / 2 + 3}
                      fill={isWinnerRow ? '#34D399' : '#E2E8F0'}
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {row.prob.toFixed(2)}
                    </text>

                    {/* Emission Edge S_{t+1} -> w_{t+1} */}
                    <line
                      x1="370"
                      y1={row.y}
                      x2="490"
                      y2={row.y}
                      stroke={isWinnerRow ? '#10B981' : '#818CF8'}
                      strokeOpacity={strokeOpacity}
                      strokeWidth={emitW}
                    />
                    <rect
                      x="407"
                      y={row.y - 10}
                      width="46"
                      height="18"
                      rx="4"
                      fill="#090D16"
                      stroke="rgba(255,255,255,0.15)"
                    />
                    <text
                      x="430"
                      y={row.y + 3}
                      fill={isWinnerRow ? '#34D399' : '#C7D2FE'}
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {row.emit.toFixed(2)}
                    </text>

                    {/* Hidden State Node S_{t+1} */}
                    <rect
                      x="250"
                      y={row.y - 20}
                      width="120"
                      height="40"
                      rx="10"
                      fill={isWinnerRow ? '#062E22' : '#0F172A'}
                      stroke={isWinnerRow ? '#10B981' : '#38BDF8'}
                      strokeWidth={isWinnerRow ? '2' : '1'}
                    />
                    <text
                      x="310"
                      y={row.y + 4}
                      fill="#F8FAFC"
                      fontSize="12"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      S = {row.state}
                    </text>

                    {/* Candidate Word Node w_{t+1} */}
                    <rect
                      x="490"
                      y={row.y - 20}
                      width="135"
                      height="40"
                      rx="10"
                      fill={isWinnerRow ? '#063729' : '#111827'}
                      stroke={isWinnerRow ? '#34D399' : '#6366F1'}
                      strokeWidth={isWinnerRow ? '2' : '1'}
                    />
                    <text
                      x="557"
                      y={row.y - 2}
                      fill={isWinnerRow ? '#6EE7B7' : '#F1F5F9'}
                      fontSize="12"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      &quot;{row.word}&quot;
                    </text>
                    <text
                      x="557"
                      y={row.y + 13}
                      fill={isWinnerRow ? '#A7F3D0' : '#94A3B8'}
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      P = {(row.prob * row.emit).toFixed(3)}
                    </text>
                  </g>
                );
              })}

              {/* Current State Node S_t = İsim ("dərsi") */}
              <rect
                x="20"
                y="100"
                width="110"
                height="50"
                rx="12"
                fill="#0C192E"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              <text
                x="75"
                y="122"
                fill="#38BDF8"
                fontSize="11"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                textAnchor="middle"
              >
                S_t = İsim
              </text>
              <text
                x="75"
                y="138"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                (&quot;dərsi&quot;)
              </text>
            </svg>
          </div>

          {/* Step-by-Step Arithmetic Ranking Cards */}
          <div className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Addım-Addım Riyazi Hesablama və Namizəd Sözlərin Reytinqi
              </h3>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Qalib: &quot;{winner.word}&quot; ({winner.finalScore.toFixed(3)})
              </span>
            </div>

            <div className="space-y-3">
              {candidates.map((cand, idx) => {
                const isWinner = idx === 0;
                return (
                  <motion.div
                    layout
                    key={cand.word}
                    onMouseEnter={() => setHoveredCandidate(cand.word)}
                    onMouseLeave={() => setHoveredCandidate(null)}
                    className={`rounded-xl p-4 border transition-all ${
                      isWinner
                        ? 'bg-emerald-500/10 border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
                        : hoveredCandidate === cand.word
                        ? 'bg-[#121D35] border-sky-400/40'
                        : 'bg-[#080C16] border-white/10'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            isWinner
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          #{idx + 1} {isWinner ? 'QALİB (WINNER)' : 'NAMİZƏD'}
                        </span>
                        <span className="text-base font-bold font-mono text-white">
                          w_&#123;t+1&#125; = &quot;{cand.word}&quot;
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                          S_&#123;t+1&#125; = {cand.dominantState}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span
                          className={`text-lg font-extrabold tabular-nums ${
                            isWinner ? 'text-emerald-300' : 'text-sky-300'
                          }`}
                        >
                          {cand.finalScore.toFixed(3)}
                        </span>
                        <span className="text-xs text-slate-400 ml-1.5 tabular-nums">
                          ({(cand.finalScore * 100).toFixed(1)}% | Nisbi pay: {(cand.normalizedShare * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Explicit Step-by-Step Arithmetic Box */}
                    <div className="p-2.5 rounded-lg bg-[#050811] border border-white/5 font-mono text-xs text-slate-200 flex flex-wrap items-center justify-between gap-2">
                      {calcMode === 'viterbi' ? (
                        <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                          <span className="text-slate-400">
                            P(&quot;{cand.word}&quot;, {cand.dominantState} | İsim) =
                          </span>
                          <span className="text-sky-300 font-semibold">
                            P({cand.dominantState} | İsim) [{cand.domTrans.toFixed(2)}]
                          </span>
                          <span className="text-slate-400">×</span>
                          <span className="text-indigo-300 font-semibold">
                            P(&quot;{cand.word}&quot; | {cand.dominantState}) [{cand.domEmit.toFixed(2)}]
                          </span>
                          <span className="text-slate-400">=</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              isWinner
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/5 text-white'
                            }`}
                          >
                            {cand.domTrans.toFixed(2)} × {cand.domEmit.toFixed(2)} = {cand.viterbiScore.toFixed(3)}
                            {isWinner ? ' → Qalib!' : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                          <span className="text-slate-400">Forward ∑ =</span>
                          {cand.forwardTerms.map((term, tIdx) => (
                            <React.Fragment key={term.state}>
                              <span>
                                ({term.a.toFixed(2)}×{term.b.toFixed(2)})
                              </span>
                              {tIdx < 2 && <span className="text-slate-500">+</span>}
                            </React.Fragment>
                          ))}
                          <span className="text-slate-400">=</span>
                          <span className="font-bold text-emerald-300">
                            {cand.forwardScore.toFixed(4)}
                          </span>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-400">{cand.roleDescription}</span>
                    </div>

                    {/* Visual Score Progress Bar */}
                    <div className="h-2 rounded-full bg-[#050811] overflow-hidden mt-2.5">
                      <motion.div
                        className={`h-full ${
                          isWinner
                            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300'
                            : 'bg-gradient-to-r from-sky-500/70 to-indigo-500/70'
                        }`}
                        animate={{ width: `${Math.min(100, cand.normalizedShare * 100)}%` }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
