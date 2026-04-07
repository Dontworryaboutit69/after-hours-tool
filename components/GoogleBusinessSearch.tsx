"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Star, Phone, Clock, X, Building2 } from "lucide-react";

export interface GoogleBusinessResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    weekday_text?: string[];
    periods?: any[];
    open_now?: boolean;
  };
  reviews?: any[];
  editorial_summary?: { overview: string };
  url?: string;
}

interface SearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
}

interface Props {
  onSelect: (business: GoogleBusinessResult) => void;
  onClear: () => void;
  selected: GoogleBusinessResult | null;
}

export default function GoogleBusinessSearch({ onSelect, onClear, selected }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/google-places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = async (result: SearchResult) => {
    setShowResults(false);
    setLoadingDetails(true);
    setQuery(result.name);

    try {
      const res = await fetch(`/api/google-places/details?place_id=${result.place_id}`);
      const data = await res.json();
      if (data.result) {
        onSelect(data.result);
      }
    } catch {
      // Fallback to basic data
      onSelect({
        place_id: result.place_id,
        name: result.name,
        formatted_address: result.formatted_address,
        types: result.types,
        rating: result.rating,
        user_ratings_total: result.user_ratings_total,
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onClear();
  };

  if (selected) {
    return (
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{selected.name}</h3>
                <p className="text-white/50 text-sm mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {selected.formatted_address}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  {selected.rating && (
                    <span className="text-sm flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white/70">{selected.rating}</span>
                      {selected.user_ratings_total && (
                        <span className="text-white/40">({selected.user_ratings_total} reviews)</span>
                      )}
                    </span>
                  )}
                  {selected.formatted_phone_number && (
                    <span className="text-sm flex items-center gap-1 text-white/50">
                      <Phone className="w-3.5 h-3.5" />
                      {selected.formatted_phone_number}
                    </span>
                  )}
                </div>
                {selected.opening_hours?.weekday_text && (
                  <div className="mt-3 flex items-start gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-white/40 space-y-0.5">
                      {selected.opening_hours.weekday_text.slice(0, 3).map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                      {selected.opening_hours.weekday_text.length > 3 && (
                        <div>+{selected.opening_hours.weekday_text.length - 3} more days</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClear}
              className="text-white/30 hover:text-white/60 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-center text-white/30 text-xs mt-2">
          Not your business?{" "}
          <button onClick={handleClear} className="text-purple-400 hover:text-purple-300 underline">
            Search again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search for your business on Google..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-lg transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {loadingDetails && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading business details...</p>
        </div>
      )}

      {showResults && results.length > 0 && !loadingDetails && (
        <div className="absolute z-50 w-full mt-2 rounded-xl border border-white/10 bg-[#1a1a2e] backdrop-blur-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
            >
              <div className="font-medium text-white text-sm">{result.name}</div>
              <div className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {result.formatted_address}
              </div>
              {result.rating && (
                <div className="text-white/30 text-xs mt-1 flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  {result.rating} ({result.user_ratings_total} reviews)
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-2 rounded-xl border border-white/10 bg-[#1a1a2e] p-4 text-center">
          <p className="text-white/40 text-sm">No businesses found. Try a different search.</p>
        </div>
      )}
    </div>
  );
}
