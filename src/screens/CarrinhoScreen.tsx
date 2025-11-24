import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { onValue, push, ref, set } from "firebase/database";
import React, { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarrinhoItem, Cliente, Lote, Pedido, RootStackParamList } from "../../app/(tabs)";
import { useCarrinho } from "../context/CarrinhoContext";
import { auth, database } from "../services/connectionFirebase";

type NavigationProps = StackNavigationProp<RootStackParamList, "Carrinho">;
type PaymentType = 'dinheiro' | 'cartao' | 'transferencia' | 'pix';
type UnitType = 'kg' | 'milheiro';

// --- SEPARADOR ---
const ItemSeparator = () => <View style={styles.itemSeparator} />;

// --- CARD DO ITEM ---
const CarrinhoCard = memo(({ item, onRemove }: { item: CarrinhoItem, onRemove: (id: string) => void }) => {
  const nomeProduto = item.produtoNome && item.produtoNome.length > 0 ? item.produtoNome : (item.loteNome || "Item sem nome");
  const nomeLote = item.loteNome ? `Lote: ${item.loteNome}` : "Lote não informado";
  
  const unidadeSegura = item.unidade || 'kg';
  const isMilheiro = unidadeSegura === 'milheiro';
  const labelUnidade = isMilheiro ? 'un' : 'kg';
  const labelPreco = isMilheiro ? '/mil' : '/kg';
  
  const totalItem = isMilheiro 
    ? (item.quantidade / 1000) * item.precoUnitario 
    : item.quantidade * item.precoUnitario;

  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{nomeProduto}</Text>
        <Text style={styles.cardSubtitle}>
          {nomeLote} • <Text style={{color: isMilheiro ? '#F59E0B' : '#10B981', fontWeight: 'bold'}}>{unidadeSegura.toUpperCase()}</Text>
        </Text>
        <Text style={styles.cardDetails}>
          {Number(item.quantidade || 0).toFixed(2)} {labelUnidade} x R$ {Number(item.precoUnitario || 0).toFixed(2)}{labelPreco}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardTotal}>R$ {totalItem.toFixed(2)}</Text>
        <Pressable style={styles.removeButton} onPress={() => onRemove(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
});

export default function CarrinhoScreen() {
  const navigation = useNavigation<NavigationProps>();
  const user = auth.currentUser;
  const { carrinho, total, removerItem, limparCarrinho, adicionarItem } = useCarrinho();
  const insets = useSafeAreaInsets();

  // Estados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  
  // Modais
  const [modais, setModais] = useState({
    cliente: false,
    checkout: false,
    listaLotes: false,
    addItem: false
  });

  // Venda
  const [dataEntrega, setDataEntrega] = useState(new Date().toLocaleDateString('pt-BR'));
  const [formaPagamento, setFormaPagamento] = useState<PaymentType>('pix');
  const [isProcessing, setIsProcessing] = useState(false);

  // Adição de Item
  const [selectedLoteToAdd, setSelectedLoteToAdd] = useState<Lote | null>(null);
  const [newItemQtd, setNewItemQtd] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<UnitType>('kg');

  // --- Carregamento de Dados ---
  useEffect(() => {
    if (!user) return;

    const clientesRef = ref(database, `users/${user.uid}/clientes`);
    const lotesRef = ref(database, `users/${user.uid}/lots`);

    const unsubClientes = onValue(clientesRef, (snap) => {
      const data = snap.val();
      const lista = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      setClientes(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
      setLoadingClientes(false);
    });

    const unsubLotes = onValue(lotesRef, (snap) => {
      const data = snap.val();
      const lista = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      setLotes(lista.filter(l => l.status === 'ativo'));
    });

    return () => { unsubClientes(); unsubLotes(); };
  }, [user]);

  const toggleModal = (key: keyof typeof modais, value: boolean) => {
    setModais(prev => ({ ...prev, [key]: value }));
  };

  // --- Lógica de Adicionar ---
  const handleSelectLoteToAdd = (lote: Lote) => {
    setSelectedLoteToAdd(lote);
    setNewItemQtd('');
    setNewItemPrice('');
    setNewItemUnit('kg');
    toggleModal('listaLotes', false);
    setTimeout(() => toggleModal('addItem', true), 200);
  };

  const handleConfirmAddItem = () => {
    if (!selectedLoteToAdd || !newItemQtd || !newItemPrice) {
      return Alert.alert("Erro", "Preencha quantidade e preço.");
    }

    const qtd = parseFloat(newItemQtd.replace(',', '.'));
    const preco = parseFloat(newItemPrice.replace(',', '.'));

    if (isNaN(qtd) || qtd <= 0 || isNaN(preco) || preco <= 0) {
      return Alert.alert("Erro", "Valores inválidos.");
    }

    adicionarItem({
      loteId: selectedLoteToAdd.id,
      loteNome: selectedLoteToAdd.nomeLote || "Lote s/ nome",
      produtoNome: selectedLoteToAdd.especie || "Peixe s/ nome",
      quantidade: qtd,
      precoUnitario: preco,
      unidade: newItemUnit
    });

    toggleModal('addItem', false);
  };

  // --- Lógica de Checkout ---
  const handleConfirmarPedido = async () => {
    if (!selectedCliente) return Alert.alert("Erro", "Selecione um cliente.");
    
    setIsProcessing(true);
    try {
      if (!user) throw new Error("Usuário inválido");
      
      // Resumo dos produtos para salvar no pedido
      const resumoProdutos = carrinho.map(i => {
        const unidade = i.unidade || 'kg';
        return `${i.produtoNome} (${unidade})`;
      }).join(', ');

      const pedido: Pedido = {
        id: '',
        cliente: selectedCliente.nome,
        produto: resumoProdutos,
        quantidade: carrinho.reduce((sum, i) => sum + i.quantidade, 0),
        valor: total,
        status: 'pendente',
        dataEntrega,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        telefoneCliente: selectedCliente.telefone,
        enderecoEntrega: selectedCliente.endereco,
        emailCliente: selectedCliente.email,
        formaPagamento,
        statusPagamento: 'pendente',
        prioridade: 'media',
        itensCarrinho: carrinho,
      };

      const newRef = push(ref(database, `users/${user.uid}/orders`));
      pedido.id = newRef.key || '';
      await set(newRef, pedido);

      toggleModal('checkout', false);
      limparCarrinho();
      Alert.alert("Sucesso", "Venda realizada!");
      navigation.navigate("Pedidos" as any);
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar pedido.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: CarrinhoItem }) => (
    <CarrinhoCard item={item} onRemove={removerItem} />
  ), [removerItem]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.title}>Carrinho</Text>
          <Text style={styles.subtitle}>{carrinho.length} itens</Text>
        </View>
        {carrinho.length > 0 && (
          <Pressable style={styles.limparButton} onPress={limparCarrinho}>
            <Text style={styles.limparButtonText}>Limpar</Text>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </Pressable>
        )}
      </View>

      {/* BOTÃO ADICIONAR */}
      <View style={styles.addItemWrapper}>
        <Pressable style={styles.addItemButton} onPress={() => toggleModal('listaLotes', true)}>
          <Ionicons name="add-circle" size={24} color="#0EA5E9" />
          <Text style={styles.addItemText}>Adicionar Produto</Text>
        </Pressable>
      </View>

      {/* LISTA DE ITENS (Com flex: 1 para ocupar o espaço central) */}
      <FlatList
        data={carrinho}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        // Removemos o padding gigante, pois o footer não é mais absoluto
        contentContainerStyle={styles.listContent} 
        ItemSeparatorComponent={ItemSeparator}
        style={{ flex: 1 }} // IMPORTANTE: Faz a lista ocupar o espaço disponível
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
          </View>
        }
      />

      {/* FOOTER (Sem position absolute, apenas fixo no final do flex container) */}
      {carrinho.length > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
          </View>
          <Pressable style={styles.btnContinuar} onPress={() => toggleModal('checkout', true)}>
            <Text style={styles.btnContinuarText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* --- MODAIS (Mantidos iguais, focando na correção do layout principal) --- */}
      
      {/* SELECIONAR LOTE */}
      <Modal visible={modais.listaLotes} animationType="slide" transparent onRequestClose={() => toggleModal('listaLotes', false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Produto</Text>
              <Pressable onPress={() => toggleModal('listaLotes', false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>
            <FlatList
              data={lotes}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.loteItem} onPress={() => handleSelectLoteToAdd(item)}>
                  <View>
                    <Text style={styles.loteTitle}>{item.nomeLote}</Text>
                    <Text style={styles.loteSubtitle}>{item.especie} • {item.quantidade} un</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={28} color="#0EA5E9" />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* QTD e PREÇO */}
      <Modal visible={modais.addItem} transparent animationType="fade" onRequestClose={() => toggleModal('addItem', false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.centeredModal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitleCenter}>Adicionar Item</Text>
            <Text style={styles.modalSubtitleCenter}>{selectedLoteToAdd?.nomeLote}</Text>
            
            {/* SELETOR DE UNIDADE */}
            <View style={styles.unitSelector}>
              <Pressable style={[styles.unitOption, newItemUnit === 'kg' && styles.unitOptionActive]} onPress={() => setNewItemUnit('kg')}>
                <Text style={[styles.unitText, newItemUnit === 'kg' && styles.unitTextActive]}>KG</Text>
              </Pressable>
              <Pressable style={[styles.unitOption, newItemUnit === 'milheiro' && styles.unitOptionActive]} onPress={() => setNewItemUnit('milheiro')}>
                <Text style={[styles.unitText, newItemUnit === 'milheiro' && styles.unitTextActive]}>MILHEIRO</Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{newItemUnit === 'kg' ? 'Quantidade (Kg)' : 'Quantidade (Un)'}</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="0.0" value={newItemQtd} onChangeText={setNewItemQtd} autoFocus />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{newItemUnit === 'kg' ? 'Preço (R$/Kg)' : 'Preço (R$/Mil)'}</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" value={newItemPrice} onChangeText={setNewItemPrice} />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.btnCancel} onPress={() => toggleModal('addItem', false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.btnConfirm} onPress={handleConfirmAddItem}>
                <Text style={styles.btnConfirmText}>Adicionar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CHECKOUT */}
      <Modal visible={modais.checkout} animationType="slide" transparent onRequestClose={() => toggleModal('checkout', false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Finalizar Venda</Text>
              <Pressable onPress={() => toggleModal('checkout', false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>
            
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <Pressable style={styles.selectButton} onPress={() => { toggleModal('checkout', false); toggleModal('cliente', true); }}>
                {selectedCliente ? (
                  <View>
                    <Text style={styles.selectedText}>{selectedCliente.nome}</Text>
                    <Text style={styles.selectedSubtext}>{selectedCliente.telefone}</Text>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Selecionar Cliente</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </Pressable>

              <Text style={styles.sectionTitle}>Data de Entrega</Text>
              <TextInput style={styles.input} value={dataEntrega} onChangeText={setDataEntrega} />

              <Text style={styles.sectionTitle}>Pagamento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                {['pix', 'dinheiro', 'cartao', 'transferencia'].map((p) => (
                  <Pressable key={p} style={[styles.chip, formaPagamento === p && styles.chipActive]} onPress={() => setFormaPagamento(p as PaymentType)}>
                    <Text style={[styles.chipText, formaPagamento === p && styles.chipTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.resumoBox}>
                <Text style={styles.resumoLabel}>Total a Receber</Text>
                <Text style={styles.resumoValue}>R$ {total.toFixed(2)}</Text>
              </View>
            </ScrollView>

            <View style={styles.footerFixed}>
              <Pressable style={styles.btnFinalizar} onPress={handleConfirmarPedido}>
                {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnFinalizarText}>Confirmar Venda</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* LISTA CLIENTES */}
      <Modal visible={modais.cliente} animationType="slide" transparent onRequestClose={() => toggleModal('cliente', false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Cliente</Text>
              <Pressable onPress={() => toggleModal('cliente', false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>
            <FlatList
              data={clientes}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <Pressable style={styles.clienteItem} onPress={() => { setSelectedCliente(item); toggleModal('cliente', false); toggleModal('checkout', true); }}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{item.nome[0]}</Text></View>
                  <View><Text style={styles.clienteNome}>{item.nome}</Text><Text style={styles.clienteTel}>{item.telefone}</Text></View>
                </Pressable>
              )}
            />
            <Pressable style={styles.btnNovoCliente} onPress={() => { toggleModal('cliente', false); navigation.navigate('Clientes' as any); }}>
              <Text style={styles.btnNovoClienteText}>Cadastrar Novo Cliente</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#1E293B' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94A3B8' },
  limparButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8 },
  limparButtonText: { color: '#EF4444', fontWeight: 'bold' },
  
  addItemWrapper: { padding: 16, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  addItemButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(14,165,233,0.15)', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0EA5E9' },
  addItemText: { color: '#0EA5E9', fontWeight: 'bold', fontSize: 16 },

  // LISTA CORRIGIDA: Padding normal
  listContent: { padding: 16, paddingBottom: 20 },
  itemSeparator: { height: 12 },
  
  // CARD
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  cardInfo: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#94A3B8' },
  cardDetails: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 70 },
  cardTotal: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  removeButton: { padding: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', marginTop: 16, fontSize: 18 },

  // FOOTER CORRIGIDO: Sem absolute, estilo padrão Flex
  footer: { width: '100%', backgroundColor: '#1E293B', padding: 20, borderTopWidth: 1, borderTopColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#94A3B8', fontSize: 12 },
  totalValue: { color: '#10B981', fontSize: 24, fontWeight: 'bold' },
  btnContinuar: { backgroundColor: '#0EA5E9', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnContinuarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContentFull: { backgroundColor: '#fff', height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  
  // Lista Lotes
  loteItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  loteTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  loteSubtitle: { color: '#64748B' },

  // Modal Add Item
  centeredModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  modalCard: { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 20, padding: 24 },
  modalTitleCenter: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#0F172A' },
  modalSubtitleCenter: { textAlign: 'center', color: '#64748B', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { color: '#334155', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  btnCancelText: { color: '#334155', fontWeight: '600' },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0EA5E9', alignItems: 'center' },
  btnConfirmText: { color: '#fff', fontWeight: '600' },

  // Unit Selector
  unitSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4, marginBottom: 20 },
  unitOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  unitOptionActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  unitText: { fontWeight: '600', color: '#64748B', fontSize: 12 },
  unitTextActive: { color: '#0F172A', fontWeight: 'bold' },

  // Checkout
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  selectedText: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  selectedSubtext: { color: '#64748B' },
  placeholderText: { color: '#64748B', fontSize: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  chipText: { color: '#64748B', fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  resumoBox: { backgroundColor: '#F0F9FF', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#BAE6FD' },
  resumoLabel: { color: '#0C4A6E', fontWeight: '600' },
  resumoValue: { color: '#0EA5E9', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  footerFixed: { padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  btnFinalizar: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnFinalizarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  // Lista Cliente
  clienteItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontWeight: 'bold', color: '#475569' },
  clienteNome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  clienteTel: { color: '#64748B' },
  btnNovoCliente: { padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center' },
  btnNovoClienteText: { color: '#0EA5E9', fontWeight: 'bold', fontSize: 16 },
});