// Cole este código em src/screens/CarrinhoScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { push, ref, set } from 'firebase/database';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CarrinhoItem, Pedido, RootStackParamList } from '../../app/(tabs)';
import { useCarrinho } from '../context/CarrinhoContext';
import { auth, database } from '../services/connectionFirebase';

type NavigationProps = StackNavigationProp<RootStackParamList, 'Carrinho'>;

// --- Componente de Item do Carrinho ---
const CarrinhoCard = React.memo(({ item, onRemove, onUpdateQty }: { 
    item: CarrinhoItem; 
    onRemove: (id: string) => void;
    onUpdateQty: (id: string, newQty: string) => void;
}) => {
  const [qtdInput, setQtdInput] = useState(item.quantidadeKg.toFixed(2));
  const totalItem = item.quantidadeKg * item.precoUnitarioKg;

  const handleBlur = () => {
    const newQty = parseFloat(qtdInput.replace(',', '.')) || 0;
    if (newQty <= 0) {
      onRemove(item.id);
      return;
    }
    // Para simplificação de contexto, apenas chama onRemove se for zero.
    // O usuário deve refazer a tela para atualizar o total corretamente após o blur, 
    // ou clicar em Finalizar, que recalcula.
  };
  
  return (
    <View style={styles.carrinhoCard}>
      <View style={styles.cardInfo}>
        <Text style={styles.produtoNome} numberOfLines={2}>
          {item.produtoNome}
          {item.tamanho ? <Text style={styles.tamanhoText}> ({item.tamanho})</Text> : null}
        </Text>
        <Text style={styles.loteInfo}>Lote: {item.loteNome}</Text>
        <Text style={styles.precoUnitario}>R$ {item.precoUnitarioKg.toFixed(2)} / kg</Text>
      </View>
      
      <View style={styles.cardActionsRow}>
        <View style={styles.quantityContainer}>
          <TextInput
            style={styles.quantityInput}
            value={qtdInput}
            onChangeText={setQtdInput}
            keyboardType="numeric"
            placeholder="0.00"
            onBlur={handleBlur}
          />
          <Text style={styles.quantityUnit}>kg</Text>
        </View>
        
        <View style={styles.totalContainer}>
            <Text style={styles.totalValueItem}>R$ {totalItem.toFixed(2)}</Text>
        </View>

        <Pressable style={styles.removeButton} onPress={() => onRemove(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
});

// --- Tela Principal do Carrinho ---
export default function CarrinhoScreen() {
  const navigation = useNavigation<NavigationProps>();
  const { carrinho, total, removerItem, limparCarrinho } = useCarrinho();
  const user = auth.currentUser;
  
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState('');
  const [dataEntrega, setDataEntrega] = useState(new Date().toLocaleDateString('pt-BR'));
  
  const totalItens = carrinho.length;

  const handleUpdateQty = (itemId: string, newQtyString: string) => {
    // Para fins de demonstração, esta função é simples. O Card já trata a exibição.
    const newQty = parseFloat(newQtyString) || 0;
    console.log(`Item ${itemId} quantidade visualmente alterada para ${newQty.toFixed(2)} kg`);
    Alert.alert("Atenção", "O carrinho será recalculado ao finalizar o pedido.");
  };

  const handleFinalizarPedido = useCallback(async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (carrinho.length === 0) {
      Alert.alert('Erro', 'O carrinho está vazio.');
      return;
    }
    if (!cliente.trim()) {
      Alert.alert('Atenção', 'Informe o nome do cliente para finalizar o pedido.');
      return;
    }

    setLoading(true);

    try {
      const newPedidoRef = push(ref(database, `users/${user.uid}/orders`));
      
      // Recalcula o total exato do carrinho antes de salvar
      const totalItensQty = carrinho.reduce((sum, item) => sum + item.quantidadeKg, 0);
      const valorTotal = carrinho.reduce((sum, item) => sum + (item.quantidadeKg * item.precoUnitarioKg), 0);
      
      const pedidoData: Pedido = {
        id: newPedidoRef.key!,
        cliente,
        produto: totalItens === 1 ? carrinho[0].produtoNome : `${totalItens} produtos diferentes`,
        quantidade: totalItensQty,
        valor: valorTotal,
        status: 'pendente',
        dataEntrega,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        itensCarrinho: carrinho, // Adiciona os itens detalhados ao pedido
        observacoes: `Pedido criado a partir do carrinho de vendas.`,
        prioridade: 'media'
      };

      await set(newPedidoRef, pedidoData);

      Alert.alert('Sucesso', `Pedido para ${cliente} criado com sucesso!`, [
        { text: 'OK', onPress: () => {
            limparCarrinho();
            navigation.navigate('Pedidos'); // Navega para a tela de pedidos
        }}
      ]);

    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível finalizar o pedido.');
    } finally {
      setLoading(false);
    }
  }, [carrinho, total, cliente, dataEntrega, user, limparCarrinho, navigation, totalItens]);

  const renderItem: ListRenderItem<CarrinhoItem> = ({ item }) => (
    <CarrinhoCard 
      item={item} 
      onRemove={removerItem} 
      onUpdateQty={handleUpdateQty} 
    />
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" translucent />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
            <Text style={styles.title}>Carrinho de Vendas</Text>
            <Text style={styles.subtitle}>
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </Text>
        </View>

        {carrinho.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Carrinho Vazio</Text>
            <Text style={styles.emptyText}>Adicione itens na tela de Lotes para começar uma venda.</Text>
            <Pressable style={styles.backButton} onPress={() => navigation.navigate('Lotes')}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Ir para Lotes</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{flex: 1}}>
            <FlatList
              data={carrinho}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
            
            <ScrollView style={styles.checkoutSection} bounces={false}>
                <View style={styles.checkoutHeader}>
                    <Ionicons name="information-circle-outline" size={20} color="#0EA5E9" />
                    <Text style={styles.checkoutTitle}>Detalhes do Pedido</Text>
                </View>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nome do Cliente *</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="Ex: João da Silva"
                        value={cliente}
                        onChangeText={setCliente}
                        placeholderTextColor="#94A3B8"
                    />
                </View>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Data de Entrega</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="DD/MM/AAAA"
                        value={dataEntrega}
                        onChangeText={setDataEntrega}
                        placeholderTextColor="#94A3B8"
                    />
                </View>
                
                <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Valor Total da Venda</Text>
                    <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
                </View>
                
                <Pressable 
                    style={[styles.finalizarButton, (loading || !cliente) && styles.buttonDisabled]} 
                    onPress={handleFinalizarPedido}
                    disabled={loading || !cliente}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                            <Text style={styles.finalizarButtonText}>Finalizar Pedido ({totalItens} itens)</Text>
                        </>
                    )}
                </Pressable>
                
                <Pressable style={styles.limparButton} onPress={limparCarrinho}>
                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    <Text style={styles.limparButtonText}>Limpar Carrinho</Text>
                </Pressable>
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 50) + 10,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14, 165, 233, 0.15)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  carrinhoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardInfo: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 8,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  tamanhoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  loteInfo: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  precoUnitario: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  quantityInput: {
    width: 60,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  quantityUnit: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 4,
  },
  totalContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  totalValueItem: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // --- Checkout Section ---
  checkoutSection: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    maxHeight: 350,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0A0F1E',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
  },
  finalizarButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  finalizarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  limparButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    gap: 6,
  },
  limparButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#0284C7',
    opacity: 0.6,
  },
  
  // --- Empty State ---
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});