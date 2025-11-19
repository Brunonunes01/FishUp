import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { get, ref, update } from "firebase/database";
import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { auth, database } from "../services/connectionFirebase";

const { width, height } = Dimensions.get('window');

// ==================== COMPONENTE DE INPUT MEMOIZADO ====================
const InputField = memo(({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = "default", 
  editable = true, 
  icon, 
  maxLength 
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={styles.modernInputContainer}>
      <View style={styles.modernLabelRow}>
        <View style={[
          styles.iconBox,
          isFocused && styles.iconBoxFocused,
          !editable && styles.iconBoxDisabled
        ]}>
          <Ionicons name={icon} size={18} color={isFocused ? "#0EA5E9" : editable ? "#64748B" : "#94A3B8"} />
        </View>
        <Text style={[
          styles.modernLabel,
          isFocused && styles.modernLabelFocused,
          !editable && styles.modernLabelDisabled
        ]}>
          {label}
        </Text>
      </View>
      <TextInput
        style={[
          styles.modernInput,
          isFocused && styles.modernInputFocused,
          !editable && styles.modernInputDisabled
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        editable={editable}
        placeholderTextColor="#94A3B8"
        maxLength={maxLength}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
});

// ==================== TELA PRINCIPAL ====================
export default function PerfilScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const headerAnim = useState(new Animated.Value(-100))[0];
  
  const [profile, setProfile] = useState({
    nome: "",
    productionType: "",
    telefone: "",
    nomePropriedade: "",
    cidade: "",
    estado: "",
  });
  
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado.");
      navigation.goBack();
      return;
    }

    const userRef = ref(database, `users/${user.uid}/profile`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.val());
      }
    }).catch(error => {
      Alert.alert("Erro", "Não foi possível carregar os dados do perfil.");
    }).finally(() => {
      setLoading(false);
      
      // Animações de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [user, navigation]);

  const handleSave = async () => {
    if (!user) return;
    
    // Validação
    if (!profile.nome.trim()) {
      Alert.alert("Atenção", "Por favor, informe seu nome completo.");
      return;
    }

    setSaving(true);
    try {
      const userRef = ref(database, `users/${user.uid}/profile`);
      await update(userRef, profile);
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
          <Text style={styles.loadingSubtext}>Aguarde um momento</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" translucent />
      
      <View style={styles.modernContainer}>
        {/* HEADER FLUTUANTE */}
        <Animated.View 
          style={[
            styles.floatingHeader,
            { transform: [{ translateY: headerAnim }] }
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Meu Perfil</Text>
            <Text style={styles.headerSubtitle}>Editar Informações</Text>
          </View>
          
          <View style={styles.headerPlaceholder} />
        </Animated.View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* CARD DE AVATAR */}
            <Animated.View 
              style={[
                styles.avatarCard,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.avatarSection}>
                <View style={styles.modernAvatar}>
                  <View style={styles.avatarInner}>
                    <Ionicons name="person" size={48} color="#0EA5E9" />
                  </View>
                  <View style={styles.avatarBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                </View>
                <View style={styles.userInfoSection}>
                  <Text style={styles.modernUserName}>
                    {profile.nome || "Usuário"}
                  </Text>
                  <Text style={styles.modernUserEmail}>{user?.email}</Text>
                  <View style={styles.userTagContainer}>
                    <View style={styles.userTag}>
                      <Ionicons name="shield-checkmark" size={12} color="#0EA5E9" />
                      <Text style={styles.userTagText}>Verificado</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* CARD DO FORMULÁRIO */}
            <Animated.View 
              style={[
                styles.formCard,
                { opacity: fadeAnim }
              ]}
            >
              <View style={styles.formHeader}>
                <Ionicons name="create-outline" size={24} color="#0EA5E9" />
                <View style={styles.formHeaderText}>
                  <Text style={styles.formTitle}>Informações Pessoais</Text>
                  <Text style={styles.formSubtitle}>Mantenha seus dados atualizados</Text>
                </View>
              </View>

              <View style={styles.formBody}>
                <InputField
                  label="Nome Completo"
                  icon="person-outline"
                  value={profile.nome}
                  onChangeText={(text: string) => setProfile(p => ({ ...p, nome: text }))}
                  placeholder="Seu nome completo"
                />

                <InputField
                  label="E-mail"
                  icon="mail-outline"
                  value={user?.email || ""}
                  editable={false}
                  placeholder="Seu e-mail"
                />

                <InputField
                  label="Telefone"
                  icon="call-outline"
                  value={profile.telefone}
                  onChangeText={(text: string) => setProfile(p => ({ ...p, telefone: text }))}
                  placeholder="(00) 00000-0000"
                  keyboardType="phone-pad"
                />

                <View style={styles.divider} />

                <View style={styles.sectionHeader}>
                  <Ionicons name="business" size={20} color="#0EA5E9" />
                  <Text style={styles.sectionTitle}>Propriedade</Text>
                </View>

                <InputField
                  label="Nome da Propriedade"
                  icon="business-outline"
                  value={profile.nomePropriedade}
                  onChangeText={(text: string) => setProfile(p => ({ ...p, nomePropriedade: text }))}
                  placeholder="Ex: Sítio Águas Claras"
                />

                <View style={styles.modernRow}>
                  <View style={styles.modernHalfInput}>
                    <InputField
                      label="Cidade"
                      icon="location-outline"
                      value={profile.cidade}
                      onChangeText={(text: string) => setProfile(p => ({ ...p, cidade: text }))}
                      placeholder="Sua cidade"
                    />
                  </View>
                  <View style={styles.modernHalfInput}>
                    <InputField
                      label="Estado"
                      icon="map-outline"
                      value={profile.estado}
                      onChangeText={(text: string) => setProfile(p => ({ ...p, estado: text.toUpperCase() }))}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.sectionHeader}>
                  <Ionicons name="fish" size={20} color="#0EA5E9" />
                  <Text style={styles.sectionTitle}>Produção</Text>
                </View>

                <InputField
                  label="Tipo de Produção"
                  icon="fish-outline"
                  value={profile.productionType}
                  onChangeText={(text: string) => setProfile(p => ({ ...p, productionType: text }))}
                  placeholder="Ex: Cria e Engorda de Tilápias"
                />
              </View>

              {/* BOTÕES DE AÇÃO */}
              <View style={styles.actionsContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modernCancelButton,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="close-outline" size={20} color="#64748B" />
                  <Text style={styles.modernCancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.modernSaveButton,
                    pressed && styles.buttonPressed,
                    saving && styles.modernSaveButtonDisabled
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.modernSaveText}>Salvando...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={styles.modernSaveText}>Salvar Alterações</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0F1E',
  },
  
  loadingContent: {
    alignItems: 'center',
  },
  
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  
  loadingSubtext: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // HEADER FLUTUANTE
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 50) + 10,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14, 165, 233, 0.15)',
  },
  
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  
  backButtonPressed: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    transform: [{ scale: 0.94 }],
  },
  
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  
  headerPlaceholder: {
    width: 42,
  },
  
  // SCROLL CONTENT
  scrollContent: {
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 50) + 70,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  
  // AVATAR CARD
  avatarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  modernAvatar: {
    position: 'relative',
    marginRight: 18,
  },
  
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 2,
  },
  
  userInfoSection: {
    flex: 1,
  },
  
  modernUserName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  
  modernUserEmail: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 10,
  },
  
  userTagContainer: {
    flexDirection: 'row',
  },
  
  userTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  
  userTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0EA5E9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // FORM CARD
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  
  formHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  
  formTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  
  formBody: {
    marginBottom: 20,
  },
  
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 20,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 0.3,
  },
  
  // INPUT FIELD
  modernInputContainer: {
    marginBottom: 18,
  },
  
  modernLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  
  iconBoxFocused: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  
  iconBoxDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  modernLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  
  modernLabelFocused: {
    color: '#0EA5E9',
  },
  
  modernLabelDisabled: {
    color: '#64748B',
  },
  
  modernInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  
  modernInputFocused: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  
  modernInputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#64748B',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  modernRow: {
    flexDirection: 'row',
    gap: 12,
  },
  
  modernHalfInput: {
    flex: 1,
  },
  
  // ACTIONS
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  
  modernCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  modernSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  
  modernSaveButtonDisabled: {
    backgroundColor: '#0284C7',
    opacity: 0.7,
  },
  
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  
  modernCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  
  modernSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  
  bottomSpacing: {
    height: 30,
  },
});