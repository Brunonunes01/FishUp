import { NavigationContainer } from "@react-navigation/native";
import RootStack from "../app/(tabs)/index";
import { CarrinhoProvider } from "../src/context/CarrinhoContext"; // Importa o Provider
 
export default function App() {
  return (
    <NavigationContainer>
      {/* O CarrinhoProvider deve envolver o RootStack */}
      <CarrinhoProvider> 
        <RootStack />
      </CarrinhoProvider>
    </NavigationContainer>
  );
}