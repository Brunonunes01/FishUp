// services/connectionFirebase.tsx

import { initializeApp } from "firebase/app";
// Importar getReactNativePersistence, initializeAuth E getAuth
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { getDatabase } from "firebase/database";
// Importar o módulo de armazenamento seguro do Expo
import * as SecureStore from "expo-secure-store";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB5VNyyQ1fny44O1Yd2B1tJy5li7KXl9GQ",
  authDomain: "piscicultura-app-244f6.firebaseapp.com",
  databaseURL: "https://piscicultura-app-244f6-default-rtdb.firebaseio.com",
  projectId: "piscicultura-app-244f6",
  storageBucket: "piscicultura-app-244f6.appspot.com",
  messagingSenderId: "758916070691",
  appId: "1:758916070691:web:ce934ac8c5469a2083a096",
};

// Objeto Wrapper FINAL: Mapeia a API do Firebase para o SecureStore,
// limpa as chaves problemáticas E verifica se a chave resultante é vazia.
const SecureStoreWrapper = {
    // Função para limpar a chave, substituindo caracteres inválidos (como ':') por '_'
    cleanKey: (key: string) => key.replace(/[^a-zA-Z0-9.\-_]/g, '_'),

    // Firebase espera 'setItem', mas SecureStore tem 'setItemAsync'
    setItem: (key: string, value: string) => {
        const cleanKey = SecureStoreWrapper.cleanKey(key);
        
        // CORREÇÃO: Evita chamar SecureStore com uma chave vazia
        if (!cleanKey) return Promise.resolve();
        
        return SecureStore.setItemAsync(cleanKey, value);
    },
    
    // Firebase espera 'getItem', mas SecureStore tem 'getItemAsync'
    getItem: (key: string) => {
        const cleanKey = SecureStoreWrapper.cleanKey(key);
        
        // CORREÇÃO: Evita chamar SecureStore com uma chave vazia
        if (!cleanKey) return Promise.resolve(null);
        
        return SecureStore.getItemAsync(cleanKey);
    },
    
    // Firebase espera 'removeItem', mas SecureStore tem 'deleteItemAsync'
    removeItem: (key: string) => {
        const cleanKey = SecureStoreWrapper.cleanKey(key);
        
        // CORREÇÃO: Evita chamar SecureStore com uma chave vazia
        if (!cleanKey) return Promise.resolve();
        
        return SecureStore.deleteItemAsync(cleanKey);
    },
};

// Inicializa o app
const app = initializeApp(firebaseConfig);

let authInstance;
// 1. CORREÇÃO DE INICIALIZAÇÃO: Usa try/catch para evitar o erro 'auth/already-initialized'
try {
    authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(SecureStoreWrapper),
    });
} catch (e) {
    // Se a inicialização falhar (porque já foi inicializado),
    // apenas pegamos a instância existente.
    authInstance = getAuth(app);
}

export const auth = authInstance;

// Realtime Database
export const database = getDatabase(app);

export default app;