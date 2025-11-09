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
let app: FirebaseApp | undefined;
let db: Firestore | undefined;

console.log('🔧 [FIREBASE] Iniciando configuração...');
console.log('🔧 [FIREBASE] Credenciais:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? '✅ Configurada' : '❌ Faltando'
});

try {
  if (!getApps().length) {
    console.log('🔧 [FIREBASE] Inicializando app pela primeira vez...');
    app = initializeApp(firebaseConfig);
    console.log('✅ [FIREBASE] App inicializado com sucesso!');
  } else {
    console.log('ℹ️ [FIREBASE] App já estava inicializado, reutilizando...');
    app = getApps()[0];
  }

  db = getFirestore(app);
  console.log('✅ [FIREBASE] Firestore conectado!');

  // Habilita offline persistence (IndexedDB) para funcionar sem internet
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ [FIREBASE] Offline persistence habilitado!');
      console.log('🎉 [FIREBASE] Tudo pronto! Sincronização em tempo real ativa.');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Múltiplas abas abertas - apenas a primeira consegue habilitar persistence
        console.warn('⚠️ [FIREBASE] Offline persistence não pôde ser habilitado (múltiplas abas abertas)');
        console.warn('ℹ️ [FIREBASE] Sincronização ainda funciona, apenas sem cache offline nesta aba.');
      } else if (err.code === 'unimplemented') {
        // Navegador não suporta IndexedDB
        console.warn('⚠️ [FIREBASE] Navegador não suporta offline persistence');
        console.warn('ℹ️ [FIREBASE] Sincronização online ainda funciona normalmente.');
      } else {
        console.error('❌ [FIREBASE] Erro ao habilitar offline persistence:', err);
      }
    });
} catch (error: any) {
  console.error('❌ [FIREBASE] ERRO CRÍTICO ao inicializar:', error);
  console.error('❌ [FIREBASE] Tipo de erro:', error.code || error.message);
  console.error('❌ [FIREBASE] App vai funcionar APENAS com localStorage (sem sincronização)');
  console.error('💡 [FIREBASE] Verifique:');
  console.error('   1. Se as credenciais do Firebase estão corretas');
  console.error('   2. Se o projeto existe no Firebase Console');
  console.error('   3. Se há conexão com a internet');
  // Garante que db seja undefined em caso de erro
  db = undefined;
  app = undefined;
}

export { app, db };
