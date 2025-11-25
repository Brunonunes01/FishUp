import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { onValue, ref } from "firebase/database";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme // Importante para detectar o tema
} from "react-native";
import { RootStackParamList } from "../../app/(tabs)";
import { Colors } from '../../constants/Colors'; // Importar as cores
import { useCarrinho } from "../context/CarrinhoContext";
import { auth, database } from "../services/connectionFirebase";

type NavigationProps = StackNavigationProp<RootStackParamList, "Dashboard">;

const { width } = Dimensions.get('window');

// ... (Interfaces Order, ActionCardProps, etc. mantidas iguais) ...
interface Order {
  id: string;
  cliente: string;
  produto: string;
  quantidade: number;
  valor: number;
  status: 'pendente' | 'processando' | 'concluido' | 'cancelado';
  dataEntrega: string;
  timestamp: number;
}

interface ActionCardProps {
  title: string;
  icon: any;
  onPress: () => void;
  gradient: string[];
  value?: number;
  iconFamily?: string;
}

interface QuickStatProps {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  iconFamily?: string;
}

interface MenuItemProps {
  icon: any;
  title: string;
  onPress: () => void;
  badge?: number;
  iconFamily?: string;
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProps>();
  const user = auth.currentUser;
  const { carrinho } = useCarrinho(); 
  const carrinhoCount = carrinho.length;
  
  // --- SISTEMA DE CORES ---
  const theme = useColorScheme() ?? 'light'; // Detecta se é light ou dark
  const colors = Colors[theme]; // Pega a paleta certa
  // ------------------------

  const [summary, setSummary] = useState({ tanks: 0, lots: 0, peixes: 0, pedidos: 0, clientes: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(30)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    
    const refs = {
      tanks: ref(database, `users/${user.uid}/tanks`),
      lots: ref(database, `users/${user.uid}/lots`),
      peixes: ref(database, `users/${user.uid}/peixes`),
      orders: ref(database, `users/${user.uid}/orders`),
      clientes: ref(database, `users/${user.uid}/clientes`)
    };

    const unsubs = [
      onValue(refs.tanks, s => setSummary(p => ({ ...p, tanks: s.exists() ? Object.keys(s.val()).length : 0 }))),
      onValue(refs.lots, s => setSummary(p => ({ ...p, lots: s.exists() ? Object.keys(s.val()).length : 0 }))),
      onValue(refs.peixes, s => setSummary(p => ({ ...p, peixes: s.exists() ? Object.keys(s.val()).length : 0 }))),
      onValue(refs.clientes, s => setSummary(p => ({ ...p, clientes: s.exists() ? Object.keys(s.val()).length : 0 }))),
      onValue(refs.orders, s => {
        const data = s.val();
        const list = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
        setSummary(p => ({ ...p, pedidos: list.length }));
      })
    ];

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.timing(statsAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start();
    
    return () => unsubs.forEach(u => u());
  }, [user]);

  const toggleMenu = () => {
    const toValue = menuVisible ? -width * 0.8 : 0;
    setMenuVisible(!menuVisible);
    Animated.spring(slideAnim, { toValue, tension: 50, friction: 8, useNativeDriver: true }).start();
  };

  const openAbout = () => {
    setMenuVisible(false);
    setTimeout(() => setAboutVisible(true), 300);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setMenuVisible(false);
  };

  const navigateTo = (screen: keyof RootStackParamList, params?: any) => {
    setMenuVisible(false);
    setTimeout(() => navigation.navigate(screen as any, params), 300);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  // --- COMPONENTES INTERNOS ADAPTADOS AO TEMA ---

  const ActionCard = ({ title, icon, onPress, gradient, value, iconFamily = 'Ionicons' }: ActionCardProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    return (
      <Pressable onPress={onPress} onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}>
        <Animated.View style={[styles.modernActionCard, { backgroundColor: gradient[0], transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.actionCardLayout}>
            <View style={styles.actionCardLeft}>
              <View style={styles.modernIconContainer}>
                {iconFamily === 'FontAwesome5' ? <FontAwesome5 name={icon} size={26} color="#fff" /> : <Ionicons name={icon} size={26} color="#fff" />}
              </View>
              <View style={styles.actionCardInfo}>
                <Text style={styles.modernCardTitle}>{title}</Text>
                {value !== undefined && (
                  <View style={styles.modernValueContainer}>
                    <Text style={styles.modernCardValue}>{value}</Text>
                    <Text style={styles.modernCardLabel}>itens</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.actionCardRight}>
              <View style={styles.arrowCircle}><Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" /></View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const QuickStat = ({ title, value, icon, color, iconFamily = 'Ionicons' }: QuickStatProps) => {
    return (
      <Animated.View style={[
        styles.modernStatCard, 
        { opacity: statsAnim, backgroundColor: colors.card, borderColor: colors.border } // COR DINÂMICA
      ]}>
        <View style={styles.statCardHeader}>
          <View style={[styles.modernStatIconBox, { backgroundColor: color + '20' }]}>
            {iconFamily === 'FontAwesome5' ? <FontAwesome5 name={icon} size={22} color={color} /> : <Ionicons name={icon} size={22} color={color} />}
          </View>
        </View>
        <View style={styles.statCardBody}>
          <Text style={[styles.modernStatValue, { color: colors.text }]}>{value}</Text>
          <Text style={[styles.modernStatLabel, { color: colors.textSecondary }]}>{title}</Text>
        </View>
        <View style={[styles.statCardFooter, { borderTopColor: colors.border }]}>
          <View style={[styles.statIndicator, { backgroundColor: color }]} />
        </View>
      </Animated.View>
    );
  };

  const MenuItem = ({ icon, title, onPress, badge, iconFamily = 'Ionicons' }: MenuItemProps) => {
    return (
      <Pressable style={({ pressed }) => [styles.modernMenuItem, pressed && { backgroundColor: colors.border }]} onPress={onPress}>
        <View style={styles.menuItemLayout}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.modernMenuIconBox, { backgroundColor: colors.primary + '15' }]}>
              {iconFamily === 'FontAwesome5' ? <FontAwesome5 name={icon} size={20} color={colors.primary} /> : <Ionicons name={icon} size={20} color={colors.primary} />}
            </View>
            <Text style={[styles.modernMenuItemText, { color: colors.text }]}>{title}</Text>
          </View>
          <View style={styles.menuItemRight}>
            {badge !== undefined && badge > 0 && (
              <View style={styles.modernMenuBadge}><Text style={styles.modernMenuBadgeText}>{badge}</Text></View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.icon} />
          </View>
        </View>
      </Pressable>
    );
  };

  const OrderItem = ({ item }: { item: Order }) => {
    const config = {
      pendente: { color: '#F59E0B', label: 'Pendente', icon: 'time-outline', bg: 'rgba(245, 158, 11, 0.12)' },
      processando: { color: '#0EA5E9', label: 'Processando', icon: 'sync-outline', bg: 'rgba(14, 165, 233, 0.12)' },
      concluido: { color: '#10B981', label: 'Concluído', icon: 'checkmark-circle-outline', bg: 'rgba(16, 185, 129, 0.12)' },
      cancelado: { color: '#EF4444', label: 'Cancelado', icon: 'close-circle-outline', bg: 'rgba(239, 68, 68, 0.12)' },
    }[item.status] || { color: '#F59E0B', label: 'Pendente', icon: 'time-outline', bg: 'rgba(245, 158, 11, 0.12)' };

    return (
      <View style={[styles.modernOrderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardHeaderLeft}>
            <Text style={[styles.modernOrderClient, { color: colors.text }]}>{item.cliente}</Text>
            <Text style={[styles.modernOrderProduct, { color: colors.textSecondary }]}>{item.produto}</Text>
          </View>
          <View style={[styles.modernStatusPill, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon as any} size={13} color={config.color} />
            <Text style={[styles.modernStatusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <View style={[styles.orderCardDivider, { backgroundColor: colors.border }]} />
        <View style={styles.orderCardFooter}>
          <View style={styles.modernOrderInfoItem}>
            <Ionicons name="cube-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.modernOrderInfoText, { color: colors.text }]}>{item.quantidade} kg</Text>
          </View>
          <View style={styles.modernOrderInfoItem}>
            <Ionicons name="cash-outline" size={14} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={[styles.modernOrderInfoText, { color: colors.text }]}>R$ {item.valor.toFixed(2)}</Text>
          </View>
          <View style={styles.modernOrderInfoItem}>
            <Ionicons name="calendar-outline" size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
            <Text style={[styles.modernOrderInfoText, { color: colors.text }]}>{item.dataEntrega}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary}/>
      </View>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pendente' || o.status === 'processando').length;

  return (
    <>
      <StatusBar 
        barStyle={theme === 'dark' ? "light-content" : "dark-content"} 
        backgroundColor={colors.backgroundContainer} 
        translucent 
      />
      
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        
        {/* HEADER */}
        <Animated.View style={[
          styles.modernHeader, 
          { 
            opacity: headerAnim, 
            backgroundColor: colors.backgroundContainer,
            borderBottomColor: colors.border
          }
        ]}>
          <View style={styles.headerContent}>
            <Pressable 
              style={({ pressed }) => [
                styles.modernHeaderButton, 
                { backgroundColor: colors.border },
                pressed && { opacity: 0.7 }
              ]}
              onPress={toggleMenu}
            >
              <Ionicons name="menu-sharp" size={24} color={colors.text} />
            </Pressable>
            
            <View style={styles.headerCenterContent}>
              <View style={styles.logoContainer}>
                <Ionicons name="water" size={22} color={colors.primary} />
                <Text style={[styles.modernHeaderTitle, { color: colors.text }]}>FishUp</Text>
              </View>
              <Text style={[styles.modernHeaderSubtitle, { color: colors.textSecondary }]}>Gestão Aquícola</Text>
            </View>
            
            <View style={styles.headerRightButtons}>
                <Pressable 
                  style={({ pressed }) => [styles.modernHeaderButton, styles.cartButton, { backgroundColor: colors.border }, pressed && { opacity: 0.7 }]}
                  onPress={() => navigateTo("Carrinho")}
                >
                  <Ionicons name="cart-outline" size={24} color={colors.text} />
                  {carrinhoCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{carrinhoCount}</Text></View>}
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [styles.modernHeaderButton, { backgroundColor: colors.border }, pressed && { opacity: 0.7 }]}
                  onPress={() => navigateTo("Pedidos")}
                >
                  <Ionicons name="notifications-outline" size={24} color={colors.text} />
                  {pendingOrders > 0 && <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{pendingOrders}</Text></View>}
                </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* SCROLLVIEW */}
        <Animated.ScrollView 
          style={[styles.scrollContainer, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modernScrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.card} />
          }
        >
          {/* ESTATÍSTICAS */}
          <View style={styles.modernStatsSection}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.modernSectionTitle, { color: colors.text }]}>Visão Geral</Text>
              <View style={[styles.sectionTitleUnderline, { backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.statsGrid}>
              <QuickStat title="Tanques Ativos" value={summary.tanks} icon="water" color={colors.primary} />
              <QuickStat title="Lotes Cadastrados" value={summary.lots} icon="fish" color={colors.success} />
              <QuickStat title="Espécies" value={summary.peixes} icon="dna" iconFamily="FontAwesome5" color="#8B5CF6" />
              <QuickStat title="Pedidos Total" value={summary.pedidos} icon="receipt" color={colors.warning} />
            </View>
          </View>
          
          {/* MÓDULOS */}
          <View style={styles.modernActionsSection}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.modernSectionTitle, { color: colors.text }]}>Acesso Rápido</Text>
              <View style={[styles.sectionTitleUnderline, { backgroundColor: colors.primary }]} />
            </View>
            <Animated.View style={[styles.modernActionsGrid, { transform: [{ translateY: cardsAnim }] }]}>
              <ActionCard title="Tanques" icon="water" gradient={['#0EA5E9', '#0284C7']} value={summary.tanks} onPress={() => navigateTo("Tanques")} />
              <ActionCard title="Lotes" icon="fish" gradient={['#10B981', '#059669']} value={summary.lots} onPress={() => navigateTo("Lotes")} />
              <ActionCard title="Espécies" icon="dna" iconFamily="FontAwesome5" gradient={['#8B5CF6', '#7C3AED']} value={summary.peixes} onPress={() => navigateTo("Peixes")} />
              <ActionCard title="Clientes" icon="people-outline" gradient={['#F59E0B', '#D97706']} value={summary.clientes} onPress={() => navigateTo("Clientes")} />
              <ActionCard title="Alimentação" icon="restaurant" gradient={['#22C55E', '#16A34A']} onPress={() => navigateTo("Alimentacao")} />
              <ActionCard title="Biometria" icon="analytics" gradient={['#EC4899', '#DB2777']} onPress={() => navigateTo("Biometria")} />
              <ActionCard title="Pedidos" icon="receipt" gradient={['#14B8A6', '#0D9488']} value={pendingOrders} onPress={() => navigateTo("Pedidos")} />
            </Animated.View>
          </View>
          
          {/* PEDIDOS RECENTES */}
          {orders.length > 0 && (
            <View style={styles.modernOrdersSection}>
              <View style={styles.ordersSectionHeader}>
                <View style={styles.sectionHeaderContainer}>
                  <Text style={[styles.modernSectionTitle, { color: colors.text }]}>Atividade Recente</Text>
                  <View style={[styles.sectionTitleUnderline, { backgroundColor: colors.primary }]} />
                </View>
                <Pressable onPress={() => navigateTo("Pedidos")} style={({ pressed }) => [styles.viewAllButton, { backgroundColor: colors.primary + '15' }, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>Ver todos</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </Pressable>
              </View>
              <View style={styles.ordersListContainer}>
                {orders.slice(0, 3).map((order) => <OrderItem key={order.id} item={order} />)}
              </View>
              {orders.length > 3 && (
                <Pressable style={({ pressed }) => [styles.showMoreButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.7 }]} onPress={() => navigateTo("Pedidos")}>
                  <Text style={[styles.showMoreText, { color: colors.textSecondary }]}>Carregar mais {orders.length - 3} pedidos</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          )}
          <View style={styles.footerSpacing} />
        </Animated.ScrollView>

        {/* MENU LATERAL (DINÂMICO) */}
        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={toggleMenu} statusBarTranslucent>
          <View style={styles.modernMenuOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
            <Animated.View style={[styles.modernMenuContainer, { backgroundColor: colors.backgroundContainer, transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.menuInnerWrapper}>
                <View style={[styles.modernMenuHeader, { borderBottomColor: colors.border, backgroundColor: colors.primary + '08' }]}>
                  <View style={styles.menuUserSection}>
                    <View style={[styles.modernMenuAvatar, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                      <Ionicons name="person" size={30} color={colors.primary} />
                    </View>
                    <View style={styles.menuUserDetailsContainer}>
                      <Text style={[styles.modernMenuUserName, { color: colors.text }]} numberOfLines={1}>{user?.displayName || 'Usuário'}</Text>
                      <Text style={[styles.modernMenuUserEmail, { color: colors.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
                    </View>
                  </View>
                  <Pressable style={[styles.modernCloseMenuButton, { backgroundColor: colors.border }]} onPress={toggleMenu}>
                    <Ionicons name="close" size={24} color={colors.icon} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modernMenuScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modernMenuScrollContent}>
                  <View style={styles.modernMenuSection}>
                    <Text style={styles.modernMenuSectionTitle}>PRINCIPAL</Text>
                    <MenuItem icon="home" title="Dashboard" onPress={() => navigateTo("Dashboard")} />
                    <MenuItem icon="person" title="Perfil" onPress={() => navigateTo("Perfil", { userId: user?.uid })} />
                     <MenuItem icon="cart" title="Carrinho de Vendas" badge={carrinhoCount} onPress={() => navigateTo("Carrinho")} />
                  </View>
                  <View style={styles.modernMenuSection}>
                    <Text style={styles.modernMenuSectionTitle}>GESTÃO</Text>
                    <MenuItem icon="water" title="Tanques" badge={summary.tanks} onPress={() => navigateTo("Tanques")} />
                    <MenuItem icon="fish" title="Lotes" badge={summary.lots} onPress={() => navigateTo("Lotes")} />
                    <MenuItem icon="dna" iconFamily="FontAwesome5" title="Espécies" badge={summary.peixes} onPress={() => navigateTo("Peixes")} />
                    <MenuItem icon="people-outline" title="Clientes" badge={summary.clientes} onPress={() => navigateTo("Clientes")} />
                    <MenuItem icon="restaurant" title="Alimentação" onPress={() => navigateTo("Alimentacao")} />
                  </View>
                  <View style={styles.modernMenuSection}>
                    <Text style={styles.modernMenuSectionTitle}>VENDAS</Text>
                    <MenuItem icon="receipt" title="Pedidos" badge={pendingOrders} onPress={() => navigateTo("Pedidos")} />
                  </View>
                  <View style={styles.modernMenuSection}>
                    <Text style={styles.modernMenuSectionTitle}>INFORMAÇÕES</Text>
                    <MenuItem icon="information-circle" title="Sobre o Desenvolvedor" onPress={openAbout} />
                  </View>
                </ScrollView>

                <View style={[styles.modernMenuFooter, { borderTopColor: colors.border, backgroundColor: colors.danger + '05' }]}>
                  <Pressable style={({ pressed }) => [styles.modernLogoutButton, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }, pressed && { opacity: 0.8 }]} onPress={handleLogout}>
                    <View style={styles.logoutButtonContent}>
                      <Ionicons name="log-out" size={22} color={colors.danger} />
                      <Text style={[styles.modernLogoutText, { color: colors.danger }]}>Sair da Conta</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>

        {/* MODAL SOBRE */}
        <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
          <View style={styles.aboutModalOverlay}>
            <View style={[styles.aboutModalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.aboutHeader, { backgroundColor: colors.primary }]}>
                <View style={[styles.devImageContainer, { backgroundColor: colors.background, borderColor: colors.card }]}>
                   <Ionicons name="code-slash" size={40} color={colors.text} />
                </View>
                <Pressable onPress={() => setAboutVisible(false)} style={styles.aboutCloseButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.aboutBody}>
                <Text style={[styles.devName, { color: colors.text }]}>Bruno Nunes</Text>
                <Text style={[styles.devRole, { color: colors.primary }]}>Full Stack Developer</Text>
                <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.aboutDescription, { color: colors.textSecondary }]}>
                  Desenvolvedor focado em criar soluções móveis eficientes e modernas. O FishUp foi criado para otimizar a gestão aquícola.
                </Text>
                <View style={styles.contactContainer}>
                  <Pressable style={styles.contactItem} onPress={() => Linking.openURL('mailto:bruno@email.com')}>
                    <View style={[styles.contactIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="mail" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.contactText, { color: colors.textSecondary }]}>Contato</Text>
                  </Pressable>
                  <Pressable style={styles.contactItem} onPress={() => Linking.openURL('https://github.com/brunonunes01')}>
                    <View style={[styles.contactIcon, { backgroundColor: colors.text + '10' }]}>
                      <Ionicons name="logo-github" size={20} color={colors.text} />
                    </View>
                    <Text style={[styles.contactText, { color: colors.textSecondary }]}>GitHub</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.aboutFooter}>
                <Text style={[styles.versionText, { color: colors.text }]}>Versão 1.0.0</Text>
                <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>© 2025 FishUp Inc.</Text>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </>
  );
}

// MANTENHA APENAS OS ESTILOS ESTRUTURAIS (Layouts, tamanhos, alinhamentos).
// As cores agora são injetadas inline via `style={[styles.abc, { color: colors.xyz }]}`.
const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modernHeader: { paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 50) + 10, paddingBottom: 14, borderBottomWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modernHeaderButton: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginLeft: 8 },
  headerCenterContent: { flex: 1, alignItems: 'center', marginHorizontal: 16 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  modernHeaderTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  modernHeaderSubtitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center' },
  cartButton: { marginLeft: 0 },
  cartBadge: { position: 'absolute', top: 6, right: 6, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2 },
  cartBadgeText: { fontSize: 10, fontWeight: '800' },
  notificationBadge: { position: 'absolute', top: 6, right: 6, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2 },
  notificationBadgeText: { fontSize: 10, fontWeight: '800' },
  scrollContainer: { flex: 1 },
  modernScrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50, flexGrow: 1 },
  modernStatsSection: { marginBottom: 30 },
  modernActionsSection: { marginBottom: 30 },
  modernOrdersSection: { marginBottom: 20 },
  sectionHeaderContainer: { marginBottom: 16 },
  modernSectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  sectionTitleUnderline: { width: 40, height: 3, borderRadius: 2 },
  ordersSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  viewAllText: { fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modernStatCard: { flex: 1, minWidth: (width - 52) / 2, borderRadius: 18, padding: 16, borderWidth: 1 },
  statCardHeader: { marginBottom: 14 },
  modernStatIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statCardBody: { marginBottom: 10 },
  modernStatValue: { fontSize: 26, fontWeight: '900', marginBottom: 3, letterSpacing: 0.3 },
  modernStatLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  statCardFooter: { paddingTop: 8, borderTopWidth: 1 },
  statIndicator: { width: 30, height: 3, borderRadius: 2 },
  modernActionsGrid: { gap: 12 },
  modernActionCard: { borderRadius: 16, padding: 16, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  actionCardLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modernIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionCardInfo: { flex: 1 },
  modernCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4, letterSpacing: 0.2 },
  modernValueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  modernCardValue: { fontSize: 14, fontWeight: '800', color: 'rgba(255, 255, 255, 0.95)' },
  modernCardLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)' },
  actionCardRight: { marginLeft: 8 },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
  ordersListContainer: { gap: 12 },
  modernOrderCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderCardHeaderLeft: { flex: 1, marginRight: 12 },
  modernOrderClient: { fontSize: 16, fontWeight: '800', marginBottom: 4, letterSpacing: 0.2 },
  modernOrderProduct: { fontSize: 13, fontWeight: '600' },
  modernStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  modernStatusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderCardDivider: { height: 1, marginBottom: 12 },
  orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  modernOrderInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modernOrderInfoText: { fontSize: 12, fontWeight: '700' },
  showMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1 },
  showMoreText: { fontSize: 13, fontWeight: '700' },
  footerSpacing: { height: 40 },
  
  // MENU
  modernMenuOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', flexDirection: 'row' },
  modernMenuContainer: { width: width * 0.8, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 16, height: '100%' },
  menuInnerWrapper: { flex: 1, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 50) },
  modernMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  menuUserSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modernMenuAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 2 },
  menuUserDetailsContainer: { flex: 1 },
  modernMenuUserName: { fontSize: 17, fontWeight: '800', marginBottom: 3, letterSpacing: 0.2 },
  modernMenuUserEmail: { fontSize: 12, fontWeight: '600' },
  modernCloseMenuButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modernMenuScrollView: { flex: 1 },
  modernMenuScrollContent: { padding: 16, paddingBottom: 100 },
  modernMenuSection: { marginBottom: 26 },
  modernMenuSectionTitle: { fontSize: 11, fontWeight: '800', paddingHorizontal: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  modernMenuItem: { borderRadius: 12, marginBottom: 4 },
  menuItemLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modernMenuIconBox: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  modernMenuItemText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modernMenuBadge: { backgroundColor: '#0EA5E9', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7 },
  modernMenuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  modernMenuFooter: { padding: 16, borderTopWidth: 1 },
  modernLogoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1 },
  logoutButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modernLogoutText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // ABOUT MODAL
  aboutModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  aboutModalContainer: { width: '100%', maxWidth: 360, borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  aboutHeader: { height: 100, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 0, position: 'relative' },
  aboutCloseButton: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  devImageContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: -40 },
  aboutBody: { marginTop: 50, paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  devName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  devRole: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  aboutDivider: { width: 40, height: 3, marginVertical: 16, borderRadius: 2 },
  aboutDescription: { textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  contactContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, width: '100%' },
  contactItem: { alignItems: 'center', gap: 8 },
  contactIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  contactText: { fontSize: 11, fontWeight: '600' },
  aboutFooter: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, alignItems: 'center' },
  versionText: { fontSize: 12, fontWeight: 'bold' },
  copyrightText: { fontSize: 11, marginTop: 2 },
});