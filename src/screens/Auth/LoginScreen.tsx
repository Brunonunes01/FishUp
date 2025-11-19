import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RootStackParamList } from "../../../app/(tabs)/index";
import { AuthButton, InputField, SwitchAuthLink } from "../../components/common/AuthUI"; // <-- IMPORTAÇÃO DOS NOVOS COMPONENTES
import { auth } from "../../services/connectionFirebase";

type NavigationProps = StackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProps>();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: false,
    senha: false
  });

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
  }, []);

  const validateFields = () => {
    const newErrors = {
      email: !email.trim(),
      senha: !senha.trim()
    };
    
    setErrors(newErrors);
    return !newErrors.email && !newErrors.senha;
  };

  const handleLogin = async () => {
    if (!validateFields()) {
      Alert.alert("Atenção", "Por favor, preencha todos os campos.");
      return;
    }
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // A navegação agora é tratada pelo listener em index.tsx
    } catch (error: any) {
      Alert.alert("Erro de Login", "Verifique seu e-mail e senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground 
        source={require('../../../assets/images/logo.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={3}
      >
        <View style={styles.gradientOverlay} />
        
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View 
              style={[
                styles.cardWrapper,
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
                  <Image 
                    source={require('../../../assets/images/logo.jpg')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.header}>
                  <Text style={styles.title}>Bem-vindo de volta!</Text>
                  <Text style={styles.subtitle}>
                    Entre na sua conta <Text style={styles.brandText}>FishUp</Text>
                  </Text>
                </View>

                <View style={styles.form}>
                  
                  <InputField
                    label="E-mail *"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    error={errors.email}
                    errorMessage="Por favor, insira seu e-mail"
                  />

                  <InputField
                    label="Senha *"
                    icon="lock-closed-outline"
                    value={senha}
                    onChangeText={setSenha}
                    placeholder="Digite sua senha"
                    secureTextEntry={!showPassword}
                    error={errors.senha}
                    errorMessage="Por favor, insira sua senha"
                  >
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#94A3B8" />
                    </Pressable>
                  </InputField>

                  <Pressable 
                    style={styles.forgotPassword}
                    onPress={() => Alert.alert("Recuperar senha", "Funcionalidade em desenvolvimento")}
                  >
                    <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
                  </Pressable>

                  <AuthButton
                    title="Entrar"
                    onPress={handleLogin}
                    loading={loading}
                    icon="arrow-forward-outline"
                    gradientColors={['#0EA5E9', '#0284C7']} // <-- CORRIGIDO
                  />

                  <SwitchAuthLink
                    mainText="Não tem uma conta?"
                    linkText="Cadastre-se"
                    onPress={() => navigation.navigate("Register")}
                  />
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  🔒 Seus dados estão seguros com criptografia
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 24, 44, 0.88)",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 32,
    padding: 28,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  brandText: {
    color: "#0EA5E9",
    fontWeight: "700",
  },
  form: {
    width: "100%",
  },
  eyeButton: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: "#0EA5E9",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
});

