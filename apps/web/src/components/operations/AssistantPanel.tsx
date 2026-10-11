'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import { askAssistant, AssistantLanguage, AssistantReply, AssistantStatus, fetchAssistantStatus } from '@/lib/api';
import { AssistantMarkdown } from './AssistantMarkdown';
import { AssistantSourceFacts } from './AssistantSourceFacts';

const DISCLOSURE = 'Before your first question: SupplyFlow will send the question you enter and a small, relevant summary of synthetic demonstration data to Google Gemini to generate an explanation. Do not enter real, confidential, personal, or sensitive military information. Common email, phone, UUID, and coordinate patterns are blocked. Coordinates and database record identifiers are not sent.';
const RESPONSE_LANGUAGES: Array<{ code: AssistantLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (\u0939\u093f\u0928\u094d\u0926\u0940)' },
  { code: 'gu', label: 'Gujarati (\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0)' },
  { code: 'mr', label: 'Marathi (\u092e\u0930\u093e\u0920\u0940)' },
  { code: 'pa', label: 'Punjabi (\u0a2a\u0a70\u0a1c\u0abe\u0a2c\u0a40)' },
  { code: 'bn', label: 'Bengali (\u09ac\u09be\u0982\u09b2\u09be)' },
];
const EXAMPLE_QUESTIONS = [
  'Which supply items need attention first?',
  'Summarize the current delivery statuses.',
  'What does the latest forecast say for the selected item?',
];

export function AssistantPanel() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [language, setLanguage] = useState<AssistantLanguage>('en');
  const [replyLanguage, setReplyLanguage] = useState<AssistantLanguage>('en');
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [disclosed, setDisclosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    fetchAssistantStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status?.available || !question.trim() || busy) return;
    const requestedLanguage = language;
    setBusy(true);
    setError('');
    setReply(null);
    setReplyLanguage(requestedLanguage);
    setCopyState('idle');
    try {
      const result = await askAssistant(question.trim(), requestedLanguage);
      if (!result) {
        setError('AI help is temporarily unavailable. Please try again later.');
      } else if (!result.available) {
        const message = result.message || 'AI help is currently unavailable.';
        setStatus((current) => current ? { ...current, available: false, message } : current);
        setError(message);
      } else {
        setReply(result);
      }
    } catch {
      setError('AI help is temporarily unavailable. Please try again later.');
    } finally {
      setBusy(false);
    }
  }

  async function copyAnswer() {
    if (!reply?.explanation) return;
    try {
      await navigator.clipboard.writeText(reply.explanation);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  const selectedLanguageLabel = RESPONSE_LANGUAGES.find((option) => option.code === language)?.label;
  const replyLanguageLabel = RESPONSE_LANGUAGES.find((option) => option.code === replyLanguage)?.label;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 rounded-2xl border border-tactical-800 bg-white p-4 shadow-sm sm:p-6 md:p-7" aria-labelledby="assistant-title">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-blue-50 p-2.5 text-accent-primary"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">Read-only | Synthetic demo data</p>
          <h2 id="assistant-title" className="mt-1 text-xl font-semibold text-tactical-100">SupplyFlow AI Help</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-tactical-400">Ask for a plain-language explanation of inventory risk, deliveries, forecasts, or existing proposals. SupplyFlow provides the source facts; AI explains them. It cannot change data or run operations.</p>
        </div>
      </div>

      <div className="rounded-xl border border-tactical-800 bg-tactical-50 p-4">
        <label htmlFor="assistant-language" className="mb-1 block text-sm font-semibold text-tactical-300">Response language</label>
        <select id="assistant-language" value={language} disabled={busy} onChange={(event) => setLanguage(event.target.value as AssistantLanguage)} className="min-h-11 max-w-full rounded-lg border border-tactical-700 bg-white px-3 py-2 text-base leading-relaxed text-tactical-300 disabled:opacity-60">
          {RESPONSE_LANGUAGES.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
        <p className="mt-1 text-sm text-tactical-500">Responses will be in: <span className="font-medium text-tactical-300">{selectedLanguageLabel}</span></p>
      </div>

      {status === null && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">AI availability could not be checked. Refresh the page or check the API connection.</p>}
      {status && !status.available && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{status.message || 'AI help is unavailable. The free Gemini provider is not configured.'}</p>}

      {status?.available && !disclosed && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-950">{DISCLOSURE}</p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-amber-950">
            <input type="checkbox" checked={disclosed} onChange={(event) => setDisclosed(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-800" />
            <span>I understand what will be sent to Google and will only ask about the synthetic demo.</span>
          </label>
        </div>
      )}
      {status?.available && disclosed && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">Privacy disclosure acknowledged. Ask only about the synthetic demonstration.</p>}

      {status?.available && (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="assistant-question" className="block text-sm font-semibold text-tactical-300">Your question</label>
            <span className="text-xs text-tactical-500">Answer language: {selectedLanguageLabel}</span>
          </div>
          <textarea id="assistant-question" lang={language} dir="auto" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} rows={4} placeholder="For example: Which supply items need attention first?" className="w-full resize-y rounded-xl border border-tactical-700 bg-white p-3.5 text-base leading-7 text-tactical-200 placeholder:text-tactical-500" />
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <span className="text-xs text-tactical-500">{question.length}/1000 characters</span>
            <button type="submit" disabled={!disclosed || !question.trim() || busy} className="min-h-11 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Preparing explanation...' : 'Ask AI'}</button>
          </div>
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-tactical-500">Try a question</p>
            <div className="flex flex-wrap gap-2">{EXAMPLE_QUESTIONS.map((example) => <button key={example} type="button" onClick={() => setQuestion(example)} className="min-h-10 rounded-full border border-tactical-700 bg-white px-3.5 py-2 text-left text-xs font-medium text-tactical-300 hover:border-accent-primary hover:bg-blue-50">{example}</button>)}</div>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {reply && (
        <div className="space-y-4" aria-live="polite">
          <section className="rounded-xl border border-tactical-800 bg-tactical-50 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-tactical-200">Data from SupplyFlow</h3>
            <p className="mt-1 text-sm leading-6 text-tactical-500">These facts come from SupplyFlow. Any examples or partial context are labelled below.</p>
            {reply.facts.length ? <>
              <AssistantSourceFacts facts={reply.facts} />
              <details className="mt-3 text-sm text-tactical-500"><summary className="min-h-10 w-fit cursor-pointer select-none py-2 font-medium">Technical details</summary><ul className="mt-1 list-disc space-y-1 pl-5">{Array.from(new Set(reply.facts.map((fact) => fact.source))).map((source) => <li key={source}>{source}</li>)}</ul></details>
            </> : <p className="mt-2 text-sm text-tactical-400">No relevant backend facts were available.</p>}
          </section>
          {reply.explanation && <section lang={replyLanguage} className="rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-blue-950">AI-generated explanation - {replyLanguageLabel}</h3><button type="button" onClick={copyAnswer} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-950 hover:bg-blue-100" aria-label="Copy AI answer">{copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copyState === 'copied' ? 'Copied' : 'Copy answer'}</button></div><div className="mt-3 text-base leading-7 text-blue-950"><AssistantMarkdown content={reply.explanation} /></div>{copyState === 'failed' && <p role="status" className="mt-2 text-xs text-blue-900">Copy is unavailable in this browser. Select the answer text to copy it.</p>}</section>}
          <p className="text-sm leading-6 text-tactical-500">Synthetic demonstration information only. Explanations may be wrong; verify facts in SupplyFlow. Displayed routes are not assessments of operational safety.</p>
        </div>
      )}
    </section>
  );
}
