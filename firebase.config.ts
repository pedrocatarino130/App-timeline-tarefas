import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuração do Firebase
// IMPORTANTE: Configure suas credenciais do Firebase no objeto abaixo
// Você pode obter essas credenciais em: https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "sua-api-key-aqui",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "seu-projeto.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "seu-projeto-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "seu-projeto.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Inicializa Firebase apenas se ainda não foi inicializado
let app: FirebaseApp;
let db: Firestore;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
} catch (error) {
  console.error('Erro ao inicializar Firebase:', error);
  // Se houver erro, continuamos sem Firebase (fallback para localStorage)
}

export { app, db };
