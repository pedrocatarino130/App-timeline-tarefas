# 🔥 Configuração do Firebase - Sincronização de Dados

## 📌 O Problema que Resolvemos

Antes, os dados eram salvos apenas no `localStorage` do navegador, o que significa que:
- ❌ Dados do celular não apareciam no notebook
- ❌ Dados do notebook não apareciam no celular
- ❌ Cada dispositivo tinha sua própria cópia dos dados

**Agora com Firebase:**
- ✅ Dados sincronizados automaticamente entre TODOS os dispositivos
- ✅ Salva no celular → Aparece no notebook instantaneamente
- ✅ Salva no notebook → Aparece no celular instantaneamente
- ✅ Backup automático na nuvem

---

## 🚀 Como Configurar (Passo a Passo)

### 1️⃣ Criar Conta no Firebase

1. Acesse: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Clique em **"Adicionar projeto"** ou **"Create a project"**

### 2️⃣ Criar um Novo Projeto

1. **Nome do projeto**: Escolha um nome (ex: "pet-hotel-tarefas")
2. **Google Analytics**: Pode desabilitar (não é necessário)
3. Clique em **"Criar projeto"**
4. Aguarde a criação (leva uns segundos)

### 3️⃣ Configurar Firestore Database

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"** ou **"Create database"**
3. Selecione o modo de produção: **"Iniciar no modo de produção"** ou **"Start in production mode"**
4. Escolha a localização mais próxima (ex: "southamerica-east1" para Brasil)
5. Clique em **"Ativar"**

### 4️⃣ Configurar Regras de Segurança

1. Ainda na seção **Firestore Database**, clique na aba **"Regras"** ou **"Rules"**
2. Substitua as regras existentes por estas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true;
    }
  }
}
```

3. Clique em **"Publicar"** ou **"Publish"**

⚠️ **NOTA**: Estas regras permitem acesso público. Para produção, você deve adicionar autenticação adequada.

### 5️⃣ Obter Credenciais do Projeto

1. Clique no ícone de engrenagem ⚙️ ao lado de "Visão geral do projeto" no menu lateral
2. Clique em **"Configurações do projeto"** ou **"Project settings"**
3. Role para baixo até a seção **"Seus aplicativos"**
4. Clique no ícone **"</>"** (Web)
5. Dê um nome ao app (ex: "pet-hotel-web")
6. **NÃO** marque "Configure Firebase Hosting"
7. Clique em **"Registrar app"**

### 6️⃣ Copiar Configuração

Você verá um código parecido com este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 7️⃣ Configurar no Projeto

**Opção 1: Usando arquivo .env (RECOMENDADO)**

1. Crie um arquivo chamado `.env` na raiz do projeto
2. Copie o conteúdo de `.env.example`
3. Preencha com suas credenciais:

```env
VITE_FIREBASE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

**Opção 2: Editando diretamente o firebase.config.ts**

1. Abra o arquivo `firebase.config.ts`
2. Substitua os valores padrão pelas suas credenciais:

```typescript
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 8️⃣ Testar a Sincronização

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Abra a aplicação em dois navegadores/dispositivos diferentes

3. No **primeiro dispositivo**:
   - Adicione uma nova tarefa
   - Você verá o indicador "Sincronizando..." no canto superior direito

4. No **segundo dispositivo**:
   - Atualize a página ou aguarde alguns segundos
   - A nova tarefa deve aparecer automaticamente! 🎉

---

## 🔍 Como Saber se Está Funcionando?

### ✅ Sinais de que está tudo OK:

1. **Console do navegador** (F12):
   ```
   🔄 Carregando dados do Firebase...
   ✅ Dados carregados do Firebase!
   🔄 Configurando sincronização em tempo real...
   ```

2. **Indicador visual**: Quando você adiciona/edita algo, aparece "Sincronizando..." no canto superior direito

3. **Firebase Console**:
   - Acesse https://console.firebase.google.com/
   - Vá em "Firestore Database"
   - Você verá uma coleção chamada "users" com seus dados

### ❌ Sinais de problema:

1. **Console mostra erros** como:
   ```
   Firebase não está configurado. Usando apenas localStorage.
   ```
   **Solução**: Verifique se as credenciais estão corretas

2. **Erro de permissão**:
   ```
   Missing or insufficient permissions
   ```
   **Solução**: Verifique as regras do Firestore (passo 4)

---

## 🆔 Como Compartilhar Dados Entre Dispositivos

A aplicação gera automaticamente um **ID único** para você no primeiro acesso. Este ID fica salvo no localStorage e é usado para sincronizar seus dados.

### Para usar os mesmos dados em vários dispositivos:

**Opção 1: Copiar o User ID (Simples)**

1. No **primeiro dispositivo**, abra o Console do navegador (F12)
2. Digite:
   ```javascript
   localStorage.getItem('pet_hotel_user_id')
   ```
3. Copie o ID que aparecer (algo como: `user_1234567890_abc123`)

4. No **segundo dispositivo**, abra o Console (F12)
5. Digite:
   ```javascript
   localStorage.setItem('pet_hotel_user_id', 'user_1234567890_abc123')
   ```
   (Substitua pelo ID que você copiou)

6. Recarregue a página

**Opção 2: Implementar QR Code ou Login (Avançado)**

Podemos implementar um sistema de compartilhamento por QR Code ou login com email. Entre em contato se precisar dessa funcionalidade!

---

## 🛡️ Segurança e Privacidade

### ⚠️ Configuração Atual (Desenvolvimento)

A configuração atual permite que qualquer pessoa leia/escreva dados. Isso é OK para:
- ✅ Desenvolvimento e testes
- ✅ Uso pessoal em dispositivos confiáveis
- ✅ Protótipos e demos

### 🔐 Para Uso em Produção

Se você quiser compartilhar a aplicação publicamente, recomendo implementar autenticação:

1. **Firebase Authentication** (Email/Google/etc)
2. **Regras de segurança** restritas ao usuário logado:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Apenas o próprio usuário pode acessar seus dados
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 💰 Custos

### Plano Gratuito do Firebase (Spark):

- ✅ **50.000** leituras por dia
- ✅ **20.000** escritas por dia
- ✅ **1 GB** de armazenamento

Para uma aplicação de gerenciamento de tarefas pessoal/pequena equipe, o plano gratuito é **mais que suficiente**!

### Exemplo de uso:
- 100 tarefas adicionadas por dia = 100 escritas
- Sincronização em 3 dispositivos = ~300 leituras por dia
- Total: **Bem dentro do limite gratuito!**

---

## 🆘 Precisa de Ajuda?

### Problemas Comuns:

**1. "Firebase não inicializado"**
- Verifique se o arquivo `.env` existe e está preenchido
- Reinicie o servidor de desenvolvimento (`npm run dev`)

**2. "Dados não sincronizam"**
- Verifique sua conexão com a internet
- Abra o Console (F12) e veja se há erros
- Verifique as regras do Firestore

**3. "Erro ao salvar no Firebase"**
- Verifique se o Firestore está ativado no console do Firebase
- Verifique as regras de segurança

---

## 📚 Recursos Adicionais

- [Documentação Firestore](https://firebase.google.com/docs/firestore)
- [Regras de Segurança](https://firebase.google.com/docs/firestore/security/get-started)
- [Console Firebase](https://console.firebase.google.com/)

---

**🎉 Pronto! Agora seus dados estão sincronizados entre todos os dispositivos!**
