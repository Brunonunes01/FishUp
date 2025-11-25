import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Peixe } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

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

// COMPONENTE DO FORMULÁRIO (DARK MODE)
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
            placeholderTextColor="#64748B"
            value={formState.nomePopular} 
            onChangeText={v => onFormChange('nomePopular', v)}
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
            placeholderTextColor="#64748B"
            value={formState.nomeCientifico} 
            onChangeText={v => onFormChange('nomeCientifico', v)}
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
            placeholderTextColor="#64748B"
            value={formState.familia} 
            onChangeText={v => onFormChange('familia', v)}
          />
        </View>
      </View>

      <View style={styles.conditionsRow}>
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Temperatura</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="thermometer" size={20} color="#F59E0B" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="24-28°C" 
              placeholderTextColor="#64748B"
              value={formState.temperaturaIdeal} 
              onChangeText={v => onFormChange('temperaturaIdeal', v)}
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
              placeholderTextColor="#64748B"
              value={formState.phIdeal} 
              onChangeText={v => onFormChange('phIdeal', v)}
            />
          </View>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Observações</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="document-text" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Informações adicionais..." 
            placeholderTextColor="#64748B"
            value={formState.observacoes} 
            onChangeText={v => onFormChange('observacoes', v)}
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
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    const peixesRef = ref(database, `users/${user.uid}/peixes`);
    const unsubscribe = onValue(peixesRef, (snapshot) => {
      const data = snapshot.val();
      setPeixes(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      setLoading(false);
      
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

  const PeixeCard = memo(({ item }: { item: Peixe }) => (
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
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="thermometer-outline" size={16} color="#F59E0B" />
            <Text style={styles.detailText}>{item.temperaturaIdeal || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={16} color="#0EA5E9" />
            <Text style={styles.detailText}>pH {item.phIdeal || 'N/A'}</Text>
          </View>
          {item.familia ? (
             <View style={styles.detailItem}>
                <Ionicons name="leaf-outline" size={16} color="#10B981" />
                <Text style={styles.detailText}>{item.familia}</Text>
             </View>
          ) : null}
        </View>
        
        {item.observacoes ? (
          <View style={styles.observacoesContainer}>
            <Text style={styles.observacoesText} numberOfLines={2}>{item.observacoes}</Text>
          </View>
        ) : null}
      </View>
      
      <View style={styles.cardActions}>
        <Pressable 
          style={({ pressed }) => [styles.actionButton, {backgroundColor: '#F59E0B15'}, pressed && styles.pressed]} 
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color="#F59E0B" />
          <Text style={[styles.actionButtonText, {color: '#F59E0B'}]}>Editar</Text>
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [styles.actionButton, {backgroundColor: '#EF444415'}, pressed && styles.pressed]} 
          onPress={() => openDeleteModal(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, {color: '#EF4444'}]}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  ));

  const renderItem: ListRenderItem<Peixe> = ({ item }) => <PeixeCard item={item} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Espécies</Text>
          <Text style={styles.subtitle}>
            {peixes.length} {peixes.length === 1 ? 'espécie cadastrada' : 'espécies cadastradas'}
          </Text>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]} 
          onPress={openAddModal}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* LISTA */}
      {loading ? (
        <View style={styles.loadingContainer}>
           <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList 
            data={peixes} 
            renderItem={renderItem} 
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="fish-outline" size={64} color="#334155" />
                <Text style={styles.emptyTitle}>Nenhuma espécie</Text>
                <Text style={styles.emptyText}>
                  Adicione espécies para gerenciar sua produção
                </Text>
              </View>
            }
          />
        </Animated.View>
      )}

      {/* MODAL ADICIONAR/EDITAR */}
      <Modal 
        visible={isAddOrEditModalVisible} 
        onRequestClose={() => setIsAddOrEditModalVisible(false)} 
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentPeixe ? 'Editar Espécie' : 'Nova Espécie'}
            </Text>
            <Pressable onPress={() => setIsAddOrEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : undefined} 
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
               <PeixeForm formState={formState} onFormChange={handleFormChange} />
               
               <View style={styles.modalButtons}>
                  <Pressable 
                    style={styles.cancelButton} 
                    onPress={() => setIsAddOrEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={styles.saveButton} 
                    onPress={handleAddOrUpdatePeixe}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {currentPeixe ? 'Atualizar' : 'Salvar'}
                    </Text>
                  </Pressable>
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
        <View style={styles.overlay}>
          <View style={styles.deleteCard}>
            <View style={styles.deleteIcon}>
              <Ionicons name="warning" size={40} color="#EF4444" />
            </View>
            
            <Text style={styles.deleteTitle}>Excluir Espécie</Text>
            
            <Text style={styles.deleteText}>
              Confirme a senha de administrador para excluir "{currentPeixe?.nomePopular}".
            </Text>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput 
                style={styles.passwordInput}
                placeholder="Senha"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.deleteButtons}>
              <Pressable style={styles.cancelDeleteButton} onPress={() => { setIsDeleteModalVisible(false); setPasswordInput(''); }}>
                <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
              </Pressable>
              
              <Pressable style={styles.confirmDeleteButton} onPress={handleDeletePeixe}>
                <Text style={styles.confirmDeleteButtonText}>Excluir</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  
  // Lista
  listContainer: { padding: 20 },
  peixeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  cardSubtitle: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: '#334155', marginBottom: 16 },
  
  cardDetails: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#CBD5E1', fontWeight: '600' },
  
  observacoesContainer: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
  },
  observacoesText: { fontSize: 12, color: '#94A3B8' },

  cardActions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: { fontWeight: '700', fontSize: 14 },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },

  // Modal Adicionar
  modalContainer: { flex: 1, backgroundColor: '#0F172A' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E293B',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalScrollContent: { padding: 20 },
  
  formContainer: { gap: 16 },
  inputWrapper: { marginBottom: 4 },
  inputLabel: { color: '#94A3B8', marginBottom: 8, fontSize: 12, fontWeight: '600' },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: { marginLeft: 12 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#fff' },
  textArea: { minHeight: 80, paddingTop: 14 },
  conditionsRow: { flexDirection: 'row', gap: 12 },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: { color: '#fff', fontWeight: '600' },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: { color: '#fff', fontWeight: '600' },

  // Modal Delete
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  deleteCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  deleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginBottom: 8 },
  deleteText: { color: '#CBD5E1', textAlign: 'center', marginBottom: 20 },
  deleteModalHighlight: { color: '#fff', fontWeight: 'bold' },
  deleteModalWarning: { color: '#64748B', fontSize: 12, marginBottom: 16 },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    marginBottom: 24,
  },
  passwordInput: { flex: 1, padding: 14, color: '#fff' },
  deleteButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelDeleteButton: { flex: 1, padding: 14, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  cancelDeleteButtonText: { color: '#fff', fontWeight: '600' },
  confirmDeleteButton: { flex: 1, padding: 14, backgroundColor: '#EF4444', borderRadius: 12, alignItems: 'center' },
  confirmDeleteButtonText: { color: '#fff', fontWeight: '600' },

  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});