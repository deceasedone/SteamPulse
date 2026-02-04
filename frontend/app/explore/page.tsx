"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { Game } from '@/lib/types';
import { KPICard } from '@/components/KPICard';

export default function GameExplorer() {
  const [data, setData] = useState<Game[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [genres, setGenres] = useState<string[]>([]);

  // Fetch genres for filter
  useEffect(() => {
    fetch('/api/genres')
      .then(res => res.json())
      .then(data => setGenres(data.map((g: any) => g.genre)));
  }, []);

  // Fetch games with filters
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
      maxPrice: maxPrice.toString(),
      ...(search && { search }),
      ...(selectedGenre && { genre: selectedGenre }),
      ...(minRating > 0 && { minRating: minRating.toString() }),
    });

    fetch(`/api/games?${params}`)
      .then(res => res.json())
      .then(result => {
        setData(result.data || []);
        setStats(result.stats);
        setTotalPages(result.totalPages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, selectedGenre, maxPrice, minRating, page]);

  // Table columns
  const columns = useMemo<ColumnDef<Game>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Game Title',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.header_image && (
              <img 
                src={row.original.header_image} 
                alt={row.original.name}
                className="w-20 h-12 object-cover rounded"
              />
            )}
            <div>
              <p className="font-medium text-white">{row.original.name}</p>
              <p className="text-xs text-slate-400">{row.original.primary_genre}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <div>
            {row.original.is_free ? (
              <span className="px-2 py-1 bg-[#a3cf06] text-black text-xs font-bold rounded">
                FREE
              </span>
            ) : (
              <span className="text-white font-medium">
                ₹{row.original.price.toLocaleString()}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'metacritic',
        header: 'Metacritic',
        cell: ({ row }) => {
          const score = row.original.metacritic;
          if (!score) return <span className="text-slate-500">N/A</span>;
          
          const color = score >= 75 ? 'text-[#a3cf06]' : score >= 50 ? 'text-yellow-500' : 'text-red-400';
          return <span className={`font-bold ${color}`}>{score}</span>;
        },
      },
      {
        accessorKey: 'total_reviews',
        header: 'Reviews',
        cell: ({ row }) => (
          <span className="text-slate-300">
            {row.original.total_reviews.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'release_date',
        header: 'Release Date',
        cell: ({ row }) => (
          <span className="text-slate-400 text-sm">
            {new Date(row.original.release_date).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: 'publisher',
        header: 'Publisher',
        cell: ({ row }) => (
          <span className="text-slate-400 text-sm">{row.original.publisher}</span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="min-h-screen bg-[#0b1016] text-white p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#66c0f4] to-[#a3cf06] bg-clip-text text-transparent">
          Game Explorer
        </h1>
        <p className="text-slate-400">Browse and filter our complete game database</p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KPICard label="Filtered Games" value={stats.filtered_count || 0} />
          <KPICard label="Avg Price" value={`₹${stats.avg_price || 0}`} />
          <KPICard label="Avg Rating" value={stats.avg_rating || 'N/A'} />
          <KPICard label="Free Games" value={`${stats.free_percentage || 0}%`} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Game name..."
              className="w-full bg-[#0b1016] border border-slate-600 rounded px-3 py-2 text-white focus:border-[#66c0f4] focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0b1016] border border-slate-600 rounded px-3 py-2 text-white focus:border-[#66c0f4] focus:outline-none"
            >
              <option value="">All Genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Max Price: ₹{maxPrice}
            </label>
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(parseInt(e.target.value));
                setPage(1);
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Min Rating: {minRating || 'Any'}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={minRating}
              onChange={(e) => {
                setMinRating(parseInt(e.target.value));
                setPage(1);
              }}
              className="w-full"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setSearch('');
            setSelectedGenre('');
            setMaxPrice(5000);
            setMinRating(0);
            setPage(1);
          }}
          className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1b2838] rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66c0f4] mx-auto mb-4"></div>
              <p className="text-slate-400">Loading games...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0b1016] border-b border-slate-700">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-[#66c0f4] transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-[#0b1016] transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#0b1016] border-t border-slate-700">
              <p className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-[#66c0f4] hover:bg-[#5ab0e4] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-black font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}