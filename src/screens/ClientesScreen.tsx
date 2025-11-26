import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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
import { Cliente } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const ADMIN_PASSWORD = 'admin123';

// ==================== TYPES ====================
type TipoCliente = 'varejo' | 'atacado' | 'distribuidor';
type FilterType = 'todos' | TipoCliente;

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
  tipo: TipoCliente;
  onFormChange: (field: keyof FormState, value: string) => void;
  onSelectTipo: (t: TipoCliente) => void;
};

// ==================== FORMULÁRIO (DARK MODE) ====================
const ClienteForm = memo(({ formState, tipo, onFormChange, onSelectTipo }: ClienteFormProps) => {
  const tipos: { label: string; value: TipoCliente; color: string }[] = [
    { label: 'Varejo', value: 'varejo', color: '#0EA5E9' },
    { label: 'Atacado', value: 'atacado', color: '#10B981' },
    { label: 'Distribuidor', value: 'distribuidor', color: '#8B5CF6' },
  ];

  return (
    <View style={styles.formContainer}>
      
      {/* Dados Principais */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nome / Razão Social *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="person" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Nome do cliente" 
            placeholderTextColor="#64748B"
            value={formState.nome} 
            onChangeText={v => onFormChange('nome', v)} 
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1.2 }]}>
          <Text style={styles.inputLabel}>Telefone *</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="(00) 00000-0000" 
              placeholderTextColor="#64748B"
              value={formState.telefone} 
              onChangeText={v => onFormChange('telefone', v)} 
              keyboardType="phone-pad"
            />
          </View>
        </View>
        <View style={[styles.inputGroup, { flex: 0.8 }]}>
          <Text style={styles.inputLabel}>CPF/CNPJ</Text>
          <TextInput 
            style={styles.inputSimple} 
            placeholder="Documento" 
            placeholderTextColor="#64748B"
            value={formState.cpfCnpj} 
            onChangeText={v => onFormChange('cpfCnpj', v)} 
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>E-mail</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="mail" size={20} color="#F59E0B" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="email@exemplo.com" 
            placeholderTextColor="#64748B"
            value={formState.email} 
            onChangeText={v => onFormChange('email', v)} 
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Endereço</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="location" size={20} color="#EF4444" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Endereço completo" 
            placeholderTextColor="#64748B"
            value={formState.endereco} 
            onChangeText={v => onFormChange('endereco', v)} 
          />
        </View>
      </View>

      {/* Seletor de Tipo */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tipo de Cliente</Text>
        <View style={styles.typeSelector}>
          {tipos.map((t) => (
            <Pressable
              key={t.value}
              style={[
                styles.typeOption,
                tipo === t.value && { backgroundColor: t.color + '20', borderColor: t.color }
              ]}
              onPress={() => onSelectTipo(t.value)}
            >
              <Text style={[
                styles.typeText,
                tipo === t.value && { color: t.color, fontWeight: 'bold' }
              ]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Observações</Text>
        <TextInput 
          style={[styles.inputSimple, styles.textArea]} 
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

// ==================== CARD DO CLIENTE ====================
const ClienteCard = memo(({ item, onEdit, onDelete }: { item: Cliente, onEdit: (c: Cliente) => void, onDelete: (c: Cliente) => void }) => {
  
  const getTipoStyle = (tipo: string) => {
    switch (tipo) {
      case 'varejo': return { color: '#0EA5E9', label: 'Varejo' };
      case 'atacado': return { color: '#10B981', label: 'Atacado' };
      case 'distribuidor': return { color: '#8B5CF6', label: 'Distribuidor' };
      default: return { color: '#64748B', label: 'Padrão' };
    }
  };

  const tipoInfo = getTipoStyle(item.tipo);

  const handleCall = () => {
    Linking.openURL(`tel:${item.telefone}`);
  };

  const handleEmail = () => {
    if (item.email) Linking.openURL(`mailto:${item.email}`);
    else Alert.alert("Aviso", "Este cliente não possui e-mail cadastrado.");
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <Text style={styles.avatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.nome}</Text>
          <View style={styles.cardBadges}>
            <View style={[styles.badge, { backgroundColor: tipoInfo.color + '20' }]}>
              <Text style={[styles.badgeText, { color: tipoInfo.color }]}>{tipoInfo.label}</Text>
            </View>
            {item.pedidosRealizados > 0 && (
              <View style={styles.statsBadge}>
                <Ionicons name="cart" size={10} color="#F59E0B" />
                <Text style={styles.statsText}>{item.pedidosRealizados}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.contactRow}>
        <Pressable style={styles.contactItem} onPress={handleCall}>
          <View style={styles.contactIconBox}>
            <Ionicons name="call" size={16} color="#10B981" />
          </View>
          <Text style={styles.contactText}>{item.telefone}</Text>
        </Pressable>
        
        {item.email && (
          <Pressable style={styles.contactItem} onPress={handleEmail}>
            <View style={styles.contactIconBox}>
              <Ionicons name="mail" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
          </Pressable>
        )}
      </View>

      {item.endereco && (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.addressText} numberOfLines={1}>{item.endereco}</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={18} color="#0EA5E9" />
          <Text style={[styles.actionText, { color: '#0EA5E9' }]}>Editar</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
});

// ==================== TELA PRINCIPAL ====================
export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const user = auth.currentUser;

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modais
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  
  // Estados de Dados
  const [currentCliente, setCurrentCliente] = useState<Cliente | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [formState, setFormState] = useState<FormState>({
    nome: '', telefone: '', email: '', endereco: '', cpfCnpj: '', observacoes: '',
  });
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('varejo');

  // Carregar Dados
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const clientesRef = ref(database, `users/${user.uid}/clientes`);
    
    const unsubscribe = onValue(clientesRef, (snapshot) => {
      const data = snapshot.val();
      const lista = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      // Ordenar por nome
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
      setClientes(lista);
      setLoading(false);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, [user]);

  // Filtros
  useEffect(() => {
    let result = clientes;

    if (filterType !== 'todos') {
      result = result.filter(c => c.tipo === filterType);
    }

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.nome.toLowerCase().includes(lower) || 
        c.email?.toLowerCase().includes(lower)
      );
    }

    setFilteredClientes(result);
  }, [clientes, filterType, searchQuery]);

  // Handlers
  const openAddModal = () => {
    setCurrentCliente(null);
    setFormState({ nome: '', telefone: '', email: '', endereco: '', cpfCnpj: '', observacoes: '' });
    setTipoCliente('varejo');
    setIsAddModalVisible(true);
  };

  const openEditModal = (c: Cliente) => {
    setCurrentCliente(c);
    setFormState({
      nome: c.nome,
      telefone: c.telefone,
      email: c.email || '',
      endereco: c.endereco || '',
      cpfCnpj: c.cpfCnpj || '',
      observacoes: c.observacoes || '',
    });
    setTipoCliente(c.tipo);
    setIsAddModalVisible(true);
  };

  const openDeleteModal = (c: Cliente) => {
    setCurrentCliente(c);
    setPasswordInput('');
    setIsDeleteModalVisible(true);
  };

  const handleSave = async () => {
    const { nome, telefone } = formState;
    if (!nome.trim() || !telefone.trim()) return Alert.alert("Erro", "Nome e telefone são obrigatórios.");
    if (!user) return;

    const clienteData = {
      ...formState,
      tipo: tipoCliente,
      pedidosRealizados: currentCliente?.pedidosRealizados || 0,
      valorTotalComprado: currentCliente?.valorTotalComprado || 0,
      dataCadastro: currentCliente?.dataCadastro || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (currentCliente) {
        await update(ref(database, `users/${user.uid}/clientes/${currentCliente.id}`), clienteData);
        Alert.alert("Sucesso", "Cliente atualizado!");
      } else {
        await set(push(ref(database, `users/${user.uid}/clientes`)), clienteData);
        Alert.alert("Sucesso", "Cliente cadastrado!");
      }
      setIsAddModalVisible(false);
    } catch (e) { Alert.alert("Erro", "Falha ao salvar."); }
  };

  const handleDelete = async () => {
    if (passwordInput !== ADMIN_PASSWORD) return Alert.alert("Erro", "Senha incorreta.");
    if (!user || !currentCliente) return;
    await remove(ref(database, `users/${user.uid}/clientes/${currentCliente.id}`));
    setIsDeleteModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.subtitle}>{filteredClientes.length} cadastrados</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="person-add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* BUSCA E FILTROS */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
          {(['todos', 'varejo', 'atacado', 'distribuidor'] as FilterType[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, filterType === t && styles.chipActive]}
              onPress={() => setFilterType(t)}
            >
              <Text style={[styles.chipText, filterType === t && styles.chipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* LISTA */}
      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#0EA5E9" /></View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={filteredClientes}
            renderItem={({ item }) => <ClienteCard item={item} onEdit={openEditModal} onDelete={openDeleteModal} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#334155" />
                <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
              </View>
            }
          />
        </Animated.View>
      )}

      {/* MODAL ADD/EDIT */}
      <Modal visible={isAddModalVisible} animationType="slide" onRequestClose={() => setIsAddModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{currentCliente ? 'Editar Cliente' : 'Novo Cliente'}</Text>
            <Pressable onPress={() => setIsAddModalVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <ClienteForm 
                formState={formState} 
                tipo={tipoCliente}
                onFormChange={(k, v) => setFormState(p => ({ ...p, [k]: v }))}
                onSelectTipo={setTipoCliente}
              />
              <View style={styles.modalButtons}>
                <Pressable style={styles.cancelButton} onPress={() => setIsAddModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL DELETE */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={() => setIsDeleteModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.deleteCard}>
            <Ionicons name="warning" size={40} color="#EF4444" />
            <Text style={styles.deleteTitle}>Excluir Cliente</Text>
            <Text style={styles.deleteText}>Confirme a senha para excluir "{currentCliente?.nome}".</Text>
            <TextInput 
              style={styles.passwordInput} 
              placeholder="Senha" 
              placeholderTextColor="#64748B" 
              secureTextEntry 
              value={passwordInput} 
              onChangeText={setPasswordInput} 
            />
            <View style={styles.deleteButtons}>
              <Pressable style={styles.cancelDeleteButton} onPress={() => setIsDeleteModalVisible(false)}>
                <Text style={styles.cancelDeleteText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmDeleteButton} onPress={handleDelete}>
                <Text style={styles.confirmDeleteText}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0EA5E9', justifyContent: 'center', alignItems: 'center' },

  // Filtros
  filterSection: { backgroundColor: '#1E293B', paddingBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, color: '#fff', fontSize: 16 },
  chipsContainer: { paddingHorizontal: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  chipText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },

  // Lista
  listContent: { padding: 20 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  cardBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  statsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statsText: { color: '#F59E0B', fontSize: 10, fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },
  contactRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  contactText: { color: '#E2E8F0', fontSize: 13, fontWeight: '500' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, backgroundColor: '#0F172A', padding: 8, borderRadius: 8 },
  addressText: { color: '#94A3B8', fontSize: 12, flex: 1 },
  
  cardActions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, gap: 6, borderWidth: 1 },
  editButton: { borderColor: '#0EA5E9', backgroundColor: 'rgba(14, 165, 233, 0.1)' },
  deleteButton: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  actionText: { fontSize: 13, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', marginTop: 16 },

  // Modal Form
  modalContainer: { flex: 1, backgroundColor: '#0F172A' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#1E293B' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  formContainer: { gap: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#94A3B8', marginBottom: 8, fontSize: 12, fontWeight: '600' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  inputIcon: { marginLeft: 12 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#fff' },
  inputSimple: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: '#334155' },
  inputRow: { flexDirection: 'row', gap: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeOption: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1E293B' },
  typeText: { color: '#94A3B8', fontSize: 12 },
  
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 },
  cancelButton: { flex: 1, padding: 16, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: '600' },
  saveButton: { flex: 1, padding: 16, backgroundColor: '#0EA5E9', borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },

  // Modal Delete
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  deleteCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginVertical: 12 },
  deleteText: { color: '#CBD5E1', textAlign: 'center', marginBottom: 20 },
  passwordInput: { backgroundColor: '#0F172A', width: '100%', padding: 12, borderRadius: 8, color: '#fff', borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  deleteButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelDeleteButton: { flex: 1, padding: 12, backgroundColor: '#334155', borderRadius: 8, alignItems: 'center' },
  cancelDeleteText: { color: '#fff', fontWeight: 'bold' },
  confirmDeleteButton: { flex: 1, padding: 12, backgroundColor: '#EF4444', borderRadius: 8, alignItems: 'center' },
  confirmDeleteText: { color: '#fff', fontWeight: 'bold' },
});