import { NavigationContainer } from "@react-navigation/native";
import RootStack from "../app/(tabs)/index";
 
export default function App() {
  return (
<NavigationContainer>
<RootStack />
</NavigationContainer>
  );
}