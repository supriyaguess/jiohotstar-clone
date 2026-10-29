import { Fragment, useEffect, useState } from 'react';
import { BOT_NAME } from '../../constants';
import { LogoMark } from '../ui/Logo';
import UserAvatar from '../ui/UserAvatar';
import { useApp } from '../../context/AppContext';
import TitleCards from './TitleCards';

// Tiny whitelist formatter. Everything stays a React text node: only **bold**, "- " bullets and
// paragraphs are recognised, so model output can never inject markup, links or images.
const renderInline = (text) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-white">{part}</strong> : <Fragment key={i}>{part}</Fragment>));

function FormattedText({ text }) {
  const blocks = [];
  text.split(/\n{2,}/).forEach((para) => {
    let list = null;
    let lines = [];
    const flush = () => { if (lines.length) blocks.push({ type: 'p', lines }); lines = []; };
    para.split('\n').forEach((line) => {
      if (/^\s*- /.test(line)) {
        flush();
        if (!list) { list = []; blocks.push({ type: 'ul', items: list }); }
        list.push(line.replace(/^\s*- /, ''));
      } else if (line.trim()) {
        list = null;
        lines.push(line);
      }
    });
    flush();
  });

  return blocks.map((b, i) => (b.type === 'ul' ? (
    <ul key={i} className="list-disc pl-5 space-y-1 my-1.5">
      {b.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
    </ul>
  ) : (
    <p key={i} className="my-1.5 first:mt-0 last:mb-0">
      {b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{renderInline(l)}</Fragment>)}
    </p>
  )));
}

const SLOW_AFTER_MS = 8000;

function TypingDots() {
  // On free hosting the server can be asleep, which adds up to a minute: say so instead of looking frozen.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span role="status" aria-label={`${BOT_NAME} is typing`}>
      <span className="inline-flex items-center gap-1 py-1.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-hotstar-gray animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
      {slow && <span className="block text-[11px] text-hotstar-gray mt-1">Still working on it. The server may be waking up, this can take a moment.</span>}
    </span>
  );
}

export default function ChatMessage({ message, onOpenTitle, onRetry, canRetry }) {
  const { user } = useApp();
  if (message.role === 'user') {
    return (
      <div className="flex justify-end items-end gap-2">
        <div className="max-w-[calc(100%-2.25rem)] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white bg-hotstar-gradient whitespace-pre-wrap break-words">
          {message.text}
        </div>
        <UserAvatar user={user} size={24} className="mb-0.5" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 min-w-0">
      <LogoMark size={24} className="mt-1" />
      <div className="min-w-0 max-w-[calc(100%-2rem)]">
        {(message.text || message.pending || message.stopped) && (
          <div className="inline-block max-w-full rounded-2xl rounded-bl-md px-3.5 py-2 text-sm text-[#e1e6f0] bg-white/[0.07] border border-white/5 break-words">
            {message.text ? <FormattedText text={message.text} /> : message.pending ? <TypingDots /> : null}
            {message.stopped && <span className="block text-[11px] text-hotstar-gray mt-1">Stopped</span>}
          </div>
        )}
        {message.error && (
          <div role="alert" className="inline-block max-w-full rounded-2xl rounded-bl-md px-3.5 py-2 text-sm text-red-200 bg-red-500/10 border border-red-500/30">
            {message.error}
            {canRetry && (
              <button type="button" onClick={onRetry} className="block mt-1.5 text-xs font-semibold text-white underline underline-offset-2 hover:text-blue-300">
                Try again
              </button>
            )}
          </div>
        )}
        <TitleCards titles={message.titles} onOpen={onOpenTitle} />
      </div>
    </div>
  );
}
