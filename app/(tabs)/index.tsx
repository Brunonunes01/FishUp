// app/(tabs)/index.tsx

import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';

import { CarrinhoProvider } from '../../src/context/CarrinhoContext';
import { auth } from '../../src/services/connectionFirebase';

// TELAS
import AlimentacaoScreen from '../../src/screens/AlimentacaoScreen';
import LoginScreen from '../../src/screens/Auth/LoginScreen';
import RegisterScreen from '../../src/screens/Auth/RegisterScreen';
import BiometriaScreen from '../../src/screens/BiometriaScreen';
import CarrinhoScreen from '../../src/screens/CarrinhoScreen';
import DashboardScreen from '../../src/screens/DashboardScreen';
// HomeScreen removida daqui
import ClientesScreen from '../../src/screens/ClientesScreen';
import ListaUsuarios from '../../src/screens/ListaUsuarios';
import LotesScreen from '../../src/screens/LotesScreen';
import PedidosScreen from '../../src/screens/PedidosScreen';
import PeixesScreen from '../../src/screens/PeixesScreen';
import PerfilScreen from '../../src/screens/PerfilScreen';
import TanquesScreen from '../../src/screens/TanquesScreen';
import PlaceholderScreen from '../../src/screens/TelaPlaceholder';

// =====================================================================
// TIPOS
// =====================================================================

export type Tanque = {
  id: string;
  name: string;
  location: string;
  comprimento: number;
  largura: number;
  profundidade: number;
  volume: number;
  createdAt?: string;
  updatedAt?: string;
  status?: 'ativo' | 'manutencao' | 'inativo';
  tipo?: 'concreto' | 'fibra' | 'terra' | 'outro';
};

export type Peixe = {
  id: string;
  nomePopular: string;
  nomeCientifico: string;
  familia: string;
  temperaturaIdeal: string;
  phIdeal: string;
  observacoes?: string;
};

export type Lote = {
  id: string;
  nomeLote: string;
  especie: string;
  quantidade: number;
  quantidadeInicial: number;
  fornecedor: string;
  pesoInicialMedio: number;
  comprimentoInicialMedio?: number;
  tanqueId: string;
  tanqueNome: string;
  dataInicio: string;
  observacoes?: string;
  status?: 'ativo' | 'colhido' | 'transferido' | 'doente';
  faseCultivo?: 'alevinagem' | 'recria' | 'engorda' | 'terminacao';
  dataEstimadaColheita?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AlimentacaoRegistro = {
  id: string;
  data: string;
  loteId: string;
  loteNome: string;
  quantidadeFornecida: number;
  sobrasEstimadas: number;
  biomassaCalculada: number;
  taxaAlimentarAplicada: number;
};

export type CarrinhoItem = {
  id: string;
  loteId: string;
  loteNome: string;
  produtoNome: string;
  quantidade: number;     
  precoUnitario: number;   
  unidade: 'kg' | 'milheiro' | 'unidade';
  observacoes?: string;
};

export type Pedido = {
  id: string;
  cliente: string;
  produto: string;
  quantidade: number;
  valor: number;
  status: 'pendente' | 'processando' | 'concluido' | 'cancelado';
  dataEntrega: string;
  timestamp: number;
  createdAt?: string;
  updatedAt?: string;
  telefoneCliente?: string;
  emailCliente?: string;
  enderecoEntrega?: string;
  formaPagamento?: 'dinheiro' | 'cartao' | 'transferencia' | 'pix';
  statusPagamento?: 'pendente' | 'pago' | 'parcial';
  itensCarrinho?: CarrinhoItem[];
  prioridade?: 'baixa' | 'media' | 'alta';
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  tipo: 'varejo' | 'atacado' | 'distribuidor';
  cpfCnpj?: string;
  observacoes?: string;
  dataCadastro: string;
  pedidosRealizados: number;
  valorTotalComprado: number;
  updatedAt?: string;
};

// =====================================================================
// TIPOS DE NAVEGAÇÃO
// =====================================================================

export type RootStackParamList = {
  // Home removida
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Perfil: { userId?: string } | undefined;
  Tanques: undefined;
  Lotes: undefined;
  Peixes: undefined;
  Alimentacao: undefined;
  Biometria: undefined;
  Relatorios: undefined;
  ListaUsuarios: undefined;
  Pedidos: undefined;
  Carrinho: undefined;
  Clientes: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// =====================================================================
// STACKS
// =====================================================================

function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login" // Agora começa direto no Login
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#0F172A' }, // Fundo escuro para evitar flash branco
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#0F172A' }, // Fundo escuro padrão
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="Tanques" component={TanquesScreen} />
      <Stack.Screen name="Lotes" component={LotesScreen} />
      <Stack.Screen name="Peixes" component={PeixesScreen} />
      <Stack.Screen name="Alimentacao" component={AlimentacaoScreen} />
      <Stack.Screen name="Biometria" component={BiometriaScreen} />
      <Stack.Screen name="Relatorios" component={PlaceholderScreen} />
      <Stack.Screen name="ListaUsuarios" component={ListaUsuarios} />
      <Stack.Screen name="Pedidos" component={PedidosScreen} />
      <Stack.Screen name="Carrinho" component={CarrinhoScreen} />
      <Stack.Screen name="Clientes" component={ClientesScreen} /> 
    </Stack.Navigator>
  );
}

// =====================================================================
// ROOT STACK
// =====================================================================

export default function RootStack() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (loading) setLoading(false);
    });

    return unsubscribe;
  }, [loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0F172A', // Loading escuro também
        }}
      >
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <CarrinhoProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {user ? <AppStack /> : <AuthStack />}
    </CarrinhoProvider>
  );
}