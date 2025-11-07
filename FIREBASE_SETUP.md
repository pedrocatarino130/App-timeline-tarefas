# 🔥 Guia Completo de Configuração do Firebase

Este guia vai te ajudar a configurar o Firebase passo a passo para ativar a sincronização em tempo real entre os dispositivos do Pedro e Sato.

---

## 📋 Pré-requisitos

- [ ] Conta Google (Gmail)
- [ ] 10 minutos de tempo
- [ ] Acesso ao código do projeto

---

## 🚀 Passo 1: Criar Projeto no Firebase Console

### 1.1 Acesse o Firebase Console

Abra no navegador: **https://console.firebase.google.com/**

### 1.2 Criar Novo Projeto

1. Clique em **"Adicionar projeto"** (ou "Create a project")
2. **Nome do projeto**: `casa-satos-pet-hotel` (ou qualquer nome que preferir)
3. Clique em **"Continuar"**

### 1.3 Desabilitar Google Analytics (opcional)

1. A tela pergunta: "Ativar Google Analytics para este projeto?"
2. **Recomendação**: Desative (toggle para OFF) - não é necessário para este projeto
3. Clique em **"Criar projeto"**
4. Aguarde 30-60 segundos até aparecer "Seu projeto está pronto"
5. Clique em **"Continuar"**

✅ **Checkpoint**: Você deve estar agora no **Dashboard do projeto**

---

## 🗄️ Passo 2: Habilitar Firestore Database

### 2.1 Acessar Firestore

1. No menu lateral esquerdo, clique em **"Firestore Database"**
2. Clique no botão **"Criar banco de dados"** (ou "Create database")

### 2.2 Configurar Modo de Segurança

**Importante**: Escolha o modo correto!

1. Aparece a pergunta: "Como você deseja começar?"
2. **Escolha**: "Iniciar em modo de produção" (Start in **production mode**)
3. Clique em **"Avançar"**

⚠️ **Por que modo de produção?** Vamos configurar regras personalizadas depois.

### 2.3 Escolher Localização

1. **Localização do Firestore**: Escolha a região mais próxima
   - **Recomendado para Brasil**: `southamerica-east1` (São Paulo)
   - Alternativa: `us-central1` (Iowa, EUA)
2. ⚠️ **ATENÇÃO**: Esta escolha é **permanente** - não pode ser alterada depois!
3. Clique em **"Ativar"**
4. Aguarde 1-2 minutos até o banco ser criado

✅ **Checkpoint**: Deve aparecer a tela do Firestore vazia (sem documentos)

---

## 🔐 Passo 3: Configurar Regras de Segurança

### 3.1 Acessar Regras

1. No Firestore, clique na aba **"Regras"** (Rules) no topo
2. Você verá um editor de código

### 3.2 Substituir Regras

**APAGUE** todo o código existente e **COLE** este código:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Permite leitura e escrita no workspace compartilhado "casa_satos"
    match /workspaces/casa_satos {
      allow read, write: if true;
    }

    // Bloqueia acesso a outros documentos
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3.3 Publicar Regras

1. Clique no botão **"Publicar"** (Publish)
2. Aguarde confirmação: "Regras publicadas com sucesso"

✅ **Checkpoint**: Regras configuradas!

---

## 🔑 Passo 4: Obter Credenciais do Firebase

### 4.1 Acessar Configurações do Projeto

1. Clique no ⚙️ **ícone de engrenagem** no menu lateral esquerdo
2. Selecione **"Configurações do projeto"** (Project settings)

### 4.2 Registrar App Web

1. Role a página para baixo até a seção **"Seus apps"**
2. Clique no ícone **`</>`** (Web)
3. **Apelido do app**: `Casa Satos Web App`
4. **NÃO** marque "Configurar Firebase Hosting"
5. Clique em **"Registrar app"**

### 4.3 Copiar Credenciais

Aparecerá um código JavaScript. **COPIE** os valores!

---

## ⚙️ Passo 5: Configurar Variáveis de Ambiente

### 5.1 Criar Arquivo `.env`

```bash
cp .env.example .env
```

### 5.2 Editar Arquivo `.env`

Abra o arquivo `.env` e preencha com os valores do Firebase:

```bash
VITE_FIREBASE_API_KEY=sua-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 🧪 Passo 6: Testar

### 6.1 Reiniciar Servidor

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

### 6.2 Verificar Console

Procure por:
```
✅ Firebase inicializado com offline persistence habilitado!
```

### 6.3 Testar em 2 Abas

1. Aba 1: Adicione uma tarefa
2. Aba 2: Deve aparecer em ~2-3 segundos automaticamente

✅ **Funcionou?** Firebase configurado! 🎉

---

## ❌ Troubleshooting

### "Firebase não está configurado"
- Verifique se `.env` existe
- **Reinicie o servidor** após criar `.env`

### "invalid-api-key"
- Confira se copiou a API key corretamente
- Sem espaços extras

### "Missing permissions"
- Volte ao Firebase Console
- Firestore → Regras → Verifique o código
- Clique em "Publicar"

---

**Precisa de ajuda?** Verifique o Console do navegador (F12) para erros detalhados.
