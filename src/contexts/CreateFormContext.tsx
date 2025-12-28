import { ReactNode, useCallback, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
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
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            backgroundColor: 'var(--darkbg-surface)',
            backgroundImage: 'linear-gradient(135deg, var(--darkbg-surface) 0%, var(--darkbg) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(234, 179, 8, 0.1)',
          }}
        >
          Create Requirement
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
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            backgroundColor: 'var(--darkbg-surface)',
            backgroundImage: 'linear-gradient(135deg, var(--darkbg-surface) 0%, var(--darkbg) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(234, 179, 8, 0.1)',
          }}
        >
          Create Interview
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
          <CreateInterviewForm
            requirementId={selectedRequirementId}
            onClose={closeCreateForm}
            onSuccess={closeCreateForm}
          />
        </DialogContent>
      </Dialog>

      {/* Consultant Modal */}
      <Dialog
        open={openForm === 'consultant'}
        onClose={closeCreateForm}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            backgroundColor: 'var(--darkbg-surface)',
            backgroundImage: 'linear-gradient(135deg, var(--darkbg-surface) 0%, var(--darkbg) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(234, 179, 8, 0.1)',
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
