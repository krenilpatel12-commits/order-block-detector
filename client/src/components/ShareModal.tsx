import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Send,
  Twitter,
  Linkedin,
  Mail,
  Smartphone,
  ExternalLink,
  Globe,
  Laptop,
  Edit2,
  Save
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  url?: string;
  text?: string;
  stockSymbol?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title = "Order Block Detector — India's #1 NSE & BSE Smart Money Tracker",
  url,
  text = "Analyze institutional Order Blocks, Demand & Supply zones, and Smart Money liquidity on NSE & BSE stocks with real-time alerts!",
  stockSymbol
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [useLiveUrl, setUseLiveUrl] = useState<boolean>(true);
  const [isEditingDomain, setIsEditingDomain] = useState<boolean>(false);
  const [customDomain, setCustomDomain] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ob_custom_share_domain') || 'https://orderblockdetector.in';
    }
    return 'https://orderblockdetector.in';
  });
  const [tempDomain, setTempDomain] = useState<string>(customDomain);

  if (!isOpen) return null;

  const currentLocalOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const effectiveBaseUrl = useLiveUrl ? (customDomain.replace(/\/+$/, '')) : currentLocalOrigin;
  
  const shareUrl = url || (stockSymbol ? `${effectiveBaseUrl}/?symbol=${stockSymbol}` : effectiveBaseUrl);
  const shareText = stockSymbol
    ? `🚨 Check out the institutional Order Block analysis for ${stockSymbol} on Order Block Detector!\n`
    : `${text}\n`;

  const handleSaveDomain = () => {
    let clean = tempDomain.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    setCustomDomain(clean);
    localStorage.setItem('ob_custom_share_domain', clean);
    setIsEditingDomain(false);
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      alert('Could not copy link to clipboard.');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // user cancelled share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/30',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'X',
      icon: Twitter,
      color: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-600 text-white shadow-blue-900/30',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-rose-700 hover:bg-rose-600 text-white shadow-rose-900/30',
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`
    }
  ];

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 my-auto ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Share Order Block Detector</h3>
              <p className="text-xs text-slate-400">Invite fellow traders & share live setups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Mode Switcher (Live Public Domain vs Local Host) */}
        <div className="flex items-center justify-between bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setUseLiveUrl(true)}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              useLiveUrl
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌐 Live Public Link</span>
          </button>
          <button
            onClick={() => setUseLiveUrl(false)}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              !useLiveUrl
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>💻 Localhost Link</span>
          </button>
        </div>

        {/* Custom Domain Edit Option (When in Live Mode) */}
        {useLiveUrl && isEditingDomain ? (
          <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-2 animate-in fade-in">
            <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Set Your Live App / Website URL:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tempDomain}
                onChange={(e) => setTempDomain(e.target.value)}
                placeholder="https://your-domain.com or https://app.vercel.app"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveDomain}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Shareable Link Input & Copy Button */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {useLiveUrl ? 'Live Web Share Link' : 'Local Share Link'}
            </label>
            {useLiveUrl && !isEditingDomain && (
              <button
                onClick={() => setIsEditingDomain(true)}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                title="Change default live domain"
              >
                <Edit2 className="w-3 h-3" />
                <span>Change Domain</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-medium focus:outline-none select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <Check className="w-3.5 h-3.5" />
              <span>Real-time link copied to clipboard successfully!</span>
            </p>
          )}
        </div>

        {/* Social Share Grid */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Share Directly via</label>
          <div className="grid grid-cols-5 gap-2">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 ${item.color}`}
                  title={`Share on ${item.name}`}
                >
                  <Icon className="w-5 h-5 mb-1 shrink-0" />
                  <span className="text-[10px] font-bold text-center leading-none">{item.name}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Native Mobile Share Button */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:opacity-90 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Mobile Share Menu</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(modalContent, document.body);
  }

  return modalContent;
};
