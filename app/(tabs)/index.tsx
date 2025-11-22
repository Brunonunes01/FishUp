// src/navigation/RootStack.tsx (ou o caminho que você estiver usando)

import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { auth } from '../../src/services/connectionFirebase';

// TELAS
import AlimentacaoScreen from '../../src/screens/AlimentacaoScreen';
import LoginScreen from '../../src/screens/Auth/LoginScreen';
import RegisterScreen from '../../src/screens/Auth/RegisterScreen';
import BiometriaScreen from '../../src/screens/BiometriaScreen';
import CarrinhoScreen from '../../src/screens/CarrinhoScreen';
import DashboardScreen from '../../src/screens/DashboardScreen';
import HomeScreen from '../../src/screens/HomeScreen';
import ListaUsuarios from '../../src/screens/ListaUsuarios';
import LotesScreen from '../../src/screens/LotesScreen';
import PedidosScreen from '../../src/screens/PedidosScreen';
import PeixesScreen from '../../src/screens/PeixesScreen';
import PerfilScreen from '../../src/screens/PerfilScreen';
import TanquesScreen from '../../src/screens/TanquesScreen';
import PlaceholderScreen from '../../src/screens/TelaPlaceholder';

// =====================================================================
// TIPOS (os mesmos que você já tinha – mantive tudo)
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
  oxigenioIdeal?: string;
  salinidadeIdeal?: string;
  dietaRecomendada?: string;
  cicloVida?: string;
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
  tipoRacao?: string;
  frequenciaAlimentacao?: number;
  conversaoAlimentar?: number;
  custoRacao?: number;
  observacoes?: string;
};

export type BiometriaRegistro = {
  id: string;
  data: string;
  loteId: string;
  loteNome: string;
  pesoMedioCalculado: number;
  biomassaTotalEstimada: number;
  mortalidadeRegistrada: number;
  observacoes?: string;
  comprimentoMedio?: number;
  taxaCrescimentoDiario?: number;
  conversaoAlimentar?: number;
  uniformidade?: number;
  sobrevivencia?: number;
  quantidadePeixesInicial?: number;
  quantidadePeixesAtual?: number;
  racaoConsumida?: number;
  ganhoPesoDiario?: number;
  fatorCondicao?: number;
  biomassaPorMetroCubico?: number;
  diasCultivo?: number;
  temperaturaAgua?: number;
  phAgua?: number;
  oxigenioDissolvido?: number;
  amonia?: number;
  nitrito?: number;
};

export type QualidadeAguaRegistro = {
  id: string;
  data: string;
  tanqueId: string;
  tanqueNome: string;
  loteId?: string;
  loteNome?: string;
  temperatura: number;
  ph: number;
  oxigenioDissolvido: number;
  amonia: number;
  nitrito: number;
  nitrato: number;
  transparencia?: number;
  alcalinidade?: number;
  dureza?: number;
  observacoes?: string;
};

export type CarrinhoItem = {
  id: string;
  loteId: string;
  loteNome: string;
  produtoNome: string;
  quantidadeKg: number;
  precoUnitarioKg: number;
  tamanho?: 'pequeno' | 'médio' | 'grande' | string;
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
  especie?: string;
  tamanho?: string;
  observacoes?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  formaPagamento?: 'dinheiro' | 'cartao' | 'transferencia' | 'pix';
  statusPagamento?: 'pendente' | 'pago' | 'parcial';
  itensCarrinho?: CarrinhoItem[];
};

export type Relatorio = {
  id: string;
  tipo: 'producao' | 'vendas' | 'biometria' | 'alimentacao' | 'qualidade_agua';
  periodo: 'diario' | 'semanal' | 'mensal' | 'anual';
  dataInicio: string;
  dataFim: string;
  metricas: {
    producaoTotal?: number;
    vendasTotal?: number;
    taxaSobrevivenciaMedia?: number;
    conversaoAlimentarMedia?: number;
    custoProducao?: number;
    lucro?: number;
  };
  createdAt: string;
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
};

export type Fornecedor = {
  id: string;
  nome: string;
  tipo: 'racao' | 'alevino' | 'equipamento' | 'outros';
  telefone: string;
  email?: string;
  endereco?: string;
  produtosFornecidos: string[];
  avaliacao?: number;
  observacoes?: string;
  dataCadastro: string;
};

export type EstoqueRacao = {
  id: string;
  tipoRacao: string;
  marca?: string;
  quantidade: number;
  unidade: 'kg' | 'saco';
  pesoPorSaco?: number;
  dataCompra: string;
  dataValidade: string;
  fornecedorId: string;
  fornecedorNome: string;
  custoUnitario: number;
  localArmazenamento?: string;
  observacoes?: string;
};

export type Manutencao = {
  id: string;
  tipo: 'preventiva' | 'corretiva' | 'preditiva';
  equipamento: string;
  tanqueId?: string;
  descricao: string;
  dataProgramada: string;
  dataRealizacao?: string;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  custo?: number;
  responsavel: string;
  observacoes?: string;
  createdAt: string;
};

// =====================================================================
// TIPOS DE NAVEGAÇÃO
// =====================================================================

export type RootStackParamList = {
  Home: undefined;
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
};

const Stack = createStackNavigator<RootStackParamList>();

// =====================================================================
// STACKS
// =====================================================================

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
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
        cardStyle: { backgroundColor: '#f8fafc' },
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
    </Stack.Navigator>
  );
}

// =====================================================================
// ROOT STACK (decide entre Auth ou App pela autenticação)
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
          backgroundColor: '#f8fafc',
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return user ? <AppStack /> : <AuthStack />;
}
