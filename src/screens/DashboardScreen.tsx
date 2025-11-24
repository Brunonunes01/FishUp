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
  View
} from "react-native";
import { RootStackParamList } from "../../app/(tabs)";
import { useCarrinho } from "../context/CarrinhoContext";
import { auth, database } from "../services/connectionFirebase";

type NavigationProps = StackNavigationProp<RootStackParamList, "Dashboard">;

const { width } = Dimensions.get('window');

// ==================== INTERFACES ====================
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

// ==================== COMPONENTE PRINCIPAL ====================
export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProps>();
  const user = auth.currentUser;
  
  // HOOK DO CARRINHO
  const { carrinho } = useCarrinho(); 
  const carrinhoCount = carrinho.length;
  
  const [summary, setSummary] = useState({ tanks: 0, lots: 0, peixes: 0, pedidos: 0, clientes: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // MODAIS
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(30)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (!user) return;
    
    const tanksRef = ref(database, `users/${user.uid}/tanks`);
    const lotsRef = ref(database, `users/${user.uid}/lots`);
    const peixesRef = ref(database, `users/${user.uid}/peixes`);
    const ordersRef = ref(database, `users/${user.uid}/orders`);
    const clientesRef = ref(database, `users/${user.uid}/clientes`);

    const unsubTanks = onValue(tanksRef, s => setSummary(p => ({ ...p, tanks: s.exists() ? Object.keys(s.val()).length : 0 })));
    const unsubLots = onValue(lotsRef, s => setSummary(p => ({ ...p, lots: s.exists() ? Object.keys(s.val()).length : 0 })));
    const unsubPeixes = onValue(peixesRef, s => setSummary(p => ({ ...p, peixes: s.exists() ? Object.keys(s.val()).length : 0 })));
    const unsubClientes = onValue(clientesRef, s => setSummary(p => ({ ...p, clientes: s.exists() ? Object.keys(s.val()).length : 0 })));
    
    const unsubOrders = onValue(ordersRef, snapshot => {
        const data = snapshot.val();
        const loadedOrders = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        setOrders(loadedOrders.sort((a, b) => b.timestamp - a.timestamp));
        setSummary(p => ({ ...p, pedidos: loadedOrders.length }));
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.timing(statsAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start();
    
    return () => {
      unsubTanks();
      unsubLots();
      unsubPeixes();
      unsubOrders();
      unsubClientes();
    };
  }, [user]);

  const toggleMenu = () => {
    const toValue = menuVisible ? -width * 0.8 : 0;
    setMenuVisible(!menuVisible);
    Animated.spring(slideAnim, { 
      toValue, 
      tension: 50, 
      friction: 8, 
      useNativeDriver: true 
    }).start();
  };

  const openAbout = () => {
    setMenuVisible(false);
    setTimeout(() => setAboutVisible(true), 300);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setMenuVisible(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const navigateTo = (screen: keyof RootStackParamList, params?: any) => {
    setMenuVisible(false);
    setTimeout(() => {
      navigation.navigate(screen as any, params);
    }, 300);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  // ==================== COMPONENTES ====================
  
  const ActionCard = ({ title, icon, onPress, gradient, value, iconFamily = 'Ionicons' }: ActionCardProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, { toValue: 0.96, tension: 300, friction: 10, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
    };

    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
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
              <View style={styles.arrowCircle}>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const QuickStat = ({ title, value, icon, color, iconFamily = 'Ionicons' }: QuickStatProps) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    return (
      <Animated.View style={[styles.modernStatCard, { opacity: statsAnim }]}>
        <View style={styles.statCardHeader}>
          <Animated.View style={[styles.modernStatIconBox, { backgroundColor: color + '20', transform: [{ scale: pulseAnim }] }]}>
            {iconFamily === 'FontAwesome5' ? <FontAwesome5 name={icon} size={22} color={color} /> : <Ionicons name={icon} size={22} color={color} />}
          </Animated.View>
        </View>
        <View style={styles.statCardBody}>
          <Text style={styles.modernStatValue}>{value}</Text>
          <Text style={styles.modernStatLabel}>{title}</Text>
        </View>
        <View style={styles.statCardFooter}>
          <View style={[styles.statIndicator, { backgroundColor: color }]} />
        </View>
      </Animated.View>
    );
  };

  const MenuItem = ({ icon, title, onPress, badge, iconFamily = 'Ionicons' }: MenuItemProps) => {
    const [isPressed, setIsPressed] = useState(false);
    return (
      <Pressable 
        style={[styles.modernMenuItem, isPressed && styles.modernMenuItemPressed]}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <View style={styles.menuItemLayout}>
          <View style={styles.menuItemLeft}>
            <View style={styles.modernMenuIconBox}>
              {iconFamily === 'FontAwesome5' ? <FontAwesome5 name={icon} size={20} color="#0EA5E9" /> : <Ionicons name={icon} size={20} color="#0EA5E9" />}
            </View>
            <Text style={styles.modernMenuItemText}>{title}</Text>
          </View>
          <View style={styles.menuItemRight}>
            {badge !== undefined && badge > 0 && (
              <View style={styles.modernMenuBadge}>
                <Text style={styles.modernMenuBadgeText}>{badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </View>
        </View>
      </Pressable>
    );
  };

  const OrderItem = ({ item }: { item: Order }) => {
    const getStatusConfig = (status: string) => {
      const configs: any = {
        pendente: { color: '#F59E0B', label: 'Pendente', icon: 'time-outline', bg: 'rgba(245, 158, 11, 0.12)' },
        processando: { color: '#0EA5E9', label: 'Processando', icon: 'sync-outline', bg: 'rgba(14, 165, 233, 0.12)' },
        concluido: { color: '#10B981', label: 'Concluído', icon: 'checkmark-circle-outline', bg: 'rgba(16, 185, 129, 0.12)' },
        cancelado: { color: '#EF4444', label: 'Cancelado', icon: 'close-circle-outline', bg: 'rgba(239, 68, 68, 0.12)' },
      };
      return configs[status] || configs.pendente;
    };
    const config = getStatusConfig(item.status);

    return (
      <View style={styles.modernOrderCard}>
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardHeaderLeft}>
            <Text style={styles.modernOrderClient}>{item.cliente}</Text>
            <Text style={styles.modernOrderProduct}>{item.produto}</Text>
          </View>
          <View style={[styles.modernStatusPill, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={13} color={config.color} />
            <Text style={[styles.modernStatusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
        <View style={styles.orderCardDivider} />
        <View style={styles.orderCardFooter}>
          <View style={styles.modernOrderInfoItem}>
            <View style={styles.orderInfoIconBox}><Ionicons name="cube-outline" size={14} color="#0EA5E9" /></View>
            <Text style={styles.modernOrderInfoText}>{item.quantidade} kg</Text>
          </View>
          <View style={styles.modernOrderInfoItem}>
            <View style={styles.orderInfoIconBox}><Ionicons name="cash-outline" size={14} color="#10B981" /></View>
            <Text style={styles.modernOrderInfoText}>R$ {item.valor.toFixed(2)}</Text>
          </View>
          <View style={styles.modernOrderInfoItem}>
            <View style={styles.orderInfoIconBox}><Ionicons name="calendar-outline" size={14} color="#8B5CF6" /></View>
            <Text style={styles.modernOrderInfoText}>{item.dataEntrega}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ==================== RENDER ====================
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9"/>
      </View>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pendente' || o.status === 'processando').length;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" translucent />
      
      <View style={styles.mainContainer}>
        {/* HEADER */}
        <Animated.View style={[styles.modernHeader, { opacity: headerAnim }]}>
          <View style={styles.headerContent}>
            <Pressable 
              style={({ pressed }) => [styles.modernHeaderButton, pressed && styles.headerButtonPressed]}
              onPress={toggleMenu}
            >
              <Ionicons name="menu-sharp" size={24} color="#fff" />
            </Pressable>
            
            <View style={styles.headerCenterContent}>
              <View style={styles.logoContainer}>
                <Ionicons name="water" size={22} color="#0EA5E9" />
                <Text style={styles.modernHeaderTitle}>FishUp</Text>
              </View>
              <Text style={styles.modernHeaderSubtitle}>Gestão Aquícola</Text>
            </View>
            
            <View style={styles.headerRightButtons}>
                <Pressable 
                  style={({ pressed }) => [styles.modernHeaderButton, styles.cartButton, pressed && styles.headerButtonPressed]}
                  onPress={() => navigateTo("Carrinho")}
                >
                  <Ionicons name="cart-outline" size={24} color="#fff" />
                  {carrinhoCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{carrinhoCount}</Text></View>}
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [styles.modernHeaderButton, pressed && styles.headerButtonPressed]}
                  onPress={() => navigateTo("Pedidos")}
                >
                  <Ionicons name="notifications-outline" size={24} color="#fff" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" colors={['#0EA5E9']} progressBackgroundColor="#1E293B" />
          }
        >
          <View style={styles.modernStatsSection}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.modernSectionTitle}>Visão Geral</Text>
              <View style={styles.sectionTitleUnderline} />
            </View>
            <View style={styles.statsGrid}>
              <QuickStat title="Tanques Ativos" value={summary.tanks} icon="water" color="#0EA5E9" />
              <QuickStat title="Lotes Cadastrados" value={summary.lots} icon="fish" color="#10B981" />
              <QuickStat title="Espécies" value={summary.peixes} icon="dna" iconFamily="FontAwesome5" color="#8B5CF6" />
              <QuickStat title="Pedidos Total" value={summary.pedidos} icon="receipt" color="#F59E0B" />
            </View>
          </View>
          
          <View style={styles.modernActionsSection}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.modernSectionTitle}>Acesso Rápido</Text>
              <View style={styles.sectionTitleUnderline} />
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
          
          {orders.length > 0 && (
            <View style={styles.modernOrdersSection}>
              <View style={styles.ordersSectionHeader}>
                <View style={styles.sectionHeaderContainer}>
                  <Text style={styles.modernSectionTitle}>Atividade Recente</Text>
                  <View style={styles.sectionTitleUnderline} />
                </View>
                <Pressable onPress={() => navigateTo("Pedidos")} style={({ pressed }) => [styles.viewAllButton, pressed && styles.viewAllButtonPressed]}>
                  <Text style={styles.viewAllText}>Ver todos</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0EA5E9" />
                </Pressable>
              </View>
              <View style={styles.ordersListContainer}>
                {orders.slice(0, 3).map((order) => <OrderItem key={order.id} item={order} />)}
              </View>
              {orders.length > 3 && (
                <Pressable style={({ pressed }) => [styles.showMoreButton, pressed && styles.showMoreButtonPressed]} onPress={() => navigateTo("Pedidos")}>
                  <Text style={styles.showMoreText}>Carregar mais {orders.length - 3} pedidos</Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </Pressable>
              )}
            </View>
          )}
          <View style={styles.footerSpacing} />
        </Animated.ScrollView>

        {/* MENU LATERAL */}
        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={toggleMenu} statusBarTranslucent>
          <View style={styles.modernMenuOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
            <Animated.View style={[styles.modernMenuContainer, { transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.menuInnerWrapper}>
                <View style={styles.modernMenuHeader}>
                  <View style={styles.menuUserSection}>
                    <View style={styles.modernMenuAvatar}>
                      <Ionicons name="person" size={30} color="#0EA5E9" />
                    </View>
                    <View style={styles.menuUserDetailsContainer}>
                      <Text style={styles.modernMenuUserName} numberOfLines={1}>{user?.displayName || 'Usuário'}</Text>
                      <Text style={styles.modernMenuUserEmail} numberOfLines={1}>{user?.email}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.modernCloseMenuButton} onPress={toggleMenu}>
                    <Ionicons name="close" size={24} color="#94A3B8" />
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
                    <Text style={styles.modernMenuSectionTitle}>ANÁLISES</Text>
                    <MenuItem icon="analytics" title="Biometria" onPress={() => navigateTo("Biometria")} />
                    <MenuItem icon="document-text" title="Relatórios" onPress={() => navigateTo("Relatorios")} />
                  </View>

                  {/* SEÇÃO SOBRE O APP */}
                  <View style={styles.modernMenuSection}>
                    <Text style={styles.modernMenuSectionTitle}>INFORMAÇÕES</Text>
                    <MenuItem icon="information-circle" title="Sobre o Desenvolvedor" onPress={openAbout} />
                  </View>

                </ScrollView>

                <View style={styles.modernMenuFooter}>
                  <Pressable style={({ pressed }) => [styles.modernLogoutButton, pressed && styles.modernLogoutButtonPressed]} onPress={handleLogout}>
                    <View style={styles.logoutButtonContent}>
                      <Ionicons name="log-out" size={22} color="#EF4444" />
                      <Text style={styles.modernLogoutText}>Sair da Conta</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>

        {/* === MODAL SOBRE O DESENVOLVEDOR === */}
        <Modal
          visible={aboutVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAboutVisible(false)}
        >
          <View style={styles.aboutModalOverlay}>
            <View style={styles.aboutModalContainer}>
              
              <View style={styles.aboutHeader}>
                <View style={styles.devImageContainer}>
                   <Ionicons name="code-slash" size={40} color="#fff" />
                </View>
                <Pressable onPress={() => setAboutVisible(false)} style={styles.aboutCloseButton}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={styles.aboutBody}>
                <Text style={styles.devName}>Bruno Nunes</Text>
                <Text style={styles.devRole}>Full Stack Developer</Text>
                
                <View style={styles.aboutDivider} />
                
                <Text style={styles.aboutDescription}>
                  Desenvolvedor focado em criar soluções móveis eficientes e modernas. O FishUp foi criado para otimizar a gestão aquícola.
                </Text>

                <View style={styles.contactContainer}>
                  <Pressable style={styles.contactItem} onPress={() => Linking.openURL('mailto:bruno@email.com')}>
                    <View style={[styles.contactIcon, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                      <Ionicons name="mail" size={20} color="#0EA5E9" />
                    </View>
                    <Text style={styles.contactText}>Contato</Text>
                  </Pressable>

                  <Pressable style={styles.contactItem} onPress={() => Linking.openURL('https://github.com/brunonunes01')}>
                    <View style={[styles.contactIcon, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                      <Ionicons name="logo-github" size={20} color="#fff" />
                    </View>
                    <Text style={styles.contactText}>GitHub</Text>
                  </Pressable>

                  <Pressable style={styles.contactItem} onPress={() => Linking.openURL('https://linkedin.com')}>
                    <View style={[styles.contactIcon, { backgroundColor: 'rgba(10, 102, 194, 0.1)' }]}>
                      <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
                    </View>
                    <Text style={styles.contactText}>LinkedIn</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.aboutFooter}>
                <Text style={styles.versionText}>Versão 1.0.0</Text>
                <Text style={styles.copyrightText}>© 2025 FishUp Inc.</Text>
              </View>

            </View>
          </View>
        </Modal>

      </View>
    </>
  );
}

// ==================== STYLES (MANTIDOS + NOVOS) ====================
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0A0F1E' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0F1E' },
  modernHeader: { backgroundColor: '#0F172A', paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 50) + 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(14, 165, 233, 0.15)', shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modernHeaderButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(14, 165, 233, 0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.2)', marginLeft: 8 },
  headerButtonPressed: { backgroundColor: 'rgba(14, 165, 233, 0.2)', transform: [{ scale: 0.94 }] },
  headerCenterContent: { flex: 1, alignItems: 'center', marginHorizontal: 16 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  modernHeaderTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  modernHeaderSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center' },
  cartButton: { marginLeft: 0 },
  cartBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#10B981', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#0F172A' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  notificationBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#0F172A' },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  scrollContainer: { flex: 1 },
  modernScrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50, flexGrow: 1 },
  modernStatsSection: { marginBottom: 30 },
  modernActionsSection: { marginBottom: 30 },
  modernOrdersSection: { marginBottom: 20 },
  sectionHeaderContainer: { marginBottom: 16 },
  modernSectionTitle: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: 0.3, marginBottom: 4 },
  sectionTitleUnderline: { width: 40, height: 3, backgroundColor: '#0EA5E9', borderRadius: 2 },
  ordersSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(14, 165, 233, 0.1)' },
  viewAllButtonPressed: { backgroundColor: 'rgba(14, 165, 233, 0.15)', transform: [{ scale: 0.96 }] },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#0EA5E9' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modernStatCard: { flex: 1, minWidth: (width - 52) / 2, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  statCardHeader: { marginBottom: 14 },
  modernStatIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statCardBody: { marginBottom: 10 },
  modernStatValue: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 3, letterSpacing: 0.3 },
  modernStatLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.2 },
  statCardFooter: { paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  statIndicator: { width: 30, height: 3, borderRadius: 2 },
  modernActionsGrid: { gap: 12 },
  modernActionCard: { borderRadius: 16, padding: 16, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  actionCardLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modernIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionCardInfo: { flex: 1 },
  modernCardTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.2 },
  modernValueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  modernCardValue: { fontSize: 14, fontWeight: '800', color: 'rgba(255, 255, 255, 0.95)' },
  modernCardLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)' },
  actionCardRight: { marginLeft: 8 },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
  ordersListContainer: { gap: 12 },
  modernOrderCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderCardHeaderLeft: { flex: 1, marginRight: 12 },
  modernOrderClient: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.2 },
  modernOrderProduct: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  modernStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  modernStatusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderCardDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginBottom: 12 },
  orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  modernOrderInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderInfoIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center' },
  modernOrderInfoText: { fontSize: 12, color: '#E2E8F0', fontWeight: '700' },
  showMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  showMoreButtonPressed: { backgroundColor: 'rgba(255, 255, 255, 0.06)', transform: [{ scale: 0.98 }] },
  showMoreText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  footerSpacing: { height: 40 },
  
  // MENU
  modernMenuOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', flexDirection: 'row' },
  modernMenuContainer: { width: width * 0.8, backgroundColor: '#1E293B', shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 16, height: '100%' },
  menuInnerWrapper: { flex: 1, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 50) },
  modernMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(14, 165, 233, 0.05)' },
  menuUserSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modernMenuAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(14, 165, 233, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 2, borderColor: 'rgba(14, 165, 233, 0.3)' },
  menuUserDetailsContainer: { flex: 1 },
  modernMenuUserName: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3, letterSpacing: 0.2 },
  modernMenuUserEmail: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  modernCloseMenuButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center' },
  modernMenuScrollView: { flex: 1 },
  modernMenuScrollContent: { padding: 16, paddingBottom: 100 },
  modernMenuSection: { marginBottom: 26 },
  modernMenuSectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', paddingHorizontal: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  modernMenuItem: { borderRadius: 12, marginBottom: 4, backgroundColor: 'transparent' },
  modernMenuItemPressed: { backgroundColor: 'rgba(14, 165, 233, 0.12)' },
  menuItemLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modernMenuIconBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(14, 165, 233, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  modernMenuItemText: { color: '#E2E8F0', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modernMenuBadge: { backgroundColor: '#0EA5E9', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7 },
  modernMenuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  modernMenuFooter: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(239, 68, 68, 0.03)' },
  modernLogoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  modernLogoutButtonPressed: { backgroundColor: 'rgba(239, 68, 68, 0.15)', transform: [{ scale: 0.98 }] },
  logoutButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modernLogoutText: { color: '#EF4444', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // NOVO: ESTILOS DO MODAL SOBRE
  aboutModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  aboutModalContainer: { width: '100%', maxWidth: 360, backgroundColor: '#1E293B', borderRadius: 24, padding: 0, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  aboutHeader: { height: 100, backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 0, position: 'relative' },
  aboutCloseButton: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  devImageContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0F172A', borderWidth: 4, borderColor: '#1E293B', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: -40 },
  aboutBody: { marginTop: 50, paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  devName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  devRole: { fontSize: 14, color: '#0EA5E9', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  aboutDivider: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16, borderRadius: 2 },
  aboutDescription: { textAlign: 'center', color: '#94A3B8', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  contactContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, width: '100%' },
  contactItem: { alignItems: 'center', gap: 8 },
  contactIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  contactText: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  aboutFooter: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, alignItems: 'center' },
  versionText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  copyrightText: { color: '#64748B', fontSize: 11, marginTop: 2 },
});