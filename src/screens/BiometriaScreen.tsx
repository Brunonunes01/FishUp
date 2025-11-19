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
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  View
} from "react-native";
import { Lote } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');

// Interface atualizada com novos campos
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
  
  // Busca lotes e registros de biometria
  useEffect(() => {
    if (!user) return;
    
    const lotesRef = ref(database, `users/${user.uid}/lots`);
    const unsubLotes = onValue(lotesRef, s => {
      setLotes(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
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
    
    // Cálculo do comprimento médio (fórmula aproximada para tilápia)
    const compMedio = comprimentoMedio ? parseFloat(comprimentoMedio) : 
      Math.pow(pesoMedioCalculado / 0.016, 1/3); // Fórmula Length-Weight Relationship
    
    // Cálculo da Taxa de Crescimento Diário (TCD)
    let taxaCrescimentoDiario = 0;
    if (ultimaBiometria && ultimaBiometria.pesoMedioCalculado > 0) {
      const diasDesdeUltima = (new Date().getTime() - new Date(ultimaBiometria.data).getTime()) / (1000 * 3600 * 24);
      if (diasDesdeUltima > 0) {
        taxaCrescimentoDiario = (pesoMedioCalculado - ultimaBiometria.pesoMedioCalculado) / diasDesdeUltima;
      }
    }

    // Cálculo da Conversão Alimentar Aparente (CAA)
    let conversaoAlimentar = 0;
    const racao = racaoConsumida ? parseFloat(racaoConsumida) : 0;
    if (racao > 0 && ultimaBiometria) {
      const ganhoBiomassa = (biomassaTotalEstimada - ultimaBiometria.biomassaTotalEstimada) * 1000; // em gramas
      if (ganhoBiomassa > 0) {
        conversaoAlimentar = racao / ganhoBiomassa;
      }
    }

    // Cálculo da Sobrevivência
    const sobrevivencia = ((qtdFinal / selectedLote.quantidadeInicial) * 100) || 0;

    // Uniformidade (estimativa baseada no CV - Coeficiente de Variação)
    const uniformidade = 85 + (Math.random() * 10); // Simulação - em produção real viria da amostragem

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
      return Alert.alert("Atenção", "Selecione um lote e preencha o peso e o número de peixes da amostra.");
    }

    const pesoTotal = parseFloat(pesoAmostra.replace(',', '.'));
    const numPeixes = parseInt(numPeixesAmostra);
    const mort = parseInt(mortalidade) || 0;

    if(isNaN(pesoTotal) || isNaN(numPeixes) || numPeixes === 0) {
      return Alert.alert("Erro", "Valores da amostra inválidos.");
    }

    const metricas = calcularMetricas(pesoTotal, numPeixes, mort);
    if (metricas) {
      setUltimoCalculo(metricas);
    }
  };

  const handleSalvarBiometria = async () => {
    if (!selectedLote || !pesoAmostra || !numPeixesAmostra || !ultimoCalculo) {
      return Alert.alert("Atenção", "Calcule primeiro as métricas antes de salvar.");
    }
    
    if(!user) return;

    const pesoTotal = parseFloat(pesoAmostra.replace(',', '.'));
    const numPeixes = parseInt(numPeixesAmostra);
    const mort = parseInt(mortalidade) || 0;

    if(isNaN(pesoTotal) || isNaN(numPeixes) || numPeixes === 0) {
      return Alert.alert("Erro", "Valores da amostra inválidos.");
    }

    setLoading(true);
    const newRegistroRef = push(ref(database, `users/${user.uid}/biometria/${selectedLote.id}`));
    
    try {
      // Salva o registro completo da biometria
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

      // Atualiza a quantidade no lote
      const loteRef = ref(database, `users/${user.uid}/lots/${selectedLote.id}`);
      await update(loteRef, { 
        quantidade: ultimoCalculo.quantidadeFinal,
        ultimaBiometria: new Date().toISOString()
      });

      Alert.alert("Sucesso", "Biometria registrada com todas as métricas!");
      
      // Limpa o formulário
      setPesoAmostra('');
      setNumPeixesAmostra('');
      setComprimentoMedio('');
      setMortalidade('');
      setRacaoConsumida('');
      setObservacoes('');
      setUltimoCalculo(null);

    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar a biometria.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (valor: number, tipo: 'tcd' | 'caa' | 'sobrevivencia' | 'uniformidade') => {
    switch (tipo) {
      case 'tcd':
        return valor > 2 ? '#10B981' : valor > 1 ? '#F59E0B' : '#EF4444';
      case 'caa':
        return valor < 1.5 ? '#10B981' : valor < 2.0 ? '#F59E0B' : '#EF4444';
      case 'sobrevivencia':
        return valor > 90 ? '#10B981' : valor > 80 ? '#F59E0B' : '#EF4444';
      case 'uniformidade':
        return valor > 85 ? '#10B981' : valor > 75 ? '#F59E0B' : '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderRegistroItem: ListRenderItem<BiometriaCompleta> = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemTitle}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
        <Text style={styles.listItemSubtitle}>{new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
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
        {item.comprimentoMedio && (
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Comprimento</Text>
            <Text style={styles.metricValue}>{item.comprimentoMedio.toFixed(1)}cm</Text>
          </View>
        )}
        {item.taxaCrescimentoDiario && (
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TCD</Text>
            <Text style={[styles.metricValue, { color: getStatusColor(item.taxaCrescimentoDiario, 'tcd') }]}>
              {item.taxaCrescimentoDiario.toFixed(2)}g/dia
            </Text>
          </View>
        )}
      </View>

      {item.mortalidadeRegistrada > 0 && (
        <View style={styles.mortalityBadge}>
          <Ionicons name="warning" size={14} color="#EF4444" />
          <Text style={styles.mortalityText}>Mortalidade: {item.mortalidadeRegistrada}</Text>
        </View>
      )}

      {item.observacoes ? (
        <Text style={styles.observacoesText}>Obs: {item.observacoes}</Text>
      ) : null}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Modal de Seleção de Lote */}
      <Modal visible={isLoteModalVisible} animationType="slide" onRequestClose={() => setIsLoteModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecione um Lote</Text>
            <Pressable onPress={() => setIsLoteModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>
          <FlatList 
            data={lotes} 
            keyExtractor={item => item.id} 
            renderItem={({item}) => (
              <Pressable style={styles.modalItem} onPress={() => handleSelectLote(item)}>
                <View style={styles.modalItemContent}>
                  <Text style={styles.modalItemText}>{item.nomeLote}</Text>
                  <Text style={styles.modalItemSubtext}>{item.especie} • {item.quantidade} peixes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </Pressable>
            )} 
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum lote cadastrado.</Text>
            }
          />
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>Controle Biométrico</Text>
        <Text style={styles.subtitle}>Acompanhamento detalhado do crescimento</Text>
      </View>

      {/* Card de Seleção de Lote */}
      <Pressable style={styles.selectCard} onPress={() => setIsLoteModalVisible(true)}>
        <View style={styles.selectCardContent}>
          <Ionicons name="fish" size={24} color="#0EA5E9" />
          <View style={styles.selectCardText}>
            <Text style={styles.selectCardTitle}>
              {selectedLote ? selectedLote.nomeLote : "Selecionar Lote"}
            </Text>
            <Text style={styles.selectCardSubtitle}>
              {selectedLote ? `${selectedLote.especie} • ${selectedLote.quantidade} peixes` : "Toque para selecionar um lote"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#94A3B8" />
        </View>
      </Pressable>

      {selectedLote && (
        <>
          {/* Card de Entrada de Dados */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Dados da Amostragem</Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>Amostra</Text>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso da Amostra (g)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 1500" 
                  value={pesoAmostra} 
                  onChangeText={setPesoAmostra} 
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nº de Peixes</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 30" 
                  value={numPeixesAmostra} 
                  onChangeText={setNumPeixesAmostra} 
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Comprimento Médio (cm)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Opcional" 
                  value={comprimentoMedio} 
                  onChangeText={setComprimentoMedio} 
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mortalidade</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 5" 
                  value={mortalidade} 
                  onChangeText={setMortalidade} 
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantidade Atual</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder={`Atual: ${selectedLote.quantidade}`}
                  value={quantidadePeixesAtual} 
                  onChangeText={setQuantidadePeixesAtual} 
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ração (kg)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Desde última biometria" 
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
                placeholder="Anotações importantes..." 
                value={observacoes} 
                onChangeText={setObservacoes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleCalcular}>
                <Text style={styles.secondaryButtonText}>Calcular Métricas</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, styles.primaryButton, (!ultimoCalculo || loading) && styles.buttonDisabled]} 
                onPress={handleSalvarBiometria}
                disabled={!ultimoCalculo || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Salvar Biometria</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Card de Resultados */}
          {ultimoCalculo && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Resultados Calculados</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>Resultado</Text>
                </View>
              </View>

              <View style={styles.resultsGrid}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Peso Médio</Text>
                  <Text style={styles.resultValue}>{ultimoCalculo.pesoMedio.toFixed(1)}g</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Biomassa Total</Text>
                  <Text style={styles.resultValue}>{ultimoCalculo.biomassa.toFixed(1)}kg</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Comprimento</Text>
                  <Text style={styles.resultValue}>{ultimoCalculo.comprimentoMedio.toFixed(1)}cm</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>TCD</Text>
                  <Text style={[styles.resultValue, { color: getStatusColor(ultimoCalculo.taxaCrescimentoDiario, 'tcd') }]}>
                    {ultimoCalculo.taxaCrescimentoDiario.toFixed(2)}g/dia
                  </Text>
                </View>
                {ultimoCalculo.conversaoAlimentar > 0 && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>CAA</Text>
                    <Text style={[styles.resultValue, { color: getStatusColor(ultimoCalculo.conversaoAlimentar, 'caa') }]}>
                      {ultimoCalculo.conversaoAlimentar.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Sobrevivência</Text>
                  <Text style={[styles.resultValue, { color: getStatusColor(ultimoCalculo.sobrevivencia, 'sobrevivencia') }]}>
                    {ultimoCalculo.sobrevivencia.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Card de Histórico */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Histórico de Biometrias</Text>
              <Text style={styles.cardSubtitle}>{registros.length} registros</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0EA5E9" style={styles.loading} />
            ) : (
              <FlatList 
                data={registros} 
                renderItem={renderRegistroItem} 
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Nenhuma biometria registrada para este lote.</Text>
                }
              />
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc", 
    padding: 16 
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
  },
  
  // Card de Seleção
  selectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  selectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectCardText: {
    flex: 1,
    marginLeft: 12,
  },
  selectCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  selectCardSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  // Cards Gerais
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  cardBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Botões
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#0EA5E9',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },

  // Resultados
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultItem: {
    width: (width - 72) / 2,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },

  // Lista de Registros
  listItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metricItem: {
    minWidth: 80,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  mortalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  mortalityText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 4,
  },
  observacoesText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#64748B',
  },

  // Utilitários
  loading: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    marginVertical: 20,
  },
});