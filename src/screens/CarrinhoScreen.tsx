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

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  const [modais, setModais] = useState({
    cliente: false,
    checkout: false,
    listaLotes: false,
    addItem: false
  });

  const [dataEntrega, setDataEntrega] = useState(new Date().toLocaleDateString('pt-BR'));
  const [formaPagamento, setFormaPagamento] = useState<PaymentType>('pix');
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedLoteToAdd, setSelectedLoteToAdd] = useState<Lote | null>(null);
  const [newItemQtd, setNewItemQtd] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<UnitType>('kg');

  useEffect(() => {
    if (!user) return;

    const clientesRef = ref(database, `users/${user.uid}/clientes`);
    const lotesRef = ref(database, `users/${user.uid}/lots`);

    const unsubClientes = onValue(clientesRef, (snap) => {
      const data = snap.val();
      const lista = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      setClientes(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
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

  const handleNavigateToNewClient = () => {
    toggleModal('cliente', false);
    toggleModal('checkout', false);
    navigation.navigate("Clientes");
  };

  const handleConfirmarPedido = async () => {
    if (!selectedCliente) return Alert.alert("Erro", "Selecione um cliente.");
    
    setIsProcessing(true);
    try {
      if (!user) throw new Error("Usuário inválido");
      
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
      navigation.navigate("Pedidos");
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

      {/* LISTA DE ITENS */}
      <FlatList
        data={carrinho}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
          </View>
        }
      />

      {/* FOOTER */}
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

      {/* --- MODAIS --- */}
      
      {/* SELECIONAR LOTE (ESCURO) */}
      <Modal visible={modais.listaLotes} animationType="slide" transparent onRequestClose={() => toggleModal('listaLotes', false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Produto</Text>
              <Pressable onPress={() => toggleModal('listaLotes', false)}>
                <Ionicons name="close" size={24} color="#fff" />
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
              ListEmptyComponent={<Text style={{color:'#94A3B8', textAlign:'center', marginTop: 20}}>Sem lotes ativos.</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* QTD e PREÇO (ESCURO E CORRIGIDO) */}
      <Modal visible={modais.addItem} transparent animationType="fade" onRequestClose={() => toggleModal('addItem', false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.centeredModal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitleCenter}>Adicionar Item</Text>
            <Text style={styles.modalSubtitleCenter}>{selectedLoteToAdd?.nomeLote}</Text>
            
            {/* SELETOR DE UNIDADE (CORRIGIDO) */}
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
              <TextInput style={styles.input} keyboardType="numeric" placeholder="0.0" placeholderTextColor="#64748B" value={newItemQtd} onChangeText={setNewItemQtd} autoFocus />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{newItemUnit === 'kg' ? 'Preço (R$/Kg)' : 'Preço (R$/Mil)'}</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#64748B" value={newItemPrice} onChangeText={setNewItemPrice} />
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

      {/* CHECKOUT (ESCURO) */}
      <Modal visible={modais.checkout} animationType="slide" transparent onRequestClose={() => toggleModal('checkout', false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Finalizar Venda</Text>
              <Pressable onPress={() => toggleModal('checkout', false)}>
                <Ionicons name="close" size={24} color="#fff" />
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
              <TextInput style={styles.input} value={dataEntrega} onChangeText={setDataEntrega} placeholderTextColor="#64748B" />

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

      {/* LISTA CLIENTES (ESCURO) */}
      <Modal visible={modais.cliente} animationType="slide" transparent onRequestClose={() => toggleModal('cliente', false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Cliente</Text>
              <Pressable onPress={() => toggleModal('cliente', false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <FlatList
              data={clientes}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.clienteItem} 
                  onPress={() => { setSelectedCliente(item); toggleModal('cliente', false); toggleModal('checkout', true); }}
                >
                  <View style={styles.avatar}><Text style={styles.avatarText}>{item.nome[0]}</Text></View>
                  <View>
                    <Text style={styles.clienteNome}>{item.nome}</Text>
                    <Text style={styles.clienteTel}>{item.telefone}</Text>
                  </View>
                </Pressable>
              )}
            />
            <Pressable 
              style={styles.btnNovoCliente} 
              onPress={handleNavigateToNewClient}
            >
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
  limparButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8 },
  limparButtonText: { color: '#EF4444', fontWeight: 'bold' },
  
  addItemWrapper: { padding: 16, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  addItemButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(14,165,233,0.15)', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0EA5E9' },
  addItemText: { color: '#0EA5E9', fontWeight: 'bold', fontSize: 16 },

  listContent: { padding: 16, paddingBottom: 20 },
  itemSeparator: { height: 12, backgroundColor: '#334155', marginVertical: 8 },
  
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  cardInfo: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  cardDetails: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 70 },
  cardTotal: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  removeButton: { padding: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', marginTop: 16, fontSize: 18 },

  footer: { width: '100%', backgroundColor: '#1E293B', padding: 20, borderTopWidth: 1, borderTopColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#94A3B8', fontSize: 12 },
  totalValue: { color: '#10B981', fontSize: 24, fontWeight: 'bold' },
  btnContinuar: { backgroundColor: '#0EA5E9', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnContinuarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  
  // Modal Full
  modalContentFull: { backgroundColor: '#1E293B', height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  
  // Lista Lotes (Modal)
  loteItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155', alignItems: 'center' },
  loteTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  loteSubtitle: { color: '#94A3B8' },

  // Modal Pequeno (Add Item)
  centeredModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 },
  modalCard: { backgroundColor: '#1E293B', width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#334155' },
  modalTitleCenter: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#FFF' },
  modalSubtitleCenter: { textAlign: 'center', color: '#94A3B8', marginBottom: 20 },
  
  inputGroup: { marginBottom: 16 },
  label: { color: '#94A3B8', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#0F172A', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', fontSize: 16, color: '#FFF' },
  
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  btnCancelText: { color: '#94A3B8', fontWeight: '600' },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0EA5E9', alignItems: 'center' },
  btnConfirmText: { color: '#fff', fontWeight: '600' },

  // Unit Selector (Corrigido para Dark)
  unitSelector: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 10, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  unitOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  unitOptionActive: { backgroundColor: '#334155' },
  unitText: { fontWeight: '600', color: '#94A3B8', fontSize: 12 },
  unitTextActive: { color: '#FFF', fontWeight: 'bold' },

  // Checkout
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  selectedText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  selectedSubtext: { color: '#94A3B8' },
  placeholderText: { color: '#64748B', fontSize: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0F172A', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  chipText: { color: '#94A3B8', fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  resumoBox: { backgroundColor: '#0F172A', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155' },
  resumoLabel: { color: '#94A3B8', fontWeight: '600' },
  resumoValue: { color: '#0EA5E9', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  footerFixed: { padding: 20, borderTopWidth: 1, borderTopColor: '#334155', backgroundColor: '#1E293B' },
  btnFinalizar: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnFinalizarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  // Lista Cliente
  clienteItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontWeight: 'bold', color: '#FFF' },
  clienteNome: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  clienteTel: { color: '#94A3B8' },
  btnNovoCliente: { padding: 16, borderTopWidth: 1, borderTopColor: '#334155', alignItems: 'center' },
  btnNovoClienteText: { color: '#0EA5E9', fontWeight: 'bold', fontSize: 16 },
});