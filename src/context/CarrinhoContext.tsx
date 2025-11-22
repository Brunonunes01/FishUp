import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Alert } from 'react-native';
// REMOVIDO: import { nanoid } from 'nanoid'; // Dependência que estava causando erro
import { CarrinhoItem } from '../../app/(tabs)/index'; // Importação do tipo CarrinhoItem

// --- Tipos ---
interface CarrinhoContextData {
  carrinho: CarrinhoItem[];
  total: number;
  adicionarItem: (item: Omit<CarrinhoItem, 'id'>) => void;
  removerItem: (itemId: string) => void;
  limparCarrinho: () => void;
}

const CarrinhoContext = createContext<CarrinhoContextData | undefined>(undefined);

// --- Provider Componente ---
export const CarrinhoProvider = ({ children }: { children: ReactNode }) => {
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);

  // Calcula o valor total do carrinho
  const total = carrinho.reduce((sum, item) => sum + (item.quantidadeKg * item.precoUnitarioKg), 0);

  const adicionarItem = (item: Omit<CarrinhoItem, 'id'>) => {
    // Validação de segurança já presente
    if (!item.quantidadeKg || item.quantidadeKg <= 0 || !item.precoUnitarioKg || item.precoUnitarioKg <= 0) {
      Alert.alert("Erro", "Quantidade e preço por Kg devem ser maiores que zero.");
      return;
    }
    
    const novoItem: CarrinhoItem = {
      ...item,
      // NOVO ID: Usa o timestamp e um número aleatório para gerar um ID único e seguro para o front-end
      id: Date.now().toString() + Math.random().toString(), 
    };

    setCarrinho(prev => [...prev, novoItem]);
    Alert.alert("Sucesso", `${item.produtoNome} adicionado ao carrinho!`);
  };

  const removerItem = (itemId: string) => {
    setCarrinho(prev => prev.filter(item => item.id !== itemId));
  };

  const limparCarrinho = () => {
    setCarrinho([]);
  };

  return (
    <CarrinhoContext.Provider value={{ carrinho, total, adicionarItem, removerItem, limparCarrinho }}>
      {children}
    </CarrinhoContext.Provider>
  );
};

// --- Hook Customizado ---
export const useCarrinho = () => {
  const context = useContext(CarrinhoContext);
  if (context === undefined) {
    throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider');
  }
  return context;
};