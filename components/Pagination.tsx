import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show page 1
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }
      
      if (start > 2) {
        pages.push("...");
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push("...");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
      <div className="text-xs text-slate-500 font-semibold">
        Menampilkan <span className="font-extrabold text-slate-900">{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(totalItems, currentPage * pageSize)}</span> dari <span className="font-extrabold text-slate-900">{totalItems}</span> data
      </div>
      
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs font-bold">
                  ...
                </span>
              );
            }
            return (
              <button
                type="button"
                key={`page-${p}`}
                onClick={() => onPageChange(Number(p))}
                className={`w-9 h-9 text-xs font-bold rounded-xl transition ${
                  currentPage === p
                    ? "bg-blue-600 text-white shadow-sm font-extrabold"
                    : "text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
        
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
