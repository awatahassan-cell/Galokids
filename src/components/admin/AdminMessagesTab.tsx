import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MessageSquare, Mail, Phone, Clock, Search, Trash2, CheckCircle2, 
  Eye, RefreshCw, AlertCircle, MessageCircle, User, Sparkles, Filter
} from 'lucide-react';
import { ContactMessage } from '../../types';
import { apiFetch } from '../../config/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { useToast, useConfirm } from '../ui/Feedback';

export interface AdminMessagesTabProps {
  currentUser?: any;
}

export const AdminMessagesTab: React.FC<AdminMessagesTabProps> = ({ currentUser }) => {
  const { language } = useLanguage();
  const L = (s: string) => adminTr(s, language);
  const toast = useToast();
  const confirm = useConfirm();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/contact-messages?limit=100${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        setMessages(list);
      }
    } catch (e) {
      console.warn('Failed to fetch contact messages:', e);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const filteredMessages = useMemo(() => {
    let result = messages;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.message?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [messages, searchQuery]);

  const handleMarkStatus = async (msg: ContactMessage, newStatus: 'read' | 'unread' | 'replied') => {
    try {
      const res = await apiFetch(`/contact-messages/${msg.id}/read`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: newStatus } : m));
        if (selectedMessage && selectedMessage.id === msg.id) {
          setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
        }
        toast(language === 'ku' ? 'دۆخی پەیامەکە نوێکرایەوە' : 'Status updated', 'success');
      }
    } catch (e) {
      toast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (msg: ContactMessage) => {
    const ok = await confirm({
      title: language === 'ku' ? 'سڕینەوەی پەیام' : 'Delete Message',
      message: language === 'ku' ? `دڵنیایت لە سڕینەوەی ئەم پەیامەی ${msg.name}؟` : `Are you sure you want to delete message from ${msg.name}?`,
      confirmText: language === 'ku' ? 'سڕینەوە' : 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      const res = await apiFetch(`/contact-messages/${msg.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        if (selectedMessage && selectedMessage.id === msg.id) {
          setSelectedMessage(null);
        }
        toast(language === 'ku' ? 'پەیامەکە بە سەرکەوتوویی سڕدرایەوە' : 'Message deleted', 'success');
      }
    } catch (e) {
      toast('Failed to delete message', 'error');
    }
  };

  const openWhatsApp = (msg: ContactMessage) => {
    if (!msg.phone) return;
    let cleanPhone = msg.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('07')) {
      cleanPhone = '964' + cleanPhone.substring(1);
    }
    const text = encodeURIComponent(
      language === 'ku'
        ? `سڵاو بەڕێز ${msg.name}، سەبارەت بە نامەکەت لە گەلۆ کیدس (Galo Kids):`
        : `مرحباً ${msg.name}، بخصوص رسالتك في Galo Kids:`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const unreadCount = useMemo(() => messages.filter(m => m.status === 'unread').length, [messages]);

  return (
    <div className="space-y-6 font-arabic">
      {/* Header Banner */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 p-6 rounded-[2rem] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">
                {language === 'ku' ? 'پەیامەکانی بەشی پەیوەندی' : language === 'ar' ? 'رسائل اتصل بنا' : 'Contact Inquiries'}
              </h2>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black shadow-xs animate-pulse">
                  {unreadCount} {language === 'ku' ? 'نوێ' : 'New'}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {language === 'ku' 
                ? 'بینینی ئەو پرسیار و پەیامانەی لە پەڕەی (پەیوەندی) لەلایەن کڕیارانەوە دەنێردرێن' 
                : 'Manage inquiries submitted by customers through the Contact Us page'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchMessages}
          disabled={isLoading}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{language === 'ku' ? 'نوێکردنەوە' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 p-4 rounded-[2rem] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={language === 'ku' ? 'گەڕان بەپێی ناو، ئیمەیڵ، ژمارە یان دەق...' : 'Search messages...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: language === 'ku' ? 'هەمووی' : 'All', count: messages.length },
            { id: 'unread', label: language === 'ku' ? 'نەخوێندراوەتەوە' : 'Unread', count: unreadCount, badgeColor: 'bg-rose-500' },
            { id: 'read', label: language === 'ku' ? 'خوێندراوەتەوە' : 'Read' },
            { id: 'replied', label: language === 'ku' ? 'وەڵامدراوە' : 'Replied' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : tab.badgeColor ? `${tab.badgeColor} text-white` : 'bg-slate-300 text-slate-800'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List / Table */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/90 rounded-[2rem] shadow-xs overflow-hidden">
        {filteredMessages.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">
              {language === 'ku' ? 'هیچ پەیامێک نەدۆزرایەوە.' : 'No messages found.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMessages.map((msg) => {
              const isUnread = msg.status === 'unread';
              const isReplied = msg.status === 'replied';

              return (
                <div
                  key={msg.id}
                  className={`p-5 transition-all hover:bg-indigo-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                    isUnread ? 'bg-indigo-50/60 font-black' : ''
                  }`}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (msg.status === 'unread') {
                      handleMarkStatus(msg, 'read');
                    }
                  }}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isUnread ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {msg.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900">{msg.name}</span>
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                            {language === 'ku' ? 'نوێ' : 'New'}
                          </span>
                        )}
                        {isReplied && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {language === 'ku' ? 'وەڵامدراوەتەوە' : 'Replied'}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.created_at).toLocaleDateString('ku', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 flex-wrap">
                        {msg.phone && (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {msg.phone}
                          </span>
                        )}
                        {msg.email && (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3 text-indigo-600" />
                            {msg.email}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed font-normal">
                        {msg.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    {msg.phone && (
                      <button
                        onClick={() => openWhatsApp(msg)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{language === 'ku' ? 'وەتسەپ' : 'WhatsApp'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedMessage(msg);
                        if (msg.status === 'unread') {
                          handleMarkStatus(msg, 'read');
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title={language === 'ku' ? 'خوێندنەوەی تەواو' : 'View Full Message'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(msg)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 transition-colors cursor-pointer"
                      title={language === 'ku' ? 'سڕینەوە' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-white/80 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {selectedMessage.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">{selectedMessage.name}</h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {new Date(selectedMessage.created_at).toLocaleString('ku')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contact info badges */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs font-bold text-slate-700">
              {selectedMessage.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{language === 'ku' ? 'مۆبایل:' : 'Phone:'}</span>
                  <span className="font-mono text-emerald-700" dir="ltr">{selectedMessage.phone}</span>
                </div>
              )}
              {selectedMessage.email && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{language === 'ku' ? 'ئیمەیڵ:' : 'Email:'}</span>
                  <span className="text-indigo-700">{selectedMessage.email}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{language === 'ku' ? 'دۆخ:' : 'Status:'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  selectedMessage.status === 'replied' ? 'bg-emerald-100 text-emerald-800' :
                  selectedMessage.status === 'read' ? 'bg-slate-200 text-slate-700' : 'bg-rose-500 text-white'
                }`}>
                  {selectedMessage.status === 'replied' ? (language === 'ku' ? 'وەڵامدراوەتەوە' : 'Replied') :
                   selectedMessage.status === 'read' ? (language === 'ku' ? 'خوێندراوەتەوە' : 'Read') : (language === 'ku' ? 'نەخوێندراوەتەوە' : 'Unread')}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                {language === 'ku' ? 'دەقی پەیام:' : 'Message Content:'}
              </h4>
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-800 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedMessage.message}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedMessage.phone && (
                  <button
                    onClick={() => openWhatsApp(selectedMessage)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'ku' ? 'وەڵامدانەوە بە وەتسەپ' : 'Reply via WhatsApp'}</span>
                  </button>
                )}
                {selectedMessage.email && (
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{language === 'ku' ? 'ئیمەیڵ' : 'Email'}</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedMessage.status !== 'replied' && (
                  <button
                    onClick={() => handleMarkStatus(selectedMessage, 'replied')}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ku' ? 'دیاریکردن وەکو وەڵامدراوە' : 'Mark Replied'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
