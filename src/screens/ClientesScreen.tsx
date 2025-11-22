import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// Importar o tipo Cliente do arquivo de navegação
import { Cliente } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123'; 

// --- TYPES ---
type TipoCliente = 'varejo' | 'atacado' | 'distribuidor';

type FormState = {
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  cpfCnpj: string;
  observacoes: string;
};

type ClienteFormProps = {
  formState: FormState;
  onFormChange: (field: keyof FormState, value: string) => void;
  tipo: TipoCliente;
  onSelectTipo: (tipo: TipoCliente) => void;
};

// --- COMPONENTE DO FORMULÁRIO ---
const ClienteForm = memo(({ formState, onFormChange, tipo, onSelectTipo }: ClienteFormProps) => {
  const inputRefs = useRef<{[key: string]: TextInput | null}>({});

  const tipos: { label: string, value: TipoCliente }[] = [
    { label: 'Varejo', value: 'varejo' },
    { label: 'Atacado', value: 'atacado' },
    { label: 'Distribuidor', value: 'distribuidor' },
  ];

  return (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      
      {/* Informações Básicas */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Dados Pessoais/Empresariais</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nome/Razão Social *</Text>
          <TextInput 
            ref={el => { inputRefs.current['nome'] = el; }}
            style={styles.input} 
            placeholder="Nome Completo ou Razão Social" 
            value={formState.nome} 
            onChangeText={v => onFormChange('nome', v)} 
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current['telefone']?.focus()}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Telefone *</Text>
            <TextInput 
              ref={el => { inputRefs.current['telefone'] = el; }}
              style={styles.input} 
              placeholder="(00) 00000-0000" 
              value={formState.telefone} 
              onChangeText={v => onFormChange('telefone', v)} 
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['email']?.focus()}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput 
              ref={el => { inputRefs.current['email'] = el; }}
              style={styles.input} 
              placeholder="email@cliente.com" 
              value={formState.email} 
              onChangeText={v => onFormChange('email', v)} 
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['cpfCnpj']?.focus()}
            />
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CPF/CNPJ</Text>
          <TextInput 
            ref={el => { inputRefs.current['cpfCnpj'] = el; }}
            style={styles.input} 
            placeholder="CPF ou CNPJ" 
            value={formState.cpfCnpj} 
            onChangeText={v => onFormChange('cpfCnpj', v)} 
            keyboardType="numeric"
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current['endereco']?.focus()}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Endereço</Text>
          <TextInput 
            ref={el => { inputRefs.current['endereco'] = el; }}
            style={styles.input} 
            placeholder="Rua, Número, Bairro, Cidade/UF" 
            value={formState.endereco} 
            onChangeText={v => onFormChange('endereco', v)} 
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current['observacoes']?.focus()}
          />
        </View>
      </View>

      {/* Tipo de Cliente */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Tipo de Cliente</Text>
        <View style={styles.optionsRow}>
          {tipos.map((t) => (
            <Pressable 
              key={t.value} 
              style={[styles.option, tipo === t.value && styles.optionActive]} 
              onPress={() => onSelectTipo(t.value)}
            >
              <Ionicons 
                name={tipo === t.value ? 'radio-button-on' : 'radio-button-off'} 
                size={20} 
                color={tipo === t.value ? '#0EA5E9' : '#64748B'} 
              />
              <Text style={[styles.optionText, tipo === t.value && styles.optionTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Observações */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Observações</Text>
        <TextInput 
          ref={el => { inputRefs.current['observacoes'] = el; }}
          style={[styles.input, styles.textArea]} 
          placeholder="Notas sobre preferências ou histórico..." 
          value={formState.observacoes} 
          onChangeText={v => onFormChange('observacoes', v)} 
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="done"
        />
      </View>
      <View style={styles.spacer} />
    </ScrollView>
  );
});

// --- COMPONENTE CARD DO CLIENTE ---
const ClienteCard = memo(({ item, onEdit, onDelete }: { item: Cliente, onEdit: (c: Cliente) => void, onDelete: (c: Cliente) => void }) => {
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'varejo': return '#0EA5E9';
      case 'atacado': return '#10B981';
      case 'distribuidor': return '#8B5CF6';
      default: return '#64748B';
    }
  };

  return (
    <View style={styles.card}>
      <View style={[styles.cardBorder, { backgroundColor: getTipoColor(item.tipo) }]} />
      <View style={styles.cardContent}>
        
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nome}</Text>
          <View style={[styles.tipoBadge, { backgroundColor: getTipoColor(item.tipo) + '20' }]}>
            <Text style={[styles.tipoText, { color: getTipoColor(item.tipo) }]}>
              {item.tipo}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardDetailRow}>
          <Ionicons name="call-outline" size={14} color="#64748B" />
          <Text style={styles.cardDetailText}>{item.telefone}</Text>
        </View>
        
        {item.email && (
          <View style={styles.cardDetailRow}>
            <Ionicons name="mail-outline" size={14} color="#64748B" />
            <Text style={styles.cardDetailText}>{item.email}</Text>
          </View>
        )}
        
        {item.endereco && (
          <View style={styles.cardDetailRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.cardDetailText} numberOfLines={1}>{item.endereco}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <Pressable style={styles.editButton} onPress={() => onEdit(item)}>
            <Ionicons name="create-outline" size={18} color="#0EA5E9" />
            <Text style={styles.editText}>Editar</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => onDelete(item)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            {/* CORREÇÃO: Usando o novo nome de estilo para o texto do card */}
            <Text style={styles.deleteCardText}>Excluir</Text> 
          </Pressable>
        </View>
        
      </View>
    </View>
  );
});

// --- TELA PRINCIPAL ---
export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  
  // Estados de Modais
  const [isAddOrEditModalVisible, setIsAddOrEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  
  // Estados de Dados
  const [currentCliente, setCurrentCliente] = useState<Cliente | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    nome: '', telefone: '', email: '', endereco: '', cpfCnpj: '', observacoes: '',
  });
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('varejo');

  // --- EFEITOS ---
  useEffect(() => {
    if (!user) return;
    
    const clientesRef = ref(database, `users/${user.uid}/clientes`);
    const unsubscribe = onValue(clientesRef, (snapshot) => {
      const data = snapshot.val();
      const clientesArray = data 
        ? Object.keys(data).map(k => ({ 
            id: k, 
            ...data[k], 
            dataCadastro: data[k].dataCadastro || new Date().toISOString() // Garante data de cadastro
          }))
        : [];
      setClientes(clientesArray.sort((a, b) => new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime()));
      setLoading(false);
    });
    
    return unsubscribe;
  }, [user]);

  // --- Funções Auxiliares de Limpeza (CORREÇÃO 1: Limpa undefined) ---
  const cleanupString = (value: string | undefined): string | undefined => {
      if (!value) return undefined; 
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
  };

  // Funçao auxiliar para remover undefineds antes de salvar no Firebase (CORREÇÃO 2: Filtra undefineds)
  const filterUndefined = (obj: any): any => {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
    );
  };
  
  // --- Funções de Abertura de Modais ---
  const openAddModal = useCallback(() => {
    setCurrentCliente(null);
    setFormState({ nome: '', telefone: '', email: '', endereco: '', cpfCnpj: '', observacoes: '' });
    setTipoCliente('varejo');
    setIsAddOrEditModalVisible(true);
  }, []);

  const openEditModal = useCallback((cliente: Cliente) => {
    setCurrentCliente(cliente);
    setFormState({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cpfCnpj: cliente.cpfCnpj || '',
      observacoes: cliente.observacoes || '',
    });
    setTipoCliente(cliente.tipo || 'varejo');
    setIsAddOrEditModalVisible(true);
  }, []);

  const openDeleteModal = useCallback((cliente: Cliente) => {
    setCurrentCliente(cliente);
    setPasswordInput('');
    setIsDeleteModalVisible(true);
  }, []);

  const handleFormChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  // --- Funções CRUD ---
  const handleAddOrUpdateCliente = async () => {
    const { nome, telefone } = formState;
    
    if (!nome.trim() || !telefone.trim()) {
      return Alert.alert("Atenção", "O nome e o telefone são obrigatórios.");
    }
    
    if (!user) return;
    setIsSaving(true);

    const baseClienteData = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: cleanupString(formState.email),
        endereco: cleanupString(formState.endereco), 
        cpfCnpj: cleanupString(formState.cpfCnpj),
        observacoes: cleanupString(formState.observacoes),
        tipo: tipoCliente,
        pedidosRealizados: currentCliente?.pedidosRealizados || 0,
        valorTotalComprado: currentCliente?.valorTotalComprado || 0,
        updatedAt: new Date().toISOString(), 
    };
    
    const clienteDataCleaned = filterUndefined(baseClienteData);
    
    try {
      if (currentCliente) {
        await update(ref(database, `users/${user.uid}/clientes/${currentCliente.id}`), {
          ...clienteDataCleaned,
          dataCadastro: currentCliente.dataCadastro,
        });
        Alert.alert("✅ Sucesso", "Cliente atualizado com sucesso!");
      } else {
        const newClienteRef = push(ref(database, `users/${user.uid}/clientes`));
        await set(newClienteRef, {
          ...clienteDataCleaned,
          dataCadastro: new Date().toISOString(),
        });
        Alert.alert("✅ Sucesso", `Cliente ${nome} cadastrado!`);
      }
      setIsAddOrEditModalVisible(false);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      Alert.alert("❌ Erro", "Ocorreu um erro ao salvar o cliente. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCliente = async () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      return Alert.alert("❌ Falha", "Senha de administrador incorreta.");
    }
    
    if (!user || !currentCliente) return;
    
    try {
      await remove(ref(database, `users/${user.uid}/clientes/${currentCliente.id}`));
      Alert.alert("✅ Sucesso", "Cliente excluído.");
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (error) {
      Alert.alert("❌ Erro", "Não foi possível excluir o cliente.");
    }
  };

  const renderItem: ListRenderItem<Cliente> = ({ item }) => (
    <ClienteCard item={item} onEdit={openEditModal} onDelete={openDeleteModal} />
  );

  // --- RENDER ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Carregando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.subtitle}>{clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} cadastrados</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Novo Cliente</Text>
        </Pressable>
      </View>

      {/* Lista de Clientes */}
      {clientes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Nenhum cliente cadastrado</Text>
          <Text style={styles.emptyText}>Comece adicionando seu primeiro cliente para gerenciar as vendas.</Text>
          <Pressable style={styles.emptyButton} onPress={openAddModal}>
            <Text style={styles.emptyButtonText}>Adicionar Cliente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={clientes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL ADICIONAR/EDITAR */}
      <Modal visible={isAddOrEditModalVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </Text>
            <Pressable onPress={() => setIsAddOrEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>
          
          <ClienteForm
            formState={formState}
            onFormChange={handleFormChange}
            tipo={tipoCliente}
            onSelectTipo={setTipoCliente}
          />

          <View style={styles.modalFooter}>
            <Pressable 
              style={styles.cancelButton}
              onPress={() => setIsAddOrEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable 
              style={[styles.saveButton, (!formState.nome || !formState.telefone || isSaving) && styles.buttonDisabled]} 
              onPress={handleAddOrUpdateCliente}
              disabled={!formState.nome || !formState.telefone || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {currentCliente ? 'Atualizar' : 'Salvar Cliente'}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DELETAR */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.centeredModal}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteHeader}>
              <Ionicons name="warning" size={32} color="#EF4444" />
              <Text style={styles.deleteTitle}>Excluir Cliente</Text>
            </View>
            
            <Text style={styles.deleteModalText}>
              Tem certeza que deseja excluir o cliente{" "}
              <Text style={styles.deleteHighlight}>"{currentCliente?.nome}"</Text>?
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
                style={styles.cancelDeleteButton}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancelar</Text>
              </Pressable>
              <Pressable 
                style={[styles.confirmDeleteButton, !passwordInput && styles.buttonDisabled]}
                onPress={handleDeleteCliente}
                disabled={!passwordInput}
              >
                <Text style={styles.confirmDeleteText}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    backgroundColor: '#10B981',
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },

  // Cliente Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
  },
  cardBorder: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  tipoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tipoText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardDetailText: {
    fontSize: 14,
    color: '#374151',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editText: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // CORREÇÃO: Novo nome de estilo para o texto do card
  deleteCardText: {
    color: '#EF4444',
    fontWeight: '600',
  },

  // Form
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  optionActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  optionTextActive: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  spacer: {
    height: 60,
  },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
    gap: 12,
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#10B981',
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
    flex: 1,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  deleteHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 8,
  },
  // CORREÇÃO: Estilo do texto principal do modal (seu bloco de código original)
  deleteModalText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  deleteHighlight: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  passwordContainer: {
    width: '100%',
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
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmDeleteButton: {
    flex: 1,
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
    flex: 1,
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
});