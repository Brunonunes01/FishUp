import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // <-- IMPORTADO PARA USAR O GRADIENTE
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

// --- INTERFACES DOS COMPONENTES ---
interface InputFieldProps {
  label: string;
  icon: any;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: boolean;
  errorMessage?: string;
  children?: React.ReactNode;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  icon: any;
  // CORRIGIDO: O tipo agora especifica que são no mínimo 2 cores, resolvendo o erro.
  gradientColors: [string, string];
}

interface SwitchAuthLinkProps {
  mainText: string;
  linkText: string;
  onPress: () => void;
}

// ==================== COMPONENTES REUTILIZÁVEIS ====================

export const InputField = ({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, errorMessage, children, maxLength, autoCapitalize }: InputFieldProps) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputLabel}>
      <Ionicons name={icon} size={14} color="#334155" /> {label}
    </Text>
    <View style={[
      styles.inputContainer,
      error && styles.inputContainerError
    ]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'none'}
        maxLength={maxLength}
      />
      {children}
    </View>
    {error && errorMessage && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    )}
  </View>
);

export const AuthButton = ({ title, onPress, loading, icon, gradientColors }: AuthButtonProps) => (
  <>
    {loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>{title}...</Text>
      </View>
    ) : (
      <Pressable
        style={({ pressed }) => [
          styles.actionButton, 
          pressed && styles.buttonPressed
        ]}
        onPress={onPress}
        android_ripple={{ color: "rgba(255,255,255,0.3)" }}
      >
        <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
        >
            <Text style={styles.actionButtonText}>{title}</Text>
            <View style={styles.buttonIconContainer}>
                <Ionicons name={icon} size={20} color="#fff" />
            </View>
        </LinearGradient>
      </Pressable>
    )}
  </>
);

export const SwitchAuthLink = ({ mainText, linkText, onPress }: SwitchAuthLinkProps) => (
  <View style={styles.switchContainer}>
    <Text style={styles.switchText}>{mainText} </Text>
    <Pressable onPress={onPress}>
      <Text style={styles.switchLink}>{linkText}</Text>
    </Pressable>
  </View>
);

// ==================== ESTILOS DOS COMPONENTES ====================
const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButton: {
    borderRadius: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  buttonIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  switchText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  switchLink: {
    color: "#0EA5E9",
    fontSize: 14,
    fontWeight: "800",
  },
});

