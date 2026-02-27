'use client'

import { useEffect, useRef, useState } from 'react'
import { debounce, searchArticles, getArticle } from '@/app/lib/wikipedia'
import type { SearchResult, Article } from '@/app/lib/wikipedia'

interface SearchFieldProps {
  placeholder?: string
  onSelect: (article: Article) => void
  onClear?: () => void
}

export default function SearchField({
  placeholder = 'Search Wikipedia...',
  onSelect,
  onClear,
}: SearchFieldProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search function
  const debouncedSearch = useRef(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([])
        setIsLoading(false)
        return
      }

      try {
        const results = await searchArticles(searchQuery)
        setSuggestions(results)
      } catch (error) {
        console.error('Search error:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  ).current

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setHighlightedIndex(-1)

    if (value.trim()) {
      setIsLoading(true)
      setIsOpen(true)
      debouncedSearch(value)
    } else {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion: SearchResult) => {
    setQuery(suggestion.title)
    setIsOpen(false)
    setSuggestions([])
    setIsLoading(true)

    try {
      const article = await getArticle(suggestion.title)
      if (article) {
        onSelect(article)
      }
    } catch (error) {
      console.error('Error fetching article:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault()
        handleSuggestionClick({ title: query, description: '', url: '' })
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleSuggestionClick(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Highlight suggestion on keyboard navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlighted = dropdownRef.current.children[highlightedIndex]
      if (highlighted instanceof HTMLElement) {
        highlighted.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-400 transition-colors"
          aria-autocomplete="list"
          aria-controls="search-dropdown"
          aria-expanded={isOpen}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="search-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          role="listbox"
        >
          {isLoading ? (
            // Skeleton loaders
            <div className="p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 mb-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse mb-2 w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse w-full" />
                </div>
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.title}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  highlightedIndex === index
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                } border-b border-gray-100 dark:border-zinc-800 last:border-b-0 cursor-pointer`}
                role="option"
                aria-selected={highlightedIndex === index}
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {suggestion.title}
                </div>
                {suggestion.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                    {suggestion.description}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
