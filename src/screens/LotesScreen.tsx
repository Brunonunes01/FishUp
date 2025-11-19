import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Lote, Peixe, Tanque } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123';

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

// --- COMPONENTES REUTILIZÁVEIS ---
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
  estimatedDate.setMonth(estimatedDate.getMonth() + 6); // +6 meses estimado
  const defaultEstimatedDate = estimatedDate.toISOString().split('T')[0];

  return (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nome do Lote *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: LOTE-2025-A" 
          value={formState.nomeLote} 
          onChangeText={v => onFormChange('nomeLote', v)} 
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Espécie *</Text>
        <Pressable style={styles.selectButton} onPress={onSelectEspecie}>
          <Text style={[styles.selectButtonText, !selectedPeixe && styles.placeholderText]}>
            {selectedPeixe ? `${selectedPeixe.nomePopular}` : "Selecione uma espécie"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </Pressable>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Quantidade *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0" 
            value={formState.quantidade} 
            onChangeText={v => onFormChange('quantidade', v)} 
            keyboardType="numeric" 
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Peso Inicial (g) *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0.0" 
            value={formState.pesoInicialMedio} 
            onChangeText={v => onFormChange('pesoInicialMedio', v)} 
            keyboardType="numeric" 
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Comprimento (cm)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0.0" 
            value={formState.comprimentoInicialMedio} 
            onChangeText={v => onFormChange('comprimentoInicialMedio', v)} 
            keyboardType="numeric" 
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fornecedor</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Nome do fornecedor" 
            value={formState.fornecedor} 
            onChangeText={v => onFormChange('fornecedor', v)} 
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Data Início *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="YYYY-MM-DD"
            value={formState.dataInicio || today}
            onChangeText={v => onFormChange('dataInicio', v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Previsão Colheita</Text>
          <TextInput 
            style={styles.input} 
            placeholder="YYYY-MM-DD"
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
          placeholder="Anotações importantes sobre o lote..." 
          value={formState.observacoes} 
          onChangeText={v => onFormChange('observacoes', v)}
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );
});

const LoteCard = memo(({ item, onEdit, onDelete }: { 
  item: Lote; 
  onEdit: (lote: Lote) => void; 
  onDelete: (lote: Lote) => void; 
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

  const getFaseColor = (fase?: string) => {
    switch (fase) {
      case 'alevinagem': return '#0EA5E9';
      case 'recria': return '#F59E0B';
      case 'engorda': return '#10B981';
      case 'terminacao': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const calculateDiasCultivo = (dataInicio: string) => {
    const inicio = new Date(dataInicio);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - inicio.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const diasCultivo = calculateDiasCultivo(item.dataInicio);

  return (
    <View style={styles.loteCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.loteTitle}>{item.nomeLote}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status || 'ativo'}
            </Text>
          </View>
        </View>
        <Text style={styles.especieText}>{item.especie}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Ionicons name="fish" size={16} color="#64748B" />
            <Text style={styles.metricText}>{item.quantidade?.toLocaleString('pt-BR')} peixes</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="scale" size={16} color="#64748B" />
            <Text style={styles.metricText}>{item.pesoInicialMedio}g inicial</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="calendar" size={16} color="#64748B" />
            <Text style={styles.metricText}>{diasCultivo} dias</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Tanque: </Text>
            {item.tanqueNome}
          </Text>
          {item.faseCultivo && (
            <View style={[styles.faseBadge, { backgroundColor: getFaseColor(item.faseCultivo) + '20' }]}>
              <Text style={[styles.faseText, { color: getFaseColor(item.faseCultivo) }]}>
                {item.faseCultivo}
              </Text>
            </View>
          )}
        </View>

        {item.dataEstimadaColheita && (
          <View style={styles.colheitaContainer}>
            <Ionicons name="time" size={14} color="#F59E0B" />
            <Text style={styles.colheitaText}>
              Colheita: {new Date(item.dataEstimadaColheita).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
});

// --- TELA PRINCIPAL ---
export default function LotesScreen() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [peixes, setPeixes] = useState<Peixe[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  // Estados para Modais
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [tanqueModalVisible, setTanqueModalVisible] = useState(false);
  const [especieModalVisible, setEspecieModalVisible] = useState(false);

  // Estados para Dados
  const [currentLote, setCurrentLote] = useState<Lote | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [formState, setFormState] = useState<FormState>({
    nomeLote: '', 
    quantidade: '', 
    quantidadeInicial: '',
    fornecedor: '', 
    pesoInicialMedio: '', 
    comprimentoInicialMedio: '',
    dataInicio: '',
    dataEstimadaColheita: '',
    observacoes: '',
  });
  const [selectedTanque, setSelectedTanque] = useState<Tanque | null>(null);
  const [selectedPeixe, setSelectedPeixe] = useState<Peixe | null>(null);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const lotesRef = ref(database, `users/${user.uid}/lots`);
    const tanquesRef = ref(database, `users/${user.uid}/tanks`);
    const peixesRef = ref(database, `users/${user.uid}/peixes`);

    const unsubLotes = onValue(lotesRef, (s) => {
      const data = s.val();
      setLotes(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      setLoading(false);
    });
    
    const unsubTanques = onValue(tanquesRef, (s) => {
      setTanques(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
    });
    
    const unsubPeixes = onValue(peixesRef, (s) => {
      setPeixes(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
    });

    return () => { 
      unsubLotes(); 
      unsubTanques(); 
      unsubPeixes(); 
    };
  }, [user]);

  // Funções de Abertura de Modais
  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + 6);
    const defaultEstimatedDate = estimatedDate.toISOString().split('T')[0];

    setCurrentLote(null);
    setFormState({ 
      nomeLote: '', 
      quantidade: '', 
      quantidadeInicial: '',
      fornecedor: '', 
      pesoInicialMedio: '', 
      comprimentoInicialMedio: '',
      dataInicio: today,
      dataEstimadaColheita: defaultEstimatedDate,
      observacoes: '',
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

  const handleSelectTanque = (tanque: Tanque) => {
    setSelectedTanque(tanque);
    setTanqueModalVisible(false);
  };

  const handleSelectPeixe = (peixe: Peixe) => {
    setSelectedPeixe(peixe);
    setEspecieModalVisible(false);
  };

  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };
  
  // Funções CRUD
  const handleAddOrUpdateLote = async () => {
    const { 
      nomeLote, 
      quantidade, 
      quantidadeInicial,
      fornecedor, 
      pesoInicialMedio, 
      comprimentoInicialMedio,
      dataInicio,
      dataEstimadaColheita,
      observacoes 
    } = formState;
    
    if (!nomeLote || !quantidade || !selectedTanque || !selectedPeixe || !dataInicio) {
      return Alert.alert("Atenção", "Preencha os campos obrigatórios (*).");
    }
    
    if (!user) return;
    
    const quantidadeNum = parseInt(quantidade);
    const pesoInicialNum = parseFloat(pesoInicialMedio.replace(',', '.')) || 0;
    const comprimentoInicialNum = comprimentoInicialMedio ? parseFloat(comprimentoInicialMedio.replace(',', '.')) : undefined;

    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      return Alert.alert("Erro", "Quantidade deve ser um número positivo.");
    }

    if (isNaN(pesoInicialNum) || pesoInicialNum <= 0) {
      return Alert.alert("Erro", "Peso inicial deve ser um número positivo.");
    }

    const loteData: any = { 
      nomeLote, 
      especie: selectedPeixe.nomePopular, 
      quantidade: quantidadeNum,
      quantidadeInicial: quantidadeInicial ? parseInt(quantidadeInicial) : quantidadeNum,
      fornecedor: fornecedor || 'Não informado',
      pesoInicialMedio: pesoInicialNum,
      comprimentoInicialMedio: comprimentoInicialNum,
      tanqueId: selectedTanque.id, 
      tanqueNome: selectedTanque.name,
      dataInicio,
      dataEstimadaColheita: dataEstimadaColheita || null,
      observacoes: observacoes || '',
      status: 'ativo',
      faseCultivo: 'alevinagem',
      createdAt: currentLote ? currentLote.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (currentLote) {
        await update(ref(database, `users/${user.uid}/lots/${currentLote.id}`), loteData);
        Alert.alert("Sucesso", "Lote atualizado com sucesso!");
        setIsEditModalVisible(false);
      } else {
        await set(push(ref(database, `users/${user.uid}/lots`)), loteData);
        Alert.alert("Sucesso", "Lote criado com sucesso!");
        setIsAddModalVisible(false);
      }
    } catch (error) { 
      console.error(error);
      Alert.alert("Erro", "Ocorreu um erro ao salvar o lote."); 
    }
  };

  const handleDeleteLote = async () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      return Alert.alert("Falha na Autenticação", "A senha de administrador está incorreta.");
    }
    
    if (!user || !currentLote) return;
    
    try {
      await remove(ref(database, `users/${user.uid}/lots/${currentLote.id}`));
      Alert.alert("Sucesso", "Lote excluído permanentemente.");
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (error) { 
      Alert.alert("Erro", "Não foi possível excluir o lote."); 
    }
  };

  const renderItem: ListRenderItem<Lote> = ({ item }) => (
    <LoteCard 
      item={item} 
      onEdit={openEditModal}
      onDelete={openDeleteModal}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Carregando lotes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gestão de Lotes</Text>
          <Text style={styles.subtitle}>{lotes.length} lotes em produção</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Novo Lote</Text>
        </Pressable>
      </View>

      {/* Lista de Lotes */}
      {lotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fish" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Nenhum lote cadastrado</Text>
          <Text style={styles.emptyText}>Comece criando seu primeiro lote de produção</Text>
          <Pressable style={styles.emptyButton} onPress={openAddModal}>
            <Text style={styles.emptyButtonText}>Criar Primeiro Lote</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList 
          data={lotes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* MODAL ADICIONAR/EDITAR LOTE */}
      <Modal visible={isAddModalVisible || isEditModalVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentLote ? 'Editar Lote' : 'Novo Lote'}
            </Text>
            <Pressable onPress={() => { setIsAddModalVisible(false); setIsEditModalVisible(false); }}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>
          
          <LoteForm
            formState={formState}
            onFormChange={handleFormChange}
            onSelectEspecie={() => setEspecieModalVisible(true)}
            onSelectTanque={() => setTanqueModalVisible(true)}
            selectedPeixe={selectedPeixe}
            selectedTanque={selectedTanque}
            isEditing={!!currentLote}
          />

          <View style={styles.modalFooter}>
            <Pressable 
              style={[styles.saveButton, (!formState.nomeLote || !formState.quantidade || !selectedTanque || !selectedPeixe) && styles.buttonDisabled]} 
              onPress={handleAddOrUpdateLote}
              disabled={!formState.nomeLote || !formState.quantidade || !selectedTanque || !selectedPeixe}
            >
              <Text style={styles.saveButtonText}>
                {currentLote ? 'Atualizar Lote' : 'Criar Lote'}
              </Text>
            </Pressable>
            <Pressable 
              style={styles.cancelButton}
              onPress={() => { setIsAddModalVisible(false); setIsEditModalVisible(false); }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL EXCLUIR LOTE */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.centeredModal}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteHeader}>
              <Ionicons name="warning" size={32} color="#EF4444" />
              <Text style={styles.deleteTitle}>Excluir Lote</Text>
            </View>
            
            <Text style={styles.deleteText}>
              Tem certeza que deseja excluir o lote "{currentLote?.nomeLote}"? 
              Esta ação não pode ser desfeita.
            </Text>

            <View style={styles.passwordContainer}>
              <Text style={styles.passwordLabel}>Senha de Administrador</Text>
              <TextInput 
                style={styles.passwordInput}
                placeholder="Digite a senha"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
              />
            </View>

            <View style={styles.deleteActions}>
              <Pressable 
                style={[styles.confirmDeleteButton, !passwordInput && styles.buttonDisabled]}
                onPress={handleDeleteLote}
                disabled={!passwordInput}
              >
                <Text style={styles.confirmDeleteText}>Confirmar Exclusão</Text>
              </Pressable>
              <Pressable 
                style={styles.cancelDeleteButton}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECIONAR TANQUE */}
      <Modal visible={tanqueModalVisible} animationType="slide" transparent>
        <View style={styles.centeredModal}>
          <View style={styles.selectionModalContent}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Selecionar Tanque</Text>
              <Pressable onPress={() => setTanqueModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <FlatList 
              data={tanques}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={[
                    styles.selectionItem,
                    selectedTanque?.id === item.id && styles.selectedItem
                  ]} 
                  onPress={() => handleSelectTanque(item)}
                >
                  <View style={styles.selectionItemContent}>
                    <Text style={styles.selectionItemText}>{item.name}</Text>
                    <Text style={styles.selectionItemSubtext}>{item.location}</Text>
                  </View>
                  {selectedTanque?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#0EA5E9" />
                  )}
                </Pressable>
              )} 
              ListEmptyComponent={
                <Text style={styles.emptySelectionText}>Nenhum tanque cadastrado.</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODAL SELECIONAR ESPÉCIE */}
      <Modal visible={especieModalVisible} animationType="slide" transparent>
        <View style={styles.centeredModal}>
          <View style={styles.selectionModalContent}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Selecionar Espécie</Text>
              <Pressable onPress={() => setEspecieModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <FlatList 
              data={peixes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={[
                    styles.selectionItem,
                    selectedPeixe?.id === item.id && styles.selectedItem
                  ]} 
                  onPress={() => handleSelectPeixe(item)}
                >
                  <View style={styles.selectionItemContent}>
                    <Text style={styles.selectionItemText}>{item.nomePopular}</Text>
                    <Text style={styles.selectionItemSubtext}>{item.nomeCientifico}</Text>
                  </View>
                  {selectedPeixe?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#0EA5E9" />
                  )}
                </Pressable>
              )} 
              ListEmptyComponent={
                <Text style={styles.emptySelectionText}>Nenhuma espécie cadastrada.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc", 
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // List
  listContent: {
    paddingBottom: 20,
  },

  // Lote Card
  loteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  loteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  especieText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#64748B',
  },
  faseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  faseText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colheitaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colheitaText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#0EA5E9',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Form Styles
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#0F172A',
  },
  placeholderText: {
    color: '#9CA3AF',
  },

  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },

  // Delete Modal
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 8,
  },
  deleteText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  passwordContainer: {
    marginBottom: 20,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  deleteActions: {
    gap: 12,
  },
  confirmDeleteButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelDeleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelDeleteText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },

  // Selection Modals
  selectionModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedItem: {
    backgroundColor: '#F0F9FF',
  },
  selectionItemContent: {
    flex: 1,
  },
  selectionItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  selectionItemSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  emptySelectionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 16,
    padding: 40,
  },
});