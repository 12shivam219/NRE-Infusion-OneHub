import { memo } from 'react';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Consultant = Database['public']['Tables']['consultants']['Row'];

interface InterviewPipelineProps {
  interviews: Interview[];
  consultants: Consultant[];
  onViewDetails: (interview: Interview) => void;
  onDelete: (interviewId: string) => void;
}

// Helper function to get status pill colors
const getStatusPillStyle = (status: string | null | undefined) => {
  const statusLower = (status || '').toLowerCase();
  
  if (statusLower === 'scheduled') {
    return {
      bg: '#DBEAFE',
      text: '#1E40AF',
      border: '#60A5FA',
    };
  } else if (statusLower === 'completed') {
    return {
      bg: '#DCFCE7',
      text: '#15803D',
      border: '#86EFAC',
    };
  } else if (statusLower === 'cancelled') {
    return {
      bg: '#FEE2E2',
      text: '#991B1B',
      border: '#FCA5A5',
    };
  }
  
  // Default fallback
  return {
    bg: '#EFF6FF',
    text: '#1E3A8A',
    border: '#93C5FD',
  };
};

export const InterviewPipeline = memo(({
  interviews,
  consultants,
  onViewDetails,
  onDelete,
}: InterviewPipelineProps) => {
  return (
    <div
      style={{
        backgroundColor: '#F9FAFB',
        borderLeft: '3px solid #2563EB',
        padding: '16px 24px',
        marginLeft: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Section Title */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#0F172A',
          margin: '0 0 12px 0',
          fontFamily: '"Instrument Sans", sans-serif',
        }}>
          Interview Pipeline
        </h3>
      </div>

      {/* Vertical Timeline/Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
        {interviews.map((interview, index) => {
          const consultant = consultants.find(c => c.id === interview.consultant_id);
          const roundName = interview.round || `Round ${(interview as any).round_index || 1}`;
          const statusPill = getStatusPillStyle(interview.status);
          const scheduledDate = interview.scheduled_date 
            ? new Date(interview.scheduled_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—';
          
          // Format time if available
          const scheduledTime = interview.scheduled_time 
            ? interview.scheduled_time.substring(0, 5) // HH:MM format
            : null;
          
          // Combine date and time for display
          const dateTimeDisplay = scheduledTime 
            ? `${scheduledDate} at ${scheduledTime}`
            : scheduledDate;

          return (
            <div
              key={interview.id}
              onClick={() => onViewDetails(interview)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                width: '100%',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.backgroundColor = '#F1F5F9';
                el.style.borderColor = '#CBD5E1';
                el.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.backgroundColor = '#FFFFFF';
                el.style.borderColor = '#E2E8F0';
                el.style.boxShadow = 'none';
              }}
            >
              {/* Timeline Dot & Line */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '24px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 0 0 2px #2563EB',
                  }}
                />
                {index < interviews.length - 1 && (
                  <div
                    style={{
                      width: '2px',
                      height: '28px',
                      backgroundColor: '#CBD5E1',
                      marginTop: '4px',
                    }}
                  />
                )}
              </div>

              {/* Card Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top Row: Status Badge FIRST (Left) & Round Name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '10px',
                  }}
                >
                  {/* Status Badge - FIRST & PROMINENT (Left Side) */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      backgroundColor: statusPill.bg,
                      color: statusPill.text,
                      border: `1px solid ${statusPill.border}`,
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: '"Instrument Sans", sans-serif',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: statusPill.text,
                      }}
                    />
                    {interview.status || 'Unknown'}
                  </span>

                  {/* Round Name */}
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      fontFamily: '"Instrument Sans", sans-serif',
                      flex: 1,
                      minWidth: 0,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {roundName}
                  </div>
                </div>

                {/* Bottom Row: Consultant & Date Details */}
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* Consultant */}
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748B',
                        fontFamily: '"Instrument Sans", sans-serif',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      <span style={{ color: '#475569', fontWeight: 500 }}>Consultant:</span>{' '}
                      {consultant ? consultant.name : interview.interviewer || '—'}
                    </div>

                    {/* Date & Time */}
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748B',
                        fontFamily: '"Instrument Sans", sans-serif',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      <span style={{ color: '#475569', fontWeight: 500 }}>Date/Time:</span>{' '}
                      {dateTimeDisplay}
                    </div>
                  </div>

                  {/* Delete Icon - Subtle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(interview.id);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#D1D5DB',
                      transition: 'all 0.2s ease',
                      fontSize: '14px',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      btn.style.backgroundColor = '#FEE2E2';
                      btn.style.color = '#DC2626';
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      btn.style.backgroundColor = 'transparent';
                      btn.style.color = '#D1D5DB';
                    }}
                    title="Delete interview"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

InterviewPipeline.displayName = 'InterviewPipeline';
