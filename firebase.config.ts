import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Configuração do Firebase - Casa Satos Pet Hotel
// Credenciais do projeto: casa-satos-pet-hotel
// Estas credenciais são seguras para serem públicas - Firebase usa regras de segurança do Firestore
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCznbg7WdWxmvKpVktDZbwQqNDJXjXm1XQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "casa-satos-pet-hotel.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "casa-satos-pet-hotel",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "casa-satos-pet-hotel.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "142705392038",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:142705392038:web:242a8d4e6c5238eb907767"
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

  // Habilita offline persistence (IndexedDB) para funcionar sem internet
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Firebase inicializado com offline persistence habilitado!');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Múltiplas abas abertas - apenas a primeira consegue habilitar persistence
        console.warn('⚠️ Offline persistence não pôde ser habilitado (múltiplas abas abertas)');
      } else if (err.code === 'unimplemented') {
        // Navegador não suporta IndexedDB
        console.warn('⚠️ Navegador não suporta offline persistence');
      } else {
        console.error('❌ Erro ao habilitar offline persistence:', err);
      }
    });
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error);
  // Se houver erro, continuamos sem Firebase (fallback para localStorage)
}

export { app, db };
