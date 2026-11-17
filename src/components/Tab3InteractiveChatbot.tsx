import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  Cpu,
  Terminal,
  Activity,
  Tag,
  GitCommit,
  Zap,
  CheckCircle2,
  User,
  RefreshCw,
} from 'lucide-react';
import { MathFormula } from './ui/PrecisionControls';

type BotEngineMode = 'intent_bayes' | 'markov_chain';

interface IntentScore {
  intentId: string;
  label: string;
  confidence: number;
}

interface ExtractedEntity {
  token: string;
  type: 'TERMİN' | 'MƏKAN' | 'ZAMAN' | 'SUAL_OPERATORU' | 'KONSEPT';
  weight: number;
}

interface MarkovStep {
  from: string;
  to: string;
  prob: number;
}

interface TelemetryRecord {
  rawInput: string;
  tokens: string[];
  topIntent: string;
  topIntentLabel: string;
  confidence: number;
  allIntents: IntentScore[];
  entities: ExtractedEntity[];
  markovPath: MarkovStep[];
  engineMode: BotEngineMode;
  latencyMs: number;
  bayesLogLikelihood: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  telemetry?: TelemetryRecord;
}

const QUICK_PROMPTS = [
  'Salam, necəsən?',
  'NLP nədir?',
  'İmtahan nə vaxtdır?',
  'HMM düsturu necə işləyir?',
  'Perpleksiya nədir?',
  'Bakıda hava necədir?',
];

interface IntentDefinition {
  id: string;
  label: string;
  prior: number;
  keywords: Record<string, number>;
  intentResponse: string;
  markovCorpusResponse: string;
  defaultMarkovSteps: MarkovStep[];
}

const INTENT_DEFINITIONS: IntentDefinition[] = [
  {
    id: 'nlp_info',
    label: 'Təbii Dilin Emalı və Dil Modelləri (nlp_info)',
    prior: 0.22,
    keywords: {
      nlp: 4.5,
      təbii: 3.8,
      dil: 3.2,
      dilin: 3.2,
      emalı: 3.8,
      model: 2.8,
      modelləri: 3.1,
      token: 3.5,
      tokenizasiya: 4.0,
      perpleksiya: 4.4,
      ppl: 4.2,
      transformer: 4.1,
      vektor: 3.4,
      embedding: 3.8,
      nədir: 1.8,
    },
    intentResponse:
      'Təbii Dilin Emalı (NLP) — insan dilinin kompüter alqoritmləri və dərin neyron şəbəkələri vasitəsilə analizi, modelləşdirilməsi və generasiyası sahəsidir. Müasir Dil Modelləri (LM) mətni alt-söz tokenlərinə bölür, ℝ^d ölçülü semantik vektorlara çevirir və Perplexity (PPL) metriki ilə optimallaşdırılır.',
    markovCorpusResponse:
      '[Markov Zənciri Generasiyası]: Təbii → dilin → emalı → alqoritmləri → mətn → korpusunu → tokenlərə → ayıraraq → kontekstual → vektor → fəzasında → növbəti → sözün → ehtimalını → yüksək → dəqiqliklə → hesablayır.',
    defaultMarkovSteps: [
      { from: '<BOS>', to: 'Təbii', prob: 0.86 },
      { from: 'Təbii', to: 'dilin', prob: 0.95 },
      { from: 'dilin', to: 'emalı', prob: 0.97 },
      { from: 'emalı', to: 'alqoritmləri', prob: 0.74 },
      { from: 'alqoritmləri', to: 'kontekstual', prob: 0.68 },
      { from: 'kontekstual', to: 'vektorlarla', prob: 0.81 },
      { from: 'vektorlarla', to: 'ehtimalı', prob: 0.79 },
      { from: 'ehtimalı', to: 'hesablayır.', prob: 0.91 },
    ],
  },
  {
    id: 'hmm_math',
    label: 'HMM Riyaziyyatı və Viterbi Alqoritmi (hmm_math)',
    prior: 0.20,
    keywords: {
      hmm: 4.8,
      markov: 4.4,
      gizli: 3.9,
      düstur: 3.7,
      düsturu: 3.9,
      keçid: 3.5,
      emissiya: 3.8,
      viterbi: 4.5,
      ehtimal: 3.0,
      necə: 1.6,
      işləyir: 2.0,
      hesablanır: 2.8,
    },
    intentResponse:
      'Gizli Markov Modelində (HMM) növbəti sözün ehtimalı iki matrisin hasili ilə tapılır: Keçid ehtimalı A_ij = P(S_{t+1} | S_t) və Emissiya ehtimalı B_j(w) = P(w_{t+1} | S_{t+1}). Məsələn, «Tələbə dərsi» ifadəsindən sonra P(Feil | İsim) × P("oxuyur" | Feil) = 0.70 × 0.45 = 0.315 hasili ilə «oxuyur» sözü qalib seçilir.',
    markovCorpusResponse:
      '[Markov Zənciri Generasiyası]: Gizli → Markov → Modeli → keçid → matrisi → A_ij → və → emissiya → ehtimalı → B_j(w) → hasilini → Viterbi → alqoritmi → ilə → maksimallaşdıraraq → ən → ehtimallı → sözü → tapır.',
    defaultMarkovSteps: [
      { from: '<BOS>', to: 'Gizli', prob: 0.89 },
      { from: 'Gizli', to: 'Markov', prob: 0.98 },
      { from: 'Markov', to: 'Modeli', prob: 0.92 },
      { from: 'Modeli', to: 'keçid', prob: 0.76 },
      { from: 'keçid', to: 'və', prob: 0.84 },
      { from: 'və', to: 'emissiya', prob: 0.88 },
      { from: 'emissiya', to: 'hasilini', prob: 0.83 },
      { from: 'hasilini', to: 'maksimallaşdırır.', prob: 0.90 },
    ],
  },
  {
    id: 'exam_schedule',
    label: 'İmtahan Cədvəli və Akademik Qiymətləndirmə (exam_schedule)',
    prior: 0.18,
    keywords: {
      imtahan: 4.8,
      imtahanlar: 4.6,
      sessiya: 4.2,
      kollokvium: 4.3,
      bal: 3.4,
      qiymət: 3.2,
      vaxtdır: 3.1,
      vaxt: 2.8,
      nə: 1.2,
      haçan: 3.0,
      kəsr: 3.5,
      tarix: 3.1,
    },
    intentResponse:
      'Bakı Mühəndislik Universitetində (BMU) payız semestrinin qış imtahan sessiyası yanvarın 5-dən başlayır. Yekun qiymətləndirmə 100 ballıq sistemlə aparılır: 50 bal semestr daxili fəaliyyət (kollokvium, laboratoriya, davamiyyət və sərbəst iş), 50 bal isə final imtahan nəticəsidir.',
    markovCorpusResponse:
      '[Markov Zənciri Generasiyası]: Universitetdə → imtahan → sessiyası → akademik → təqvimə → uyğun → olaraq → yanvar → ayında → keçirilir → və → tələbələrin → biliyi → yüz → ballıq → şkala → ilə → qiymətləndirilir.',
    defaultMarkovSteps: [
      { from: '<BOS>', to: 'İmtahan', prob: 0.91 },
      { from: 'İmtahan', to: 'sessiyası', prob: 0.94 },
      { from: 'sessiyası', to: 'yanvar', prob: 0.78 },
      { from: 'yanvar', to: 'ayında', prob: 0.95 },
      { from: 'ayında', to: 'başlayır', prob: 0.82 },
      { from: 'başlayır', to: 'və', prob: 0.75 },
      { from: 'və', to: '100-ballıq', prob: 0.80 },
      { from: '100-ballıq', to: 'sistemlə', prob: 0.93 },
    ],
  },
  {
    id: 'university_bmu',
    label: 'BMU Universitet və Tədris Məlumatı (university_bmu)',
    prior: 0.16,
    keywords: {
      bmu: 4.7,
      universitet: 4.2,
      bakı: 2.5,
      mühəndislik: 3.9,
      fakültə: 4.0,
      ixtisas: 3.8,
      kitabxana: 3.9,
      laboratoriya: 3.7,
      dərs: 3.1,
      kredit: 3.6,
      tələbə: 2.9,
    },
    intentResponse:
      'Bakı Mühəndislik Universiteti (BMU) müasir informasiya texnologiyaları, süni intellekt, kompüter mühəndisliyi və kibertəhlükəsizlik istiqamətləri üzrə ixtisaslaşmış ali təhsil ocağıdır. Universitetdə elmi-tədqiqat laboratoriyaları və rəqəmsal kitabxana 24/7 rejimində tələbələrin istifadəsindədir.',
    markovCorpusResponse:
      '[Markov Zənciri Generasiyası]: Bakı → Mühəndislik → Universiteti → yüksək → texnologiyalar → və → süni → intellekt → laboratoriyaları → vasitəsilə → müasir → mühəndis → kadrları → hazırlayır.',
    defaultMarkovSteps: [
      { from: '<BOS>', to: 'Bakı', prob: 0.88 },
      { from: 'Bakı', to: 'Mühəndislik', prob: 0.96 },
      { from: 'Mühəndislik', to: 'Universiteti', prob: 0.98 },
      { from: 'Universiteti', to: 'süni', prob: 0.72 },
      { from: 'süni', to: 'intellekt', prob: 0.97 },
      { from: 'intellekt', to: 'üzrə', prob: 0.81 },
      { from: 'üzrə', to: 'mütəxəssislər', prob: 0.85 },
      { from: 'mütəxəssislər', to: 'yetişdirir.', prob: 0.92 },
    ],
  },
  {
    id: 'weather_campus',
    label: 'Hava Проqnozu və Kampus Mühiti (weather_campus)',
    prior: 0.10,
    keywords: {
      hava: 4.9,
      temperatur: 4.2,
      külək: 3.9,
      yağış: 3.8,
      bakıda: 3.6,
      xırdalan: 4.1,
      dərəcə: 3.5,
      isti: 3.0,
      soyuq: 3.0,
    },
    intentResponse:
      'Hazırda Bakı və Abşeron yarımadasında (BMU Xırdalan kampusunda) dəyişkən buludlu, mülayim hava şəraiti müşahidə olunur. Temperatur +16°C, şimal-qərb küləyinin sürəti isə 6 m/s təşkil edir.',
    markovCorpusResponse:
      '[Markov Zənciri Generasiyası]: Bakı → və → Xırdalan → kampusunda → hava → şəraiti → mülayim → keçir → temperatur → müsbət → on → altı → dərəcə → təşkil → edir.',
    defaultMarkovSteps: [
      { from: '<BOS>', to: 'Kampusda', prob: 0.84 },
      { from: 'Kampusda', to: 'hava', prob: 0.93 },
      { from: 'hava', to: 'mülayimdir', prob: 0.79 },
      { from: 'mülayimdir', to: 'və', prob: 0.86 },
      { from: 'və', to: 'temperatur', prob: 0.91 },
      { from: 'temperatur', to: '+16°C', prob: 0.87 },
      { from: '+16°C', to: 'təşkil', prob: 0.94 },
      { from: 'təşkil', to: 'edir.', prob: 0.98 },
    ],
  },
  {
    id: 'greeting_chat',
    label: 'Salamlaşma və Ümumi Dialoq (greeting_chat)',
    prior: 0.14,
    keywords: {
      salam: 4.9,
      necəsən: 4.7,
      necəsiz: 4.5,
      kimsən: 4.2,
      təşəkkür: 4.4,
      sağ: 3.5,
      ol: 3.0,
      kömək: 3.2,
      asistent: 3.8,
    },
    intentResponse:
      'Salam! Mən BMU AI Asistentiyəm — Təbii Dilin Emalı (NLP), Gizli Markov Modelləri (HMM) və universitet tədris məsələləri üzrə qurulmuş interaktiv intellektual sisteməm. Sizə hansı mövzuda kömək edə bilərəm?',
    markovCorpusResponse:
      '[Markov Zənciri Generasiyası]: Salam! → Mən → Azərbaycan → dilində → işləyən → ehtimal → və → Markov → əsaslı → süni → intellekt → dialoq → asistentiyəm.',
    defaultMarkovSteps: [
      { from: '<BOS>', to: 'Salam!', prob: 0.95 },
      { from: 'Salam!', to: 'Mən', prob: 0.91 },
      { from: 'Mən', to: 'BMU', prob: 0.84 },
      { from: 'BMU', to: 'NLP', prob: 0.87 },
      { from: 'NLP', to: 'intellektual', prob: 0.78 },
      { from: 'intellektual', to: 'dialoq', prob: 0.85 },
      { from: 'dialoq', to: 'sistemiyəm.', prob: 0.93 },
    ],
  },
];

function normalizeAzText(input: string): string[] {
  return input
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[.,!?;:"'()[\]{}]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function runNLPPipeline(rawText: string, mode: BotEngineMode): {
  reply: string;
  telemetry: TelemetryRecord;
} {
  const tokens = normalizeAzText(rawText);
  const entities: ExtractedEntity[] = [];

  // Score all intents using Naive Bayes log-likelihood approximation
  const rawScores = INTENT_DEFINITIONS.map((intent) => {
    let score = Math.log(intent.prior + 1e-6) + 2.5;
    for (const tok of tokens) {
      // Exact or prefix stem match
      for (const [kw, weight] of Object.entries(intent.keywords)) {
        if (tok === kw || (tok.length >= 3 && kw.startsWith(tok)) || (kw.length >= 3 && tok.startsWith(kw))) {
          score += weight;
        }
      }
    }
    return { intent, rawScore: score };
  });

  // Extract entities from tokens
  tokens.forEach((tok) => {
    if (['nlp', 'hmm', 'markov', 'viterbi', 'token', 'perpleksiya', 'ppl', 'transformer', 'model'].some((k) => tok.includes(k))) {
      entities.push({ token: tok, type: 'TERMİN', weight: 0.94 });
    } else if (['bmu', 'universitet', 'bakı', 'bakıda', 'xırdalan', 'kitabxana'].some((k) => tok.includes(k))) {
      entities.push({ token: tok, type: 'MƏKAN', weight: 0.89 });
    } else if (['imtahan', 'vaxt', 'vaxtdır', 'yanvar', 'sessiya', 'kollokvium'].some((k) => tok.includes(k))) {
      entities.push({ token: tok, type: 'ZAMAN', weight: 0.87 });
    } else if (['nədir', 'necə', 'nə', 'haçan', 'niyə', 'necəsən'].some((k) => tok.includes(k))) {
      entities.push({ token: tok, type: 'SUAL_OPERATORU', weight: 0.82 });
    } else if (tok.length > 3) {
      entities.push({ token: tok, type: 'KONSEPT', weight: 0.68 });
    }
  });

  if (entities.length === 0 && tokens.length > 0) {
    entities.push({ token: tokens[0], type: 'KONSEPT', weight: 0.72 });
  }

  // Softmax over rawScores to produce crisp confidence probabilities
  const maxS = Math.max(...rawScores.map((r) => r.rawScore));
  const exps = rawScores.map((r) => Math.exp((r.rawScore - maxS) * 1.15));
  const sumExp = exps.reduce((a, b) => a + b, 0) || 1;

  const ranked = rawScores
    .map((r, i) => ({
      intent: r.intent,
      confidence: exps[i] / sumExp,
      logLikelihood: r.rawScore,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const winner = ranked[0];
  const reply =
    mode === 'intent_bayes'
      ? winner.intent.intentResponse
      : winner.intent.markovCorpusResponse;

  const telemetry: TelemetryRecord = {
    rawInput: rawText,
    tokens: tokens.length > 0 ? tokens : ['<boş_giriş>'],
    topIntent: winner.intent.id,
    topIntentLabel: winner.intent.label,
    confidence: winner.confidence,
    allIntents: ranked.map((r) => ({
      intentId: r.intent.id,
      label: r.intent.label,
      confidence: r.confidence,
    })),
    entities,
    markovPath: winner.intent.defaultMarkovSteps,
    engineMode: mode,
    latencyMs: Number((8.4 + tokens.length * 1.7).toFixed(1)),
    bayesLogLikelihood: Number(winner.logLikelihood.toFixed(2)),
  };

  return { reply, telemetry };
}

export const Tab3InteractiveChatbot: React.FC = () => {
  const [engineMode, setEngineMode] = useState<BotEngineMode>('intent_bayes');
  const [inputVal, setInputVal] = useState<string>('');

  // Initialize with a rich initial message & live telemetry
  const initialRun = runNLPPipeline('NLP nədir?', 'intent_bayes');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-user',
      sender: 'user',
      text: 'NLP nədir?',
      timestamp: '13:45:01',
    },
    {
      id: 'msg-init-bot',
      sender: 'bot',
      text: initialRun.reply,
      timestamp: '13:45:02',
      telemetry: initialRun.telemetry,
    },
  ]);
  const [activeTelemetry, setActiveTelemetry] = useState<TelemetryRecord>(
    initialRun.telemetry
  );
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (customPrompt?: string) => {
    const query = (customPrompt ?? inputVal).trim();
    if (!query) return;

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const result = runNLPPipeline(query, engineMode);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: timeStr,
    };

    const botMsg: ChatMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'bot',
      text: result.reply,
      timestamp: timeStr,
      telemetry: result.telemetry,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setActiveTelemetry(result.telemetry);
    if (!customPrompt) {
      setInputVal('');
    }
  };

  const handleSwitchMode = (newMode: BotEngineMode) => {
    setEngineMode(newMode);
    // Re-evaluate last query under the new mode so the user immediately sees the difference
    const updated = runNLPPipeline(activeTelemetry.rawInput, newMode);
    setActiveTelemetry(updated.telemetry);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner for Tab 3 */}
      <div className="rounded-2xl bg-[#0D1424]/95 border border-white/10 p-5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-300 text-xs font-mono mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>BMU AI ASİSTENTİ // X-RAY NLP TELEMETRİYA LABORATORİYASI</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            İnteraktiv Chat-Bot Nümunəsi və Daxili NLP Konveyeri
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Sol paneldə Azərbaycan dilində suallar verin, sağdakı <strong className="text-sky-300">«Under the Hood / X-Ray Telemetry»</strong> panelində isə tokenizasiya, Bayes niyyət təsnifatı (<MathFormula math="P(\text{Intent}\mid W)" />), varlıqların çıxarılması və Markov keçid zəncirini canlı izləyin.
          </p>
        </div>

        {/* Engine Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#080C16] p-1.5 rounded-xl border border-white/10 self-start lg:self-center">
          {[
            {
              id: 'intent_bayes' as const,
              label: 'Qayda + Ehtimal (Intent/Bayes)',
            },
            {
              id: 'markov_chain' as const,
              label: 'Markov Zənciri Generasiyası',
            },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleSwitchMode(m.id)}
              className={`relative px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
                engineMode === m.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {engineMode === m.id && (
                <motion.div
                  layoutId="botEngineModePill"
                  className="absolute inset-0 bg-gradient-to-r from-sky-500/25 to-emerald-500/25 border border-sky-400/50 rounded-lg"
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative z-10">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Split-Screen Architecture: Left Chat Panel + Right X-Ray Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Chat Interface (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0D1424]/95 border border-white/10 shadow-2xl flex flex-col h-[680px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 py-3.5 bg-[#090E1B] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 relative">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090E1B]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">BMU AI Asistenti</div>
                <div className="text-[11px] font-mono text-emerald-400">
                  Rejim: {engineMode === 'intent_bayes' ? 'Intent + Naive Bayes' : 'Markov N-gram Zənciri'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const init = runNLPPipeline('Salam, necəsən?', engineMode);
                setMessages([
                  {
                    id: 'reset-u',
                    sender: 'user',
                    text: 'Salam, necəsən?',
                    timestamp: 'İndi',
                  },
                  {
                    id: 'reset-b',
                    sender: 'bot',
                    text: init.reply,
                    timestamp: 'İndi',
                    telemetry: init.telemetry,
                  },
                ]);
                setActiveTelemetry(init.telemetry);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Dialoqu Sıfırla"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 space-y-3.5 overflow-y-auto">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isInspected =
                msg.telemetry && msg.telemetry.rawInput === activeTelemetry.rawInput;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isUser ? (
                      <>
                        <span className="text-[10px] font-mono text-slate-500">
                          {msg.timestamp}
                        </span>
                        <span className="text-[11px] font-semibold text-sky-300 flex items-center gap-1">
                          İstifadəçi <User className="w-3 h-3" />
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                          <Bot className="w-3 h-3" /> BMU AI
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {msg.timestamp}
                        </span>
                      </>
                    )}
                  </div>

                  <div
                    onClick={() => msg.telemetry && setActiveTelemetry(msg.telemetry)}
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed transition-all ${
                      isUser
                        ? 'bg-sky-500/20 border border-sky-400/40 text-slate-100 rounded-tr-sm'
                        : `cursor-pointer bg-[#080D1A] border ${
                            isInspected
                              ? 'border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                              : 'border-white/10 hover:border-white/25'
                          } text-slate-200 rounded-tl-sm`
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.telemetry && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-400">
                          Intent: {msg.telemetry.topIntent} ({(msg.telemetry.confidence * 100).toFixed(1)}%)
                        </span>
                        <span>{msg.telemetry.latencyMs} ms • X-Ray Aktiv</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Quick-Prompt Chips */}
          <div className="px-4 py-2.5 bg-[#090E1B]/90 border-t border-white/10">
            <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              Sürətli Sual Şablonları (Klikləyin):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-sky-500/20 border border-white/10 hover:border-sky-400/40 text-[11px] font-mono text-slate-300 hover:text-sky-200 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#070B14] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Azərbaycan dilində sualınızı yazın (məs: HMM düsturu necə işləyir?)..."
              className="flex-1 rounded-xl bg-[#0D1424] border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-sky-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              Göndər
            </button>
          </form>
        </div>

        {/* RIGHT PANEL: Under the Hood / X-Ray NLP Telemetry (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#0D1424]/95 border border-white/10 p-5 shadow-2xl space-y-5">
          {/* Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  UNDER THE HOOD // X-RAY NLP TELEMETRİYASI
                </h3>
                <p className="text-xs text-slate-400">
                  Son sorğu: <span className="text-sky-300 font-mono">&laquo;{activeTelemetry.rawInput}&raquo;</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 tabular-nums">
                Gecikmə: {activeTelemetry.latencyMs} ms
              </span>
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 tabular-nums">
                Log-L: {activeTelemetry.bayesLogLikelihood}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTelemetry.rawInput}-${activeTelemetry.engineMode}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* STEP 1: INPUT TOKENS */}
              <div className="rounded-xl bg-[#080C16] border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    1. GİRİŞ TOKENLƏRİ (PREPROCESSING & TOKENIZATION)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    Token sayı: {activeTelemetry.tokens.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-slate-500">[</span>
                  {activeTelemetry.tokens.map((tok, i) => (
                    <motion.span
                      key={`${tok}-${i}`}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-400/40 text-sky-200 font-bold"
                    >
                      &quot;{tok}&quot;
                      {i < activeTelemetry.tokens.length - 1 && (
                        <span className="text-slate-400 ml-1">,</span>
                      )}
                    </motion.span>
                  ))}
                  <span className="text-slate-500">]</span>
                </div>
              </div>

              {/* STEP 2: DETECTED INTENT & CONFIDENCE SCORE BAR */}
              <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    2. NİYYƏTİN TƏYİNİ VƏ EHTİMAL PAYLANMASI (INTENT CLASSIFICATION)
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-bold tabular-nums">
                    Intent: {activeTelemetry.topIntent} ({(activeTelemetry.confidence * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-lg bg-[#050811] border border-white/5 text-xs">
                  <MathFormula
                    math="P(\text{Intent}_k \mid W) = \frac{P(\text{Intent}_k) \prod_{i} P(w_i \mid \text{Intent}_k)}{\sum_{j} P(\text{Intent}_j) \prod_{i} P(w_i \mid \text{Intent}_j)}"
                  />
                </div>

                <div className="space-y-2">
                  {activeTelemetry.allIntents.slice(0, 4).map((item, idx) => {
                    const isTop = idx === 0;
                    return (
                      <div key={item.intentId} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className={isTop ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                            {isTop ? '★ ' : ''}
                            {item.label}
                          </span>
                          <span className="tabular-nums font-bold text-slate-200">
                            {(item.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#050811] overflow-hidden">
                          <motion.div
                            className={`h-full ${
                              isTop
                                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400'
                                : 'bg-slate-600/60'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.confidence * 100}%` }}
                            transition={{ duration: 0.35 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: EXTRACTED ENTITIES / KEYWORDS */}
              <div className="rounded-xl bg-[#080C16] border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    3. ÇIXARILAN VARLIQLAR VƏ AÇAR SÖZLƏR (NER & KEYWORD EXTRACTION)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {activeTelemetry.entities.length} varlıq aşkarlandı
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeTelemetry.entities.map((ent, idx) => (
                    <div
                      key={`${ent.token}-${idx}`}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-400/30 flex items-center gap-2 font-mono text-xs"
                    >
                      <span className="text-white font-bold">&quot;{ent.token}&quot;</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-200 text-[10px]">
                        {ent.type}
                      </span>
                      <span className="text-[10px] text-emerald-300 tabular-nums">
                        w={ent.weight.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 4: RESPONSE SELECTION / MARKOV TRANSITION PATH */}
              <div className="rounded-xl bg-[#080C16] border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5" />
                    4. CAVAB SEÇİMİ VƏ MARKOV KEÇİD ZƏNCİRİ P(w_&#123;t+1&#125; | w_t)
                  </span>
                  <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {activeTelemetry.engineMode === 'intent_bayes'
                      ? 'Bayes Şablon + Kontekst'
                      : 'Stoxastik Markov Zənciri'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  {activeTelemetry.markovPath.map((step, idx) => (
                    <React.Fragment key={`${step.from}-${step.to}-${idx}`}>
                      {idx === 0 && (
                        <span className="px-2 py-1 rounded bg-amber-500/15 border border-amber-400/30 font-mono text-[11px] text-amber-300">
                          {step.from}
                        </span>
                      )}
                      <div className="flex flex-col items-center px-1">
                        <span className="text-[9px] font-mono text-emerald-400 tabular-nums">
                          {step.prob.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-xs">→</span>
                      </div>
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.06 }}
                        className="px-2.5 py-1 rounded-lg bg-[#10192E] border border-sky-400/30 font-mono text-xs text-slate-100 font-semibold"
                      >
                        {step.to}
                      </motion.span>
                    </React.Fragment>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cavab uğurla sintez edildi
                  </span>
                  <span>
                    Birgə Keçid Ehtimalı:{' '}
                    <strong className="text-slate-200 tabular-nums">
                      {activeTelemetry.markovPath
                        .reduce((acc, s) => acc * s.prob, 1)
                        .toFixed(4)}
                    </strong>
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
