import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { onValue, push, ref, set } from "firebase/database";
import React, { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
// Importar os tipos necessários (Cliente, CarrinhoItem, Pedido)
import { CarrinhoItem, Cliente, Pedido, RootStackParamList } from "../../app/(tabs)";
import { useCarrinho } from "../context/CarrinhoContext";
import { auth, database } from "../services/connectionFirebase";

type NavigationProps = StackNavigationProp<RootStackParamList, "Carrinho">;

const { width } = Dimensions.get('window');

// Tipos auxiliares para simplificar a referência
type StatusType = 'pendente' | 'processando' | 'concluido' | 'cancelado';
type PaymentType = 'dinheiro' | 'cartao' | 'transferencia' | 'pix';
type PriorityType = 'baixa' | 'media' | 'alta';

// --- COMPONENTE ITEM DO CARRINHO ---

const CarrinhoCard = memo(({ item, onRemove }: { item: CarrinhoItem, onRemove: (id: string) => void }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.produtoNome}</Text>
        <Text style={styles.cardSubtitle}>Lote: {item.loteNome}</Text>
        <Text style={styles.cardDetails}>
          {item.quantidadeKg.toFixed(2)} kg @ R$ {item.precoUnitarioKg.toFixed(2)}/kg
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardTotal}>R$ {(item.quantidadeKg * item.precoUnitarioKg).toFixed(2)}</Text>
        <Pressable 
          style={styles.removeButton}
          onPress={() => onRemove(item.id)}
        >
          <Ionicons name="close" size={16} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
});

// ==================== TELA PRINCIPAL ====================

export default function CarrinhoScreen() {
  const navigation = useNavigation<NavigationProps>();
  const user = auth.currentUser;
  const { carrinho, total, removerItem, limparCarrinho } = useCarrinho();

  // NOVOS ESTADOS PARA O CHECKOUT
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  const [dataEntrega, setDataEntrega] = useState(new Date().toLocaleDateString('pt-BR'));
  const [formaPagamento, setFormaPagamento] = useState<PaymentType>('pix');
  const [status, setStatus] = useState<StatusType>('pendente');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Funções de Navegação e Estado ---
  
  const openClientModal = () => setIsClientModalVisible(true);
  const closeClientModal = () => setIsClientModalVisible(false);
  
  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    closeClientModal();
  };

  // --- Efeito para Carregar Clientes ---
  useEffect(() => {
    if (!user) return;
    
    // Carrega clientes do nó 'clientes' no Firebase
    const clientesRef = ref(database, `users/${user.uid}/clientes`);
    const unsubscribe = onValue(clientesRef, (snapshot) => {
      const data = snapshot.val();
      // O campo dataCadastro é usado como fallback para a chave (k) se estiver faltando
      const loadedClientes = data 
        ? Object.keys(data).map(k => ({ id: k, ...data[k], dataCadastro: data[k].dataCadastro || k })) 
        : [];
      setClientes(loadedClientes);
      setLoadingClientes(false);
    });
    
    return unsubscribe;
  }, [user]);
  
  // --- Funções de Pedido ---

  const handleConfirmarPedido = async () => {
    if (carrinho.length === 0) {
      return Alert.alert("Atenção", "O carrinho está vazio.");
    }
    if (!selectedCliente) {
      return Alert.alert("Atenção", "Selecione o cliente para o pedido.");
    }
    if (!dataEntrega) {
      return Alert.alert("Atenção", "Informe a data de entrega.");
    }

    setIsProcessing(true);

    const pedidoData: Pedido = {
      id: '', // Será gerado pelo push
      cliente: selectedCliente.nome,
      produto: carrinho.map(i => i.produtoNome).join(', '), // Resumo dos produtos
      quantidade: carrinho.reduce((sum, item) => sum + item.quantidadeKg, 0),
      valor: total,
      status: status,
      dataEntrega: dataEntrega,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Detalhes do Cliente/Pagamento
      telefoneCliente: selectedCliente.telefone,
      enderecoEntrega: selectedCliente.endereco,
      emailCliente: selectedCliente.email,
      formaPagamento: formaPagamento,
      statusPagamento: 'pendente', // Status de pagamento inicial
      prioridade: 'media' as PriorityType,
      itensCarrinho: carrinho,
    };

    try {
      if (!user) throw new Error("Usuário não autenticado");
      
      // Salva o pedido no Firebase
      const newOrderRef = push(ref(database, `users/${user.uid}/orders`));
      pedidoData.id = newOrderRef.key || '';
      await set(newOrderRef, pedidoData);

      // Limpa o carrinho
      limparCarrinho();
      
      Alert.alert(
        "✅ Pedido Criado!",
        `O pedido para ${selectedCliente.nome} foi criado com sucesso.\nTotal: R$ ${total.toFixed(2)}`,
        [{ text: "OK", onPress: () => navigation.navigate("Pedidos" as any) }]
      );
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      Alert.alert("❌ Erro", "Não foi possível finalizar o pedido. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Renderização ---
  const renderItem: ListRenderItem<CarrinhoItem> = useCallback(({ item }) => (
    <CarrinhoCard item={item} onRemove={removerItem} />
  ), [removerItem]);

  const renderClientItem: ListRenderItem<Cliente> = useCallback(({ item }) => (
    <Pressable 
      style={[
        styles.clientItem, 
        selectedCliente?.id === item.id && styles.selectedClientItem
      ]}
      onPress={() => handleSelectCliente(item)}
    >
      <View style={styles.clientItemContent}>
        <Text style={styles.clientItemTitle}>{item.nome}</Text>
        <Text style={styles.clientItemSubtitle}>
          <Ionicons name="call-outline" size={12} color="#64748B" /> {item.telefone}
        </Text>
        {item.endereco && <Text style={styles.clientItemSubtitle} numberOfLines={1}>{item.endereco}</Text>}
      </View>
      {selectedCliente?.id === item.id && (
        <Ionicons name="checkmark-circle" size={20} color="#0EA5E9" />
      )}
    </Pressable>
  ), [selectedCliente]);
  
  // Opções de Pagamento e Status
  const paymentOptions: PaymentType[] = ['pix', 'transferencia', 'cartao', 'dinheiro'];
  const statusOptions: StatusType[] = ['pendente', 'processando'];


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Carrinho de Vendas</Text>
          <Text style={styles.subtitle}>{carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}</Text>
        </View>
        
        {carrinho.length > 0 && (
            <Pressable style={styles.limparButton} onPress={limparCarrinho}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={styles.limparButtonText}>Limpar</Text>
            </Pressable>
        )}
      </View>

      {/* Lista de Itens no Carrinho */}
      {carrinho.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color="#94A3B8" />
          <Text style={styles.emptyText}>Nenhum item adicionado à venda</Text>
          <Text style={styles.emptySubtext}>Adicione produtos na tela de Lotes para criar um pedido.</Text>
          <Pressable style={styles.goLotesButton} onPress={() => navigation.navigate("Lotes" as any)}>
             <Ionicons name="fish-outline" size={20} color="#fff" />
             <Text style={styles.goLotesButtonText}>Ver Lotes</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList 
          data={carrinho}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FOOTER - CHECKOUT */}
      {carrinho.length > 0 && (
        <View style={styles.checkoutContainer}>
          <ScrollView style={styles.checkoutScroll} horizontal showsHorizontalScrollIndicator={false}>
            {/* 1. SELEÇÃO DO CLIENTE (NOVA LÓGICA) */}
            <Pressable style={styles.checkoutInput} onPress={openClientModal}>
              <Ionicons name="person-outline" size={20} color={selectedCliente ? '#10B981' : '#F59E0B'} />
              <Text style={[styles.checkoutText, !selectedCliente && styles.placeholderText]}>
                {selectedCliente ? selectedCliente.nome : 'Selecionar Cliente *'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </Pressable>
            
            {/* 2. DATA DE ENTREGA */}
            <View style={styles.checkoutInput}>
              <Ionicons name="calendar-outline" size={20} color="#0EA5E9" />
              <TextInput 
                style={styles.checkoutText} 
                placeholder="Data de Entrega *" 
                value={dataEntrega} 
                onChangeText={setDataEntrega}
                keyboardType="numbers-and-punctuation"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* 3. FORMA DE PAGAMENTO */}
            <View style={styles.checkoutOptionContainer}>
              <Text style={styles.checkoutOptionLabel}>Pagamento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {paymentOptions.map(p => (
                  <Pressable 
                    key={p} 
                    style={[styles.optionChip, formaPagamento === p && styles.optionChipActive]}
                    onPress={() => setFormaPagamento(p)}
                  >
                    <Text style={[styles.optionChipText, formaPagamento === p && styles.optionChipTextActive]}>
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* 4. STATUS INICIAL */}
            <View style={styles.checkoutOptionContainer}>
              <Text style={styles.checkoutOptionLabel}>Status Inicial</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {statusOptions.map(s => (
                  <Pressable 
                    key={s} 
                    style={[styles.optionChip, status === s && styles.optionChipActive]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={[styles.optionChipText, status === s && styles.optionChipTextActive]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.spacer} />
            
          </ScrollView>

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
          </View>

          <Pressable 
            style={[styles.confirmButton, (!selectedCliente || isProcessing) && styles.buttonDisabled]} 
            onPress={handleConfirmarPedido}
            disabled={!selectedCliente || isProcessing}
          >
            {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                        CONFIRMAR PEDIDO
                    </Text>
                </>
            )}
          </Pressable>
        </View>
      )}

      {/* MODAL SELECIONAR CLIENTE */}
      <Modal visible={isClientModalVisible} onRequestClose={closeClientModal} animationType="slide" transparent>
        <View style={styles.centeredModal}>
          <View style={styles.clientModalContent}>
            <View style={styles.clientModalHeader}>
              <Text style={styles.clientModalTitle}>Selecionar Cliente</Text>
              <Pressable onPress={closeClientModal}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            {loadingClientes ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#0EA5E9" />
                <Text style={styles.modalLoadingText}>Carregando clientes...</Text>
              </View>
            ) : (
              <FlatList
                data={clientes}
                keyExtractor={(item) => item.id}
                renderItem={renderClientItem}
                ListEmptyComponent={
                  <View style={styles.modalLoading}>
                    <Text style={styles.emptySelectionText}>Nenhum cliente cadastrado.</Text>
                    <Text style={styles.emptySelectionSubtext}>
                        Use a tela Clientes para adicionar o primeiro.
                    </Text>
                    <Pressable style={styles.addClientButton} onPress={() => navigation.navigate("Clientes" as any)}>
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.addClientButtonText}>Ir para Clientes</Text>
                    </Pressable>
                  </View>
                }
              />
            )}
            
            <View style={styles.clientModalFooter}>
                <Text style={styles.footerNoteText}>Total de clientes: {clientes.length}</Text>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#0EA5E9',
  },
  titleContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  limparButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  limparButtonText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  
  // Card do Item
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  cardDetails: {
    fontSize: 14,
    color: '#94A3B8',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  removeButton: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  // Estado Vazio
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  goLotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  goLotesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Checkout Footer
  checkoutContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  checkoutScroll: {
    maxHeight: 120, // Aumentado para acomodar as opções de pagamento/status
    marginBottom: 16,
  },
  
  // Container que envolve as opções para dar espaço horizontal
  checkoutOptionContainer: {
    marginRight: 10,
    minWidth: 150,
  },
  checkoutOptionLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  optionChip: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  optionChipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0284C7',
  },
  optionChipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  optionChipTextActive: {
    fontWeight: 'bold',
    color: '#fff',
  },
  
  checkoutInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    gap: 8,
    minWidth: 200, // Aumentado para melhor UX
    height: 40,
  },
  checkoutText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    padding: 0,
  },
  placeholderText: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#E2E8F0',
    textTransform: 'capitalize',
  },
  spacer: {
    width: 20, 
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonDisabled: {
    backgroundColor: '#64748B',
  },

  // Modal Cliente
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  clientModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  clientModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  clientModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedClientItem: {
    backgroundColor: '#F0F9FF',
  },
  clientItemContent: {
    flex: 1,
  },
  clientItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  clientItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    color: '#64748B',
  },
  emptySelectionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 16,
  },
  emptySelectionSubtext: {
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: 12,
      marginTop: 5,
  },
  clientModalFooter: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
  },
  footerNoteText: {
      color: '#64748B',
      fontSize: 12,
      textAlign: 'center',
  },
  addClientButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#10B981',
      padding: 12,
      borderRadius: 10,
      gap: 8,
  },
  addClientButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  }
});