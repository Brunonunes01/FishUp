/**
 * constants/Colors.ts
 */

const tintColorLight = '#0EA5E9';
const tintColorDark = '#0EA5E9';

export const Colors = {
  light: {
    text: '#0F172A',        // Texto principal escuro
    textSecondary: '#64748B', // Texto secundário cinza
    background: '#F1F5F9',    // Fundo da tela (cinza bem claro)
    backgroundContainer: '#FFFFFF', // Fundo de containers/headers
    card: '#FFFFFF',          // Fundo dos cards
    border: '#E2E8F0',        // Bordas sutis
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorLight,
    
    // Cores Semânticas
    primary: '#0EA5E9',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    
    // Elementos Específicos
    inputBackground: '#F8FAFC',
    placeholder: '#94A3B8',
    shadow: '#000000', // Cor da sombra
  },
  dark: {
    text: '#FFFFFF',        // Texto principal claro
    textSecondary: '#94A3B8', // Texto secundário
    background: '#0A0F1E',    // Fundo da tela (Azul quase preto)
    backgroundContainer: '#0F172A', // Header e Containers
    card: '#1E293B',          // Fundo dos cards (Slate 800)
    border: 'rgba(255, 255, 255, 0.08)', // Bordas sutis
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorDark,
    
    // Cores Semânticas
    primary: '#0EA5E9',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    
    // Elementos Específicos
    inputBackground: 'rgba(255, 255, 255, 0.05)',
    placeholder: '#64748B',
    shadow: '#000000',
  },
};