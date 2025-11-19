import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useEffect, useState } from "react";
import {
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
import { Peixe } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123';

type FormState = {
  nomePopular: string;
  nomeCientifico: string;
  familia: string;
  temperaturaIdeal: string;
  phIdeal: string;
  observacoes: string;
};

type PeixeFormProps = {
  formState: FormState;
  onFormChange: (field: keyof FormState, value: string) => void;
};

// COMPONENTE DO FORMULÁRIO
const PeixeForm = memo(({ formState, onFormChange }: PeixeFormProps) => {
  return (
    <View style={styles.formContainer}>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Nome Popular *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="fish" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Tilápia" 
            value={formState.nomePopular} 
            onChangeText={v => onFormChange('nomePopular', v)}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
      
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Nome Científico</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="school" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Oreochromis niloticus" 
            value={formState.nomeCientifico} 
            onChangeText={v => onFormChange('nomeCientifico', v)}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
      
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Família</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="leaf" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Cichlidae" 
            value={formState.familia} 
            onChangeText={v => onFormChange('familia', v)}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.conditionsRow}>
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Temperatura</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="thermometer" size={20} color="#0EA5E9" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="24-28°C" 
              value={formState.temperaturaIdeal} 
              onChangeText={v => onFormChange('temperaturaIdeal', v)}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
        
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <Text style={styles.inputLabel}>pH Ideal</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="water" size={20} color="#0EA5E9" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="6.5-7.5" 
              value={formState.phIdeal} 
              onChangeText={v => onFormChange('phIdeal', v)}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Observações</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="document-text" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Informações adicionais sobre a espécie..." 
            value={formState.observacoes} 
            onChangeText={v => onFormChange('observacoes', v)}
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  );
});

// TELA PRINCIPAL
export default function PeixesScreen() {
  const [peixes, setPeixes] = useState<Peixe[]>([]);
  const user = auth.currentUser;
  const [fadeAnim] = useState(new Animated.Value(0));

  const [isAddOrEditModalVisible, setIsAddOrEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [currentPeixe, setCurrentPeixe] = useState<Peixe | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [formState, setFormState] = useState<FormState>({
    nomePopular: '', nomeCientifico: '', familia: '',
    temperaturaIdeal: '', phIdeal: '', observacoes: '',
  });

  useEffect(() => {
    if (!user) return;
    const peixesRef = ref(database, `users/${user.uid}/peixes`);
    const unsubscribe = onValue(peixesRef, (snapshot) => {
      const data = snapshot.val();
      setPeixes(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, [user, fadeAnim]);

  const openAddModal = () => {
    setCurrentPeixe(null);
    setFormState({
      nomePopular: '', nomeCientifico: '', familia: '',
      temperaturaIdeal: '', phIdeal: '', observacoes: '',
    });
    setIsAddOrEditModalVisible(true);
  };
  
  const openEditModal = (peixe: Peixe) => {
    setCurrentPeixe(peixe);
    setFormState({
      nomePopular: peixe.nomePopular,
      nomeCientifico: peixe.nomeCientifico,
      familia: peixe.familia,
      temperaturaIdeal: peixe.temperaturaIdeal,
      phIdeal: peixe.phIdeal,
      observacoes: peixe.observacoes || '',
    });
    setIsAddOrEditModalVisible(true);
  };
  
  const openDeleteModal = (peixe: Peixe) => {
    setCurrentPeixe(peixe);
    setIsDeleteModalVisible(true);
  };

  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddOrUpdatePeixe = async () => {
    if (!formState.nomePopular.trim()) {
      return Alert.alert("Atenção", "O nome popular é obrigatório.");
    }
    if (!user) return;

    try {
      if (currentPeixe) {
        await update(ref(database, `users/${user.uid}/peixes/${currentPeixe.id}`), formState);
        Alert.alert("Sucesso", "Espécie atualizada!");
      } else {
        await set(push(ref(database, `users/${user.uid}/peixes`)), formState);
        Alert.alert("Sucesso", "Espécie adicionada!");
      }
      setIsAddOrEditModalVisible(false);
    } catch (error) { 
      Alert.alert("Erro", "Não foi possível salvar a espécie."); 
    }
  };

  const handleDeletePeixe = async () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      return Alert.alert("Falha", "Senha incorreta.");
    }
    if (!user || !currentPeixe) return;
    try {
      await remove(ref(database, `users/${user.uid}/peixes/${currentPeixe.id}`));
      Alert.alert("Sucesso", "Espécie excluída.");
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (error) { 
      Alert.alert("Erro", "Não foi possível excluir."); 
    }
  };

  const PeixeCard = ({ item }: { item: Peixe }) => (
    <View style={styles.peixeCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="fish" size={28} color="#0EA5E9" />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{item.nomePopular}</Text>
          {item.nomeCientifico ? (
            <Text style={styles.cardSubtitle}>{item.nomeCientifico}</Text>
          ) : null}
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardDetails}>
        {item.familia ? (
          <View style={styles.detailRow}>
            <Ionicons name="leaf-outline" size={16} color="#64748B" />
            <Text style={styles.detailLabel}>Família:</Text>
            <Text style={styles.detailValue}>{item.familia}</Text>
          </View>
        ) : null}
        
        <View style={styles.detailRow}>
          <Ionicons name="thermometer-outline" size={16} color="#64748B" />
          <Text style={styles.detailLabel}>Temperatura:</Text>
          <Text style={styles.detailValue}>{item.temperaturaIdeal}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="water-outline" size={16} color="#64748B" />
          <Text style={styles.detailLabel}>pH:</Text>
          <Text style={styles.detailValue}>{item.phIdeal}</Text>
        </View>
        
        {item.observacoes ? (
          <View style={styles.observacoesContainer}>
            <Text style={styles.observacoesLabel}>Observações</Text>
            <Text style={styles.observacoesText}>{item.observacoes}</Text>
          </View>
        ) : null}
      </View>
      
      <View style={styles.cardActions}>
        <Pressable 
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]} 
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]} 
          onPress={() => openDeleteModal(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderItem: ListRenderItem<Peixe> = ({ item }) => <PeixeCard item={item} />;

  return (
    <ImageBackground 
      source={require('../../assets/images/logo.jpg')}
      style={styles.background}
      blurRadius={5}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
      <Animated.ScrollView 
        style={[styles.container, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Espécies</Text>
          <Text style={styles.subtitle}>
            {peixes.length} {peixes.length === 1 ? 'espécie cadastrada' : 'espécies cadastradas'}
          </Text>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]} 
          onPress={openAddModal}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Nova Espécie</Text>
        </Pressable>

        {peixes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="fish-outline" size={64} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma espécie cadastrada</Text>
            <Text style={styles.emptyText}>
              Adicione espécies de peixes para gerenciar melhor sua produção
            </Text>
          </View>
        ) : (
          <FlatList 
            data={peixes} 
            renderItem={renderItem} 
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </Animated.ScrollView>

      {/* MODAL ADICIONAR/EDITAR */}
      <Modal 
        visible={isAddOrEditModalVisible} 
        onRequestClose={() => setIsAddOrEditModalVisible(false)} 
        animationType="slide"
      >
        <View style={styles.modalBackground}>
          <StatusBar barStyle="dark-content" />
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1 }}
          >
            <ScrollView 
              style={styles.modalContainer}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {currentPeixe ? 'Editar Espécie' : 'Nova Espécie'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {currentPeixe ? 'Atualize as informações' : 'Preencha os dados da espécie'}
                  </Text>
                </View>
                <Pressable 
                  style={styles.closeButton} 
                  onPress={() => setIsAddOrEditModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.modalCard}>
                <PeixeForm formState={formState} onFormChange={handleFormChange} />
                
                <View style={styles.modalButtons}>
                  <Pressable 
                    style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]} 
                    onPress={() => setIsAddOrEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} 
                    onPress={handleAddOrUpdatePeixe}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {currentPeixe ? 'Atualizar' : 'Salvar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL EXCLUIR */}
      <Modal 
        visible={isDeleteModalVisible} 
        onRequestClose={() => setIsDeleteModalVisible(false)} 
        transparent={true}
        animationType="fade"
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning-outline" size={56} color="#EF4444" />
            </View>
            
            <Text style={styles.deleteModalTitle}>Confirmar Exclusão</Text>
            
            <Text style={styles.deleteModalText}>
              Deseja excluir <Text style={styles.deleteModalHighlight}>"{currentPeixe?.nomePopular}"</Text>?
            </Text>
            
            <Text style={styles.deleteModalWarning}>
              Digite a senha de administrador para confirmar.
            </Text>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput 
                style={styles.passwordInput}
                placeholder="Senha de administrador"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.deleteModalButtons}>
              <Pressable 
                style={({ pressed }) => [styles.cancelDeleteButton, pressed && styles.pressed]} 
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setPasswordInput('');
                }}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
              </Pressable>
              
              <Pressable 
                style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.pressed]} 
                onPress={handleDeletePeixe}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.confirmDeleteButtonText}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(15, 23, 42, 0.92)' 
  },
  container: { flex: 1 },
  scrollContent: { 
    paddingBottom: 40 
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  peixeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  observacoesContainer: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
    marginTop: 4,
  },
  observacoesLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  observacoesText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // MODAL STYLES
  modalBackground: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalContainer: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 20,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formContainer: {
    gap: 20,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  conditionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
    paddingBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  
  // DELETE MODAL
  deleteModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  deleteModalHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  deleteModalWarning: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelDeleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelDeleteButtonText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 15,
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
  confirmDeleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});