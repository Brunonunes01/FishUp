import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AlimentacaoRegistro, Lote } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

// --- LÓGICA DA TABELA DE ALIMENTAÇÃO ---
const getTaxaPorPeso = (pesoGramas: number): number => {
  if (pesoGramas <= 5) return 0.10;
  if (pesoGramas <= 20) return 0.08;
  if (pesoGramas <= 50) return 0.06;
  if (pesoGramas <= 100) return 0.05;
  if (pesoGramas <= 200) return 0.04;
  if (pesoGramas <= 400) return 0.03;
  return 0.02;
};

const getFatorTemperatura = (tempCelsius: number): number => {
  if (tempCelsius < 18) return 0.5;
  if (tempCelsius < 22) return 0.8;
  if (tempCelsius > 30) return 0.9;
  return 1.0;
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
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false); // NOVO MODAL DE AJUDA
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  // Estados da Calculadora
  const [pesoMedio, setPesoMedio] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [calculo, setCalculo] = useState<any>(null);

  // Estados do Registro
  const [qtdFornecida, setQtdFornecida] = useState('');
  const [sobras, setSobras] = useState('');

  useEffect(() => {
    if (!user) return;
    const lotesRef = ref(database, `users/${user.uid}/lots`);
    const unsubLotes = onValue(lotesRef, s => {
      const data = s.val();
      const lista = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      setLotes(lista.filter(l => l.status === 'ativo'));
    });

    let unsubRegistros = () => {};
    if (selectedLote) {
      setLoading(true);
      const registrosRef = ref(database, `users/${user.uid}/alimentacao/${selectedLote.id}`);
      unsubRegistros = onValue(registrosRef, s => {
        const data = s.val();
        const loadedData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        setRegistros(loadedData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
        setLoading(false);
      });
    } else {
      setRegistros([]);
      setLoading(false);
    }

    return () => {
      unsubLotes();
      unsubRegistros();
    };
  }, [user, selectedLote]);

  const handleSelectLote = (lote: Lote) => {
    setSelectedLote(lote);
    setPesoMedio('');
    setTemperatura('');
    setCalculo(null);
    setQtdFornecida('');
    setSobras('');
    setIsLoteModalVisible(false);
  };
  
  const handleCalcular = () => {
    if (!selectedLote || !pesoMedio || !temperatura) {
      return Alert.alert("Atenção", "Preencha o peso médio e a temperatura.");
    }
    const peso = parseFloat(pesoMedio.replace(',', '.'));
    const temp = parseFloat(temperatura.replace(',', '.'));
    
    if (isNaN(peso) || isNaN(temp)) return Alert.alert("Erro", "Valores inválidos.");

    const biomassa = (selectedLote.quantidade * peso) / 1000; // Kg
    const taxaBase = getTaxaPorPeso(peso);
    const fatorTemp = getFatorTemperatura(temp);
    const taxaAjustada = taxaBase * fatorTemp;
    const racaoDiaria = biomassa * taxaAjustada * 1000; // gramas
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
      return Alert.alert("Atenção", "Informe a quantidade fornecida.");
    }
    
    const qtd = parseFloat(qtdFornecida.replace(',', '.'));
    if (isNaN(qtd) || qtd <= 0) return Alert.alert("Erro", "Quantidade inválida.");

    const newRegistroRef = push(ref(database, `users/${user.uid}/alimentacao/${selectedLote.id}`));
    try {
      await set(newRegistroRef, {
        data: new Date().toISOString(),
        loteId: selectedLote.id,
        loteNome: selectedLote.nomeLote,
        quantidadeFornecida: qtd,
        sobrasEstimadas: parseFloat(sobras.replace(',', '.')) || 0,
        biomassaCalculada: calculo?.biomassa || 0,
        taxaAlimentarAplicada: calculo?.taxaRecomendada || 0,
      });
      Alert.alert("Sucesso", "Alimentação registrada!");
      setQtdFornecida('');
      setSobras('');
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar.");
    }
  };
  
  const renderRegistroItem: ListRenderItem<AlimentacaoRegistro> = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
          <Text style={styles.listItemDate}>
            {new Date(item.data).toLocaleDateString('pt-BR')}
          </Text>
          <Text style={styles.listItemTime}>
            {new Date(item.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
      </View>
      
      <View style={styles.listItemContent}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Fornecido</Text>
          <Text style={[styles.metricValue, { color: '#10B981' }]}>{item.quantidadeFornecida} g</Text>
        </View>
        
        {item.sobrasEstimadas > 0 && (
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Sobras</Text>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>{item.sobrasEstimadas} g</Text>
          </View>
        )}

        {item.biomassaCalculada > 0 && (
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Biomassa</Text>
            <Text style={styles.metricValue}>{item.biomassaCalculada.toFixed(1)} kg</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* HEADER COM BOTÃO DE AJUDA */}
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>Alimentação</Text>
            <Text style={styles.subtitle}>Controle diário e cálculos</Text>
        </View>
        <Pressable style={styles.helpButton} onPress={() => setIsHelpModalVisible(true)}>
            <Ionicons name="help-circle-outline" size={28} color="#fff" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* SELETOR DE LOTE */}
        <Pressable style={styles.selectButton} onPress={() => setIsLoteModalVisible(true)}>
          <View style={styles.selectButtonContent}>
            <Ionicons name="fish" size={24} color="#0EA5E9" />
            <View style={styles.selectTextContainer}>
              <Text style={styles.selectLabel}>Lote Selecionado</Text>
              <Text style={styles.selectValue}>
                {selectedLote ? `${selectedLote.nomeLote} (${selectedLote.especie})` : "Toque para selecionar"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </View>
        </Pressable>

        {selectedLote && (
          <>
            {/* CALCULADORA */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="calculator" size={20} color="#8B5CF6" />
                <Text style={styles.cardTitle}>Calculadora de Ração</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Peso Médio (g)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Ex: 150" 
                    placeholderTextColor="#64748B"
                    value={pesoMedio} 
                    onChangeText={setPesoMedio} 
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Temp. Água (°C)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Ex: 26" 
                    placeholderTextColor="#64748B"
                    value={temperatura} 
                    onChangeText={setTemperatura} 
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Pressable style={styles.calcButton} onPress={handleCalcular}>
                <Text style={styles.calcButtonText}>Calcular Recomendação</Text>
              </Pressable>

              {/* RESULTADOS DO CÁLCULO */}
              {calculo && (
                <View style={styles.resultsContainer}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Ração Diária:</Text>
                    <Text style={styles.resultHighlight}>{calculo.racaoDiaria.toFixed(0)} g</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Frequência:</Text>
                    <Text style={styles.resultValue}>{calculo.frequencia}</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultMiniRow}>
                    <Text style={styles.resultMiniText}>Biomassa: {calculo.biomassa.toFixed(1)} kg</Text>
                    <Text style={styles.resultMiniText}>Taxa: {calculo.taxaRecomendada.toFixed(2)}%</Text>
                  </View>
                </View>
              )}
            </View>

            {/* REGISTRO */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="pencil" size={20} color="#10B981" />
                <Text style={styles.cardTitle}>Registrar Alimentação</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Qtd. Fornecida (g)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="0" 
                    placeholderTextColor="#64748B"
                    value={qtdFornecida} 
                    onChangeText={setQtdFornecida} 
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sobras (g)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Opcional" 
                    placeholderTextColor="#64748B"
                    value={sobras} 
                    onChangeText={setSobras} 
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Pressable style={styles.saveButton} onPress={handleRegistrar}>
                <Text style={styles.saveButtonText}>Salvar Registro</Text>
              </Pressable>
            </View>

            {/* HISTÓRICO */}
            <View style={styles.historyContainer}>
              <Text style={styles.sectionTitle}>Histórico Recente</Text>
              {loading ? (
                <ActivityIndicator color="#0EA5E9" />
              ) : (
                <FlatList 
                  data={registros} 
                  renderItem={renderRegistroItem} 
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Nenhum registro encontrado.</Text>
                  }
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* MODAL SELEÇÃO LOTE */}
      <Modal visible={isLoteModalVisible} transparent animationType="slide" onRequestClose={() => setIsLoteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Lote</Text>
              <Pressable onPress={() => setIsLoteModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <FlatList 
              data={lotes} 
              keyExtractor={item => item.id} 
              renderItem={({item}) => (
                <Pressable style={styles.loteItem} onPress={() => handleSelectLote(item)}>
                  <View>
                    <Text style={styles.loteItemTitle}>{item.nomeLote}</Text>
                    <Text style={styles.loteItemSubtitle}>{item.especie} • {item.quantidade} un</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </Pressable>
              )} 
              ListEmptyComponent={<Text style={styles.emptyTextModal}>Nenhum lote ativo.</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* === NOVO MODAL DE AJUDA === */}
      <Modal visible={isHelpModalVisible} transparent animationType="fade" onRequestClose={() => setIsHelpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Como Usar?</Text>
              <Pressable onPress={() => setIsHelpModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <ScrollView style={{padding: 20}}>
                
                <View style={styles.helpStep}>
                    <View style={styles.helpIconBg}><Text style={styles.helpNumber}>1</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.helpTitle}>Selecione o Lote</Text>
                        <Text style={styles.helpText}>Escolha qual tanque você vai alimentar hoje.</Text>
                    </View>
                </View>

                <View style={styles.helpStep}>
                    <View style={styles.helpIconBg}><Text style={styles.helpNumber}>2</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.helpTitle}>Use a Calculadora (Opcional)</Text>
                        <Text style={styles.helpText}>
                            Não sabe quanto dar de ração? Preencha o <Text style={{fontWeight:'bold', color:'#fff'}}>Peso Médio</Text> (ex: 150g) e a <Text style={{fontWeight:'bold', color:'#fff'}}>Temperatura</Text> da água. O app calcula a quantidade ideal baseado na biomassa.
                        </Text>
                    </View>
                </View>

                <View style={styles.helpStep}>
                    <View style={styles.helpIconBg}><Text style={styles.helpNumber}>3</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.helpTitle}>Registre o Arraçoamento</Text>
                        <Text style={styles.helpText}>
                            No campo <Text style={{fontWeight:'bold', color:'#fff'}}>Qtd. Fornecida</Text>, coloque o que você realmente jogou no tanque.
                        </Text>
                    </View>
                </View>
                
                <View style={[styles.helpStep, { borderBottomWidth: 0 }]}>
                    <View style={styles.helpIconBg}><Text style={styles.helpNumber}>4</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.helpTitle}>Sobras</Text>
                        <Text style={styles.helpText}>
                            Se sobrou ração na superfície, estime a quantidade e anote. Isso ajuda a ajustar a próxima alimentação.
                        </Text>
                    </View>
                </View>

                <Pressable style={styles.closeHelpButton} onPress={() => setIsHelpModalVisible(false)}>
                    <Text style={styles.closeHelpButtonText}>Entendi, vamos lá!</Text>
                </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingHorizontal: 20, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10, paddingBottom: 20, backgroundColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  
  helpButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
  },

  scrollContent: { padding: 20, paddingBottom: 40 },

  // Select Button
  selectButton: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  selectButtonContent: { flexDirection: 'row', alignItems: 'center' },
  selectTextContainer: { flex: 1, marginLeft: 12 },
  selectLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  selectValue: { fontSize: 16, color: '#fff', fontWeight: 'bold', marginTop: 2 },

  // Cards
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup: { flex: 1 },
  inputLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#334155', fontSize: 16 },
  
  calcButton: { backgroundColor: '#8B5CF6', borderRadius: 12, padding: 14, alignItems: 'center' },
  calcButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  saveButton: { backgroundColor: '#10B981', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Resultados
  resultsContainer: { marginTop: 16, backgroundColor: '#0F172A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultLabel: { color: '#94A3B8', fontSize: 14 },
  resultValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultHighlight: { color: '#10B981', fontSize: 20, fontWeight: 'bold' },
  resultDivider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  resultMiniRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resultMiniText: { color: '#64748B', fontSize: 12 },

  // Histórico
  historyContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  
  listItem: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  listItemHeader: { marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listItemDate: { color: '#fff', fontWeight: '600' },
  listItemTime: { color: '#64748B', fontSize: 12 },
  
  listItemContent: { flexDirection: 'row', justifyContent: 'space-between' },
  metricItem: { alignItems: 'flex-start' },
  metricLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  
  emptyText: { color: '#64748B', textAlign: 'center', fontStyle: 'italic', marginTop: 10 },
  emptyTextModal: { color: '#64748B', textAlign: 'center', padding: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  loteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  loteItemTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  loteItemSubtitle: { color: '#64748B' },

  // Help Modal Specifics
  helpStep: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
  },
  helpIconBg: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#0EA5E9',
      justifyContent: 'center',
      alignItems: 'center',
  },
  helpNumber: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
  helpTitle: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 4,
  },
  helpText: {
      color: '#94A3B8',
      fontSize: 14,
      lineHeight: 20,
  },
  closeHelpButton: {
      backgroundColor: '#0EA5E9',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
  },
  closeHelpButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
});