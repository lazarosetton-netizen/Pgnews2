/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Newspaper, 
  Globe, 
  ShieldCheck, 
  History, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  ArrowLeft,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { fetchLatestNews, fetchNewsDetail, NewsItem } from './services/gemini';

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastNewsElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !selectedNews) {
        loadMoreNews();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, selectedNews]);

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    setHasMore(true);
    try {
      const data = await fetchLatestNews();
      setNews(data);
      if (data.length < 10) setHasMore(false);
    } catch (err) {
      setError("Não foi possível carregar as notícias em tempo real. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreNews = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const lastTimestamp = news.length > 0 ? news[news.length - 1].timestamp : undefined;
      const data = await fetchLatestNews(lastTimestamp);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        // Filter out duplicates just in case
        setNews(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newItems = data.filter(n => !existingIds.has(n.id));
          if (newItems.length === 0) setHasMore(false);
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error("Erro ao carregar mais notícias:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSelectNews = async (item: NewsItem) => {
    setSelectedNews(item);
    if (!item.fullText || !item.analysis) {
      setLoadingDetail(true);
      try {
        const details = await fetchNewsDetail(item);
        const updatedItem = { ...item, ...details };
        setSelectedNews(updatedItem);
        // Update the item in the list as well to cache it
        setNews(prev => prev.map(n => n.id === item.id ? updatedItem : n));
      } catch (err) {
        console.error("Erro ao carregar detalhes:", err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">PG<span className="text-blue-600">NEWS</span></h1>
          </div>
          <button 
            onClick={loadNews}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {selectedNews ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setSelectedNews(null)}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para as notícias
              </button>

              <article className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full">
                    {selectedNews.source}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {selectedNews.timestamp}
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold mb-8 leading-tight">
                  {selectedNews.title}
                </h2>

                {loadingDetail ? (
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                      <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse"></div>
                      <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse"></div>
                    </div>
                    <div className="h-48 bg-blue-50 rounded-2xl animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-gray max-w-none mb-12 text-lg leading-relaxed text-gray-700">
                      {selectedNews.fullText?.split('\n').map((para, i) => (
                        <p key={i} className="mb-4">{para}</p>
                      ))}
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-6 md:p-8 border border-blue-100">
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-bold text-blue-900">Análise Geopolítica e Histórica</h3>
                      </div>
                      <div className="text-blue-800 leading-relaxed space-y-4">
                        {selectedNews.analysis?.split('\n').map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="flex items-center gap-4">
                    <a 
                      href={selectedNews.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline"
                    >
                      Ver fonte original <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedNews.url);
                        alert("Link copiado para a área de transferência!");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Copiar link
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-300 font-mono break-all max-w-[200px] text-right">
                    {selectedNews.url}
                  </div>
                </div>
              </article>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-1">Últimas Atualizações</h2>
                  <p className="text-2xl font-bold">Monitorando o Oriente Médio</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-100">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Tempo Real Ativo
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white h-64 rounded-3xl animate-pulse border border-gray-100"></div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-red-900 mb-2">{error}</h3>
                  <button 
                    onClick={loadNews}
                    className="px-6 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {news.map((item, index) => (
                      <motion.div
                        key={item.id}
                        ref={index === news.length - 1 ? lastNewsElementRef : null}
                        whileHover={{ y: -4 }}
                        className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md"
                        onClick={() => handleSelectNews(item)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                            {item.source}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {item.timestamp}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-3 mb-6 leading-relaxed">
                          {item.summary}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                          <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold">
                            <History className="w-3.5 h-3.5" />
                            Análise Disponível
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {loadingMore && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  )}
                  
                  {!hasMore && news.length > 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm font-medium">
                      Você chegou ao fim das notícias recentes.
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 py-12 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Soberania & Fatos</span>
          </div>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Análises fundamentadas em dados históricos e lógica geopolítica para uma compreensão clara da situação em Israel.
          </p>
        </div>
      </footer>
    </div>
  );
}
