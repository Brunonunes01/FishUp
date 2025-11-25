import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
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
import { AuthButton, InputField, SwitchAuthLink } from "../../components/common/AuthUI";
import { auth, database } from "../../services/connectionFirebase";

type NavigationProps = StackNavigationProp<RootStackParamList, "Register">;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProps>();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    nome: false,
    email: false,
    senha: false,
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
      nome: !nome.trim(),
      email: !email.trim(),
      senha: !senha.trim() || senha.length < 6,
    };
    setErrors(newErrors);
    return !newErrors.nome && !newErrors.email && !newErrors.senha;
  };

  const handleRegister = async () => {
    if (!validateFields()) {
      Alert.alert("Atenção", "Por favor, preencha todos os campos obrigatórios (*) corretamente.");
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const { uid } = userCredential.user;
      await set(ref(database, `users/${uid}/profile`), {
        nome,
        email,
        telefone,
        cidade,
        estado,
        nomePropriedade: '',
        productionType: 'Não definido',
        createdAt: new Date().toISOString(),
      });
      // O listener de autenticação em index.tsx cuidará da navegação
    } catch (error: any) {
      let msg = "Não foi possível criar a conta.";
      if (error.code === 'auth/email-already-in-use') {
        msg = "Este e-mail já está em uso.";
      } else if (error.code === 'auth/invalid-email') {
        msg = "O formato do e-mail é inválido.";
      }
      Alert.alert("Erro no Cadastro", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* MANTÉM O BACKGROUND ORIGINAL PARA PREENCHER A TELA */}
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
                
                {/* LOGO NOVO GRANDE (ZOOM) */}
                <View style={styles.logoContainer}>
                  <Image 
                    source={require('../../../assets/images/novo_logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.header}>
                  <Text style={styles.title}>Crie sua conta</Text>
                  <Text style={styles.subtitle}>
                    Junte-se ao <Text style={styles.brandText}>FishUp</Text> hoje
                  </Text>
                </View>

                <View style={styles.form}>
                  
                  <InputField
                    label="Nome Completo *"
                    icon="person-outline"
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Digite seu nome completo"
                    error={errors.nome}
                    errorMessage="Nome é obrigatório"
                  />

                  <InputField
                    label="E-mail *"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    error={errors.email}
                    errorMessage="E-mail é obrigatório"
                  />

                  <InputField
                    label="Senha *"
                    icon="lock-closed-outline"
                    value={senha}
                    onChangeText={setSenha}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry={!showPassword}
                    error={errors.senha}
                    errorMessage="Senha deve ter no mínimo 6 caracteres"
                  >
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#94A3B8" />
                    </Pressable>
                  </InputField>

                  <View style={styles.optionalDivider}>
                    <Text style={styles.optionalText}>Informações Opcionais</Text>
                  </View>

                  <InputField
                    label="Telefone"
                    icon="call-outline"
                    value={telefone}
                    onChangeText={setTelefone}
                    placeholder="(00) 00000-0000"
                    keyboardType="phone-pad"
                  />

                  <View style={styles.rowInputs}>
                    <View style={{flex: 1, marginRight: 8}}>
                      <InputField
                        label="Cidade"
                        icon="business-outline"
                        value={cidade}
                        onChangeText={setCidade}
                        placeholder="Sua cidade"
                      />
                    </View>

                    <View style={{flex: 1, marginLeft: 8}}>
                      <InputField
                        label="Estado"
                        icon="map-outline"
                        value={estado}
                        onChangeText={setEstado}
                        placeholder="UF"
                        maxLength={2}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                  
                  <AuthButton
                    title="Criar Conta"
                    onPress={handleRegister}
                    loading={loading}
                    icon="checkmark-outline"
                    gradientColors={['#10B981', '#059669']}
                  />

                  <SwitchAuthLink
                    mainText="Já tem uma conta?"
                    linkText="Fazer Login"
                    onPress={() => navigation.navigate("Login")}
                  />
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  🔒 Ao criar uma conta, você concorda com nossos Termos
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
    paddingVertical: 30,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 32,
    padding: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  
  // --- LOGO ATUALIZADO IGUAL AO LOGIN ---
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
    height: 140, // Altura fixa para o container
    justifyContent: 'center',
    overflow: 'visible',
  },
  logoImage: {
    width: 140,
    height: 140,
    transform: [{ scale: 2.5 }], // ZOOM PARA CORTAR BORDAS TRANSPARENTES
  },
  // ---------------------------------------

  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
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
    padding: 6,
  },
  optionalDivider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  optionalText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  footer: {
    marginTop: 16,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
});