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
import { Pedido } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123';
const STATUS_CHANGE_PASSWORD = 'mudar123';

type FormState = {
  cliente: string;
  produto: string;
  quantidade: string;
  precoKg: string;
  valorTotal: string;
  dataEntrega: string;
  telefoneCliente: string;
  enderecoEntrega: string;
  observacoes: string;
};

type StatusType = 'pendente' | 'processando' | 'concluido' | 'cancelado';
type FilterType = 'todos' | StatusType;
type PriorityType = 'baixa' | 'media' | 'alta';

// FORMULÁRIO
const PedidoForm = memo(({ 
  formState, 
  onFormChange,
  onCalculateTotal 
}: { 
  formState: FormState; 
  onFormChange: (field: keyof FormState, value: string) => void;
  onCalculateTotal: () => void;
}) => {
  return (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Cliente *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput 
            style={styles.inputField} 
            placeholder="Nome do cliente" 
            value={formState.cliente} 
            onChangeText={v => onFormChange('cliente', v)} 
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Telefone</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput 
            style={styles.inputField} 
            placeholder="(00) 00000-0000" 
            value={formState.telefoneCliente} 
            onChangeText={v => onFormChange('telefoneCliente', v)} 
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Produto *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="fish-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput 
            style={styles.inputField} 
            placeholder="Ex: Tilápia Inteira 500g" 
            value={formState.produto} 
            onChangeText={v => onFormChange('produto', v)} 
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Quantidade (kg) *</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="cube-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput 
              style={styles.inputField} 
              placeholder="0.0" 
              value={formState.quantidade} 
              onChangeText={v => {
                onFormChange('quantidade', v);
                onCalculateTotal();
              }} 
              keyboardType="numeric" 
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
        
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Preço/kg (R$) *</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="cash-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput 
              style={styles.inputField} 
              placeholder="0.00" 
              value={formState.precoKg} 
              onChangeText={v => {
                onFormChange('precoKg', v);
                onCalculateTotal();
              }} 
              keyboardType="numeric" 
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Valor Total</Text>
        <Text style={styles.totalValue}>R$ {formState.valorTotal}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Data de Entrega *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput 
            style={styles.inputField} 
            placeholder="DD/MM/AAAA" 
            value={formState.dataEntrega} 
            onChangeText={v => onFormChange('dataEntrega', v)} 
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Endereço de Entrega</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="location-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput 
            style={styles.inputField} 
            placeholder="Endereço completo" 
            value={formState.enderecoEntrega} 
            onChangeText={v => onFormChange('enderecoEntrega', v)} 
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Observações</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="document-text-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput 
            style={[styles.inputField, styles.textArea]} 
            placeholder="Informações adicionais..." 
            value={formState.observacoes} 
            onChangeText={v => onFormChange('observacoes', v)}
            multiline
            numberOfLines={4}
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
        </View>
      </View>
    </ScrollView>
  );
});

// TELA PRINCIPAL
export default function PedidosScreen() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const user = auth.currentUser;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [currentPedido, setCurrentPedido] = useState<Pedido | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [statusPasswordInput, setStatusPasswordInput] = useState('');
  const [newStatus, setNewStatus] = useState<StatusType>('pendente');
  
  const [formState, setFormState] = useState<FormState>({
    cliente: '', produto: '', quantidade: '', precoKg: '',
    valorTotal: '0.00', dataEntrega: '', telefoneCliente: '',
    enderecoEntrega: '', observacoes: ''
  });
  
  const [status, setStatus] = useState<StatusType>('pendente');
  const [prioridade, setPrioridade] = useState<PriorityType>('media');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const pedidosRef = ref(database, `users/${user.uid}/orders`);
    const unsubscribe = onValue(pedidosRef, (snapshot) => {
      const data = snapshot.val();
      const loadedPedidos = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      setPedidos(loadedPedidos.sort((a, b) => b.timestamp - a.timestamp));
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    let result = pedidos;
    if (filterType !== 'todos') result = result.filter(p => p.status === filterType);
    if (searchQuery.trim()) {
      result = result.filter(p =>
        p.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.telefoneCliente && p.telefoneCliente.includes(searchQuery))
      );
    }
    setFilteredPedidos(result);
  }, [pedidos, searchQuery, filterType]);

  const calculateTotal = useCallback(() => {
    const quantidade = parseFloat(formState.quantidade.replace(',', '.')) || 0;
    const precoKg = parseFloat(formState.precoKg.replace(',', '.')) || 0;
    setFormState(prev => ({ ...prev, valorTotal: (quantidade * precoKg).toFixed(2) }));
  }, [formState.quantidade, formState.precoKg]);

  const openModal = (pedido: Pedido | null) => {
    setCurrentPedido(pedido);
    if (pedido) {
      const precoKg = pedido.quantidade > 0 ? (pedido.valor / pedido.quantidade).toFixed(2) : '0.00';
      setFormState({
        cliente: pedido.cliente, produto: pedido.produto,
        quantidade: pedido.quantidade.toString(), precoKg: precoKg,
        valorTotal: pedido.valor.toFixed(2), dataEntrega: pedido.dataEntrega,
        telefoneCliente: pedido.telefoneCliente || '', enderecoEntrega: pedido.enderecoEntrega || '',
        observacoes: pedido.observacoes || ''
      });
      setStatus(pedido.status);
      setPrioridade(pedido.prioridade || 'media');
    } else {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setFormState({ 
        cliente: '', produto: '', quantidade: '', precoKg: '', valorTotal: '0.00',
        dataEntrega: nextWeek.toLocaleDateString('pt-BR'), telefoneCliente: '',
        enderecoEntrega: '', observacoes: ''
      });
      setStatus('pendente');
      setPrioridade('media');
    }
    setIsModalVisible(true);
  };
  
  const handleFormChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    const { cliente, produto, quantidade, precoKg, dataEntrega } = formState;
    if (!cliente || !produto || !quantidade || !precoKg || !dataEntrega) {
      return Alert.alert("Atenção", "Preencha todos os campos obrigatórios (*).");
    }
    if (!user) return;
    setIsSaving(true);

    const quantidadeNum = parseFloat(quantidade.replace(',', '.'));
    const precoKgNum = parseFloat(precoKg.replace(',', '.'));

    if (isNaN(quantidadeNum) || quantidadeNum <= 0 || isNaN(precoKgNum) || precoKgNum <= 0) {
      Alert.alert("Erro", "Valores inválidos.");
      setIsSaving(false);
      return;
    }

    const pedidoData: any = {
      cliente, produto, quantidade: quantidadeNum, valor: quantidadeNum * precoKgNum,
      dataEntrega, status, prioridade, telefoneCliente: formState.telefoneCliente || '',
      enderecoEntrega: formState.enderecoEntrega || '', observacoes: formState.observacoes || '',
      timestamp: currentPedido?.timestamp || Date.now(), updatedAt: new Date().toISOString(),
    };

    try {
      if (currentPedido) {
        await update(ref(database, `users/${user.uid}/orders/${currentPedido.id}`), {
          ...pedidoData, createdAt: currentPedido.createdAt || new Date().toISOString()
        });
        Alert.alert("Sucesso", "Pedido atualizado!");
      } else {
        await set(push(ref(database, `users/${user.uid}/orders`)), {
          ...pedidoData, createdAt: new Date().toISOString()
        });
        Alert.alert("Sucesso", "Pedido criado!");
      }
      setIsModalVisible(false);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (pedido: Pedido) => {
    setCurrentPedido(pedido);
    setPasswordInput('');
    setIsDeleteModalVisible(true);
  }

  const handleDelete = async () => {
    if(passwordInput !== ADMIN_PASSWORD) return Alert.alert("Falha", "Senha incorreta.");
    if(!user || !currentPedido) return;
    try {
      await remove(ref(database, `users/${user.uid}/orders/${currentPedido.id}`));
      Alert.alert("Sucesso", "Pedido excluído.");
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (e) {
      Alert.alert("Erro", "Não foi possível excluir.");
    }
  };

  const openStatusModal = (pedido: Pedido, newStatus: StatusType) => {
    setCurrentPedido(pedido);
    setNewStatus(newStatus);
    setStatusPasswordInput('');
    setIsStatusModalVisible(true);
  }

  const handleStatusChange = async () => {
    if(statusPasswordInput !== STATUS_CHANGE_PASSWORD) return Alert.alert("Falha", "Senha incorreta.");
    if(!user || !currentPedido) return;
    try {
      await update(ref(database, `users/${user.uid}/orders/${currentPedido.id}`), {
        status: newStatus, updatedAt: new Date().toISOString()
      });
      Alert.alert("Sucesso", "Status alterado!");
      setIsStatusModalVisible(false);
      setStatusPasswordInput('');
    } catch (e) {
      Alert.alert("Erro", "Não foi possível alterar.");
    }
  };

  const getStatusStyle = (status: StatusType) => {
    switch(status) {
      case 'pendente': return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', icon: 'time-outline' };
      case 'processando': return { color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)', icon: 'sync-outline' };
      case 'concluido': return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: 'checkmark-circle-outline' };
      case 'cancelado': return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: 'close-circle-outline' };
      default: return { color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)', icon: 'help-circle-outline'};
    }
  }

  const getPriorityStyle = (priority: PriorityType) => {
    switch(priority) {
      case 'baixa': return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'media': return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'alta': return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      default: return { color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)'};
    }
  }

  const getNextStatus = (currentStatus: StatusType): StatusType[] => {
    switch(currentStatus) {
      case 'pendente': return ['processando', 'concluido', 'cancelado'];
      case 'processando': return ['concluido', 'cancelado'];
      case 'concluido': return ['pendente'];
      case 'cancelado': return ['pendente'];
      default: return [];
    }
  }

  const renderItem: ListRenderItem<Pedido> = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const priorityStyle = getPriorityStyle(item.prioridade || 'media');
    const nextStatusOptions = getNextStatus(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item.cliente}</Text>
            {item.telefoneCliente && (
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={12} color="#64748B" />
                <Text style={styles.cardPhone}>{item.telefoneCliente}</Text>
              </View>
            )}
          </View>
          <View style={styles.badgesContainer}>
            <View style={[styles.priorityBadge, {backgroundColor: priorityStyle.bg}]}>
              <Text style={[styles.priorityText, {color: priorityStyle.color}]}>
                {item.prioridade || 'média'}
              </Text>
            </View>
            <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
              <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.color} />
              <Text style={[styles.statusText, {color: statusStyle.color}]}>{item.status}</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.cardProduct}>{item.produto}</Text>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="cube-outline" size={14} color="#64748B" />
            <Text style={styles.detailValue}>{item.quantidade} kg</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color="#64748B" />
            <Text style={styles.detailValue}>R$ {item.valor.toFixed(2)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text style={styles.detailValue}>{item.dataEntrega}</Text>
          </View>
        </View>

        {item.enderecoEntrega && (
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.addressText} numberOfLines={1}>{item.enderecoEntrega}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          {nextStatusOptions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusActions} contentContainerStyle={{gap: 6}}>
              {nextStatusOptions.map(statusOption => (
                <Pressable 
                  key={statusOption}
                  style={[styles.statusActionButton, { backgroundColor: getStatusStyle(statusOption).bg }]}
                  onPress={() => openStatusModal(item, statusOption)}
                >
                  <Ionicons name={getStatusStyle(statusOption).icon as any} size={12} color={getStatusStyle(statusOption).color} />
                  <Text style={[styles.statusActionText, { color: getStatusStyle(statusOption).color }]}>
                    {statusOption}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          
          <View style={styles.editActions}>
            <Pressable style={styles.editButton} onPress={() => openModal(item)}>
              <Ionicons name="create-outline" size={16} color="#F59E0B" />
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => openDeleteModal(item)}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground source={require('../../assets/images/logo.jpg')} style={styles.background} blurRadius={5}>
        <View style={styles.overlay} />
        <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.screenTitle}>Pedidos</Text>
              <Text style={styles.screenSubtitle}>
                {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
              </Text>
            </View>
            <Pressable style={styles.addButton} onPress={() => openModal(null)}>
              <Ionicons name="add" size={ 24 } color="#fff" />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#64748B" />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Buscar pedidos..." 
              placeholderTextColor="#94A3B8" 
              value={searchQuery} 
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
            {(['todos', 'pendente', 'processando', 'concluido', 'cancelado'] as FilterType[]).map((type) => (
              <Pressable 
                key={type} 
                style={[styles.filterChip, filterType === type && styles.filterChipActive]} 
                onPress={() => setFilterType(type)}
              >
                {type !== 'todos' && (
                  <Ionicons 
                    name={getStatusStyle(type as StatusType).icon as any} 
                    size={14} 
                    color={filterType === type ? '#fff' : 'rgba(255,255,255,0.7)'} 
                  />
                )}
                <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pedidos.filter(p => p.status === 'pendente').length}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#0EA5E9'}]}>
                {pedidos.filter(p => p.status === 'processando').length}
              </Text>
              <Text style={styles.statLabel}>Processando</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#10B981'}]}>
                {pedidos.filter(p => p.status === 'concluido').length}
              </Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </View>
          </View>

          <FlatList
            data={filteredPedidos}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="receipt-outline" size={64} color="rgba(255,255,255,0.3)" />
                </View>
                <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || filterType !== 'todos' ? 'Ajuste os filtros' : 'Crie seu primeiro pedido'}
                </Text>
              </View>
            }
          />
        </Animated.View>

        {/* MODAL ADICIONAR/EDITAR */}
        <Modal visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)} animationType="slide">
          <View style={styles.modalBackground}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {currentPedido ? 'Editar Pedido' : 'Novo Pedido'}
                </Text>
                <Pressable onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </Pressable>
              </View>
              
              <PedidoForm formState={formState} onFormChange={handleFormChange} onCalculateTotal={calculateTotal} />

              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Status</Text>
                <View style={styles.optionsRow}>
                  {(['pendente', 'processando', 'concluido', 'cancelado'] as StatusType[]).map((s) => {
                    const style = getStatusStyle(s);
                    return (
                      <Pressable 
                        key={s} 
                        style={[styles.option, status === s && {borderColor: style.color, backgroundColor: style.bg}]} 
                        onPress={() => setStatus(s)}
                      >
                        <Ionicons name={style.icon as any} size={16} color={status === s ? style.color : '#64748B'} />
                        <Text style={[styles.optionText, status === s && {color: style.color}]}>{s}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Prioridade</Text>
                <View style={styles.optionsRow}>
                  {(['baixa', 'media', 'alta'] as PriorityType[]).map((p) => {
                    const style = getPriorityStyle(p);
                    return (
                      <Pressable 
                        key={p} 
                        style={[styles.option, prioridade === p && {borderColor: style.color, backgroundColor: style.bg}]} 
                        onPress={() => setPrioridade(p)}
                      >
                        <Text style={[styles.optionText, prioridade === p && {color: style.color}]}>{p}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <View style={styles.modalFooter}>
                <Pressable style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable 
                  style={[styles.saveButton, (!formState.cliente || !formState.produto || !formState.quantidade || !formState.precoKg || !formState.dataEntrega || isSaving) && styles.buttonDisabled]} 
                  onPress={handleSave} 
                  disabled={!formState.cliente || !formState.produto || !formState.quantidade || !formState.precoKg || !formState.dataEntrega || isSaving}
                >
                  {isSaving ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>{currentPedido ? 'Atualizar' : 'Criar'}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* MODAL EXCLUIR */}
        <Modal visible={isDeleteModalVisible} onRequestClose={() => setIsDeleteModalVisible(false)} transparent animationType="fade">
          <View style={styles.centeredModal}>
            <View style={styles.statusModalContent}>
              <View style={styles.statusModalIcon}>
                <Ionicons name="trash-outline" size={32} color="#EF4444" />
              </View>
              <Text style={styles.statusModalTitle}>Excluir Pedido</Text>
              <Text style={styles.statusModalText}>
                Tem certeza que deseja excluir o pedido de {currentPedido?.cliente}?
              </Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Digite a senha de administrador"
                placeholderTextColor="#94A3B8"
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
              />
              <View style={styles.modalFooter}>
                <Pressable style={styles.cancelButton} onPress={() => setIsDeleteModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteConfirmButton, !passwordInput && styles.buttonDisabled]}
                  onPress={handleDelete}
                  disabled={!passwordInput}
                >
                  <Text style={styles.deleteConfirmButtonText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL MUDANÇA DE STATUS */}
        <Modal visible={isStatusModalVisible} onRequestClose={() => setIsStatusModalVisible(false)} transparent animationType="fade">
          <View style={styles.centeredModal}>
            <View style={styles.statusModalContent}>
              <View style={styles.statusModalIcon}>
                <Ionicons name="swap-horizontal-outline" size={32} color="#0EA5E9" />
              </View>
              <Text style={styles.statusModalTitle}>Alterar Status</Text>
              <Text style={styles.statusModalText}>
                Deseja alterar o status do pedido de {currentPedido?.cliente} para "{newStatus}"?
              </Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Digite a senha de alteração"
                placeholderTextColor="#94A3B8"
                value={statusPasswordInput}
                onChangeText={setStatusPasswordInput}
                secureTextEntry
              />
              <View style={styles.modalFooter}>
                <Pressable style={styles.cancelButton} onPress={() => setIsStatusModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, !statusPasswordInput && styles.buttonDisabled]}
                  onPress={handleStatusChange}
                  disabled={!statusPasswordInput}
                >
                  <Text style={styles.saveButtonText}>Confirmar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 20, 40, 0.8)',
  },
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 40,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  screenSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  addButton: {
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    padding: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#0EA5E9',
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'capitalize',
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardPhone: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  priorityBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cardProduct: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusActions: {
    flex: 1,
  },
  statusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  statusActionText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    padding: 12,
  },
  inputField: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  modalSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 14,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  statusModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: width * 0.8,
    alignItems: 'center',
  },
  statusModalIcon: {
    marginBottom: 16,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusModalText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  passwordInput: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  deleteConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});