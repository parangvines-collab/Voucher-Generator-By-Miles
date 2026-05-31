import { Voucher, VoucherTemplate } from '../types';
import { formatTimeForDisplay } from '../utils/voucherHelpers';
import { Copy, Check, Ticket, Scissors } from 'lucide-react';
import { useState } from 'react';

interface VoucherCardListProps {
  vouchers: Voucher[];
  template: VoucherTemplate;
  hotspotName: string;
}

export function VoucherCardList({ vouchers, template, hotspotName }: VoucherCardListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  if (vouchers.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 font-medium">
        <Ticket className="w-12 h-12 mx-auto mb-2 opacity-20" />
        No active vouchers generated in this session yet.
      </div>
    );
  }

  // Define styling based on template
  const getTemplateStyles = (v: Voucher) => {
    switch (template) {
      case 'template2': // Modern (Sleek Cyan/Blue)
        return {
          card: 'bg-slate-900 border-2 border-indigo-500 rounded-xl overflow-hidden shadow-md relative',
          sidebar: 'bg-indigo-600 text-white font-bold flex flex-col justify-center items-center py-3 px-2 text-center select-none text-xs w-[60px] min-h-[90px]',
          content: 'p-3 flex-1 flex flex-col justify-between text-slate-200 bg-sky-950/10',
          codeText: 'font-mono text-lg font-bold text-indigo-400 tracking-wider',
          badge: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px]'
        };
      case 'template3': // Classic (Warm Parchment)
        return {
          card: 'bg-[#fcf8f2] border-2 border-[#8b5a2b] rounded-lg overflow-hidden shadow-md relative',
          sidebar: 'bg-[#8b5a2b] text-[#fbf1c7] font-bold flex flex-col justify-center items-center py-3 px-2 text-center select-none text-xs w-[60px] min-h-[90px]',
          content: 'p-3 flex-1 flex flex-col justify-between text-[#3e2723] bg-[#fffaf0]',
          codeText: 'font-mono text-lg font-bold text-[#b22222] tracking-wider',
          badge: 'bg-[#8b5a2b]/10 text-[#8b5a2b] border border-[#8b5a2b]/20 px-2 py-0.5 rounded text-[10px]'
        };
      case 'template1': // Standard (Default High Contrast)
      default:
        return {
          card: 'bg-slate-950 border-2 border-slate-700 border-dashed rounded-lg overflow-hidden shadow-md relative',
          sidebar: 'bg-slate-800 text-slate-200 font-bold flex flex-col justify-center items-center py-3 px-2 text-center select-none text-xs w-[60px] min-h-[90px]',
          content: 'p-3 flex-1 flex flex-col justify-between text-slate-200 bg-slate-900',
          codeText: 'font-mono text-lg font-bold text-red-500 tracking-widest',
          badge: 'bg-slate-700/30 text-slate-300 border border-slate-700/50 px-2 py-0.5 rounded text-[10px]'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {vouchers.map((v, idx) => {
        const styles = getTemplateStyles(v);
        return (
          <div key={v.code} className={`${styles.card} flex items-stretch min-h-[90px] animate-fade-in`}>
            {/* Amount Badge Column */}
            <div className={`${styles.sidebar} relative border-r border-dashed border-slate-800/20`}>
              <div className="absolute top-1 left-1 opacity-25">
                <Scissors className="w-3 h-3" />
              </div>
              <span className="text-[10px] uppercase font-semibold text-opacity-85">PHP</span>
              <span className="text-lg font-extrabold">{v.amount}</span>
            </div>

            {/* Voucher Code Details & Specs */}
            <div className={styles.content}>
              <div className="flex justify-between items-start">
                <div className="truncate pr-2">
                  <span className="block text-[9px] uppercase tracking-wider opacity-60 font-medium">
                    {hotspotName || 'MikroTik Hotspot'}
                  </span>
                  <span className={styles.codeText}>{v.code}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(v.code, idx)}
                  className="p-1 px-2 rounded bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all text-[11px] font-medium flex items-center gap-1 shrink-0"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/10">
                <div className="flex gap-1.5 flex-wrap">
                  <span className={styles.badge}>
                    Time: {formatTimeForDisplay(v.time)}
                  </span>
                  <span className={styles.badge}>
                    Valid: {formatTimeForDisplay(v.validity)}
                  </span>
                </div>
                {v.profile && (
                  <span className="text-[9px] text-slate-500 italic max-w-[60px] truncate">
                     {v.profile}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
