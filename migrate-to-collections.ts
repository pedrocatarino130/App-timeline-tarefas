/**
 * 🔄 Script de Migração: Workspace → Collections
 * 
 * Move dados de workspaces/casa_satos (estrutura antiga)
 * para collections separadas (estrutura nova e simples)
 * 
 * COMO USAR:
 * 1. Instalar ts-node: npm install -g ts-node
 * 2. Executar: ts-node migrate-to-collections.ts
 * 3. Aguardar confirmação de migração
 * 4. Deletar workspace antigo (opcional - deixar como backup)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, setDoc, Timestamp } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCznbg7WdWxmvKpVktDZbwQqNDJXjXm1XQ",
  authDomain: "casa-satos-pet-hotel.firebaseapp.com",
  projectId: "casa-satos-pet-hotel",
  storageBucket: "casa-satos-pet-hotel.firebasestorage.app",
  messagingSenderId: "142705392038",
  appId: "1:142705392038:web:242a8d4e6c5238eb907767"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface OldUserData {
  tasks: any[];
  reminders: any[];
  goals: any[];
  goalCompletions: any[];
  lastUpdated: number;
  lastDeviceId?: string;
  version?: number;
}

async function migrateData() {
  console.log('🔄 Iniciando migração de dados...\n');

  try {
    // 1. Ler dados do workspace antigo
    console.log('📖 Lendo dados de workspaces/casa_satos...');
    const workspaceRef = doc(db, 'workspaces', 'casa_satos');
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      console.log('⚠️  Workspace não encontrado. Nada para migrar.');
      console.log('✅ Estrutura nova já pode ser usada diretamente!');
      return;
    }

    const oldData = workspaceSnap.data() as OldUserData;
    console.log('✅ Dados carregados:');
    console.log(`   - ${oldData.tasks?.length || 0} tarefas`);
    console.log(`   - ${oldData.reminders?.length || 0} lembretes`);
    console.log(`   - ${oldData.goals?.length || 0} metas`);
    console.log(`   - ${oldData.goalCompletions?.length || 0} conclusões de metas\n`);

    // 2. Migrar Tasks
    if (oldData.tasks && oldData.tasks.length > 0) {
      console.log('📝 Migrando tarefas...');
      for (const task of oldData.tasks) {
        const taskData = {
          description: task.description || '',
          timestamp: task.timestamp ? 
            (typeof task.timestamp === 'string' ? Timestamp.fromDate(new Date(task.timestamp)) : Timestamp.fromDate(task.timestamp)) 
            : Timestamp.now(),
          mediaUrl: task.mediaUrl || null,
          mediaType: task.mediaType || null,
          author: task.author || null,
        };
        
        await setDoc(doc(db, 'tasks', task.id), taskData);
        console.log(`   ✅ Tarefa migrada: ${task.id}`);
      }
      console.log(`✅ ${oldData.tasks.length} tarefas migradas!\n`);
    }

    // 3. Migrar Reminders
    if (oldData.reminders && oldData.reminders.length > 0) {
      console.log('💬 Migrando lembretes...');
      for (const reminder of oldData.reminders) {
        const reminderData = {
          type: reminder.type || 'text',
          content: reminder.content || '',
          audioUrl: reminder.audioUrl || null,
          timestamp: reminder.timestamp ? 
            (typeof reminder.timestamp === 'string' ? Timestamp.fromDate(new Date(reminder.timestamp)) : Timestamp.fromDate(reminder.timestamp)) 
            : Timestamp.now(),
          status: reminder.status || 'pending',
          linkedTaskId: reminder.linkedTaskId || null,
          author: reminder.author || null,
        };
        
        await setDoc(doc(db, 'reminders', reminder.id), reminderData);
        console.log(`   ✅ Lembrete migrado: ${reminder.id}`);
      }
      console.log(`✅ ${oldData.reminders.length} lembretes migrados!\n`);
    }

    // 4. Migrar Goals
    if (oldData.goals && oldData.goals.length > 0) {
      console.log('🎯 Migrando metas...');
      for (const goal of oldData.goals) {
        const goalData = {
          description: goal.description || '',
          type: goal.type || 'unique',
          createdAt: goal.createdAt ? 
            (typeof goal.createdAt === 'string' ? Timestamp.fromDate(new Date(goal.createdAt)) : Timestamp.fromDate(goal.createdAt)) 
            : Timestamp.now(),
          audioUrl: goal.audioUrl || null,
          author: goal.author || null,
        };
        
        await setDoc(doc(db, 'goals', goal.id), goalData);
        console.log(`   ✅ Meta migrada: ${goal.id}`);
      }
      console.log(`✅ ${oldData.goals.length} metas migradas!\n`);
    }

    // 5. Migrar Goal Completions
    if (oldData.goalCompletions && oldData.goalCompletions.length > 0) {
      console.log('✔️  Migrando conclusões de metas...');
      for (const completion of oldData.goalCompletions) {
        const completionId = `${completion.goalId}_${completion.date}`;
        const completionData = {
          goalId: completion.goalId || '',
          date: completion.date || '',
          completed: completion.completed || false,
        };
        
        await setDoc(doc(db, 'goalCompletions', completionId), completionData);
        console.log(`   ✅ Conclusão migrada: ${completionId}`);
      }
      console.log(`✅ ${oldData.goalCompletions.length} conclusões migradas!\n`);
    }

    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n');
    console.log('📌 Próximos passos:');
    console.log('   1. Verifique os dados no Firebase Console');
    console.log('   2. Teste a aplicação com a nova estrutura');
    console.log('   3. (Opcional) Delete workspaces/casa_satos para economizar espaço');
    console.log('   4. Atualize as regras do Firestore para a nova estrutura\n');

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    console.error('\n💡 Verifique:');
    console.error('   - Conexão com internet');
    console.error('   - Credenciais do Firebase');
    console.error('   - Permissões do Firestore (regras)');
  }
}

// Executar migração
console.log('=====================================');
console.log('  MIGRAÇÃO: Workspace → Collections  ');
console.log('=====================================\n');

migrateData()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

