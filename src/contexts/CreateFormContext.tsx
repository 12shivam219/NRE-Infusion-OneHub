import { ReactNode, useCallback, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { CreateFormContext } from './CreateFormContextDef';
import { CreateRequirementForm } from '../components/crm/CreateRequirementForm';
import { CreateInterviewForm } from '../components/crm/CreateInterviewForm';
import { CreateConsultantForm } from '../components/crm/CreateConsultantForm';

type FormType = 'requirement' | 'interview' | 'consultant';

export const CreateFormProvider = ({ children }: { children: ReactNode }) => {
  const [openForm, setOpenForm] = useState<FormType | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | undefined>();

  const closeCreateForm = useCallback(() => {
    setOpenForm(null);
    setSelectedRequirementId(undefined);
  }, []);

  const openCreateForm = useCallback((type: FormType, requirementId?: string) => {
    setOpenForm(type);
    if (type === 'interview' && requirementId) {
      setSelectedRequirementId(requirementId);
    }
  }, []);

  const contextValue = useMemo(
    () => ({ openCreateForm, closeCreateForm }),
    [openCreateForm, closeCreateForm]
  );

  return (
    <CreateFormContext.Provider value={contextValue}>
      {children}

      {/* Requirement Modal */}
      <Dialog
        open={openForm === 'requirement'}
        onClose={closeCreateForm}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            backgroundColor: '#FFFFFF',
            backgroundImage: 'none',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            zIndex: 1401,
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(3px)',
              zIndex: 1400,
            },
          },
        }}
      >
        <DialogTitle sx={{ pr: 7, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#333', mb: 0.5 }}>
              Create New Requirement
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#888' }}>
              Add job requirement details
            </Typography>
          </div>
          <IconButton
            onClick={closeCreateForm}
            size="small"
            sx={{ color: '#666', '&:hover': { color: '#333' } }}
            aria-label="Close form"
            title="Close form"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#fff', p: 2 }}>
          <CreateRequirementForm
            onClose={closeCreateForm}
            onSuccess={closeCreateForm}
          />
        </DialogContent>
      </Dialog>

      {/* Interview Modal */}
      <Dialog
        open={openForm === 'interview'}
        onClose={closeCreateForm}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            boxShadow: '0 0 30px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            color: '#1a1a1a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          Create Interview
          <IconButton
            onClick={closeCreateForm}
            size="small"
            sx={{
              color: '#666666',
              '&:hover': { color: '#1a1a1a' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2, backgroundColor: '#ffffff' }}>
          <CreateInterviewForm
            requirementId={selectedRequirementId}
            onClose={closeCreateForm}
            onSuccess={closeCreateForm}
            showDialog={false}
          />
        </DialogContent>
      </Dialog>

      {/* Consultant Modal */}
      <Dialog
        open={openForm === 'consultant'}
        onClose={closeCreateForm}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            backgroundColor: '#FFFFFF',
            backgroundImage: 'none',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            color: '#0F172A',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          Create Consultant
          <IconButton
            onClick={closeCreateForm}
            size="small"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { color: '#FFFFFF' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <CreateConsultantForm
            onClose={closeCreateForm}
            onSuccess={closeCreateForm}
          />
        </DialogContent>
      </Dialog>
    </CreateFormContext.Provider>
  );
};
