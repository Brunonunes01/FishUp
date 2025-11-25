import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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

  const handleOpenOrder = (order: Pedido) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  // --- GERAR PDF E COMPARTILHAR (SEM STORAGE) ---
  const handleSharePDF = async () => {
    if (!selectedOrder) return;
    setGeneratingPdf(true);

    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0EA5E9; padding-bottom: 10px; }
              .title { font-size: 24px; font-weight: bold; color: #0EA5E9; }
              .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
              .info-card { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { font-weight: bold; font-size: 12px; color: #6b7280; text-transform: uppercase; }
              .value { font-size: 14px; font-weight: 600; color: #1f2937; }
              .status { color: #0EA5E9; font-weight: bold; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { text-align: left; border-bottom: 2px solid #e5e7eb; padding: 10px 5px; color: #6b7280; font-size: 12px; text-transform: uppercase; }
              td { border-bottom: 1px solid #e5e7eb; padding: 12px 5px; font-size: 14px; }
              .price-col { text-align: right; }
              
              .total-section { margin-top: 20px; text-align: right; }
              .total-label { font-size: 14px; color: #6b7280; }
              .total-amount { font-size: 24px; font-weight: bold; color: #10B981; }
              
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">FishUp</div>
              <div class="subtitle">Comprovante de Venda</div>
            </div>

            <div class="info-card">
              <div class="row">
                <div>
                  <div class="label">Cliente</div>
                  <div class="value">${selectedOrder.cliente}</div>
                </div>
                <div style="text-align: right;">
                  <div class="label">Data</div>
                  <div class="value">${new Date(selectedOrder.timestamp).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
              <div class="row" style="margin-top: 10px;">
                <div>
                  <div class="label">Telefone</div>
                  <div class="value">${selectedOrder.telefoneCliente || 'N/A'}</div>
                </div>
                <div style="text-align: right;">
                  <div class="label">Status</div>
                  <div class="value status">${selectedOrder.status.toUpperCase()}</div>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd</th>
                  <th class="price-col">Preço</th>
                  <th class="price-col">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${selectedOrder.itensCarrinho?.map(item => {
                  const isMilheiro = item.unidade === 'milheiro';
                  const qtdReal = isMilheiro ? item.quantidade : item.quantidade;
                  const precoReal = item.precoUnitario;
                  const subtotal = isMilheiro 
                    ? (item.quantidade / 1000) * item.precoUnitario 
                    : item.quantidade * item.precoUnitario;
                  const unidadeLabel = isMilheiro ? 'un' : 'kg';
                  const precoLabel = isMilheiro ? 'mil' : 'kg';

                  return `
                    <tr>
                      <td>
                        <strong>${item.produtoNome}</strong><br>
                        <span style="font-size: 10px; color: #888;">${item.loteNome}</span>
                      </td>
                      <td>${qtdReal} ${unidadeLabel}</td>
                      <td class="price-col">R$ ${precoReal.toFixed(2)}/${precoLabel}</td>
                      <td class="price-col">R$ ${subtotal.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('') || `<tr><td colspan="4">${selectedOrder.produto}</td></tr>`}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-label">VALOR TOTAL</div>
              <div class="total-amount">R$ ${selectedOrder.valor.toFixed(2)}</div>
            </div>

            <div class="footer">
              Emitido em ${new Date().toLocaleString('pt-BR')} • FishUp Gestão Aquícola
            </div>
          </body>
        </html>
      `;

      // GERA O ARQUIVO TEMPORÁRIO
      const { uri } = await Print.printToFileAsync({ html });
      
      // COMPARTILHA DIRETO
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
      console.error(error);
    } finally {
      setGeneratingPdf(false);
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

  const filteredOrders = statusFilter === 'todos' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#F59E0B';
      case 'processando': return '#0EA5E9';
      case 'concluido': return '#10B981';
      case 'cancelado': return '#EF4444';
      default: return '#64748B';
    }
  };

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

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.title}>Meus Pedidos</Text>
          <Text style={styles.subtitle}>{filteredOrders.length} pedidos encontrados</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {(['todos', 'pendente', 'processando', 'concluido', 'cancelado'] as const).map((status) => (
            <Pressable
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
            </View>
          }
        />
      )}

      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
              <Pressable onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>

            {selectedOrder && (
              <ScrollView contentContainerStyle={styles.modalBody}>
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

                {/* BOTÃO GERAR PDF (SEM STORAGE) */}
                <Pressable 
                    style={styles.pdfButton} 
                    onPress={handleSharePDF}
                    disabled={generatingPdf}
                >
                    {generatingPdf ? <ActivityIndicator color="#fff" /> : <Ionicons name="print-outline" size={20} color="#fff" />}
                    <Text style={styles.pdfButtonText}> Gerar Comprovante PDF</Text>
                </Pressable>

                <View style={styles.dividerLarge} />

                <Text style={styles.sectionTitle}>Alterar Status</Text>
                <View style={styles.statusGrid}>
                  {(['pendente', 'processando', 'concluido', 'cancelado'] as StatusType[]).map((status) => (
                    <Pressable
                      key={status}
                      style={[styles.statusButton, selectedOrder.status === status && styles.statusButtonActive, { borderColor: getStatusColor(status) }]}
                      onPress={() => handleChangeStatus(status)}
                      disabled={updating}
                    >
                      <Ionicons name={status === 'concluido' ? 'checkmark-circle' : 'ellipse'} size={12} color={selectedOrder.status === status ? '#fff' : getStatusColor(status)} />
                      <Text style={[styles.statusButtonText, { color: selectedOrder.status === status ? '#fff' : getStatusColor(status) }]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                      {selectedOrder.status === status && <View style={[styles.statusBackground, { backgroundColor: getStatusColor(status) }]} />}
                    </Pressable>
                  ))}
                </View>

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
  container: { flex: 1, backgroundColor: '#0F172A' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155', zIndex: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  refreshButton: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  filterContainer: { backgroundColor: '#1E293B', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155', zIndex: 5 },
  filterContent: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  filterChipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  filterText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#94A3B8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
  cardContent: { gap: 8 },
  productText: { fontSize: 14, color: '#E2E8F0', fontWeight: '500' },
  detailsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#CBD5E1', fontWeight: '600' },
  footerCard: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(51, 65, 85, 0.5)' },
  footerText: { fontSize: 12, color: '#64748B' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#64748B', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  closeButton: { padding: 4 },
  modalBody: { padding: 20 },
  modalInfoSection: { marginBottom: 20 },
  modalLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  modalValueBig: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  modalSubInfo: { fontSize: 14, color: '#64748B', marginTop: 4 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalCol: { flex: 1 },
  modalValue: { fontSize: 16, color: '#0F172A', fontWeight: '500' },
  modalValueHighlight: { fontSize: 18, color: '#10B981', fontWeight: 'bold' },
  pdfButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0EA5E9', paddingVertical: 14, borderRadius: 12, gap: 8, marginTop: 10, marginBottom: 10 },
  pdfButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  dividerLarge: { height: 6, backgroundColor: '#F1F5F9', marginVertical: 20, borderRadius: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 0, marginBottom: 12 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  statusButton: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderRadius: 12, gap: 8, overflow: 'hidden' },
  statusButtonActive: { borderWidth: 0 },
  statusBackground: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
  statusButtonText: { fontWeight: '600', fontSize: 13 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#FEF2F2', borderRadius: 12, gap: 8, marginBottom: 40 },
  deleteButtonText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});