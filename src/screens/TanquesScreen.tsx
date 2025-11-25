import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Tanque } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const ADMIN_PASSWORD = 'admin123';

// ==================== TYPES ====================
type FormState = {
  name: string;
  location: string;
  comprimento: string;
  largura: string;
  profundidade: string;
};

type TanqueFormProps = {
  formState: FormState;
  onFormChange: (field: keyof FormState, value: string) => void;
  inputRefs: React.MutableRefObject<{ [key: string]: TextInput | null }>;
};

type FilterType = 'todos' | 'grande' | 'medio' | 'pequeno';

// ==================== COMPONENTE DO FORMULÁRIO ====================
const TanqueForm = memo(({ formState, onFormChange, inputRefs }: TanqueFormProps) => {
  return (
    <View style={styles.formContainer}>
      <View style={styles.formSection}>
        <View style={styles.sectionHeaderForm}>
          <Ionicons name="information-circle" size={20} color="#0EA5E9" />
          <Text style={styles.sectionTitleForm}>Informações Básicas</Text>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Nome do Tanque</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="water" size={20} color="#0EA5E9" style={styles.inputIcon} />
            <TextInput
              ref={el => { inputRefs.current['name'] = el; }}
              style={styles.inputField}
              placeholder="Ex: Tanque Principal 01"
              value={formState.name}
              onChangeText={(v) => onFormChange('name', v)}
              placeholderTextColor="#64748B"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['location']?.focus()}
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Localização</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location" size={20} color="#0EA5E9" style={styles.inputIcon} />
            <TextInput
              ref={el => { inputRefs.current['location'] = el; }}
              style={styles.inputField}
              placeholder="Ex: Setor A - Área Externa"
              value={formState.location}
              onChangeText={(v) => onFormChange('location', v)}
              placeholderTextColor="#64748B"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['comprimento']?.focus()}
            />
          </View>
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.sectionHeaderForm}>
          <Ionicons name="resize" size={20} color="#10B981" />
          <Text style={styles.sectionTitleForm}>Dimensões (metros)</Text>
        </View>

        <View style={styles.dimensionsGrid}>
          <View style={styles.dimensionCard}>
            <Text style={styles.dimensionLabel}>Comprimento</Text>
            <TextInput
              ref={el => { inputRefs.current['comprimento'] = el; }}
              style={styles.dimensionInput}
              placeholder="0.00"
              value={formState.comprimento}
              onChangeText={(v) => onFormChange('comprimento', v)}
              keyboardType="numeric"
              placeholderTextColor="#64748B"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['largura']?.focus()}
            />
          </View>

          <View style={styles.dimensionCard}>
            <Text style={styles.dimensionLabel}>Largura</Text>
            <TextInput
              ref={el => { inputRefs.current['largura'] = el; }}
              style={styles.dimensionInput}
              placeholder="0.00"
              value={formState.largura}
              onChangeText={(v) => onFormChange('largura', v)}
              keyboardType="numeric"
              placeholderTextColor="#64748B"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['profundidade']?.focus()}
            />
          </View>

          <View style={styles.dimensionCard}>
            <Text style={styles.dimensionLabel}>Profundidade</Text>
            <TextInput
              ref={el => { inputRefs.current['profundidade'] = el; }}
              style={styles.dimensionInput}
              placeholder="0.00"
              value={formState.profundidade}
              onChangeText={(v) => onFormChange('profundidade', v)}
              keyboardType="numeric"
              placeholderTextColor="#64748B"
              returnKeyType="done"
            />
          </View>
        </View>

        {formState.comprimento && formState.largura && formState.profundidade && (
          <View style={styles.volumePreview}>
            <Ionicons name="calculator" size={20} color="#8B5CF6" />
            <Text style={styles.volumePreviewText}>
              Volume: {' '}
              <Text style={styles.volumePreviewValue}>
                {(
                  parseFloat(formState.comprimento.replace(',', '.') || '0') *
                  parseFloat(formState.largura.replace(',', '.') || '0') *
                  parseFloat(formState.profundidade.replace(',', '.') || '0') *
                  1000
                ).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
              </Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

// ==================== TELA PRINCIPAL ====================
export default function TanquesScreen() {
  const [tanks, setTanks] = useState<Tanque[]>([]);
  const [filteredTanks, setFilteredTanks] = useState<Tanque[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const user = auth.currentUser;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [isAddOrEditModalVisible, setIsAddOrEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [currentTank, setCurrentTank] = useState<Tanque | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [formState, setFormState] = useState<FormState>({ name: '', location: '', comprimento: '', largura: '', profundidade: '' });
  const [isSaving, setIsSaving] = useState(false);

  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  useEffect(() => {
    if (!user) return;
    const tanksRef = ref(database, `users/${user.uid}/tanks`);
    const unsubscribe = onValue(tanksRef, (snapshot) => {
      const data = snapshot.val();
      const tanksArray = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      setTanks(tanksArray);
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    let result = tanks;
    if (filterType !== 'todos') {
      result = result.filter(tank => {
        const volume = tank.volume;
        if (filterType === 'grande') return volume > 50000;
        if (filterType === 'medio') return volume > 20000 && volume <= 50000;
        if (filterType === 'pequeno') return volume <= 20000;
        return true;
      });
    }
    if (searchQuery.trim()) {
      result = result.filter(tank =>
        tank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tank.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTanks(result);
  }, [tanks, filterType, searchQuery]);

  const openAddModal = useCallback(() => {
    setCurrentTank(null);
    setFormState({ name: '', location: '', comprimento: '', largura: '', profundidade: '' });
    setIsAddOrEditModalVisible(true);
  }, []);

  const openEditModal = useCallback((tanque: Tanque) => {
    setCurrentTank(tanque);
    setFormState({
      name: tanque.name,
      location: tanque.location,
      comprimento: tanque.comprimento.toString().replace('.', ','),
      largura: tanque.largura.toString().replace('.', ','),
      profundidade: tanque.profundidade.toString().replace('.', ','),
    });
    setIsAddOrEditModalVisible(true);
  }, []);

  const openDeleteModal = useCallback((tanque: Tanque) => {
    setCurrentTank(tanque);
    setIsDeleteModalVisible(true);
  }, []);

  const openDetailsModal = useCallback((tanque: Tanque) => {
    setCurrentTank(tanque);
    setIsDetailsModalVisible(true);
  }, []);

  const handleFormChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddOrUpdateTank = async () => {
    const { name, location, comprimento, largura, profundidade } = formState;
    if (!name.trim() || !location.trim() || !comprimento || !largura || !profundidade) return Alert.alert("Atenção", "Preencha todos os campos.");
    
    if (!user) return;
    setIsSaving(true);

    const c = parseFloat(comprimento.replace(',', '.'));
    const l = parseFloat(largura.replace(',', '.'));
    const p = parseFloat(profundidade.replace(',', '.'));

    if (isNaN(c) || isNaN(l) || isNaN(p) || c <= 0 || l <= 0 || p <= 0) {
      setIsSaving(false);
      return Alert.alert("Erro", "As dimensões devem ser números positivos.");
    }

    const volumeEmLitros = c * l * p * 1000;
    const tankData: Partial<Tanque> = {
      name,
      location,
      comprimento: c,
      largura: l,
      profundidade: p,
      volume: volumeEmLitros,
      updatedAt: new Date().toISOString(),
    };
    
    if (!currentTank) tankData.createdAt = new Date().toISOString();

    try {
      if (currentTank) {
        await update(ref(database, `users/${user.uid}/tanks/${currentTank.id}`), { ...tankData, createdAt: currentTank.createdAt });
        Alert.alert("Sucesso", "Tanque atualizado!");
      } else {
        await set(push(ref(database, `users/${user.uid}/tanks`)), tankData);
        Alert.alert("Sucesso", `Tanque adicionado!\nVolume: ${volumeEmLitros.toFixed(0)} L`);
      }
      setIsAddOrEditModalVisible(false);
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTank = async () => {
    if (passwordInput !== ADMIN_PASSWORD) return Alert.alert("Falha", "Senha incorreta.");
    if (!user || !currentTank) return;
    try {
      await remove(ref(database, `users/${user.uid}/tanks/${currentTank.id}`));
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (error) {
      Alert.alert("Erro", "Falha ao excluir.");
    }
  };

  const getTankSize = (volume: number) => {
    if (volume > 50000) return { label: 'Grande', color: '#10B981' };
    if (volume > 20000) return { label: 'Médio', color: '#F59E0B' };
    return { label: 'Pequeno', color: '#0EA5E9' };
  };

  // ==================== RENDER CARD ====================
  const TanqueCard = memo(({ item }: { item: Tanque }) => {
    const sizeInfo = getTankSize(item.volume);
    
    return (
      <Pressable style={styles.tanqueCard} onPress={() => openDetailsModal(item)}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBg, { backgroundColor: sizeInfo.color + '20' }]}>
            <Ionicons name="water" size={24} color={sizeInfo.color} />
          </View>
          <View style={styles.cardTitleSection}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardLocation}>{item.location}</Text>
          </View>
          <View style={[styles.cardSizeBadge, { backgroundColor: sizeInfo.color + '20' }]}>
            <Text style={[styles.cardSizeBadgeText, { color: sizeInfo.color }]}>{sizeInfo.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardMainInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Volume:</Text>
            <Text style={styles.infoValue}>{item.volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="resize-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Dimensões:</Text>
            <Text style={styles.infoValue}>
              {item.comprimento}x{item.largura}x{item.profundidade}m
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable style={[styles.actionButton, { backgroundColor: '#F59E0B20' }]} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={16} color="#F59E0B" />
            <Text style={[styles.actionText, { color: '#F59E0B' }]}>Editar</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: '#EF444420' }]} onPress={() => openDeleteModal(item)}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  });

  const renderItem: ListRenderItem<Tanque> = ({ item }) => <TanqueCard item={item} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Tanques</Text>
          <Text style={styles.screenSubtitle}>{filteredTanks.length} tanques ativos</Text>
        </View>
        <Pressable style={styles.addFloatingButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Busca e Filtros */}
      <View style={styles.filtersWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar tanque..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['todos', 'grande', 'medio', 'pequeno'] as const).map((type) => (
            <Pressable
              key={type}
              style={[styles.filterChip, filterType === type && styles.filterChipActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Lista */}
      <FlatList
        data={filteredTanks}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="water-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>Nenhum tanque encontrado</Text>
          </View>
        }
      />

      {/* MODAL ADICIONAR/EDITAR */}
      <Modal visible={isAddOrEditModalVisible} onRequestClose={() => setIsAddOrEditModalVisible(false)} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{currentTank ? 'Editar Tanque' : 'Novo Tanque'}</Text>
            <Pressable onPress={() => setIsAddOrEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TanqueForm formState={formState} onFormChange={handleFormChange} inputRefs={inputRefs} />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setIsAddOrEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleAddOrUpdateTank} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL DETALHES */}
      <Modal visible={isDetailsModalVisible} onRequestClose={() => setIsDetailsModalVisible(false)} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.detailsCard}>
            {currentTank && (
              <>
                <View style={styles.detailsHeader}>
                  <Text style={styles.detailsTitle}>{currentTank.name}</Text>
                  <Pressable onPress={() => setIsDetailsModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </Pressable>
                </View>
                <View style={styles.detailsContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Localização</Text>
                    <Text style={styles.detailValue}>{currentTank.location}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Volume</Text>
                    <Text style={[styles.detailValue, { color: '#0EA5E9' }]}>{currentTank.volume.toLocaleString()} L</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dimensões</Text>
                    <Text style={styles.detailValue}>{currentTank.comprimento} x {currentTank.largura} x {currentTank.profundidade}m</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* MODAL EXCLUIR */}
      <Modal visible={isDeleteModalVisible} onRequestClose={() => setIsDeleteModalVisible(false)} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.deleteCard}>
            <Ionicons name="warning" size={48} color="#EF4444" />
            <Text style={styles.deleteTitle}>Excluir Tanque</Text>
            <Text style={styles.deleteText}>Confirme a senha de administrador para excluir "{currentTank?.name}".</Text>
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
              <Pressable style={styles.confirmDeleteButton} onPress={handleDeleteTank}>
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
  header: { paddingHorizontal: 20, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  screenSubtitle: { color: '#94A3B8', fontSize: 14 },
  addFloatingButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0EA5E9', justifyContent: 'center', alignItems: 'center' },
  
  filtersWrapper: { backgroundColor: '#1E293B', paddingBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, color: '#fff' },
  filterScroll: { paddingHorizontal: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  filterChipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  filterChipText: { color: '#94A3B8', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  listContainer: { padding: 20 },
  tanqueCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitleSection: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  cardLocation: { fontSize: 12, color: '#94A3B8' },
  cardSizeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardSizeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  cardDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  cardMainInfo: { gap: 8, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { color: '#94A3B8', fontSize: 13 },
  infoValue: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', marginTop: 16, fontSize: 16 },

  // FORM STYLES (ADIÇÃO DA CORREÇÃO AQUI)
  formContainer: { gap: 24 },
  formSection: { marginBottom: 24 }, // <--- ADICIONADO AQUI PARA CORRIGIR O ERRO
  sectionHeaderForm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitleForm: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { color: '#94A3B8', marginBottom: 8, fontSize: 12, fontWeight: '600' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  inputIcon: { marginLeft: 12 },
  inputField: { flex: 1, color: '#fff', padding: 12 },
  dimensionsGrid: { flexDirection: 'row', gap: 12 },
  dimensionCard: { flex: 1, backgroundColor: '#1E293B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  dimensionLabel: { color: '#94A3B8', fontSize: 10, marginBottom: 4 },
  dimensionInput: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  volumePreview: { marginTop: 16, backgroundColor: 'rgba(139,92,246,0.1)', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  volumePreviewText: { color: '#A78BFA' },
  volumePreviewValue: { fontWeight: 'bold', color: '#fff' },

  // Modal Adicionar
  modalContainer: { flex: 1, backgroundColor: '#0F172A' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#1E293B' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, padding: 16, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: '600' },
  saveButton: { flex: 1, padding: 16, backgroundColor: '#0EA5E9', borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },

  // Overlays
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  detailsCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailsTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  detailsContent: { gap: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: '#94A3B8' },
  detailValue: { color: '#fff', fontWeight: 'bold' },
  
  deleteCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginVertical: 12 },
  deleteText: { color: '#CBD5E1', textAlign: 'center', marginBottom: 16 },
  passwordInput: { backgroundColor: '#0F172A', width: '100%', padding: 12, borderRadius: 8, color: '#fff', borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  deleteButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelDeleteButton: { flex: 1, padding: 12, backgroundColor: '#334155', borderRadius: 8, alignItems: 'center' },
  cancelDeleteText: { color: '#fff' },
  confirmDeleteButton: { flex: 1, padding: 12, backgroundColor: '#EF4444', borderRadius: 8, alignItems: 'center' },
  confirmDeleteText: { color: '#fff', fontWeight: 'bold' },
});