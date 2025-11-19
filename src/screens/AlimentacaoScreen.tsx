import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, Pressable, Alert, FlatList,
  ListRenderItem, ScrollView, Modal, ActivityIndicator
} from "react-native";
import { ref, onValue, push, set } from "firebase/database";
import { database, auth } from "../services/connectionFirebase";
import { Lote, AlimentacaoRegistro } from "../../app/(tabs)";

// --- LÓGICA DA TABELA DE ALIMENTAÇÃO (Exemplo para Tilápias) ---
const getTaxaPorPeso = (pesoGramas: number): number => {
  if (pesoGramas <= 5) return 0.10;   // 10%
  if (pesoGramas <= 20) return 0.08;  // 8%
  if (pesoGramas <= 50) return 0.06;  // 6%
  if (pesoGramas <= 100) return 0.05; // 5%
  if (pesoGramas <= 200) return 0.04; // 4%
  if (pesoGramas <= 400) return 0.03; // 3%
  return 0.02; // 2%
};

const getFatorTemperatura = (tempCelsius: number): number => {
  if (tempCelsius < 18) return 0.5;
  if (tempCelsius < 22) return 0.8;
  if (tempCelsius > 30) return 0.9;
  return 1.0; // Ideal
};

const getFrequenciaPorPeso = (pesoGramas: number): string => {
  if (pesoGramas < 20) return "4-6 vezes/dia";
  if (pesoGramas < 100) return "3-4 vezes/dia";
  return "2-3 vezes/dia";
};

// --- TELA PRINCIPAL ---
export default function AlimentacaoScreen() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [registros, setRegistros] = useState<AlimentacaoRegistro[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [isLoteModalVisible, setIsLoteModalVisible] = useState(false);
  const user = auth.currentUser;

  // Estados da Calculadora
  const [pesoMedio, setPesoMedio] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [calculo, setCalculo] = useState<any>(null);

  // Estados do Registro
  const [qtdFornecida, setQtdFornecida] = useState('');
  const [sobras, setSobras] = useState('');

  // Busca lotes e registros do lote selecionado
  useEffect(() => {
    if (!user) return;
    const lotesRef = ref(database, `users/${user.uid}/lots`);
    const unsubLotes = onValue(lotesRef, s => {
      setLotes(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
    });

    let unsubRegistros = () => {};
    if (selectedLote) {
      const registrosRef = ref(database, `users/${user.uid}/alimentacao/${selectedLote.id}`);
      unsubRegistros = onValue(registrosRef, s => {
        const data = s.val();
        // Ordena do mais recente para o mais antigo
        const loadedData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        setRegistros(loadedData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
      });
    } else {
      setRegistros([]);
    }

    return () => {
      unsubLotes();
      unsubRegistros();
    };
  }, [user, selectedLote]);

  const handleSelectLote = (lote: Lote) => {
    setSelectedLote(lote);
    // Limpa campos ao trocar de lote
    setPesoMedio('');
    setTemperatura('');
    setCalculo(null);
    setQtdFornecida('');
    setSobras('');
    setIsLoteModalVisible(false);
  };
  
  const handleCalcular = () => {
    if (!selectedLote || !pesoMedio || !temperatura) {
      return Alert.alert("Atenção", "Selecione um lote e preencha o peso médio e a temperatura.");
    }
    const peso = parseFloat(pesoMedio.replace(',', '.'));
    const temp = parseFloat(temperatura.replace(',', '.'));
    const biomassa = (selectedLote.quantidade * peso) / 1000; // em Kg
    const taxaBase = getTaxaPorPeso(peso);
    const fatorTemp = getFatorTemperatura(temp);
    const taxaAjustada = taxaBase * fatorTemp;
    const racaoDiaria = biomassa * taxaAjustada * 1000; // em gramas
    const frequencia = getFrequenciaPorPeso(peso);

    setCalculo({
      biomassa,
      taxaRecomendada: taxaAjustada * 100,
      racaoDiaria,
      frequencia,
    });
  };

  const handleRegistrar = async () => {
    if (!user || !selectedLote || !qtdFornecida) {
      return Alert.alert("Atenção", "Selecione um lote e informe a quantidade fornecida.");
    }
    
    const newRegistroRef = push(ref(database, `users/${user.uid}/alimentacao/${selectedLote.id}`));
    try {
      await set(newRegistroRef, {
        data: new Date().toISOString(),
        loteId: selectedLote.id,
        loteNome: selectedLote.nomeLote,
        quantidadeFornecida: parseFloat(qtdFornecida.replace(',', '.')) || 0,
        sobrasEstimadas: parseFloat(sobras.replace(',', '.')) || 0,
        biomassaCalculada: calculo?.biomassa || 0,
        taxaAlimentarAplicada: calculo?.taxaRecomendada || 0,
      });
      Alert.alert("Sucesso", "Alimentação registrada!");
      setQtdFornecida('');
      setSobras('');
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar o registro.");
    }
  };
  
  const renderRegistroItem: ListRenderItem<AlimentacaoRegistro> = ({ item }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemTitle}>{new Date(item.data).toLocaleDateString('pt-BR')} - {new Date(item.data).toLocaleTimeString('pt-BR')}</Text>
      <Text style={styles.detailText}>Qtd. Fornecida: {item.quantidadeFornecida} g</Text>
      {item.sobrasEstimadas > 0 && <Text style={styles.detailText}>Sobras: {item.sobrasEstimadas} g</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Modal de Seleção de Lote */}
      <Modal visible={isLoteModalVisible} onRequestClose={() => setIsLoteModalVisible(false)} transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione um Lote</Text>
            <FlatList data={lotes} keyExtractor={item => item.id} renderItem={({item}) => (
              <Pressable style={styles.modalItem} onPress={() => handleSelectLote(item)}>
                <Text style={styles.modalItemText}>{item.nomeLote} ({item.especie})</Text>
              </Pressable>
            )} ListEmptyComponent={<Text>Nenhum lote ativo.</Text>}/>
            <Pressable style={styles.modalCloseButton} onPress={() => setIsLoteModalVisible(false)}><Text style={styles.buttonText}>Cancelar</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Text style={styles.title}>Controle de Alimentação</Text>

      <Pressable style={styles.selectButton} onPress={() => setIsLoteModalVisible(true)}>
        <Text style={styles.selectButtonText}>{selectedLote ? `${selectedLote.nomeLote}` : "Selecione um Lote *"}</Text>
      </Pressable>

      {selectedLote && (
        <>
          {/* Card da Calculadora */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Calculadora de Ração</Text>
            <View style={styles.dimensionRow}>
              <TextInput style={[styles.input, styles.dimensionInput]} placeholder="Peso Médio (g)" value={pesoMedio} onChangeText={setPesoMedio} keyboardType="numeric"/>
              <TextInput style={[styles.input, styles.dimensionInput]} placeholder="Temp. Água (°C)" value={temperatura} onChangeText={setTemperatura} keyboardType="numeric"/>
            </View>
            <Pressable style={styles.button} onPress={handleCalcular}><Text style={styles.buttonText}>Calcular</Text></Pressable>
          </View>
          
          {/* Card de Resultados */}
          {calculo && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tabela de Arraçoamento</Text>
              <Text style={styles.resultText}>Biomassa Total: <Text style={styles.resultValue}>{calculo.biomassa.toFixed(2)} kg</Text></Text>
              <Text style={styles.resultText}>Taxa Diária Recomendada: <Text style={styles.resultValue}>{calculo.taxaRecomendada.toFixed(2)} %</Text></Text>
              <Text style={styles.resultText}>Ração Diária: <Text style={styles.resultValue}>{calculo.racaoDiaria.toFixed(0)} g</Text></Text>
              <Text style={styles.resultText}>Frequência: <Text style={styles.resultValue}>{calculo.frequencia}</Text></Text>
            </View>
          )}

          {/* Card de Registro */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Registrar Alimentação</Text>
            <View style={styles.dimensionRow}>
              <TextInput style={[styles.input, styles.dimensionInput]} placeholder="Qtd. Fornecida (g)" value={qtdFornecida} onChangeText={setQtdFornecida} keyboardType="numeric"/>
              <TextInput style={[styles.input, styles.dimensionInput]} placeholder="Sobras (g)" value={sobras} onChangeText={setSobras} keyboardType="numeric"/>
            </View>
            <Pressable style={styles.button} onPress={handleRegistrar}><Text style={styles.buttonText}>Registrar</Text></Pressable>
          </View>

          {/* Histórico */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Histórico do Lote</Text>
            <FlatList data={registros} renderItem={renderRegistroItem} keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhum registro para este lote.</Text>}
              scrollEnabled={false}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  dimensionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dimensionInput: { width: '48%' },
  button: { backgroundColor: '#007BFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  selectButton: { borderWidth: 1, borderColor: '#007BFF', borderStyle: 'dashed', borderRadius: 8, padding: 15, marginBottom: 20, alignItems: 'center' },
  selectButtonText: { fontSize: 16, color: '#007BFF', fontWeight: 'bold' },
  resultText: { fontSize: 16, marginBottom: 8 },
  resultValue: { fontWeight: 'bold' },
  listItem: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10 },
  listItemTitle: { fontSize: 16, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#6c757d' },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#6c757d' },
  // Estilos do Modal
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
  modalCloseButton: { backgroundColor: '#6c757d', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
});
