
import React, { useState } from 'react';
import { GoalType } from '../types';

interface GoalFormProps {
  onSubmit: (description: string, type: GoalType) => void;
  onCancel: () => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GoalType>('unique');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onSubmit(description.trim(), type);
      setDescription('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-20 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md m-2 sm:m-4 my-4 sm:my-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nova Meta</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Comprar mais ração"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white resize-none"
            rows={3}
            autoFocus
          />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Meta:</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <label className="flex items-center cursor-pointer">
                    <input type="radio" name="goalType" value="unique" checked={type === 'unique'} onChange={() => setType('unique')} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                    <span className="ml-2 text-gray-800 dark:text-gray-200">Única (só hoje)</span>
                </label>
                 <label className="flex items-center cursor-pointer">
                    <input type="radio" name="goalType" value="fixed" checked={type === 'fixed'} onChange={() => setType('fixed')} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                    <span className="ml-2 text-gray-800 dark:text-gray-200">Fixa (todos os dias)</span>
                </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!description.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium"
            >
              Salvar Meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalForm;
