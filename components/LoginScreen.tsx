import React from 'react';
import { UserRole } from '../types';
import { PersonIcon, SupervisorIcon } from './Icons';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timeline Pet Hotel</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Selecione seu perfil para continuar</p>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => onLogin('Executor')}
            className="w-full flex items-center justify-center px-4 py-3 text-lg font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
          >
            <PersonIcon className="w-6 h-6 mr-3" />
            Pedro
          </button>
          <button
            onClick={() => onLogin('Supervisor')}
            className="w-full flex items-center justify-center px-4 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105"
          >
            <SupervisorIcon className="w-6 h-6 mr-3" />
            Sato
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;