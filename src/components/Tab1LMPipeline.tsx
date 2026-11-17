import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Scissors,
  Binary,
  Cpu,
  Gauge,
  Rocket,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Filter,
  Layers,
  Activity,
  Terminal,
  Sliders,
} from 'lucide-react';
import { MathFormula, PrecisionSlider } from './ui/PrecisionControls';

interface StageInfo {
  id: number;
  code: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  latency: string;
  icon: React.FC<{ className?: string }>;
  accent: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose';
}

const PIPELINE_STAGES: StageInfo[] = [
  {
    id: 1,
    code: 'STG-01',
    title: 'Məlumatların Toplanması (Data Collection & Corpus)',
    shortTitle: '1. Korpus Toplanması',
    subtitle: 'Xam mətn mənbələri, deduplikasiya və korpus filtrasiyası',
    latency: 'Həcm: ~45 GB',
    icon: Database,
    accent: 'sky',
  },
  {
    id: 2,
    code: 'STG-02',
    title: 'Mətnin Təmizlənməsi və Tokenizasiya',
    shortTitle: '2. Tokenizasiya',
    subtitle: 'Normalizasiya, morfoloji kök-şəkilçi parçalanması (BPE / WordPiece)',
    latency: '|V| = 50,257',
    icon: Scissors,
    accent: 'indigo',
  },
  {
    id: 3,
    code: 'STG-03',
    title: 'Vektorlaşdırma (Embeddings & Kontekstual Vektorlar)',
    shortTitle: '3. Vektorlaşdırma',
    subtitle: 'One-Hot-dan sıx semantik fəzaya (Word2Vec / Transformer d=768)',
    latency: 'Ölçü: ℝ⁷⁶⁸',
    icon: Binary,
    accent: 'emerald',
  },
  {
    id: 4,
    code: 'STG-04',
    title: 'Model Arxitekturası və Təlim (Training & Loss)',
    shortTitle: '4. Arxitektura & Təlim',
    subtitle: 'N-gram, RNN/LSTM və Transformer Self-Attention + Cross-Entropy',
    latency: 'Loss: ℒ_CE',
    icon: Cpu,
    accent: 'amber',
  },
  {
    id: 5,
    code: 'STG-05',
    title: 'Qiymətləndirmə (Evaluation & Perplexity — PPL)',
    shortTitle: '5. Perpleksiya (PPL)',
    subtitle: 'Modelin qeyri-müəyyənlik dərəcəsi və proqnoz dəqiqliyi metriki',
    latency: 'PPL = exp(ℒ)',
    icon: Gauge,
    accent: 'rose',
  },
  {
    id: 6,
    code: 'STG-06',
    title: 'Tətbiq və İnterfeys (Deployment & Inference)',
    shortTitle: '6. İnferens & Sampling',
    subtitle: 'Temperatur (T) və Top-K stoxastik generasiya idarəetməsi',
    latency: 'T / Top-K',
    icon: Rocket,
    accent: 'sky',
  },
];

// Embedding dictionary for Stage 3
interface WordVectorItem {
  word: string;
  pos: string;
  tokenId: number;
  oneHotIdx: number;
  vec: number[]; // 8 latent semantic dimensions
  coords: { x: number; y: number }; // 2D projection
}

const SEMANTIC_AXES = [
  'Akademik',
  'Texnologiya',
  'Subyekt/Canlı',
  'Hərəkət/Proses',
  'Abstrakt',
  'Məkan/Qurum',
  'Riyazi',
  'Informasiya',
];

const EMBEDDING_WORDS: WordVectorItem[] = [
  {
    word: 'tələbə',
    pos: 'İsim',
    tokenId: 4821,
    oneHotIdx: 2,
    vec: [0.91, 0.34, 0.95, 0.42, -0.28, 0.68, 0.19, 0.54],
    coords: { x: 75, y: 68 },
  },
  {
    word: 'universitet',
    pos: 'İsim',
    tokenId: 5109,
    oneHotIdx: 5,
    vec: [0.96, 0.41, 0.62, 0.25, -0.12, 0.94, 0.28, 0.66],
    coords: { x: 88, y: 52 },
  },
  {
    word: 'müəllim',
    pos: 'İsim',
    tokenId: 3914,
    oneHotIdx: 1,
    vec: [0.93, 0.38, 0.92, 0.48, -0.21, 0.74, 0.31, 0.69],
    coords: { x: 64, y: 58 },
  },
  {
    word: 'alqoritm',
    pos: 'İsim',
    tokenId: 8832,
    oneHotIdx: 7,
    vec: [0.64, 0.97, -0.72, 0.58, 0.89, -0.35, 0.96, 0.88],
    coords: { x: 245, y: 74 },
  },
  {
    word: 'model',
    pos: 'İsim',
    tokenId: 7410,
    oneHotIdx: 4,
    vec: [0.71, 0.94, -0.65, 0.51, 0.84, -0.22, 0.91, 0.92],
    coords: { x: 230, y: 92 },
  },
  {
    word: 'öyrənir',
    pos: 'Feil',
    tokenId: 6205,
    oneHotIdx: 6,
    vec: [0.82, 0.52, 0.45, 0.96, 0.35, 0.18, 0.44, 0.78],
    coords: { x: 155, y: 145 },
  },
];

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// Azerbaijani lowercasing helper
function toAzLower(str: string): string {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase();
}

// Simulated BPE morphological splitter for Azerbaijani educational demonstration
function splitAzBPE(word: string): string[] {
  const clean = word.replace(/[.,!?;:"'()]/g, '');
  if (!clean) return [];
  const lower = toAzLower(clean);

  const suffixes = [
    'larımızdakılardan',
    'lərimizdəkilərdən',
    'laşdırılmışdır',
    'ləşdirilmişdir',
    'larımızdan',
    'lərimizdən',
    'modellərini',
    'tələbələri',
    'öyrənirlər',
    'sistemləri',
    'əsaslanır',
    'tərəfindən',
    'larından',
    'lərindən',
    'acaqdır',
    'əcəkdir',
    'müəllimlər',
    'universitetdə',
  ];

  if (lower === 'tələbələri') return ['tələbə', '##lər', '##i'];
  if (lower === 'tələbələr') return ['tələbə', '##lər'];
  if (lower === 'modellərini') return ['model', '##lər', '##in', '##i'];
  if (lower === 'modelləri') return ['model', '##lər', '##i'];
  if (lower === 'öyrənirlər') return ['öyrən', '##ir', '##lər'];
  if (lower === 'universitetində') return ['universitet', '##in', '##də'];
  if (lower === 'alqoritmləri') return ['alqoritm', '##lər', '##i'];
  if (lower === 'hesablanması') return ['hesab', '##lan', '##ma', '##sı'];
  if (lower === 'vektorlaşdırma') return ['vektor', '##laş', '##dır', '##ma'];

  // Generic suffix剥离 for live custom user text
  const commonEndings = ['ların', 'lərin', 'lar', 'lər', 'dan', 'dən', 'da', 'də', 'ın', 'in', 'un', 'ün', 'ır', 'ir', 'ur', 'ür'];
  for (const end of commonEndings) {
    if (lower.length > end.length + 3 && lower.endsWith(end)) {
      const stem = lower.slice(0, lower.length - end.length);
      return [stem, `##${end}`];
    }
  }
  void suffixes;
  return [clean];
}

export const Tab1LMPipeline: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(1);

  // Stage 1 State: Corpus Collection & Filtering
  const [sources, setSources] = useState({
    wiki: true,
    academic: true,
    news: true,
    social: false,
  });
  const [deduplicate, setDeduplicate] = useState<boolean>(true);

  // Stage 2 State: Preprocessing & Tokenization
  const [rawInputText, setRawInputText] = useState<string>(
    "<div class='post'>Bakı Mühəndislik Universitetində tələbələr SÜNİ İNTELLEKT və Dil Modellərini öyrənirlər! https://bmu.edu.az #NLP</div>"
  );
  const [stripHtmlUrls, setStripHtmlUrls] = useState<boolean>(true);
  const [lowercaseAz, setLowercaseAz] = useState<boolean>(true);
  const [addSpecialTokens, setAddSpecialTokens] = useState<boolean>(true);
  const [tokenMode, setTokenMode] = useState<'word' | 'bpe' | 'char'>('bpe');

  // Stage 3 State: Embeddings & Cosine Similarity
  const [selectedWordA, setSelectedWordA] = useState<string>('tələbə');
  const [selectedWordB, setSelectedWordB] = useState<string>('universitet');

  // Stage 4 State: Architecture & Training Epoch
  const [archType, setArchType] = useState<'ngram' | 'rnn' | 'transformer'>('transformer');
  const [epoch, setEpoch] = useState<number>(65);
  const [learningRate, setLearningRate] = useState<number>(0.003);

  // Stage 5 State: Perplexity (PPL) Interactive Slider
  const [perplexity, setPerplexity] = useState<number>(12.4);

  // Stage 6 State: Deployment & Inference (Temperature & Top-K)
  const [temperature, setTemperature] = useState<number>(0.65);
  const [topK, setTopK] = useState<number>(4);
  const [generatedStream, setGeneratedStream] = useState<string[]>([
    'Dil',
    'modeli',
    'mətni',
  ]);

  // --- STAGE 1 COMPUTATIONS ---
  const corpusStats = useMemo(() => {
    let rawDocs = 0;
    let rawGb = 0;
    let noiseRatio = 0;
    if (sources.wiki) {
      rawDocs += 285000;
      rawGb += 4.2;
      noiseRatio += 6;
    }
    if (sources.academic) {
      rawDocs += 140000;
      rawGb += 3.8;
      noiseRatio += 3;
    }
    if (sources.news) {
      rawDocs += 920000;
      rawGb += 11.5;
      noiseRatio += 12;
    }
    if (sources.social) {
      rawDocs += 2400000;
      rawGb += 18.0;
      noiseRatio += 38;
    }
    const activeCount = Object.values(sources).filter(Boolean).length || 1;
    const avgNoise = noiseRatio / activeCount;
    const finalGb = deduplicate ? rawGb * (1 - avgNoise / 140) : rawGb;
    const finalNoise = deduplicate ? Math.max(1.2, avgNoise * 0.18) : avgNoise;
    const totalTokensMillions = Math.round(finalGb * 145);
    return {
      rawDocs,
      finalGb: finalGb.toFixed(1),
      finalNoise: finalNoise.toFixed(1),
      totalTokensMillions,
    };
  }, [sources, deduplicate]);

  // --- STAGE 2 COMPUTATIONS ---
  const processedTokens = useMemo(() => {
    let text = rawInputText;
    if (stripHtmlUrls) {
      text = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/#\w+/g, ' ')
        .replace(/[!?.,;:"'()]/g, ' ');
    }
    if (lowercaseAz) {
      text = toAzLower(text);
    }
    const words = text
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    let tokens: string[] = [];
    if (tokenMode === 'word') {
      tokens = words;
    } else if (tokenMode === 'bpe') {
      tokens = words.flatMap((w) => splitAzBPE(w));
    } else {
      tokens = words.join('_').split('').slice(0, 28);
    }

    if (addSpecialTokens) {
      tokens = ['<BOS>', ...tokens, '<EOS>'];
    }

    return tokens.map((tok, i) => {
      const hash =
        tok === '<BOS>'
          ? 101
          : tok === '<EOS>'
          ? 102
          : Math.abs(
              tok.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 49000, 1000)
            );
      return { token: tok, id: hash, index: i };
    });
  }, [rawInputText, stripHtmlUrls, lowercaseAz, addSpecialTokens, tokenMode]);

  // --- STAGE 3 COMPUTATIONS ---
  const wordObjA = useMemo(
    () => EMBEDDING_WORDS.find((w) => w.word === selectedWordA) || EMBEDDING_WORDS[0],
    [selectedWordA]
  );
  const wordObjB = useMemo(
    () => EMBEDDING_WORDS.find((w) => w.word === selectedWordB) || EMBEDDING_WORDS[1],
    [selectedWordB]
  );
  const pairCosSim = useMemo(
    () => cosineSimilarity(wordObjA.vec, wordObjB.vec),
    [wordObjA, wordObjB]
  );

  // --- STAGE 4 COMPUTATIONS ---
  const trainingTelemetry = useMemo(() => {
    // Simulated Cross-Entropy loss curve depending on architecture, epoch, and learning rate
    const baseAsymptote =
      archType === 'transformer' ? 0.42 : archType === 'rnn' ? 0.95 : 1.65;
    const rateFactor = Math.min(1.6, Math.max(0.4, learningRate / 0.003));
    const decay = Math.exp((-epoch / 28) * rateFactor);
    const currentLoss = baseAsymptote + 3.8 * decay;
    const targetProb = Math.min(0.96, Math.exp(-currentLoss));
    const rem = 1 - targetProb;
    return {
      currentLoss,
      targetProb,
      candidates: [
        { word: 'öyrənirlər', prob: targetProb, isTarget: true },
        { word: 'oxuyurlar', prob: rem * 0.48, isTarget: false },
        { word: 'yazırlar', prob: rem * 0.27, isTarget: false },
        { word: 'kitabxana', prob: rem * 0.16, isTarget: false },
        { word: 'təsadüfi', prob: rem * 0.09, isTarget: false },
      ],
    };
  }, [archType, epoch, learningRate]);

  // --- STAGE 5 COMPUTATIONS (PERPLEXITY SLIDER) ---
  const perplexityTelemetry = useMemo(() => {
    // Lower PPL -> concentrated high confidence on correct academic continuation
    // Higher PPL -> flat, high-entropy noisy distribution
    const crossEntropyNats = Math.log(perplexity);
    const entropyBits = Math.log2(perplexity);

    // Sharpness parameter controlled inversely by Perplexity
    const sharpness = Math.max(0.12, Math.min(3.5, 18 / perplexity));
    const rawScores = [
      { word: 'modelləşdirir', role: 'Dəqiq Kontekstual Feil', logit: 3.4 },
      { word: 'təhlil_edir', role: 'Semantik Yaxın Feil', logit: 2.5 },
      { word: 'generasiya_edir', role: 'Uyğun Termin', logit: 2.0 },
      { word: 'avtomobil', role: 'Kontekstdən Kənar İsim', logit: 0.4 },
      { word: 'yağışlı', role: 'Təsadüfi Sifət (Səs-küy)', logit: -0.5 },
    ];

    const exps = rawScores.map((item) => Math.exp(item.logit * sharpness));
    const sumExp = exps.reduce((a, b) => a + b, 0);
    const distribution = rawScores.map((item, idx) => ({
      ...item,
      prob: exps[idx] / sumExp,
    }));

    let sampleOutput = '';
    let qualityLabel = '';
    let qualityColor = '';

    if (perplexity <= 15) {
      qualityLabel = 'Yüksək Dəqiqlikli Elmi Dil Modeli (Aşağı Perpleksiya)';
      qualityColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      sampleOutput =
        '«Təbii dilin emalı alqoritmləri kontekstual vektorlar vasitəsilə cümlənin semantik strukturunu yüksək dəqiqliklə modelləşdirir.»';
    } else if (perplexity <= 55) {
      qualityLabel = 'Orta Səviyyəli Statistik / RNN Modeli (Orta Perpleksiya)';
      qualityColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      sampleOutput =
        '«Təbii dilin emalı sözləri hesablayır və cümlə daxilində növbəti söz ehtimalını müəyyən qədər təhlil edir.»';
    } else {
      qualityLabel = 'Zəif / Təlimlənməmiş Model (Yüksək Perpleksiya — Xaos)';
      qualityColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      sampleOutput =
        '«Təbii dilin avtomobil yağışlı kitabxana cümlə sürətli hesablayır rəqəm...» (Yüksək entropiya və təsadüfi seçim)';
    }

    return {
      crossEntropyNats,
      entropyBits,
      distribution,
      sampleOutput,
      qualityLabel,
      qualityColor,
    };
  }, [perplexity]);

  // --- STAGE 6 COMPUTATIONS (TEMPERATURE & TOP-K) ---
  const inferenceCandidates = useMemo(() => {
    const baseLogits = [
      { word: 'analiz_edir', rawLogit: 3.2, meaning: 'Ən yüksək ehtimallı elmi davam' },
      { word: 'strukturlaşdırır', rawLogit: 2.6, meaning: 'Akademik sinonim seçim' },
      { word: 'proqnozlaşdırır', rawLogit: 2.1, meaning: 'Stoxastik alternativ' },
      { word: 'kodlaşdırır', rawLogit: 1.5, meaning: 'Texniki kontekst sözü' },
      { word: 'dəyişdirir', rawLogit: 0.7, meaning: 'Ümumi feil' },
      { word: 'buludlar', rawLogit: -0.6, meaning: 'Kontekstdən uzaq (Hallüsinasiya)' },
    ];

    // Sort by rawLogit descending (already sorted) and apply Top-K cutoff
    const scaled = baseLogits.map((item, idx) => {
      const scaledLogit = item.rawLogit / temperature;
      const inTopK = idx < topK;
      return {
        ...item,
        scaledLogit,
        inTopK,
        expVal: inTopK ? Math.exp(scaledLogit) : 0,
      };
    });

    const totalExp = scaled.reduce((acc, item) => acc + item.expVal, 0) || 1;
    return scaled.map((item) => ({
      ...item,
      prob: item.expVal / totalExp,
    }));
  }, [temperature, topK]);

  const handleSampleNextToken = () => {
    const r = Math.random();
    let cumulative = 0;
    let chosen = inferenceCandidates[0].word;
    for (const item of inferenceCandidates) {
      if (!item.inTopK) continue;
      cumulative += item.prob;
      if (r <= cumulative) {
        chosen = item.word;
        break;
      }
    }
    setGeneratedStream((prev) => [...prev.slice(-7), chosen]);
  };

  return (
    <div className="space-y-6">
      {/* Top Pipeline Overview Banner */}
      <div className="rounded-2xl bg-[#0D1424]/90 border border-white/10 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-mono mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>6-MƏRHƏLƏLİ DİL MODELİ (LM) MÜHƏNDİSLİK KONVEYERİ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              LM Hazırlanması və Dil Modellərinin Mərhələləri
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Xam Azərbaycan mətn korpusunun toplanmasından başlayaraq, morfoloji BPE tokenizasiyası,
              kontekstual vektorlaşdırma, Transformer təlimi, <span className="text-sky-300 font-mono">Perplexity (PPL)</span> qiymətləndirməsi və canlı inferensə qədər tam riyazi-texniki axın.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <span className="text-xs font-mono text-slate-400">Aktiv Mərhələ:</span>
            <span className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300 font-mono text-xs font-bold tabular-nums">
              0{activeStage} / 06 — {PIPELINE_STAGES[activeStage - 1].code}
            </span>
          </div>
        </div>

        {/* Interactive 6-Stage Horizontal/Grid Pipeline Selector */}
        <div className="relative">
          {/* Connecting SVG Line on Desktop */}
          <svg
            className="hidden xl:block absolute top-1/2 left-0 w-full h-8 -translate-y-1/2 pointer-events-none z-0"
            preserveAspectRatio="none"
          >
            <line
              x1="4%"
              y1="50%"
              x2="96%"
              y2="50%"
              stroke="rgba(148, 163, 184, 0.16)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <motion.line
              x1="4%"
              y1="50%"
              x2={`${((activeStage - 1) / 5) * 92 + 4}%`}
              y2="50%"
              stroke="#38BDF8"
              strokeWidth="2.5"
              initial={false}
              animate={{ x2: `${((activeStage - 1) / 5) * 92 + 4}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </svg>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 relative z-10">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon;
              const isSelected = activeStage === stage.id;
              const isPassed = stage.id < activeStage;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`group relative text-left rounded-xl p-3.5 transition-all duration-200 border ${
                    isSelected
                      ? 'bg-[#131F38] border-sky-400/60 shadow-[0_0_25px_rgba(56,189,248,0.18)]'
                      : isPassed
                      ? 'bg-[#0E1729]/90 border-emerald-500/30 hover:border-emerald-400/50'
                      : 'bg-[#0A101D]/90 border-white/10 hover:border-white/25'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeStageGlow"
                      className="absolute inset-0 rounded-xl ring-1 ring-sky-400/50 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none"
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400/40 text-sky-300 font-bold'
                          : isPassed
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {stage.code}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {stage.latency}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className={`p-2 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                          : isPassed
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-xs text-white leading-snug">
                      {stage.shortTitle}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {stage.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Stage Deep Interactive Engineering Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-6 shadow-2xl"
        >
          {/* STAGE 1: DATA COLLECTION & CORPUS */}
          {activeStage === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20">
                  <Database className="w-3.5 h-3.5" />
                  <span>MƏRHƏLƏ 01 // KORPUS MÜHƏNDİSLİYİ</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  1. Məlumatların Toplanması və Korpusun Təşkili
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Dil modelinin (LM) linqvistik qabiliyyəti birbaşa təlim korpusunun <strong className="text-white">kəmiyyət və keyfiyyətindən</strong> asılıdır. Azərbaycan dili üçün korpus toplanarkən elmi məqalələr, ensiklopedik mənbələr, rəsmi xəbər arxivləri və ədəbi mətnlər birləşdirilir.
                </p>

                <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-2">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    Heaps Qanunu (Lüğət Həcminin Artımı)
                  </div>
                  <MathFormula
                    block
                    math="|V(N)| = K \cdot N^{\beta}, \quad 0.4 \le \beta \le 0.6"
                  />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Burada <MathFormula math="N" /> korpusdakı ümumi söz (token) sayını, <MathFormula math="|V(N)|" /> isə unikal sözlərin sayını göstərir. İltisaqi (aqqlütinativ) dil olan Azərbaycan dilində şəkilçilər səbəbindən <MathFormula math="\beta" /> əmsalı yüksəkdir.
                  </p>
                </div>

                {/* Source Toggles */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Korpus Mənbələrini Seçin (Canlı Simulyasiya):
                  </div>
                  {[
                    {
                      key: 'wiki' as const,
                      label: 'Azərbaycan Vikipediyası və Ensiklopedik Mətnlər',
                      meta: '285K məqalə • Yüksək struktur',
                    },
                    {
                      key: 'academic' as const,
                      label: 'Elmi Jurnallar, Dissertasiyalar və Dərsliklər (BMU / AMEA)',
                      meta: '140K sənəd • Akademik üslub',
                    },
                    {
                      key: 'news' as const,
                      label: 'Rəsmi Xəbər Portalları və Publisistika',
                      meta: '920K xəbər • Müasir leksika',
                    },
                    {
                      key: 'social' as const,
                      label: 'Sosial Media və Açıq Forum Şərhləri (Yüksək Səs-küy)',
                      meta: '2.4M yazı • Qeyri-normativ / Slenq',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        sources[item.key]
                          ? 'bg-sky-500/10 border-sky-400/40 text-white'
                          : 'bg-[#090D16] border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={sources[item.key]}
                          onChange={() =>
                            setSources((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                          }
                          className="rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-900"
                        />
                        <div>
                          <div className="text-xs font-semibold">{item.label}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.meta}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {sources[item.key] ? 'AKTİV' : 'DEAKTİV'}
                      </span>
                    </label>
                  ))}

                  <button
                    onClick={() => setDeduplicate(!deduplicate)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border font-mono text-xs transition-all ${
                      deduplicate
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-400/30 text-rose-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      MinHash Deduplikasiya & Keyfiyyət Filtri
                    </span>
                    <span className="font-bold">
                      {deduplicate ? 'AKTİV (Təmiz Korpus)' : 'SÖNDÜRÜLÜB (Xam/Səs-küylü)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live Corpus Data Transformation Preview */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] text-slate-400 font-mono">Sənəd Sayı</div>
                    <div className="text-lg font-bold font-mono text-white tabular-nums mt-1">
                      {corpusStats.rawDocs.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] text-slate-400 font-mono">Təmiz Həcm</div>
                    <div className="text-lg font-bold font-mono text-sky-400 tabular-nums mt-1">
                      {corpusStats.finalGb} GB
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] text-slate-400 font-mono">Token Həcmi (N)</div>
                    <div className="text-lg font-bold font-mono text-indigo-400 tabular-nums mt-1">
                      {corpusStats.totalTokensMillions}M
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] text-slate-400 font-mono">Səs-küy Nisbəti</div>
                    <div
                      className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                        parseFloat(corpusStats.finalNoise) < 5
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {corpusStats.finalNoise}%
                    </div>
                  </div>
                </div>

                {/* Raw vs Filtered JSONL Stream Inspector */}
                <div className="rounded-xl bg-[#070B14] border border-white/10 overflow-hidden flex-1 flex flex-col">
                  <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                      <Terminal className="w-3.5 h-3.5 text-sky-400" />
                      <span>corpus_pipeline_stream.jsonl (Canlı Məlumat Transformasiyası)</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      UTF-8 // AZ-CORPUS
                    </span>
                  </div>

                  <div className="p-4 space-y-3 font-mono text-xs overflow-y-auto max-h-[340px]">
                    <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 text-slate-300">
                      <div className="text-[10px] text-rose-400 uppercase font-bold mb-1">
                        [XAM SCRAPE AXINI — TƏMİZLƏNMƏMİŞ]
                      </div>
                      <code className="text-[11px] text-slate-400 break-all">
                        {`{"url": "https://az.wikipedia.org/...", "raw": "<div id='bodyContent'><p><b>Təbii dilin emalı</b> (ing. NLP) — süni intellekt və dilçilik sahəsidir... [1][2]</p><script>ads()</script></div>"}`}
                      </code>
                    </div>

                    <div className="flex items-center justify-center text-sky-400 text-xs gap-2 py-1">
                      <ArrowRight className="w-4 h-4 rotate-90" />
                      <span>
                        {deduplicate
                          ? 'MinHash Deduplikasiya + HTML/Script Strip + Dil İdentifikasiyası (lang=az ≥ 0.98)'
                          : 'Filtrasiya Söndürülüb — Xam sətirlər birbaşa ötürülür'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/25 text-slate-200 space-y-2">
                      <div className="text-[10px] text-emerald-400 uppercase font-bold">
                        [TƏLİM ÜÇÜN HAZIR STRUKTURLAŞDIRILMIŞ KORPUS SƏNƏDİ]
                      </div>
                      {sources.academic && (
                        <div className="p-2 rounded bg-[#0B1220] border border-white/5 text-[11px]">
                          <span className="text-sky-400">{`{"doc_id": "bmu_nlp_001", "domain": "academic", `}</span>
                          <span className="text-emerald-300">
                            {`"text": "Dil modelləri söz ardıcıllığının birgə ehtimal paylanmasını P(w_1, ..., w_n) hesablayan stoxastik sistemlərdir."}`}
                          </span>
                        </div>
                      )}
                      {sources.wiki && (
                        <div className="p-2 rounded bg-[#0B1220] border border-white/5 text-[11px]">
                          <span className="text-sky-400">{`{"doc_id": "azwiki_4821", "domain": "encyclopedia", `}</span>
                          <span className="text-emerald-300">
                            {`"text": "Gizli Markov Modeli müşahidə olunan ardıcıllıqlar əsasında gizli qrammatik vəziyyətləri müəyyən edir."}`}
                          </span>
                        </div>
                      )}
                      {sources.social && !deduplicate && (
                        <div className="p-2 rounded bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-300">
                          {`{"doc_id": "soc_992", "domain": "social_raw", "text": "salammm necasiz??? 🔥🔥🔥 bmu imtahan vaxti haçandı???"}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: PREPROCESSING & TOKENIZATION */}
          {activeStage === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>MƏRHƏLƏ 02 // NORMALİZASİYA VƏ TOKENİZASİYA</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  2. Mətnin Təmizlənməsi və Morfoloji Tokenizasiya
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Azərbaycan dili <strong className="text-white">iltisaqi (aqqlütinativ)</strong> quruluşa malik olduğu üçün bir söz kökünə onlarla şəkilçi artırılaraq yeni söz formaları yaranır (məsələn: <code className="text-sky-300 font-mono">tələbə + lər + imiz + dən</code>).
                  Sadə söz-səviyyəli tokenizasiya lüğətin hədsiz şişməsinə və <strong className="text-amber-300">OOV (Out-of-Vocabulary)</strong> probleminə səbəb olur. Buna görə müasir dil modellərində <strong className="text-indigo-300">Alt-söz (Subword BPE / WordPiece)</strong> alqoritmi tətbiq edilir.
                </p>

                <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-2">
                  <div className="text-xs font-mono text-slate-400 uppercase">
                    Byte-Pair Encoding (BPE) Birləşmə Qaydası
                  </div>
                  <MathFormula
                    block
                    math="(c_i, c_j)^* = \arg\max_{(c_i, c_j)} \text{Count}(c_i, c_j)"
                  />
                  <p className="text-xs text-slate-400">
                    Ən tez-tez yanaşı gələn simvol və morfem cütləri iterativ olaraq vahid alt-söz tokenində birləşdirilir.
                  </p>
                </div>

                {/* Preprocessing Controls */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#090D16] border border-white/10 text-xs cursor-pointer">
                    <span>HTML Teqləri, URL və Durğu Təmizlənməsi</span>
                    <input
                      type="checkbox"
                      checked={stripHtmlUrls}
                      onChange={() => setStripHtmlUrls(!stripHtmlUrls)}
                      className="rounded text-indigo-500 bg-slate-900"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#090D16] border border-white/10 text-xs cursor-pointer">
                    <span>Azərbaycan Reqistr Normalizasiyası (İ → i, I → ı)</span>
                    <input
                      type="checkbox"
                      checked={lowercaseAz}
                      onChange={() => setLowercaseAz(!lowercaseAz)}
                      className="rounded text-indigo-500 bg-slate-900"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#090D16] border border-white/10 text-xs cursor-pointer">
                    <span>Xüsusi Sərhəd Tokenləri (&lt;BOS&gt;, &lt;EOS&gt;)</span>
                    <input
                      type="checkbox"
                      checked={addSpecialTokens}
                      onChange={() => setAddSpecialTokens(!addSpecialTokens)}
                      className="rounded text-indigo-500 bg-slate-900"
                    />
                  </label>
                </div>
              </div>

              {/* Right Column: Live Tokenizer Workbench */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-slate-300">
                      Canlı Giriş Mətni (Redaktə Edilə Bilən):
                    </label>
                    <button
                      onClick={() =>
                        setRawInputText(
                          "<div class='post'>Bakı Mühəndislik Universitetində tələbələr SÜNİ İNTELLEKT və Dil Modellərini öyrənirlər! https://bmu.edu.az #NLP</div>"
                        )
                      }
                      className="text-[11px] font-mono text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Nümunəni Bərpa Et
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={rawInputText}
                    onChange={(e) => setRawInputText(e.target.value)}
                    className="w-full rounded-xl bg-[#070B14] border border-white/15 p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Tokenization Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#080C16] p-1.5 rounded-xl border border-white/10">
                  {[
                    { id: 'word' as const, label: 'Söz Səviyyəli (Word)' },
                    { id: 'bpe' as const, label: 'Alt-söz BPE (Subword Morfoloji)' },
                    { id: 'char' as const, label: 'Simvol Səviyyəli (Char)' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setTokenMode(mode.id)}
                      className={`relative flex-1 py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-colors ${
                        tokenMode === mode.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tokenMode === mode.id && (
                        <motion.div
                          layoutId="tokenizerModePill"
                          className="absolute inset-0 bg-indigo-500/25 border border-indigo-400/50 rounded-lg"
                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        />
                      )}
                      <span className="relative z-10">{mode.label}</span>
                    </button>
                  ))}
                </div>

                {/* Visual Token Chips & ID Tensor */}
                <div className="rounded-xl bg-[#070B14] border border-white/10 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">
                      Çıxarılan Token Ardıcıllığı ({processedTokens.length} token):
                    </span>
                    <span className="text-xs font-mono text-indigo-300">
                      Rejim: {tokenMode.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {processedTokens.map((item) => {
                      const isSpecial = item.token === '<BOS>' || item.token === '<EOS>';
                      const isSuffix = item.token.startsWith('##');
                      return (
                        <motion.div
                          key={`${item.index}-${item.token}`}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs flex flex-col items-center ${
                            isSpecial
                              ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                              : isSuffix
                              ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200'
                              : 'bg-sky-500/15 border-sky-400/30 text-sky-200'
                          }`}
                        >
                          <span className="font-bold">{item.token}</span>
                          <span className="text-[9px] opacity-70 mt-0.5 tabular-nums">
                            ID:{item.id}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B1220] border border-white/5 font-mono text-xs text-slate-300">
                    <div className="text-[10px] text-slate-500 mb-1">
                      input_ids (Ədədi İndeks Vektoru):
                    </div>
                    <div className="text-emerald-400 tabular-nums break-all">
                      [{processedTokens.map((t) => t.id).join(', ')}]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: VECTORIZATION & EMBEDDINGS */}
          {activeStage === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                  <Binary className="w-3.5 h-3.5" />
                  <span>MƏRHƏLƏ 03 // SEMANTİK VEKTOR FƏZASI</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  3. Vektorlaşdırma: One-Hot-dan Kontekstual Embedding-ə
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Kompüterlər sözləri birbaşa anlamadığı üçün hər bir token ədədi vektora çevrilir. Klassik <strong className="text-white">One-Hot</strong> üsulunda hər söz <MathFormula math="\mathbb{R}^{|V|}" /> ölçülü seyrək (sparse) vektorla təmsil olunur və bütün sözlər bir-birinə ortoqonaldır (<MathFormula math="\cos(\theta) = 0" />).
                  <strong className="text-emerald-300"> Word2Vec</strong> və <strong className="text-sky-300">Transformer Embedding</strong> qatları isə sözləri sıx (dense) <MathFormula math="\mathbb{R}^d" /> semantik fəzaya proyeksiya edir.
                </p>

                <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-2">
                  <div className="text-xs font-mono text-slate-400 uppercase">
                    Kosinus Oxşarlığı (Cosine Similarity) Düsturu
                  </div>
                  <MathFormula
                    block
                    math="\text{CosSim}(\vec{u}, \vec{v}) = \cos(\theta) = \frac{\sum_{i=1}^{d} u_i v_i}{\sqrt{\sum_{i=1}^{d} u_i^2} \cdot \sqrt{\sum_{i=1}^{d} v_i^2}}"
                  />
                </div>

                {/* Word Pair Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1.5">
                      1-ci Söz (<MathFormula math="\vec{u}" />):
                    </label>
                    <select
                      value={selectedWordA}
                      onChange={(e) => setSelectedWordA(e.target.value)}
                      className="w-full rounded-xl bg-[#090D16] border border-sky-400/40 p-2.5 text-xs font-mono text-sky-300"
                    >
                      {EMBEDDING_WORDS.map((w) => (
                        <option key={w.word} value={w.word}>
                          &quot;{w.word}&quot; ({w.pos})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1.5">
                      2-ci Söz (<MathFormula math="\vec{v}" />):
                    </label>
                    <select
                      value={selectedWordB}
                      onChange={(e) => setSelectedWordB(e.target.value)}
                      className="w-full rounded-xl bg-[#090D16] border border-emerald-400/40 p-2.5 text-xs font-mono text-emerald-300"
                    >
                      {EMBEDDING_WORDS.map((w) => (
                        <option key={w.word} value={w.word}>
                          &quot;{w.word}&quot; ({w.pos})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Cosine Similarity Result Box */}
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-emerald-300">
                      Semantik Yaxınlıq Nəticəsi:
                    </div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      cos(&quot;{wordObjA.word}&quot;, &quot;{wordObjB.word}&quot;)
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
                    {pairCosSim.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Right Column: One-Hot vs Dense Embedding + 2D Semantic Space */}
              <div className="lg:col-span-7 space-y-4">
                {/* Sparse One-Hot vs Dense Vector Comparison */}
                <div className="rounded-xl bg-[#070B14] border border-white/10 p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                      <span>
                        1) Seyrək One-Hot Vektoru — &quot;{wordObjA.word}&quot; (Ölçü: |V| = 50,257)
                      </span>
                      <span className="text-rose-400">cos(u, v) = 0.0000 (Ortoqonal)</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto py-1">
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const isOne = idx === wordObjA.oneHotIdx;
                        return (
                          <div
                            key={idx}
                            className={`px-2.5 py-1.5 rounded border tabular-nums ${
                              isOne
                                ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold'
                                : 'bg-white/[0.02] border-white/10 text-slate-600'
                            }`}
                          >
                            {isOne ? '1' : '0'}
                          </div>
                        );
                      })}
                      <span className="text-slate-500 px-2">... (50,247 sıfır)</span>
                    </div>
                  </div>

                  {/* Dense Embedding Tensor */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                      <span>
                        2) Sıx Semantik Embedding Vektoru (ℝ⁸ kəsiyi): &quot;{wordObjA.word}&quot; vs &quot;{wordObjB.word}&quot;
                      </span>
                      <span className="text-emerald-400">Öyrənilmiş Latent Xüsusiyyətlər</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {SEMANTIC_AXES.map((axis, idx) => {
                        const valA = wordObjA.vec[idx];
                        const valB = wordObjB.vec[idx];
                        return (
                          <div
                            key={axis}
                            className="rounded-lg bg-[#0D1526] border border-white/10 p-2 text-center"
                          >
                            <div className="text-[9px] text-slate-400 truncate mb-1" title={axis}>
                              {axis}
                            </div>
                            <div className="text-xs font-mono font-bold text-sky-300 tabular-nums">
                              {valA >= 0 ? `+${valA.toFixed(2)}` : valA.toFixed(2)}
                            </div>
                            <div className="text-[11px] font-mono text-emerald-300 tabular-nums border-t border-white/5 mt-1 pt-1">
                              {valB >= 0 ? `+${valB.toFixed(2)}` : valB.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2D PCA Semantic Space SVG */}
                <div className="rounded-xl bg-[#070B14] border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-300">
                      2D PCA Semantik Vektor Fəzası Proyeksiyası
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Oxların bucağı kosinus oxşarlığını əks etdirir
                    </span>
                  </div>

                  <svg viewBox="0 0 320 180" className="w-full h-48 bg-[#050811] rounded-lg border border-white/5">
                    {/* Grid lines */}
                    <line x1="20" y1="160" x2="300" y2="160" stroke="#1E293B" strokeWidth="1" />
                    <line x1="20" y1="20" x2="20" y2="160" stroke="#1E293B" strokeWidth="1" />

                    {/* Vectors from Origin (20, 160) to Word A and Word B */}
                    <line
                      x1="20"
                      y1="160"
                      x2={wordObjA.coords.x}
                      y2={wordObjA.coords.y}
                      stroke="#38BDF8"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    <line
                      x1="20"
                      y1="160"
                      x2={wordObjB.coords.x}
                      y2={wordObjB.coords.y}
                      stroke="#10B981"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    {/* Direct distance line */}
                    <line
                      x1={wordObjA.coords.x}
                      y1={wordObjA.coords.y}
                      x2={wordObjB.coords.x}
                      y2={wordObjB.coords.y}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="1.5"
                    />

                    {/* Plot all words */}
                    {EMBEDDING_WORDS.map((item) => {
                      const isA = item.word === wordObjA.word;
                      const isB = item.word === wordObjB.word;
                      return (
                        <g
                          key={item.word}
                          className="cursor-pointer"
                          onClick={() => setSelectedWordB(item.word)}
                        >
                          <circle
                            cx={item.coords.x}
                            cy={item.coords.y}
                            r={isA || isB ? 6 : 4}
                            fill={isA ? '#38BDF8' : isB ? '#10B981' : '#64748B'}
                          />
                          <text
                            x={item.coords.x + 8}
                            y={item.coords.y + 4}
                            fill={isA ? '#38BDF8' : isB ? '#10B981' : '#94A3B8'}
                            fontSize="10"
                            fontFamily="JetBrains Mono"
                            fontWeight={isA || isB ? 'bold' : 'normal'}
                          >
                            {item.word}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: ARCHITECTURE & TRAINING */}
          {activeStage === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>MƏRHƏLƏ 04 // ARXİTEKTURA VƏ OPTİMİZASİYA</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  4. Model Arxitekturası və Təlim (Cross-Entropy Loss)
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Vektorlaşdırılmış token ardıcıllığı seçilmiş arxitekturaya ötürülür. Təlim zamanı model növbəti sözü proqnozlaşdırır və həqiqi sözlə arasındakı fərq <strong className="text-amber-300">Çarpaz Entropiya İtkisi (Cross-Entropy Loss)</strong> ilə ölçülərək <strong className="text-white">Backpropagation (AdamW)</strong> vasitəsilə çəkilər (<MathFormula math="\theta" />) yenilənir.
                </p>

                <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-2">
                  <div className="text-xs font-mono text-slate-400 uppercase">
                    Transformer Self-Attention və Cross-Entropy Düsturu
                  </div>
                  <MathFormula
                    block
                    math="\text{Attention}(Q,K,V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V"
                  />
                  <MathFormula
                    block
                    math="\mathcal{L}_{\text{CE}}(\theta) = -\sum_{t=1}^{T} \log P_{\theta}(w_t \mid w_1, \dots, w_{t-1})"
                  />
                </div>

                {/* Architecture Switcher */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ngram' as const, name: 'N-gram', desc: 'Lokal Markov' },
                    { id: 'rnn' as const, name: 'RNN / LSTM', desc: 'Ardıcıl Gizli H_t' },
                    { id: 'transformer' as const, name: 'Transformer', desc: 'Self-Attention' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setArchType(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        archType === item.id
                          ? 'bg-amber-500/15 border-amber-400/50 text-white'
                          : 'bg-[#090D16] border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono">{item.name}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>

                <PrecisionSlider
                  label="Təlim Epoxası (Training Epoch)"
                  sublabel="İterasiya artdıqca Cross-Entropy Loss azalır"
                  value={epoch}
                  min={1}
                  max={100}
                  step={1}
                  onChange={setEpoch}
                  formatValue={(v) => `Epoxa ${Math.round(v)}`}
                  accent="amber"
                />

                <PrecisionSlider
                  label="Öyrənmə Sürəti (Learning Rate η)"
                  sublabel="Qradiyent enişi addım ölçüsü"
                  value={learningRate}
                  min={0.0005}
                  max={0.01}
                  step={0.0005}
                  onChange={setLearningRate}
                  formatValue={(v) => v.toFixed(4)}
                  accent="sky"
                />
              </div>

              {/* Right Column: Live Loss Curve & Target Probability Convergence */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] font-mono text-slate-400">Arxitektura</div>
                    <div className="text-base font-bold font-mono text-amber-300 uppercase mt-1">
                      {archType}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] font-mono text-slate-400">Cross-Entropy Loss</div>
                    <div className="text-lg font-bold font-mono text-rose-400 tabular-nums mt-1">
                      {trainingTelemetry.currentLoss.toFixed(3)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] font-mono text-slate-400">Hədəf Söz Ehtimalı</div>
                    <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums mt-1">
                      {(trainingTelemetry.targetProb * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-[#070B14] border border-white/10 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      Kontekst: &quot;Tələbələr süni intellekt modellərini ...&quot; → Hədəf: &quot;öyrənirlər&quot;
                    </span>
                    <span className="text-xs font-mono text-amber-300 tabular-nums">
                      Epoxa #{epoch}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {trainingTelemetry.candidates.map((cand) => (
                      <div key={cand.word} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span
                            className={
                              cand.isTarget ? 'text-emerald-300 font-bold' : 'text-slate-400'
                            }
                          >
                            {cand.isTarget ? `★ "${cand.word}" (Həqiqi Hədəf y=1)` : `"${cand.word}"`}
                          </span>
                          <span className="tabular-nums text-slate-200">
                            {(cand.prob * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#0D1526] overflow-hidden border border-white/5">
                          <motion.div
                            className={`h-full ${
                              cand.isTarget
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                                : 'bg-slate-600/70'
                            }`}
                            animate={{ width: `${cand.prob * 100}%` }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 5: EVALUATION & PERPLEXITY (PPL) SLIDER */}
          {activeStage === 5 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>MƏRHƏLƏ 05 // PERPLEKSİYA (PPL) METRİKİ</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  5. Modelin Qiymətləndirilməsi: Perplexity (PPL)
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  <strong className="text-white">Perpleksiya (PPL)</strong> dil modelinin test korpusundakı növbəti sözü təxmin edərkən nə dərəcədə &laquo;tərəddüd etdiyini&raquo; ölçən əsas intrinsik metrikdir. Riyazi olaraq çarpaz entropiya itkisinin eksponentinə bərabərdir.
                  <strong className="text-emerald-300"> Aşağı Perpleksiya = Yüksək Dəqiqlik!</strong>
                </p>

                <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-2">
                  <div className="text-xs font-mono text-slate-400 uppercase">
                    Perpleksiya (PPL) Riyazi Düsturu
                  </div>
                  <MathFormula
                    block
                    math="\text{PPL}(W) = P(w_1, w_2, \dots, w_N)^{-\frac{1}{N}} = \exp\!\left(-\frac{1}{N}\sum_{t=1}^{N} \log P(w_t \mid w_{<t})\right)"
                  />
                </div>

                {/* Interactive Perplexity Slider */}
                <PrecisionSlider
                  label="Modelin Perpleksiya (PPL) Göstəricisi"
                  sublabel="Slayderi sola çəkdikdə PPL azalır və proqnoz dəqiqləşir!"
                  value={perplexity}
                  min={4.5}
                  max={180.0}
                  step={0.5}
                  onChange={setPerplexity}
                  formatValue={(v) => `PPL = ${v.toFixed(1)}`}
                  accent={perplexity <= 18 ? 'emerald' : perplexity <= 60 ? 'amber' : 'rose'}
                  badgeText="İNTERAKTİV METRİK"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPerplexity(6.8)}
                    className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Güclü Transformer (PPL = 6.8)
                  </button>
                  <button
                    onClick={() => setPerplexity(145.0)}
                    className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-300 hover:bg-rose-500/20"
                  >
                    Zəif Model (PPL = 145.0)
                  </button>
                </div>
              </div>

              {/* Right Column: Live Perplexity Impact Visualizer */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] font-mono text-slate-400">Effektiv Seçim Sayı</div>
                    <div className="text-lg font-bold font-mono text-white tabular-nums mt-1">
                      ~{Math.round(perplexity)} söz
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] font-mono text-slate-400">Entropiya H(P)</div>
                    <div className="text-lg font-bold font-mono text-sky-400 tabular-nums mt-1">
                      {perplexityTelemetry.entropyBits.toFixed(2)} bit
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#080C16] border border-white/10 p-3.5">
                    <div className="text-[11px] font-mono text-slate-400">Log Loss (Nats)</div>
                    <div className="text-lg font-bold font-mono text-indigo-400 tabular-nums mt-1">
                      {perplexityTelemetry.crossEntropyNats.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-[#070B14] border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      Kontekst: &quot;Dil modeli cümlənin semantik strukturunu...&quot;
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${perplexityTelemetry.qualityColor}`}
                    >
                      {perplexity <= 18 ? 'DƏQİQ PROQNOZ' : perplexity <= 60 ? 'ORTA' : 'YÜKSƏK TƏRƏDDÜD'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {perplexityTelemetry.distribution.map((cand, i) => (
                      <div key={cand.word} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className={i === 0 ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                            &quot;{cand.word}&quot;{' '}
                            <span className="text-[10px] text-slate-500">({cand.role})</span>
                          </span>
                          <span className="tabular-nums font-bold text-slate-200">
                            {(cand.prob * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#0D1526] overflow-hidden border border-white/5">
                          <motion.div
                            className={`h-full ${
                              i === 0
                                ? 'bg-gradient-to-r from-emerald-500 to-sky-400'
                                : i <= 2
                                ? 'bg-indigo-500/70'
                                : 'bg-rose-500/70'
                            }`}
                            animate={{ width: `${cand.prob * 100}%` }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated Sentence Quality Box */}
                <div className={`rounded-xl border p-4 ${perplexityTelemetry.qualityColor}`}>
                  <div className="text-xs font-mono uppercase font-bold mb-1">
                    {perplexityTelemetry.qualityLabel}
                  </div>
                  <p className="text-sm font-sans text-slate-100 leading-relaxed">
                    {perplexityTelemetry.sampleOutput}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 6: DEPLOYMENT & INFERENCE (TEMPERATURE & TOP-K) */}
          {activeStage === 6 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>MƏRHƏLƏ 06 // İNFERENS VƏ DEKODLAMA</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  6. Tətbiq və İnterfeys: Temperatur (T) və Top-K Sampling
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Təlimdən çıxmış model istifadəyə verildikdə (Inference), çıxış qatındakı xam <strong className="text-white">logitlər (<MathFormula math="z_i" />)</strong> Temperatur (<MathFormula math="T" />) parametrinə bölünərək <strong className="text-sky-300">Softmax</strong> funksiyasından keçirilir və <strong className="text-indigo-300">Top-K</strong> kəsimi ilə ən yüksək ehtimallı <MathFormula math="K" /> namizəd saxlanılır.
                </p>

                <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-2">
                  <div className="text-xs font-mono text-slate-400 uppercase">
                    Temperaturlu Softmax Düsturu
                  </div>
                  <MathFormula
                    block
                    math="P(w_i \mid w_{<t}) = \frac{\exp(z_i / T)}{\sum_{j \in V^{(K)}} \exp(z_j / T)}"
                  />
                </div>

                <PrecisionSlider
                  label="Temperatur Parametri (T)"
                  sublabel="T → 0.1: Deterministik (Greedy) | T → 1.8: Yaradıcı / Təsadüfi"
                  value={temperature}
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  onChange={setTemperature}
                  formatValue={(v) => `T = ${v.toFixed(2)}`}
                  accent="sky"
                />

                <PrecisionSlider
                  label="Top-K Filtrasiya Həddi (K)"
                  sublabel="Yalnız ən yüksək ehtimallı ilk K söz namizəd kimi saxlanılır"
                  value={topK}
                  min={1}
                  max={6}
                  step={1}
                  onChange={setTopK}
                  formatValue={(v) => `Top-${Math.round(v)}`}
                  accent="indigo"
                  ticks={6}
                />
              </div>

              {/* Right Column: Live Inference Sampling Engine */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-xl bg-[#070B14] border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      Namizəd Sözlərin Ehtimal Paylanması (Logit → Softmax(z/T) → Top-{topK})
                    </span>
                    <button
                      onClick={handleSampleNextToken}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-sky-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Növbəti Sözü Seç (Sample)
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {inferenceCandidates.map((item, idx) => (
                      <div
                        key={item.word}
                        className={`p-2.5 rounded-xl border transition-opacity ${
                          item.inTopK
                            ? 'bg-[#0C1323] border-white/10 opacity-100'
                            : 'bg-[#070A12] border-white/5 opacity-40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 tabular-nums">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-white">&quot;{item.word}&quot;</span>
                            <span className="text-[11px] text-slate-400 hidden sm:inline">
                              — {item.meaning}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 tabular-nums">
                            <span className="text-[11px] text-slate-500">
                              z={item.rawLogit.toFixed(1)}
                            </span>
                            <span
                              className={`font-bold ${
                                item.inTopK ? 'text-sky-300' : 'text-rose-400 line-through'
                              }`}
                            >
                              {item.inTopK ? `${(item.prob * 100).toFixed(1)}%` : 'KƏSİLDİ (0%)'}
                            </span>
                          </div>
                        </div>

                        <div className="h-2 rounded-full bg-[#060911] overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-400"
                            animate={{ width: `${item.prob * 100}%` }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Autoregressive Output Stream */}
                <div className="rounded-xl bg-[#080C16] border border-sky-500/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-sky-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Canlı Avtoreqressiv Generasiya Axını:
                    </span>
                    <button
                      onClick={() => setGeneratedStream(['Dil', 'modeli', 'mətni'])}
                      className="text-[11px] font-mono text-slate-400 hover:text-white"
                    >
                      Sıfırla
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
                    {generatedStream.map((tok, i) => (
                      <span
                        key={`${i}-${tok}`}
                        className={`px-2.5 py-1 rounded-md border ${
                          i >= 3
                            ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        {tok}
                      </span>
                    ))}
                    <span className="inline-block w-2 h-5 bg-sky-400 animate-pulse ml-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage Navigation Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              disabled={activeStage === 1}
              onClick={() => setActiveStage((s) => Math.max(1, s - 1))}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-mono text-slate-200 transition-all"
            >
              ← Əvvəlki Mərhələ
            </button>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Bütün riyazi parametrlər interaktivdir</span>
            </div>
            <button
              disabled={activeStage === 6}
              onClick={() => setActiveStage((s) => Math.min(6, s + 1))}
              className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-30 border border-sky-400/40 text-xs font-mono text-sky-300 font-bold transition-all"
            >
              Növbəti Mərhələ →
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
