import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-[color:var(--darkbg-surface)] border border-[color:var(--gold)] border-opacity-20 rounded-lg p-4 sm:p-6 animate-pulse">
      {/* Title skeleton */}
      <div className="h-6 bg-[color:var(--gold)] bg-opacity-10 rounded mb-4 w-3/4" />
      
      {/* Status badge skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 bg-[color:var(--gold)] bg-opacity-10 rounded-full w-24" />
      </div>

      {/* Content lines */}
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-full" />
        <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-5/6" />
        <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-4/6" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 py-4 border-y border-[color:var(--gold)] border-opacity-10">
        <div>
          <div className="h-3 bg-[color:var(--gold)] bg-opacity-10 rounded mb-2 w-20" />
          <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-16" />
        </div>
        <div>
          <div className="h-3 bg-[color:var(--gold)] bg-opacity-10 rounded mb-2 w-20" />
          <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-16" />
        </div>
      </div>

      {/* Button skeleton */}
      <div className="flex gap-2 mt-4">
        <div className="h-10 bg-[color:var(--gold)] bg-opacity-10 rounded flex-1" />
        <div className="h-10 bg-[color:var(--gold)] bg-opacity-10 rounded w-10" />
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[color:var(--darkbg-surface)] border border-[color:var(--gold)] border-opacity-20 rounded-lg p-4 sm:p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-5 bg-[color:var(--gold)] bg-opacity-10 rounded mb-2 w-1/2" />
              <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-1/3" />
            </div>
            <div className="h-6 bg-[color:var(--gold)] bg-opacity-10 rounded-full w-20 ml-4 flex-shrink-0" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="h-3 bg-[color:var(--gold)] bg-opacity-10 rounded mb-2 w-16" />
              <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-20" />
            </div>
            <div>
              <div className="h-3 bg-[color:var(--gold)] bg-opacity-10 rounded mb-2 w-16" />
              <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-20" />
            </div>
            <div>
              <div className="h-3 bg-[color:var(--gold)] bg-opacity-10 rounded mb-2 w-16" />
              <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-20" />
            </div>
            <div>
              <div className="h-3 bg-[color:var(--gold)] bg-opacity-10 rounded mb-2 w-16" />
              <div className="h-4 bg-[color:var(--gold)] bg-opacity-10 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
