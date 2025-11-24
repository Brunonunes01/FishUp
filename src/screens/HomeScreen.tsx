import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RootStackParamList } from "../../app/(tabs)";

const { width, height } = Dimensions.get("window");

type NavigationProps = StackNavigationProp<RootStackParamList, "Home">;
interface Props {
  navigation: NavigationProps;
}

export default function HomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
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
      Animated.spring(scaleAnim, { 
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground 
        source={require('../../assets/images/logo.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={2}
      >
        <View style={styles.gradientOverlay} />
        <View style={styles.gradientTop} />
        
        <View style={styles.floatingCircle1} />
        <View style={styles.floatingCircle2} />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.container,
              {
                opacity: fadeAnim, 
                transform: [
                  { translateY: slideAnim }, 
                  { scale: scaleAnim } 
                ],
              }
            ]}
          >
            <View style={styles.card}>
              
              <View style={styles.logoContainer}>
                <View style={styles.logoGlow} />
                <Image 
                  source={{ uri: "https://cdn-icons-png.flaticon.com/512/3079/3079165.png" }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NOVO</Text>
              </View>

              <Text style={styles.welcomeText}>Bem-vindo ao</Text>
              <Text style={styles.title}>
                <Text style={styles.brand}>Fish</Text>
                <Text style={styles.brandAccent}>Up</Text>
              </Text>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerDot} />
                <View style={styles.divider} />
                <View style={styles.dividerDot} />
              </View>

              <Text style={styles.subtitle}>Gestão Inteligente de Piscicultura</Text>
              <Text style={styles.description}>
                Controle completo da sua produção aquícola com tecnologia de ponta.
              </Text>

              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <View style={styles.featureCard}>
                    <View style={[styles.iconContainer, styles.iconBlue]}>
                      <Text style={styles.featureEmoji}>🐠</Text>
                    </View>
                    <Text style={styles.featureTitle}>Tanques</Text>
                    <Text style={styles.featureDesc}>Monitoramento real</Text>
                  </View>

                  <View style={styles.featureCard}>
                    <View style={[styles.iconContainer, styles.iconGreen]}>
                      <Text style={styles.featureEmoji}>📈</Text>
                    </View>
                    <Text style={styles.featureTitle}>Lotes</Text>
                    <Text style={styles.featureDesc}>Gestão de estoque</Text>
                  </View>
                </View>

                <View style={styles.featureRow}>
                  <View style={styles.featureCard}>
                    <View style={[styles.iconContainer, styles.iconPurple]}>
                      <Text style={styles.featureEmoji}>🍽️</Text>
                    </View>
                    <Text style={styles.featureTitle}>Alimentação</Text>
                    <Text style={styles.featureDesc}>Programação auto</Text>
                  </View>

                  <View style={styles.featureCard}>
                    <View style={[styles.iconContainer, styles.iconOrange]}>
                      <Text style={styles.featureEmoji}>📊</Text>
                    </View>
                    <Text style={styles.featureTitle}>Relatórios</Text>
                    <Text style={styles.featureDesc}>Análises detalhadas</Text>
                  </View>
                </View>
              </View>

              <Pressable
                android_ripple={{ color: "rgba(255,255,255,0.3)" }}
                style={({ pressed }) => [
                  styles.pressable, 
                  pressed && styles.pressed
                ]}
                onPress={() => navigation.navigate("Login")} 
              >
                <View style={styles.button}>
                  <View style={styles.buttonGradient} />
                  <Text style={styles.buttonText}>Começar Agora</Text>
                  <View style={styles.buttonIconContainer}>
                    <Text style={styles.buttonIcon}>→</Text>
                  </View>
                </View>
              </Pressable>

              <View style={styles.infoRow}>
                <Text style={styles.infoText}>✓ Gratuito</Text>
                <View style={styles.infoDivider} />
                <Text style={styles.infoText}>✓ Sem cartão</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                🌊 Tecnologia de ponta para aquicultura sustentável
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 24, 44, 0.85)",
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.25,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
  },
  floatingCircle1: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(14, 165, 233, 0.08)",
    borderWidth: 2,
    borderColor: "rgba(14, 165, 233, 0.25)",
  },
  floatingCircle2: {
    position: 'absolute',
    bottom: 100,
    left: 15,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(34, 211, 238, 0.06)",
    borderWidth: 2,
    borderColor: "rgba(34, 211, 238, 0.18)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight || 20) + 10,
  },
  card: {
    width: width * 0.94,
    maxWidth: 440,
    padding: 24,
    paddingTop: 28,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "#0EA5E9",
    elevation: 10,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  logoGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#0EA5E9",
    opacity: 0.15,
  },
  logoImage: {
    width: 55,
    height: 55,
    tintColor: "#0EA5E9",
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  welcomeText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  brand: {
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: "#0EA5E9",
    letterSpacing: -0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  divider: {
    height: 3,
    width: 40,
    borderRadius: 2,
    backgroundColor: "#0EA5E9",
    marginHorizontal: 6,
  },
  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#0EA5E9",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  features: {
    width: "100%",
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  iconBlue: {
    backgroundColor: "#DBEAFE",
  },
  iconGreen: {
    backgroundColor: "#D1FAE5",
  },
  iconPurple: {
    backgroundColor: "#E9D5FF",
  },
  iconOrange: {
    backgroundColor: "#FED7AA",
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 3,
    textAlign: "center",
  },
  featureDesc: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 12,
  },
  pressable: {
    borderRadius: 18,
    overflow: "hidden",
    width: "100%",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  button: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: 'hidden',
  },
  buttonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginRight: 6,
  },
  buttonIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  infoText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  infoDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#CBD5E1",
  },
  footer: {
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.2,
  },
});