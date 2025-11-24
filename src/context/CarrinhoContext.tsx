import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { CarrinhoItem } from '../../app/(tabs)/index';

interface CarrinhoContextData {
  carrinho: CarrinhoItem[];
  total: number;
  adicionarItem: (item: Omit<CarrinhoItem, 'id'>) => void;
  removerItem: (itemId: string) => void;
  limparCarrinho: () => void;
  isLoading: boolean;
}

const STORAGE_KEY = '@fishup:carrinho';

const CarrinhoContext = createContext<CarrinhoContextData | undefined>(undefined);

export const CarrinhoProvider = ({ children }: { children: ReactNode }) => {
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar
  useEffect(() => {
    async function loadCart() {
      try {
        const savedCart = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedCart) setCarrinho(JSON.parse(savedCart));
      } catch (error) {
        console.error("Erro ao carregar carrinho:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCart();
  }, []);

  // Salvar
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho)).catch(console.error);
    }
  }, [carrinho, isLoading]);

  // CÁLCULO DO TOTAL (COM MILHEIRO)
  const total = carrinho.reduce((sum, item) => {
    if (item.unidade === 'milheiro') {
      // Preço é por 1000 unidades
      return sum + (item.quantidade / 1000) * item.precoUnitario;
    }
    // Preço é por Kg ou Unidade simples
    return sum + item.quantidade * item.precoUnitario;
  }, 0);

  const adicionarItem = (item: Omit<CarrinhoItem, 'id'>) => {
    if (!item.quantidade || item.quantidade <= 0 || !item.precoUnitario || item.precoUnitario <= 0) {
      Alert.alert("Erro", "Quantidade e preço devem ser positivos.");
      return;
    }
    
    const novoItem: CarrinhoItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString().slice(2), 
    };

    setCarrinho(prev => [...prev, novoItem]);
    
    // Feedback visual do que foi adicionado
    const unidadeTexto = item.unidade === 'milheiro' ? 'milheiro(s)' : 'kg';
    Alert.alert("Sucesso", `${item.produtoNome}\nAdicionado: ${item.quantidade} (${unidadeTexto})`);
  };

  const removerItem = (id: string) => setCarrinho(prev => prev.filter(i => i.id !== id));
  
  const limparCarrinho = async () => {
    setCarrinho([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CarrinhoContext.Provider value={{ carrinho, total, adicionarItem, removerItem, limparCarrinho, isLoading }}>
      {children}
    </CarrinhoContext.Provider>
  );
};

export const useCarrinho = () => {
  const context = useContext(CarrinhoContext);
  if (!context) throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider');
  return context;
};