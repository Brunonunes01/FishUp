import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack"; // <--- IMPORTANTE
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Importar RootStackParamList para tipagem
import { Lote, Peixe, RootStackParamList, Tanque } from "../../app/(tabs)";
import { useCarrinho } from '../context/CarrinhoContext';
import { auth, database } from "../services/connectionFirebase";

const ADMIN_PASSWORD = 'admin123';

// --- TIPAGEM DA NAVEGAÇÃO ---
type NavigationProps = StackNavigationProp<RootStackParamList, "Lotes">;

// --- TYPES ---
type FormState = {
  nomeLote: string;
  quantidade: string;
  quantidadeInicial: string;
  fornecedor: string;
  pesoInicialMedio: string;
  comprimentoInicialMedio: string;
  dataInicio: string;
  dataEstimadaColheita: string;
  observacoes: string;
};

type LoteFormProps = {
  formState: FormState;
  onFormChange: (field: keyof FormState, value: string) => void;
  onSelectEspecie: () => void;
  onSelectTanque: () => void;
  selectedPeixe: Peixe | null;
  selectedTanque: Tanque | null;
  isEditing: boolean;
};

// --- FORMULÁRIO (DARK MODE) ---
const LoteForm = memo(({ 
  formState, 
  onFormChange, 
  onSelectEspecie, 
  onSelectTanque, 
  selectedPeixe, 
  selectedTanque,
  isEditing 
}: LoteFormProps) => {
  const today = new Date().toISOString().split('T')[0];
  const estimatedDate = new Date();
  estimatedDate.setMonth(estimatedDate.getMonth() + 6);
  const defaultEstimatedDate = estimatedDate.toISOString().split('T')[0];

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nome do Lote *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: LOTE-2025-A" 
          placeholderTextColor="#64748B"
          value={formState.nomeLote} 
          onChangeText={v => onFormChange('nomeLote', v)} 
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Espécie *</Text>
        <Pressable style={styles.selectButton} onPress={onSelectEspecie}>
          <Text style={[styles.selectButtonText, !selectedPeixe && styles.placeholderText]}>
            {selectedPeixe ? selectedPeixe.nomePopular : "Selecione uma espécie"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </Pressable>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, {flex: 1}]}>
          <Text style={styles.inputLabel}>Quantidade *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0" 
            placeholderTextColor="#64748B"
            value={formState.quantidade} 
            onChangeText={v => onFormChange('quantidade', v)} 
            keyboardType="numeric" 
          />
        </View>
        <View style={[styles.inputGroup, {flex: 1}]}>
          <Text style={styles.inputLabel}>Peso Inicial (g) *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0.0" 
            placeholderTextColor="#64748B"
            value={formState.pesoInicialMedio} 
            onChangeText={v => onFormChange('pesoInicialMedio', v)} 
            keyboardType="numeric" 
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, {flex: 1}]}>
          <Text style={styles.inputLabel}>Comprimento (cm)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0.0" 
            placeholderTextColor="#64748B"
            value={formState.comprimentoInicialMedio} 
            onChangeText={v => onFormChange('comprimentoInicialMedio', v)} 
            keyboardType="numeric" 
          />
        </View>
        <View style={[styles.inputGroup, {flex: 1}]}>
          <Text style={styles.inputLabel}>Fornecedor</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Nome" 
            placeholderTextColor="#64748B"
            value={formState.fornecedor} 
            onChangeText={v => onFormChange('fornecedor', v)} 
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, {flex: 1}]}>
          <Text style={styles.inputLabel}>Data Início</Text>
          <TextInput 
            style={styles.input} 
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748B"
            value={formState.dataInicio || today}
            onChangeText={v => onFormChange('dataInicio', v)}
          />
        </View>
        <View style={[styles.inputGroup, {flex: 1}]}>
          <Text style={styles.inputLabel}>Previsão Colheita</Text>
          <TextInput 
            style={styles.input} 
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748B"
            value={formState.dataEstimadaColheita || defaultEstimatedDate}
            onChangeText={v => onFormChange('dataEstimadaColheita', v)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tanque *</Text>
        <Pressable style={styles.selectButton} onPress={onSelectTanque}>
          <Text style={[styles.selectButtonText, !selectedTanque && styles.placeholderText]}>
            {selectedTanque ? `${selectedTanque.name} - ${selectedTanque.location}` : "Selecione um tanque"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </Pressable>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Observações</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Anotações..." 
          placeholderTextColor="#64748B"
          value={formState.observacoes} 
          onChangeText={v => onFormChange('observacoes', v)}
          multiline
        />
      </View>
    </View>
  );
});

// --- CARD DO LOTE (DARK MODE) ---
const LoteCard = memo(({ item, onEdit, onDelete, onSell }: { 
  item: Lote; 
  onEdit: (lote: Lote) => void; 
  onDelete: (lote: Lote) => void; 
  onSell: (lote: Lote) => void;
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ativo': return '#10B981';
      case 'colhido': return '#8B5CF6';
      case 'transferido': return '#F59E0B';
      case 'doente': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const diasCultivo = Math.ceil(Math.abs(new Date().getTime() - new Date(item.dataInicio).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <View style={styles.loteCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.loteTitle}>{item.nomeLote}</Text>
          <Text style={styles.especieText}>{item.especie}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status || 'ativo'}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardContent}>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="fish" size={16} color="#0EA5E9" />
            <Text style={styles.metricText}>{item.quantidade.toLocaleString()} un</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="scale" size={16} color="#F59E0B" />
            <Text style={styles.metricText}>{item.pesoInicialMedio}g (ini)</Text>
          </View>
        </View>
        
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Tanque: <Text style={styles.detailValue}>{item.tanqueNome}</Text></Text>
          <Text style={styles.detailLabel}>Dias: <Text style={styles.detailValue}>{diasCultivo}</Text></Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable style={[styles.actionButton, styles.sellButton]} onPress={() => onSell(item)}>
          <Ionicons name="cart" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Vender</Text>
        </Pressable>

        <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(item)}>
          <Ionicons name="create" size={18} color="#F59E0B" />
        </Pressable>
        
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(item)}>
          <Ionicons name="trash" size={18} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
});

// --- TELA PRINCIPAL ---
export default function LotesScreen() {
  // CORREÇÃO: Tipagem correta do navigation
  const navigation = useNavigation<NavigationProps>();
  
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [filteredLotes, setFilteredLotes] = useState<Lote[]>([]);
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [peixes, setPeixes] = useState<Peixe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const user = auth.currentUser;
  const { adicionarItem } = useCarrinho();

  // Estados Modais
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [tanqueModalVisible, setTanqueModalVisible] = useState(false);
  const [especieModalVisible, setEspecieModalVisible] = useState(false);
  const [isSellingModalVisible, setIsSellingModalVisible] = useState(false);

  // Estados Dados
  const [currentLote, setCurrentLote] = useState<Lote | null>(null);
  const [loteToSell, setLoteToSell] = useState<Lote | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleUnit, setSaleUnit] = useState<'kg' | 'milheiro'>('kg');
  
  const [formState, setFormState] = useState<FormState>({
    nomeLote: '', quantidade: '', quantidadeInicial: '', fornecedor: '', 
    pesoInicialMedio: '', comprimentoInicialMedio: '', dataInicio: '', 
    dataEstimadaColheita: '', observacoes: '',
  });
  const [selectedTanque, setSelectedTanque] = useState<Tanque | null>(null);
  const [selectedPeixe, setSelectedPeixe] = useState<Peixe | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const refs = {
        lotes: ref(database, `users/${user.uid}/lots`),
        tanques: ref(database, `users/${user.uid}/tanks`),
        peixes: ref(database, `users/${user.uid}/peixes`)
    };

    const unsubs = [
        onValue(refs.lotes, s => {
            const data = s.val();
            const list = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
            setLotes(list);
            setLoading(false);
        }),
        onValue(refs.tanques, s => {
            setTanques(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
        }),
        onValue(refs.peixes, s => {
            setPeixes(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
        })
    ];

    return () => unsubs.forEach(u => u());
  }, [user]);

  // Filtro de Busca
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLotes(lotes);
    } else {
      const lower = searchQuery.toLowerCase();
      setFilteredLotes(lotes.filter(l => 
        l.nomeLote.toLowerCase().includes(lower) || 
        l.especie.toLowerCase().includes(lower)
      ));
    }
  }, [lotes, searchQuery]);

  // Funções de Modal
  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentLote(null);
    setFormState({ 
      nomeLote: '', quantidade: '', quantidadeInicial: '', fornecedor: '', 
      pesoInicialMedio: '', comprimentoInicialMedio: '', dataInicio: today, 
      dataEstimadaColheita: '', observacoes: '',
    });
    setSelectedTanque(null);
    setSelectedPeixe(null);
    setIsAddModalVisible(true);
  };
  
  const openEditModal = (lote: Lote) => {
    setCurrentLote(lote);
    setFormState({
      nomeLote: lote.nomeLote,
      quantidade: lote.quantidade.toString(),
      quantidadeInicial: lote.quantidadeInicial?.toString() || lote.quantidade.toString(),
      fornecedor: lote.fornecedor || '',
      pesoInicialMedio: lote.pesoInicialMedio.toString(),
      comprimentoInicialMedio: lote.comprimentoInicialMedio?.toString() || '',
      dataInicio: lote.dataInicio,
      dataEstimadaColheita: lote.dataEstimadaColheita || '',
      observacoes: lote.observacoes || '',
    });
    setSelectedTanque(tanques.find(t => t.id === lote.tanqueId) || null);
    setSelectedPeixe(peixes.find(p => p.nomePopular === lote.especie) || null);
    setIsEditModalVisible(true);
  };
  
  const openDeleteModal = (lote: Lote) => {
    setCurrentLote(lote);
    setPasswordInput('');
    setIsDeleteModalVisible(true);
  };
  
  const openSellModal = (lote: Lote) => {
    setLoteToSell(lote);
    setSaleQuantity('');
    setSalePrice('');
    setSaleUnit('kg');
    setIsSellingModalVisible(true);
  };

  // CRUD Handlers
  const handleAddOrUpdateLote = async () => {
    const { nomeLote, quantidade } = formState;
    if (!nomeLote || !quantidade || !selectedTanque || !selectedPeixe) {
      return Alert.alert("Atenção", "Preencha os campos obrigatórios.");
    }
    
    const loteData = { 
      ...formState,
      quantidade: parseInt(quantidade),
      quantidadeInicial: parseInt(formState.quantidadeInicial || quantidade),
      pesoInicialMedio: parseFloat(formState.pesoInicialMedio.replace(',', '.')) || 0,
      comprimentoInicialMedio: parseFloat(formState.comprimentoInicialMedio.replace(',', '.')) || 0,
      especie: selectedPeixe.nomePopular, 
      tanqueId: selectedTanque.id, 
      tanqueNome: selectedTanque.name,
      status: 'ativo',
      faseCultivo: 'alevinagem',
      updatedAt: new Date().toISOString(),
    };

    try {
      if (currentLote) {
        await update(ref(database, `users/${user?.uid}/lots/${currentLote.id}`), loteData);
        setIsEditModalVisible(false);
      } else {
        await set(push(ref(database, `users/${user?.uid}/lots`)), {
            ...loteData, 
            createdAt: new Date().toISOString()
        });
        setIsAddModalVisible(false);
      }
    } catch (error) { Alert.alert("Erro", "Falha ao salvar."); }
  };

  const handleDeleteLote = async () => {
    if (passwordInput !== ADMIN_PASSWORD) return Alert.alert("Falha", "Senha incorreta.");
    if (!user || !currentLote) return;
    await remove(ref(database, `users/${user.uid}/lots/${currentLote.id}`));
    setIsDeleteModalVisible(false);
  };
  
  const handleSellLote = () => {
    if (!loteToSell || !saleQuantity || !salePrice) return Alert.alert("Erro", "Preencha os campos.");
    adicionarItem({
        loteId: loteToSell.id,
        loteNome: loteToSell.nomeLote,
        produtoNome: loteToSell.especie,
        quantidade: parseFloat(saleQuantity.replace(',', '.')),
        precoUnitario: parseFloat(salePrice.replace(',', '.')),
        unidade: saleUnit
    });
    setIsSellingModalVisible(false);
    Alert.alert("Sucesso", "Adicionado ao carrinho!", [
        { text: "Ir ao Carrinho", onPress: () => navigation.navigate("Carrinho") },
        { text: "Continuar", style: "cancel" }
    ]);
  };

  const renderItem: ListRenderItem<Lote> = ({ item }) => (
    <LoteCard item={item} onEdit={openEditModal} onDelete={openDeleteModal} onSell={openSellModal} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>Lotes</Text>
            <Text style={styles.subtitle}>{filteredLotes.length} lotes ativos</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar lote ou espécie..." 
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
        />
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#0EA5E9" /></View>
      ) : (
        <FlatList 
          data={filteredLotes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Ionicons name="fish-outline" size={64} color="#334155" />
                <Text style={styles.emptyText}>Nenhum lote encontrado</Text>
            </View>
          }
        />
      )}

      {/* MODAL ADICIONAR/EDITAR */}
      <Modal visible={isAddModalVisible || isEditModalVisible} animationType="slide" onRequestClose={() => {setIsAddModalVisible(false); setIsEditModalVisible(false)}}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{currentLote ? 'Editar Lote' : 'Novo Lote'}</Text>
            <Pressable onPress={() => {setIsAddModalVisible(false); setIsEditModalVisible(false)}}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <LoteForm 
                    formState={formState} 
                    onFormChange={(k, v) => setFormState(p => ({...p, [k]: v}))}
                    onSelectEspecie={() => setEspecieModalVisible(true)}
                    onSelectTanque={() => setTanqueModalVisible(true)}
                    selectedPeixe={selectedPeixe}
                    selectedTanque={selectedTanque}
                    isEditing={!!currentLote}
                />
                <View style={styles.modalButtons}>
                    <Pressable style={styles.cancelButton} onPress={() => {setIsAddModalVisible(false); setIsEditModalVisible(false)}}><Text style={styles.cancelButtonText}>Cancelar</Text></Pressable>
                    <Pressable style={styles.saveButton} onPress={handleAddOrUpdateLote}><Text style={styles.saveButtonText}>Salvar</Text></Pressable>
                </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL VENDER */}
      <Modal visible={isSellingModalVisible} transparent animationType="fade" onRequestClose={() => setIsSellingModalVisible(false)}>
        <View style={styles.overlay}>
            <View style={styles.sellCard}>
                <View style={styles.modalHeaderSimple}>
                    <Text style={styles.sellTitle}>Vender Lote</Text>
                    <Pressable onPress={() => setIsSellingModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></Pressable>
                </View>
                <Text style={styles.sellSubtitle}>{loteToSell?.nomeLote}</Text>

                <View style={styles.unitSelector}>
                    <Pressable style={[styles.unitOption, saleUnit === 'kg' && styles.unitOptionActive]} onPress={() => setSaleUnit('kg')}><Text style={[styles.unitText, saleUnit === 'kg' && styles.unitTextActive]}>KG</Text></Pressable>
                    <Pressable style={[styles.unitOption, saleUnit === 'milheiro' && styles.unitOptionActive]} onPress={() => setSaleUnit('milheiro')}><Text style={[styles.unitText, saleUnit === 'milheiro' && styles.unitTextActive]}>MILHEIRO</Text></Pressable>
                </View>

                <TextInput style={styles.input} placeholder={saleUnit === 'kg' ? "Peso (Kg)" : "Qtd (Un)"} placeholderTextColor="#64748B" keyboardType="numeric" value={saleQuantity} onChangeText={setSaleQuantity} />
                <TextInput style={[styles.input, {marginTop: 12}]} placeholder="Preço Unitário (R$)" placeholderTextColor="#64748B" keyboardType="numeric" value={salePrice} onChangeText={setSalePrice} />

                <Pressable style={styles.confirmSellButton} onPress={handleSellLote}>
                    <Text style={styles.confirmSellText}>Adicionar ao Carrinho</Text>
                </Pressable>
            </View>
        </View>
      </Modal>

      {/* MODAL DELETE */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={() => setIsDeleteModalVisible(false)}>
        <View style={styles.overlay}>
            <View style={styles.deleteCard}>
                <Ionicons name="warning" size={40} color="#EF4444" />
                <Text style={styles.deleteTitle}>Excluir Lote</Text>
                <Text style={styles.deleteText}>Digite a senha de administrador para excluir "{currentLote?.nomeLote}".</Text>
                <TextInput style={styles.passwordInput} placeholder="Senha" placeholderTextColor="#64748B" secureTextEntry value={passwordInput} onChangeText={setPasswordInput} />
                <View style={styles.deleteButtons}>
                    <Pressable style={styles.cancelButton} onPress={() => setIsDeleteModalVisible(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></Pressable>
                    <Pressable style={styles.confirmDeleteButton} onPress={handleDeleteLote}><Text style={styles.confirmDeleteText}>Excluir</Text></Pressable>
                </View>
            </View>
        </View>
      </Modal>

      {/* SELETORES AUXILIARES (TANQUE/ESPÉCIE) */}
      <Modal visible={tanqueModalVisible} animationType="slide" transparent onRequestClose={() => setTanqueModalVisible(false)}>
        <View style={styles.overlay}>
            <View style={styles.selectorContent}>
                <View style={styles.modalHeaderSimple}><Text style={styles.modalTitle}>Selecione o Tanque</Text><Pressable onPress={() => setTanqueModalVisible(false)}><Ionicons name="close" size={24} color="#0F172A" /></Pressable></View>
                <FlatList data={tanques} keyExtractor={i => i.id} renderItem={({item}) => (
                    <Pressable style={styles.selectorItem} onPress={() => {setSelectedTanque(item); setTanqueModalVisible(false)}}>
                        <Text style={styles.selectorText}>{item.name}</Text>
                    </Pressable>
                )} />
            </View>
        </View>
      </Modal>

      <Modal visible={especieModalVisible} animationType="slide" transparent onRequestClose={() => setEspecieModalVisible(false)}>
        <View style={styles.overlay}>
            <View style={styles.selectorContent}>
                <View style={styles.modalHeaderSimple}><Text style={styles.modalTitle}>Selecione a Espécie</Text><Pressable onPress={() => setEspecieModalVisible(false)}><Ionicons name="close" size={24} color="#0F172A" /></Pressable></View>
                <FlatList data={peixes} keyExtractor={i => i.id} renderItem={({item}) => (
                    <Pressable style={styles.selectorItem} onPress={() => {setSelectedPeixe(item); setEspecieModalVisible(false)}}>
                        <Text style={styles.selectorText}>{item.nomePopular}</Text>
                    </Pressable>
                )} />
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0EA5E9', justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', marginHorizontal: 20, marginTop: 16, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, color: '#fff', fontSize: 16 },

  listContent: { padding: 20 },
  
  // Card
  loteCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  loteTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  especieText: { fontSize: 14, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  cardDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  cardContent: { marginBottom: 16, gap: 8 },
  metricsRow: { flexDirection: 'row', gap: 16 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: { color: '#fff', fontWeight: '600' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: '#94A3B8', fontSize: 12 },
  detailValue: { color: '#fff', fontWeight: '600' },
  
  cardActions: { flexDirection: 'row', gap: 10 },
  actionButton: { padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  sellButton: { flex: 2, backgroundColor: '#10B981' },
  editButton: { flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  deleteButton: { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  actionButtonText: { color: '#fff', fontWeight: 'bold' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', marginTop: 16 },

  // Modais
  modalContainer: { flex: 1, backgroundColor: '#0F172A' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#1E293B' },
  modalHeaderSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' }, // Título Branco no Header Escuro
  formContainer: { gap: 16 },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputLabel: { color: '#94A3B8', marginBottom: 8, fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: '#fff', borderWidth: 1, borderColor: '#334155', fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E293B', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  selectButtonText: { color: '#fff', fontSize: 16 },
  placeholderText: { color: '#64748B' },
  
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 },
  cancelButton: { flex: 1, padding: 16, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: '600' },
  saveButton: { flex: 1, padding: 16, backgroundColor: '#0EA5E9', borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },

  // Overlay & Selectors
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  selectorContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '70%' }, // Lista de seleção fundo branco
  selectorItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selectorText: { color: '#0F172A', fontSize: 16, fontWeight: '500' },

  // Sell Modal
  sellCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24 },
  sellTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  sellSubtitle: { color: '#94A3B8', marginBottom: 20, textAlign: 'center' },
  unitSelector: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 10, padding: 4, marginBottom: 20 },
  unitOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  unitOptionActive: { backgroundColor: '#334155' },
  unitText: { fontWeight: '600', color: '#64748B', fontSize: 12 },
  unitTextActive: { color: '#fff' },
  confirmSellButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  confirmSellText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Delete Modal
  deleteCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginVertical: 12 },
  deleteText: { color: '#CBD5E1', textAlign: 'center', marginBottom: 20 },
  passwordInput: { backgroundColor: '#0F172A', width: '100%', padding: 12, borderRadius: 8, color: '#fff', borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  deleteButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmDeleteButton: { flex: 1, padding: 12, backgroundColor: '#EF4444', borderRadius: 8, alignItems: 'center' },
  confirmDeleteText: { color: '#fff', fontWeight: 'bold' },
});