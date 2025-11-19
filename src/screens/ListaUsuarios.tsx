// screens/ListaUsuarios.tsx
import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ref, get } from "firebase/database";
import { database, auth } from "../services/connectionFirebase";
import { RootStackParamList } from "../../app/(tabs)/index";

const { width } = Dimensions.get("window");

type ListaUsuariosNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ListaUsuarios"
>;

export default function ListaUsuarios() {
  const navigation = useNavigation<ListaUsuariosNavigationProp>();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any | null>(null);

  const carregarUsuarioConectado = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(
        "Não autenticado",
        "Nenhum usuário autenticado. Faça login para ver seu perfil.",
        [{ text: "OK" }]
      );
      setUserData(null);
      return;
    }

    const uid = currentUser.uid;
    console.log("[ListaUsuarios] uid atual:", uid);
    setLoading(true);

    try {
      const snap = await get(ref(database, `users/${uid}`));
      if (snap.exists()) {
        const data = snap.val();
        console.log("[ListaUsuarios] dados do usuário conectado:", data);

        const nome = data.nome ?? data.name ?? "(sem nome)";
        const email = data.email ?? data.mail ?? "(sem email)";
        const phone = data.phone ?? data.telefone ?? "";
        const city = data.city ?? data.cidade ?? "";

        setUserData({ uid, nome, email, phone, city, raw: data });
      } else {
        console.log("[ListaUsuarios] usuário não encontrado em users/{uid}");
        Alert.alert("Nenhum perfil", "Perfil não encontrado no banco (users/{uid}).");
        setUserData(null);
      }
    } catch (err: any) {
      console.error("[ListaUsuarios] erro ao ler usuário:", err);
      Alert.alert("Erro", `Não foi possível carregar o perfil: ${err?.message || err}`);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) carregarUsuarioConectado();
  }, [isFocused, carregarUsuarioConectado]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Meu Perfil</Text>

        <View style={styles.divider} />

        {loading ? (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <ActivityIndicator size="large" />
            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>Carregando...</Text>
          </View>
        ) : userData ? (
          <View style={styles.userCard}>
            <Text style={styles.userName}>{userData.nome}</Text>
            <Text style={styles.userDetail}>E-mail: {userData.email}</Text>
            <Text style={styles.userDetail}>
              Telefone: {userData.phone ? userData.phone : "—"}
            </Text>
            <Text style={styles.userDetail}>
              Cidade: {userData.city ? userData.city : "—"}
            </Text>

            <Pressable
              android_ripple={{ color: "rgba(255,255,255,0.06)" }}
              style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
              onPress={() => {
                if (!userData?.uid) {
                  Alert.alert("Erro", "UID do usuário inválido.");
                  return;
                }
                navigation.navigate("Perfil", { userId: userData.uid });
              }}
            >
              <LinearGradient
                colors={["#3b0000", "#ff2b2b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, { marginTop: 14 }]}
              >
                <Text style={styles.buttonText}>Editar Perfil</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 8 }}>
              Não há informações do perfil carregadas.
            </Text>

            <Pressable
              android_ripple={{ color: "rgba(255,255,255,0.06)" }}
              style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
              onPress={carregarUsuarioConectado}
            >
              <LinearGradient colors={["#222", "#444"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                <Text style={[styles.buttonText, { textTransform: "none" }]}>Recarregar / Testar</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        <Pressable
          android_ripple={{ color: "rgba(255,255,255,0.06)" }}
          style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <LinearGradient
            colors={["#444", "#222"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, { marginTop: 24 }]}
          >
            <Text style={[styles.buttonText, { textAlign: "center" }]}>Voltar para Dashboard</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: width * 0.94,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "rgba(255,43,43,0.12)",
    elevation: 12,
    shadowColor: "#ff2b2b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
  },
  divider: {
    height: 5,
    width: 80,
    borderRadius: 6,
    alignSelf: "center",
    marginVertical: 12,
    backgroundColor: "rgba(255,43,43,0.15)",
  },
  userCard: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 12,
    borderColor: "rgba(255,43,43,0.08)",
    borderWidth: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ff2b2b",
    marginBottom: 8,
  },
  userDetail: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginBottom: 6,
  },
  pressable: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "center",
  },
  pressablePressed: {
    opacity: 0.96,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 180,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
