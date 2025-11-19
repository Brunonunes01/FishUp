import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  ImageBackground,
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
import { Tanque } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width, height } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123'; // IMPORTANTE: Mover para .env em produção

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
      {/* Informações Básicas */}
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
              placeholderTextColor="#94A3B8"
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
              placeholderTextColor="#94A3B8"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['comprimento']?.focus()}
            />
          </View>
        </View>
      </View>

      {/* Dimensões */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeaderForm}>
          <Ionicons name="resize" size={20} color="#10B981" />
          <Text style={styles.sectionTitleForm}>Dimensões (metros)</Text>
        </View>

        <View style={styles.dimensionsGrid}>
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionIconContainer}>
              <Ionicons name="arrow-forward" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.dimensionLabel}>Comprimento</Text>
            <TextInput
              ref={el => { inputRefs.current['comprimento'] = el; }}
              style={styles.dimensionInput}
              placeholder="0,00"
              value={formState.comprimento}
              onChangeText={(v) => onFormChange('comprimento', v)}
              keyboardType="numeric"
              placeholderTextColor="#CBD5E1"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['largura']?.focus()}
            />
            <Text style={styles.dimensionUnit}>metros</Text>
          </View>

          <View style={styles.dimensionCard}>
            <View style={styles.dimensionIconContainer}>
              <Ionicons name="swap-horizontal" size={18} color="#10B981" />
            </View>
            <Text style={styles.dimensionLabel}>Largura</Text>
            <TextInput
              ref={el => { inputRefs.current['largura'] = el; }}
              style={styles.dimensionInput}
              placeholder="0,00"
              value={formState.largura}
              onChangeText={(v) => onFormChange('largura', v)}
              keyboardType="numeric"
              placeholderTextColor="#CBD5E1"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current['profundidade']?.focus()}
            />
            <Text style={styles.dimensionUnit}>metros</Text>
          </View>

          <View style={styles.dimensionCard}>
            <View style={styles.dimensionIconContainer}>
              <Ionicons name="arrow-down" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.dimensionLabel}>Profundidade</Text>
            <TextInput
              ref={el => { inputRefs.current['profundidade'] = el; }}
              style={styles.dimensionInput}
              placeholder="0,00"
              value={formState.profundidade}
              onChangeText={(v) => onFormChange('profundidade', v)}
              keyboardType="numeric"
              placeholderTextColor="#CBD5E1"
              returnKeyType="done"
            />
            <Text style={styles.dimensionUnit}>metros</Text>
          </View>
        </View>

        {/* Preview do Volume */}
        {formState.comprimento && formState.largura && formState.profundidade && (
          <View style={styles.volumePreview}>
            <Ionicons name="calculator" size={20} color="#8B5CF6" />
            <Text style={styles.volumePreviewText}>
              Volume estimado: {' '}
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
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Estados de modais
  const [isAddOrEditModalVisible, setIsAddOrEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [currentTank, setCurrentTank] = useState<Tanque | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [formState, setFormState] = useState<FormState>({
    name: '', location: '', comprimento: '', largura: '', profundidade: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (!user) return;
    
    const tanksRef = ref(database, `users/${user.uid}/tanks`);
    const unsubscribe = onValue(tanksRef, (snapshot) => {
      const data = snapshot.val();
      const tanksArray = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      setTanks(tanksArray);
      
      // Animações de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
    
    return unsubscribe;
  }, [user]);

  // Filtro e busca
  useEffect(() => {
    let result = tanks;

    // Filtro por tamanho
    if (filterType !== 'todos') {
      result = result.filter(tank => {
        const volume = tank.volume;
        if (filterType === 'grande') return volume > 50000;
        if (filterType === 'medio') return volume > 20000 && volume <= 50000;
        if (filterType === 'pequeno') return volume <= 20000;
        return true;
      });
    }

    // Busca por nome ou localização
    if (searchQuery.trim()) {
      result = result.filter(tank =>
        tank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tank.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTanks(result);
  }, [tanks, filterType, searchQuery]);

  // ==================== FUNÇÕES ====================
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
    
    if (!name.trim() || !location.trim() || !comprimento || !largura || !profundidade) {
      return Alert.alert("Atenção", "Preencha todos os campos.");
    }
    
    if (!user) return;

    setIsSaving(true);

    const c = parseFloat(comprimento.replace(',', '.'));
    const l = parseFloat(largura.replace(',', '.'));
    const p = parseFloat(profundidade.replace(',', '.'));

    if (isNaN(c) || isNaN(l) || isNaN(p) || c <= 0 || l <= 0 || p <= 0) {
      setIsSaving(false);
      return Alert.alert("Erro", "As dimensões devem ser números positivos válidos.");
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
    
    if (!currentTank) {
        tankData.createdAt = new Date().toISOString();
    }


    try {
      if (currentTank) {
        await update(ref(database, `users/${user.uid}/tanks/${currentTank.id}`), {
            ...tankData,
            createdAt: currentTank.createdAt || new Date().toISOString() // Manter data de criação original
        });
        Alert.alert("✅ Sucesso", "Tanque atualizado com sucesso!");
      } else {
        const newTankRef = push(ref(database, `users/${user.uid}/tanks`));
        await set(newTankRef, tankData);
        Alert.alert("✅ Sucesso", `Tanque adicionado!\nVolume: ${volumeEmLitros.toFixed(0)} L`);
      }
      setIsAddOrEditModalVisible(false);
    } catch (error) {
      console.error("Erro ao salvar tanque:", error);
      Alert.alert("❌ Erro", "Ocorreu um erro ao salvar o tanque.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTank = async () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      return Alert.alert("❌ Falha", "Senha de administrador incorreta.");
    }
    
    if (!user || !currentTank) return;
    
    try {
      await remove(ref(database, `users/${user.uid}/tanks/${currentTank.id}`));
      Alert.alert("✅ Sucesso", "Tanque excluído permanentemente.");
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (error) {
      Alert.alert("❌ Erro", "Não foi possível excluir o tanque.");
    }
  };

  const getTankSize = (volume: number): { label: string; color: string } => {
    if (volume > 50000) return { label: 'Grande', color: '#10B981' };
    if (volume > 20000) return { label: 'Médio', color: '#F59E0B' };
    return { label: 'Pequeno', color: '#0EA5E9' };
  };

  // ==================== COMPONENTES ====================
  const TanqueCard = memo(({ item }: { item: Tanque }) => {
    const sizeInfo = getTankSize(item.volume);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.tanqueCard,
          pressed && styles.cardPressed
        ]}
        onPress={() => openDetailsModal(item)}
      >
        <View style={styles.cardGradient} />
        
        {/* Header do Card */}
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrapper}>
            <View style={[styles.cardIconBg, { backgroundColor: sizeInfo.color + '20' }]}>
              <Ionicons name="water" size={28} color={sizeInfo.color} />
            </View>
          </View>
          
          <View style={styles.cardTitleSection}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.cardLocationRow}>
              <Ionicons name="location" size={14} color="#64748B" />
              <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>
          
          <View style={[styles.cardSizeBadge, { backgroundColor: sizeInfo.color }]}>
            <Text style={styles.cardSizeBadgeText}>{sizeInfo.label}</Text>
          </View>
        </View>

        {/* Detalhes principais */}
        <View style={styles.cardMainInfo}>
          <View style={styles.volumeDisplayCard}>
            <Ionicons name="cube" size={20} color="#0EA5E9" />
            <View style={styles.volumeDisplayText}>
              <Text style={styles.volumeLabel}>Volume Total</Text>
              <Text style={styles.volumeValue}>
                {item.volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
              </Text>
            </View>
          </View>
        </View>

        {/* Dimensões */}
        <View style={styles.cardDimensions}>
          <View style={styles.dimensionItem}>
            <Ionicons name="arrow-forward" size={14} color="#64748B" />
            <Text style={styles.dimensionText}>
              {item.comprimento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}m
            </Text>
          </View>
          <View style={styles.dimensionSeparator} />
          <View style={styles.dimensionItem}>
            <Ionicons name="swap-horizontal" size={14} color="#64748B" />
            <Text style={styles.dimensionText}>
              {item.largura.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}m
            </Text>
          </View>
          <View style={styles.dimensionSeparator} />
          <View style={styles.dimensionItem}>
            <Ionicons name="arrow-down" size={14} color="#64748B" />
            <Text style={styles.dimensionText}>
              {item.profundidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}m
            </Text>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [
              styles.cardActionButton,
              styles.editActionButton,
              pressed && styles.actionPressed
            ]}
            onPress={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
          >
            <Ionicons name="create" size={16} color="#F59E0B" />
            <Text style={styles.editActionText}>Editar</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cardActionButton,
              styles.deleteActionButton,
              pressed && styles.actionPressed
            ]}
            onPress={(e) => {
              e.stopPropagation();
              openDeleteModal(item);
            }}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
            <Text style={styles.deleteActionText}>Excluir</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  });

  const renderItem: ListRenderItem<Tanque> = ({ item }) => <TanqueCard item={item} />;

  // ==================== RENDER ====================
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={require('../../assets/images/logo.jpg')}
        style={styles.background}
        blurRadius={4}
      >
        <View style={styles.overlay} />

        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.screenTitle}>Tanques</Text>
                <Text style={styles.screenSubtitle}>
                  {filteredTanks.length} tanque{filteredTanks.length !== 1 ? 's' : ''} encontrado{filteredTanks.length !== 1 ? 's' : ''}
                </Text>
              </View>
              
              <Pressable
                style={({ pressed }) => [
                  styles.addFloatingButton,
                  pressed && styles.addButtonPressed
                ]}
                onPress={openAddModal}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </Pressable>
            </View>

            {/* Barra de Busca */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome ou localização..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#64748B" />
                </Pressable>
              )}
            </View>

            {/* Filtros */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            >
              <Pressable
                style={[styles.filterChip, filterType === 'todos' && styles.filterChipActive]}
                onPress={() => setFilterType('todos')}
              >
                <Text style={[styles.filterChipText, filterType === 'todos' && styles.filterChipTextActive]}>
                  Todos
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, filterType === 'grande' && styles.filterChipActive]}
                onPress={() => setFilterType('grande')}
              >
                <Text style={[styles.filterChipText, filterType === 'grande' && styles.filterChipTextActive]}>
                  Grandes
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, filterType === 'medio' && styles.filterChipActive]}
                onPress={() => setFilterType('medio')}
              >
                <Text style={[styles.filterChipText, filterType === 'medio' && styles.filterChipTextActive]}>
                  Médios
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, filterType === 'pequeno' && styles.filterChipActive]}
                onPress={() => setFilterType('pequeno')}
              >
                <Text style={[styles.filterChipText, filterType === 'pequeno' && styles.filterChipTextActive]}>
                  Pequenos
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* Lista de Tanques */}
          {filteredTanks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name={searchQuery ? "search" : "water"} size={64} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum tanque cadastrado'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Tente buscar com outros termos'
                  : 'Comece adicionando seu primeiro tanque'}
              </Text>
              {!searchQuery && (
                <Pressable
                  style={styles.emptyButton}
                  onPress={openAddModal}
                >
                  <Ionicons name="add-circle" size={20} color="#0EA5E9" />
                  <Text style={styles.emptyButtonText}>Adicionar Tanque</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredTanks}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>

        {/* ==================== MODAL ADICIONAR/EDITAR ==================== */}
        <Modal
          visible={isAddOrEditModalVisible}
          onRequestClose={() => setIsAddOrEditModalVisible(false)}
          animationType="slide"
        >
          <ImageBackground
            source={require('../../assets/images/logo.jpg')}
            style={styles.background}
            blurRadius={4}
          >
            <View style={styles.overlay} />
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Header do Modal */}
                <View style={styles.modalHeaderSection}>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => setIsAddOrEditModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </Pressable>
                  
                  <View style={styles.modalTitleContainer}>
                    <View style={styles.modalIconBg}>
                      <Ionicons
                        name={currentTank ? "create" : "add-circle"}
                        size={32}
                        color="#0EA5E9"
                      />
                    </View>
                    <Text style={styles.modalTitle}>
                      {currentTank ? 'Editar Tanque' : 'Novo Tanque'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {currentTank
                        ? 'Atualize as informações do tanque'
                        : 'Adicione um novo tanque à sua piscicultura'}
                    </Text>
                  </View>
                </View>

                {/* Formulário */}
                <View style={styles.modalCard}>
                  <TanqueForm
                    formState={formState}
                    onFormChange={handleFormChange}
                    inputRefs={inputRefs}
                  />

                  {/* Botões */}
                  <View style={styles.modalActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalCancelButton,
                        pressed && styles.actionPressed
                      ]}
                      onPress={() => setIsAddOrEditModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.modalSaveButton,
                        pressed && styles.actionPressed,
                        isSaving && styles.modalSaveButtonDisabled
                      ]}
                      onPress={handleAddOrUpdateTank}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      )}
                      <Text style={styles.modalSaveText}>
                        {isSaving ? "Salvando..." : (currentTank ? 'Atualizar' : 'Salvar')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </ImageBackground>
        </Modal>

        {/* ==================== MODAL DETALHES ==================== */}
        <Modal
          visible={isDetailsModalVisible}
          onRequestClose={() => setIsDetailsModalVisible(false)}
          transparent
          animationType="fade"
        >
          <View style={styles.detailsModalOverlay}>
            <View style={styles.detailsModalContent}>
              {currentTank && (
                <>
                  <View style={styles.detailsModalHeader}>
                    <View style={[styles.detailsIcon, { backgroundColor: getTankSize(currentTank.volume).color }]}>
                      <Ionicons name="water" size={32} color="#fff" />
                    </View>
                    <Text style={styles.detailsModalTitle}>{currentTank.name}</Text>
                    <Text style={styles.detailsModalLocation}>
                      <Ionicons name="location" size={14} color="#64748B" /> {currentTank.location}
                    </Text>
                  </View>

                  <View style={styles.detailsModalBody}>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Volume Total</Text>
                      <Text style={styles.detailsValue}>
                        {currentTank.volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                      </Text>
                    </View>

                    <View style={styles.detailsDivider} />

                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Comprimento</Text>
                      <Text style={styles.detailsValue}>
                        {currentTank.comprimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m
                      </Text>
                    </View>

                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Largura</Text>
                      <Text style={styles.detailsValue}>
                        {currentTank.largura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m
                      </Text>
                    </View>
                    
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Profundidade</Text>
                      <Text style={styles.detailsValue}>
                        {currentTank.profundidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m
                      </Text>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.detailsRow}>
                        <Text style={styles.detailsLabel}>Criado em</Text>
                        <Text style={styles.detailsValue}>
                            {currentTank.createdAt ? new Date(currentTank.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.detailsRow}>
                        <Text style={styles.detailsLabel}>Última Atualização</Text>
                        <Text style={styles.detailsValue}>
                            {currentTank.updatedAt ? new Date(currentTank.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}
                        </Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.detailsModalCloseButton,
                      pressed && styles.actionPressed
                    ]}
                    onPress={() => setIsDetailsModalVisible(false)}
                  >
                    <Text style={styles.detailsModalCloseText}>Fechar</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
        
        {/* ==================== MODAL DELETAR ==================== */}
        <Modal
          visible={isDeleteModalVisible}
          onRequestClose={() => setIsDeleteModalVisible(false)}
          transparent
          animationType="fade"
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteModalIcon}>
                <Ionicons name="warning" size={48} color="#EF4444" />
              </View>

              <Text style={styles.deleteModalTitle}>Confirmar Exclusão</Text>
              
              <Text style={styles.deleteModalText}>
                Tem certeza que deseja excluir o tanque{" "}
                <Text style={styles.deleteModalHighlight}>"{currentTank?.name}"</Text>?
              </Text>
              
              <Text style={styles.deleteModalWarning}>
                Esta ação não pode ser desfeita. Digite a senha de administrador para confirmar.
              </Text>

              <View style={styles.passwordInputContainer}>
                <Ionicons name="lock-closed" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Senha de administrador"
                  secureTextEntry
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.deleteModalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    pressed && styles.actionPressed
                  ]}
                  onPress={() => {
                    setIsDeleteModalVisible(false);
                    setPasswordInput('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.confirmDeleteButton,
                    pressed && styles.actionPressed
                  ]}
                  onPress={handleDeleteTank}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.confirmDeleteText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  screenSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  addFloatingButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 14,
  },
  filtersContainer: {
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tanqueCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIconWrapper: {
    marginRight: 12,
  },
  cardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardLocation: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
  },
  cardSizeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardSizeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardMainInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  volumeDisplayCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeDisplayText: {
    marginLeft: 12,
  },
  volumeLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  volumeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDimensions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
    marginHorizontal: 16,
  },
  dimensionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dimensionText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  dimensionSeparator: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  editActionButton: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteActionButton: {
    // Estilo que estava em falta, agora não é mais necessário
  },
  actionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  editActionText: {
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteActionText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#0EA5E9',
    fontWeight: 'bold',
  },
  // Modal Adicionar/Editar
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHeaderSection: {
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40),
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  modalIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  modalCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
  },
  formContainer: {
    gap: 24,
  },
  formSection: {},
  sectionHeaderForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitleForm: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    marginLeft: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  inputField: {
    flex: 1,
    height: 52,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 12,
  },
  dimensionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dimensionCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dimensionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dimensionLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  dimensionInput: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 4,
  },
  dimensionUnit: {
    fontSize: 10,
    color: '#64748B',
  },
  volumePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  volumePreviewText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  volumePreviewValue: {
    fontWeight: 'bold',
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalCancelText: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#0284C7',
  },

  // Modal Detalhes
  detailsModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  detailsModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  detailsModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  detailsModalLocation: {
    fontSize: 14,
    color: '#94A3B8',
  },
  detailsModalBody: {
    marginBottom: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailsLabel: {
    color: '#94A3B8',
  },
  detailsValue: {
    color: '#fff',
    fontWeight: '600',
  },
  detailsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsModalCloseButton: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailsModalCloseText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Modal Deletar
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  deleteModalIcon: {
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  deleteModalHighlight: {
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteModalWarning: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

