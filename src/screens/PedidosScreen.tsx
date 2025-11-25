import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { onValue, ref, remove, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share, // <--- IMPORTADO AQUI
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pedido, RootStackParamList } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

type NavigationProps = StackNavigationProp<RootStackParamList, "Pedidos">;
type StatusType = 'pendente' | 'processando' | 'concluido' | 'cancelado';

export default function PedidosScreen() {
  const navigation = useNavigation<NavigationProps>();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusType | 'todos'>('todos');

  // ESTADOS PARA O MODAL DE DETALHES
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  // --- Load Data ---
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const ordersRef = ref(database, `users/${user.uid}/orders`);
    
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      const loadedOrders = data 
        ? Object.keys(data).map(key => ({ id: key, ...data[key] })) 
        : [];
      loadedOrders.sort((a, b) => b.timestamp - a.timestamp);
      setOrders(loadedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // --- Ações do Pedido ---
  const handleOpenOrder = (order: Pedido) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  // --- NOVA FUNÇÃO: COMPARTILHAR COMPROVANTE ---
  const handleShareReceipt = async () => {
    if (!selectedOrder) return;

    // Formata a data/hora
    const dataPedido = new Date(selectedOrder.timestamp).toLocaleDateString('pt-BR');
    const horaPedido = new Date(selectedOrder.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

    // Monta o texto formatado (Markdown simples para WhatsApp)
    const receiptMessage = `
🐟 *COMPROVANTE DE PEDIDO - FishUp* 🐟
--------------------------------
📦 *Pedido:* #${selectedOrder.id.slice(-6).toUpperCase()}
📅 *Data:* ${dataPedido} às ${horaPedido}
--------------------------------

👤 *CLIENTE*
Nome: *${selectedOrder.cliente}*
Tel: ${selectedOrder.telefoneCliente || 'Não informado'}
Entrega: ${selectedOrder.dataEntrega}

🛒 *ITENS*
${selectedOrder.produto}

💰 *TOTAL: R$ ${selectedOrder.valor.toFixed(2)}*
Status: ${selectedOrder.status.toUpperCase()}

--------------------------------
Obrigado pela preferência! 🌊
    `;

    try {
        await Share.share({
            message: receiptMessage,
            title: 'Comprovante FishUp' // Título para alguns Androids
        });
    } catch (error) {
        Alert.alert("Erro", "Não foi possível compartilhar.");
    }
  };

  const handleChangeStatus = async (newStatus: StatusType) => {
    if (!user || !selectedOrder) return;
    setUpdating(true);
    try {
      await update(ref(database, `users/${user.uid}/orders/${selectedOrder.id}`), {
        status: newStatus
      });
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert("Sucesso", `Status alterado para ${newStatus.toUpperCase()}`);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = () => {
    Alert.alert(
      "Excluir Pedido",
      "Tem certeza que deseja excluir este pedido permanentemente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!user || !selectedOrder) return;
            try {
              await remove(ref(database, `users/${user.uid}/orders/${selectedOrder.id}`));
              setIsModalVisible(false);
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir.");
            }
          }
        }
      ]
    );
  };

  // --- Filtros ---
  const filteredOrders = statusFilter === 'todos' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  // --- Helper de Cores ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#F59E0B';
      case 'processando': return '#0EA5E9';
      case 'concluido': return '#10B981';
      case 'cancelado': return '#EF4444';
      default: return '#64748B';
    }
  };

  // --- Render Item ---
  const renderOrderItem = ({ item }: { item: Pedido }) => (
    <Pressable style={styles.card} onPress={() => handleOpenOrder(item)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.clientName}>{item.cliente}</Text>
          <Text style={styles.dateText}>
             {new Date(item.timestamp).toLocaleDateString('pt-BR')} • {new Date(item.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardContent}>
        <Text style={styles.productText} numberOfLines={2}>
          {item.produto}
        </Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="cube-outline" size={14} color="#94A3B8" />
            <Text style={styles.detailText}>{Number(item.quantidade).toFixed(2)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="wallet-outline" size={14} color="#94A3B8" />
            <Text style={styles.detailText}>R$ {item.valor.toFixed(2)}</Text>
          </View>
        </View>
      </View>
      
      {item.dataEntrega && (
          <View style={styles.footerCard}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" />
              <Text style={styles.footerText}>Entrega: {item.dataEntrega}</Text>
          </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER FIXO */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.title}>Meus Pedidos</Text>
          <Text style={styles.subtitle}>{filteredOrders.length} pedidos encontrados</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* FILTROS FIXOS */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {(['todos', 'pendente', 'processando', 'concluido', 'cancelado'] as const).map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterText,
                statusFilter === status && styles.filterTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* LISTA (SCROLL INDEPENDENTE) */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
            </View>
          }
        />
      )}

      {/* === MODAL DE DETALHES E STATUS === */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
              <Pressable onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>

            {selectedOrder && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                
                {/* Info Principal */}
                <View style={styles.modalInfoSection}>
                  <Text style={styles.modalLabel}>Cliente</Text>
                  <Text style={styles.modalValueBig}>{selectedOrder.cliente}</Text>
                  <Text style={styles.modalSubInfo}>
                    <Ionicons name="call-outline" size={14} /> {selectedOrder.telefoneCliente || "Não informado"}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Valor Total</Text>
                    <Text style={styles.modalValueHighlight}>R$ {selectedOrder.valor.toFixed(2)}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Data Entrega</Text>
                    <Text style={styles.modalValue}>{selectedOrder.dataEntrega}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoSection}>
                  <Text style={styles.modalLabel}>Produtos</Text>
                  <Text style={styles.modalValue}>{selectedOrder.produto}</Text>
                </View>

                {/* --- BOTÃO DE COMPARTILHAR (NOVO) --- */}
                <Pressable style={styles.shareButton} onPress={handleShareReceipt}>
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                    <Text style={styles.shareButtonText}>Compartilhar Comprovante</Text>
                </Pressable>

                <View style={styles.dividerLarge} />

                {/* Seção de Alterar Status */}
                <Text style={styles.sectionTitle}>Alterar Status</Text>
                <View style={styles.statusGrid}>
                  {(['pendente', 'processando', 'concluido', 'cancelado'] as StatusType[]).map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusButton,
                        selectedOrder.status === status && styles.statusButtonActive,
                        { borderColor: getStatusColor(status) }
                      ]}
                      onPress={() => handleChangeStatus(status)}
                      disabled={updating}
                    >
                      <Ionicons 
                        name={status === 'concluido' ? 'checkmark-circle' : 'ellipse'} 
                        size={12} 
                        color={selectedOrder.status === status ? '#fff' : getStatusColor(status)} 
                      />
                      <Text style={[
                        styles.statusButtonText,
                        { color: selectedOrder.status === status ? '#fff' : getStatusColor(status) }
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                      {selectedOrder.status === status && (
                        <View style={[styles.statusBackground, { backgroundColor: getStatusColor(status) }]} />
                      )}
                    </Pressable>
                  ))}
                </View>

                {/* Botão Excluir */}
                <Pressable style={styles.deleteButton} onPress={handleDeleteOrder}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Excluir Pedido</Text>
                </Pressable>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },

  // Filter Bar
  filterContainer: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    zIndex: 5,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  filterText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: '#fff',
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  
  // Order Card
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  cardContent: {
    gap: 8,
  },
  productText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  footerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  footerText: {
      fontSize: 12,
      color: '#64748B',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },

  // === ESTILOS DO MODAL ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%', // Aumentado um pouco para caber o botão de share
  },
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
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalInfoSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalValueBig: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSubInfo: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalCol: {
    flex: 1,
  },
  modalValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  modalValueHighlight: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
  },
  
  // Botão Share
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366', // Cor WhatsApp
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerLarge: {
    height: 6,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
    borderRadius: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 0,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  statusButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
    overflow: 'hidden',
  },
  statusButtonActive: {
    borderWidth: 0,
  },
  statusBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  statusButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    gap: 8,
    marginBottom: 40, // Espaço extra no final
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});