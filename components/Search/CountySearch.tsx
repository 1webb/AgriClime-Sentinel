"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, X, Clock, Star, Navigation } from "lucide-react";
import { County } from "@/types";

interface CountySearchProps {
  onCountySelect: (fips: string) => void;
}

interface SearchResult extends County {
  displayName: string;
}

export default function CountySearch({ onCountySelect }: CountySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [favorites, setFavorites] = useState<SearchResult[]>([]);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches and favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recent_county_searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load recent searches:", e);
      }
    }

    const storedFavorites = localStorage.getItem("favorite_counties");
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (e) {
        console.error("Failed to load favorites:", e);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/counties?search=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const counties: County[] = await response.json();
          const results: SearchResult[] = counties.map((county) => ({
            ...county,
            displayName: `${county.name}, ${county.state}`,
          }));
          setSearchResults(results);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addToRecentSearches = useCallback(
    (county: SearchResult) => {
      const updated = [
        county,
        ...recentSearches.filter((c) => c.fips !== county.fips),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recent_county_searches", JSON.stringify(updated));
    },
    [recentSearches]
  );

  const toggleFavorite = useCallback(
    (county: SearchResult, e: React.MouseEvent) => {
      e.stopPropagation();
      const isFavorite = favorites.some((f) => f.fips === county.fips);
      const updated = isFavorite
        ? favorites.filter((f) => f.fips !== county.fips)
        : [...favorites, county];
      setFavorites(updated);
      localStorage.setItem("favorite_counties", JSON.stringify(updated));
    },
    [favorites]
  );

  const handleSelectCounty = useCallback(
    (county: SearchResult) => {
      addToRecentSearches(county);
      onCountySelect(county.fips);
      setSearchQuery("");
      setShowResults(false);
    },
    [addToRecentSearches, onCountySelect]
  );

  const handleGeolocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Find nearest county using reverse geocoding
          // For now, we'll use a simple approach - in production, use a proper geocoding service
          const response = await fetch(`/api/counties`);
          if (response.ok) {
            const counties: County[] = await response.json();

            // Find closest county by calculating distance to centroids
            let closestCounty: County | null = null;
            let minDistance = Infinity;

            counties.forEach((county) => {
              if (county.centroid) {
                const distance = Math.sqrt(
                  Math.pow(county.centroid.latitude - latitude, 2) +
                    Math.pow(county.centroid.longitude - longitude, 2)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  closestCounty = county;
                }
              }
            });

            if (closestCounty) {
              const result: SearchResult = {
                ...closestCounty,
                displayName: `${closestCounty.name}, ${closestCounty.state}`,
              };
              handleSelectCounty(result);
            }
          }
        } catch (error) {
          console.error("Error finding nearest county:", error);
          alert("Failed to find nearest county");
        } finally {
          setIsGeolocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to get your location. Please enable location services.");
        setIsGeolocating(false);
      }
    );
  }, [handleSelectCounty]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Search counties..."
          className="w-full pl-10 pr-24 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder:text-gray-400 bg-white"
        />

        {/* Clear button */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-14 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}

        {/* Geolocation button */}
        <button
          onClick={handleGeolocation}
          disabled={isGeolocating}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Use my location"
        >
          <Navigation
            size={18}
            className={isGeolocating ? "animate-pulse" : ""}
          />
        </button>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {/* Loading state */}
          {isSearching && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Searching...
            </div>
          )}

          {/* Search Results */}
          {!isSearching && searchResults.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                Search Results
              </div>
              {searchResults.map((county) => (
                <div
                  key={county.fips}
                  className="w-full px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between group transition-colors cursor-pointer"
                  onClick={() => handleSelectCounty(county)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {county.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {county.state}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(county, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={
                      favorites.some((f) => f.fips === county.fips)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    <Star
                      size={16}
                      className={
                        favorites.some((f) => f.fips === county.fips)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-400"
                      }
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!isSearching &&
            searchQuery.length >= 2 &&
            searchResults.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No counties found matching "{searchQuery}"
              </div>
            )}

          {/* Favorites */}
          {!searchQuery && favorites.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 flex items-center gap-1.5">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                Favorites
              </div>
              {favorites.map((county) => (
                <div
                  key={county.fips}
                  className="w-full px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between group transition-colors cursor-pointer"
                  onClick={() => handleSelectCounty(county)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {county.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {county.state}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(county, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove from favorites"
                  >
                    <Star
                      size={16}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {!searchQuery && recentSearches.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 flex items-center gap-1.5">
                <Clock size={12} />
                Recent
              </div>
              {recentSearches.map((county) => (
                <button
                  key={county.fips}
                  onClick={() => handleSelectCounty(county)}
                  className="w-full px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {county.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {county.state}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(county, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star
                      size={16}
                      className={
                        favorites.some((f) => f.fips === county.fips)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-400"
                      }
                    />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!searchQuery &&
            recentSearches.length === 0 &&
            favorites.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">
                <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
                <p>Start typing to search for counties</p>
                <p className="text-xs mt-1">
                  or use the location button to find your nearest county
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
