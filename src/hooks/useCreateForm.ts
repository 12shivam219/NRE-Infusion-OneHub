import { useContext } from 'react';
import { CreateFormContext } from '../contexts/CreateFormContextDef';

export const useCreateForm = () => {
  const context = useContext(CreateFormContext);
  if (!context) {
    throw new Error('useCreateForm must be used within CreateFormProvider');
  }
  return context;
};
