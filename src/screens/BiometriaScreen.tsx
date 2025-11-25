import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, set, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ListRenderItem,
  Modal,
  Platform, // <--- ADICIONADO AQUI
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Lote } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');

// Interface atualizada
interface BiometriaCompleta {
  id: string;
  data: string;
  loteId: string;
  loteNome: string;
  pesoMedioCalculado: number;
  biomassaTotalEstimada: number;
  mortalidadeRegistrada: number;
  observacoes: string;
  comprimentoMedio?: number;
  taxaCrescimentoDiario?: number;
  conversaoAlimentar?: number;
  uniformidade?: number;
  sobrevivencia?: number;
  quantidadePeixesInicial?: number;
  quantidadePeixesAtual?: number;
  racaoConsumida?: number;
}

export default function BiometriaScreen() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [registros, setRegistros] = useState<BiometriaCompleta[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [isLoteModalVisible, setIsLoteModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ultimaBiometria, setUltimaBiometria] = useState<BiometriaCompleta | null>(null);
  const user = auth.currentUser;

  // Estados do Formulário
  const [pesoAmostra, setPesoAmostra] = useState('');
  const [numPeixesAmostra, setNumPeixesAmostra] = useState('');
  const [comprimentoMedio, setComprimentoMedio] = useState('');
  const [mortalidade, setMortalidade] = useState('');
  const [quantidadePeixesAtual, setQuantidadePeixesAtual] = useState('');
  const [racaoConsumida, setRacaoConsumida] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ultimoCalculo, setUltimoCalculo] = useState<any>(null);
  
  // Busca lotes e registros
  useEffect(() => {
    if (!user) return;
    
    const lotesRef = ref(database, `users/${user.uid}/lots`);
    const unsubLotes = onValue(lotesRef, s => {
      const data = s.val();
      const lista = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      // Filtra apenas lotes ativos
      setLotes(lista.filter(l => l.status === 'ativo'));
    });

    let unsubRegistros = () => {};
    if (selectedLote) {
      setLoading(true);
      const registrosRef = ref(database, `users/${user.uid}/biometria/${selectedLote.id}`);
      unsubRegistros = onValue(registrosRef, s => {
        const data = s.val();
        const loadedData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        const sortedData = loadedData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setRegistros(sortedData);
        setUltimaBiometria(sortedData.length > 0 ? sortedData[0] : null);
        setLoading(false);
      });
    } else {
      setRegistros([]);
      setUltimaBiometria(null);
      setLoading(false);
    }

    return () => { unsubLotes(); unsubRegistros(); };
  }, [user, selectedLote]);

  const handleSelectLote = (lote: Lote) => {
    setSelectedLote(lote);
    setQuantidadePeixesAtual(lote.quantidade?.toString() || '');
    setPesoAmostra('');
    setNumPeixesAmostra('');
    setComprimentoMedio('');
    setMortalidade('');
    setRacaoConsumida('');
    setObservacoes('');
    setUltimoCalculo(null);
    setIsLoteModalVisible(false);
  };

  const calcularMetricas = (pesoTotal: number, numPeixes: number, mort: number) => {
    if (!selectedLote || numPeixes === 0) return null;

    const pesoMedioCalculado = pesoTotal / numPeixes;
    const qtdAtual = parseInt(quantidadePeixesAtual) || selectedLote.quantidade;
    const qtdFinal = qtdAtual - mort;
    const biomassaTotalEstimada = (pesoMedioCalculado * qtdFinal) / 1000;
    
    // Comprimento estimado (relação peso-comprimento padrão tilápia se não informado)
    const compMedio = comprimentoMedio ? parseFloat(comprimentoMedio) : 
      Math.pow(pesoMedioCalculado / 0.016, 1/3); 
    
    // TCD
    let taxaCrescimentoDiario = 0;
    if (ultimaBiometria && ultimaBiometria.pesoMedioCalculado > 0) {
      const diasDesdeUltima = (new Date().getTime() - new Date(ultimaBiometria.data).getTime()) / (1000 * 3600 * 24);
      if (diasDesdeUltima > 0) {
        taxaCrescimentoDiario = (pesoMedioCalculado - ultimaBiometria.pesoMedioCalculado) / diasDesdeUltima;
      }
    }

    // CAA
    let conversaoAlimentar = 0;
    const racao = racaoConsumida ? parseFloat(racaoConsumida) : 0;
    if (racao > 0 && ultimaBiometria) {
      const ganhoBiomassa = (biomassaTotalEstimada - ultimaBiometria.biomassaTotalEstimada) * 1000; 
      if (ganhoBiomassa > 0) {
        conversaoAlimentar = racao / ganhoBiomassa;
      }
    }

    // Sobrevivência Global
    const sobrevivencia = ((qtdFinal / selectedLote.quantidadeInicial) * 100) || 0;
    
    // Uniformidade (simulada para exemplo, idealmente viria da variância da amostra)
    const uniformidade = 90; 

    return {
      pesoMedio: pesoMedioCalculado,
      biomassa: biomassaTotalEstimada,
      comprimentoMedio: compMedio,
      taxaCrescimentoDiario,
      conversaoAlimentar,
      uniformidade,
      sobrevivencia,
      quantidadeFinal: qtdFinal
    };
  };

  const handleCalcular = () => {
    if (!selectedLote || !pesoAmostra || !numPeixesAmostra) {
      return Alert.alert("Atenção", "Preencha os dados da amostra.");
    }

    const pesoTotal = parseFloat(pesoAmostra.replace(',', '.'));
    const numPeixes = parseInt(numPeixesAmostra);
    const mort = parseInt(mortalidade) || 0;

    if(isNaN(pesoTotal) || isNaN(numPeixes) || numPeixes === 0) {
      return Alert.alert("Erro", "Valores inválidos.");
    }

    const metricas = calcularMetricas(pesoTotal, numPeixes, mort);
    if (metricas) setUltimoCalculo(metricas);
  };

  const handleSalvarBiometria = async () => {
    if (!selectedLote || !ultimoCalculo) return Alert.alert("Erro", "Calcule antes de salvar.");
    if(!user) return;

    setLoading(true);
    const mort = parseInt(mortalidade) || 0;
    const newRegistroRef = push(ref(database, `users/${user.uid}/biometria/${selectedLote.id}`));
    
    try {
      await set(newRegistroRef, {
        data: new Date().toISOString(),
        loteId: selectedLote.id,
        loteNome: selectedLote.nomeLote,
        pesoMedioCalculado: ultimoCalculo.pesoMedio,
        biomassaTotalEstimada: ultimoCalculo.biomassa,
        comprimentoMedio: ultimoCalculo.comprimentoMedio,
        taxaCrescimentoDiario: ultimoCalculo.taxaCrescimentoDiario,
        conversaoAlimentar: ultimoCalculo.conversaoAlimentar,
        uniformidade: ultimoCalculo.uniformidade,
        sobrevivencia: ultimoCalculo.sobrevivencia,
        mortalidadeRegistrada: mort,
        quantidadePeixesInicial: selectedLote.quantidadeInicial,
        quantidadePeixesAtual: ultimoCalculo.quantidadeFinal,
        racaoConsumida: racaoConsumida ? parseFloat(racaoConsumida) : 0,
        observacoes,
      });

      // Atualiza Lote
      await update(ref(database, `users/${user.uid}/lots/${selectedLote.id}`), { 
        quantidade: ultimoCalculo.quantidadeFinal,
        updatedAt: new Date().toISOString()
      });

      Alert.alert("Sucesso", "Biometria registrada!");
      
      // Reset
      setPesoAmostra(''); setNumPeixesAmostra(''); setComprimentoMedio('');
      setMortalidade(''); setRacaoConsumida(''); setObservacoes('');
      setUltimoCalculo(null);

    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (valor: number, tipo: 'tcd' | 'caa' | 'sobrevivencia') => {
    switch (tipo) {
      case 'tcd': return valor > 2 ? '#10B981' : valor > 1 ? '#F59E0B' : '#EF4444'; // Maior é melhor
      case 'caa': return valor > 0 && valor < 1.5 ? '#10B981' : valor < 1.8 ? '#F59E0B' : '#EF4444'; // Menor é melhor
      case 'sobrevivencia': return valor > 90 ? '#10B981' : valor > 80 ? '#F59E0B' : '#EF4444';
      default: return '#94A3B8';
    }
  };

  const renderRegistroItem: ListRenderItem<BiometriaCompleta> = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
          <Text style={styles.listItemDate}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
        </View>
        {item.mortalidadeRegistrada > 0 && (
            <View style={styles.mortalityBadge}>
                <Text style={styles.mortalityText}>Mort: {item.mortalidadeRegistrada}</Text>
            </View>
        )}
      </View>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Peso Médio</Text>
          <Text style={styles.metricValue}>{item.pesoMedioCalculado.toFixed(1)}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Biomassa</Text>
          <Text style={styles.metricValue}>{item.biomassaTotalEstimada.toFixed(1)}kg</Text>
        </View>
        {item.taxaCrescimentoDiario ? (
            <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>TCD</Text>
                <Text style={[styles.metricValue, {color: getStatusColor(item.taxaCrescimentoDiario, 'tcd')}]}>
                    {item.taxaCrescimentoDiario.toFixed(2)}
                </Text>
            </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Biometria</Text>
        <Text style={styles.subtitle}>Acompanhamento de desempenho</Text>
      </View>

      {/* SELETOR DE LOTE */}
      <Pressable style={styles.selectButton} onPress={() => setIsLoteModalVisible(true)}>
        <View style={styles.selectButtonContent}>
          <Ionicons name="fish" size={24} color="#0EA5E9" />
          <View style={styles.selectTextContainer}>
            <Text style={styles.selectLabel}>Lote Selecionado</Text>
            <Text style={styles.selectValue}>
              {selectedLote ? `${selectedLote.nomeLote}` : "Toque para selecionar"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </View>
      </Pressable>

      {selectedLote && (
        <>
          {/* FORMULÁRIO DE AMOSTRAGEM */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={20} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Nova Amostragem</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso Amostra (g)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 1500" 
                  placeholderTextColor="#64748B"
                  value={pesoAmostra} 
                  onChangeText={setPesoAmostra} 
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nº Peixes</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 10" 
                  placeholderTextColor="#64748B"
                  value={numPeixesAmostra} 
                  onChangeText={setNumPeixesAmostra} 
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mortalidade</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0" 
                  placeholderTextColor="#64748B"
                  value={mortalidade} 
                  onChangeText={setMortalidade} 
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ração (kg)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Consumida" 
                  placeholderTextColor="#64748B"
                  value={racaoConsumida} 
                  onChangeText={setRacaoConsumida} 
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observações</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Anotações..." 
                  placeholderTextColor="#64748B"
                  value={observacoes} 
                  onChangeText={setObservacoes} 
                  multiline
                />
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={styles.calcButton} onPress={handleCalcular}>
                <Text style={styles.calcButtonText}>Calcular</Text>
              </Pressable>
              <Pressable 
                style={[styles.saveButton, (!ultimoCalculo || loading) && styles.buttonDisabled]} 
                onPress={handleSalvarBiometria}
                disabled={!ultimoCalculo || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
              </Pressable>
            </View>
          </View>

          {/* RESULTADOS */}
          {ultimoCalculo && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.cardTitle}>Resultados</Text>
              </View>

              <View style={styles.resultsGrid}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Peso Médio</Text>
                  <Text style={styles.resultValue}>{ultimoCalculo.pesoMedio.toFixed(1)} g</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Biomassa</Text>
                  <Text style={styles.resultValue}>{ultimoCalculo.biomassa.toFixed(1)} kg</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>TCD</Text>
                  <Text style={[styles.resultValue, { color: getStatusColor(ultimoCalculo.taxaCrescimentoDiario, 'tcd') }]}>
                    {ultimoCalculo.taxaCrescimentoDiario.toFixed(2)} g/dia
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Conversão</Text>
                  <Text style={[styles.resultValue, { color: getStatusColor(ultimoCalculo.conversaoAlimentar, 'caa') }]}>
                    {ultimoCalculo.conversaoAlimentar > 0 ? ultimoCalculo.conversaoAlimentar.toFixed(2) : '-'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* HISTÓRICO */}
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Histórico</Text>
            {loading ? (
                <ActivityIndicator color="#0EA5E9" />
            ) : (
                <FlatList 
                  data={registros} 
                  renderItem={renderRegistroItem} 
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={<Text style={styles.emptyText}>Nenhum registro.</Text>}
                />
            )}
          </View>
        </>
      )}

      {/* MODAL SELEÇÃO LOTE */}
      <Modal visible={isLoteModalVisible} transparent animationType="slide" onRequestClose={() => setIsLoteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Lote</Text>
              <Pressable onPress={() => setIsLoteModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingHorizontal: 20, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 10, paddingBottom: 20, backgroundColor: '#1E293B' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  calcButton: { flex: 1, backgroundColor: '#8B5CF6', borderRadius: 12, padding: 14, alignItems: 'center' },
  calcButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  saveButton: { flex: 1, backgroundColor: '#10B981', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  buttonDisabled: { backgroundColor: '#94A3B8', opacity: 0.5 },

  // Resultados
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultItem: { width: (width - 72) / 2, backgroundColor: '#0F172A', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  resultLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  resultValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Histórico
  historyContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  
  listItem: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listItemDate: { color: '#fff', fontWeight: '600' },
  mortalityBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  mortalityText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },
  
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metricItem: { alignItems: 'flex-start' },
  metricLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  
  emptyText: { color: '#64748B', textAlign: 'center', fontStyle: 'italic', marginTop: 10 },
  emptyTextModal: { color: '#64748B', textAlign: 'center', padding: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  loteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  loteItemTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  loteItemSubtitle: { color: '#64748B' },
});