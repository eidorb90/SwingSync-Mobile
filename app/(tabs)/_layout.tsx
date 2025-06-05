import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import { HeaderShownContext } from '@react-navigation/elements';
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
  <Tabs screenOptions={{ tabBarActiveTintColor: "blue", tabBarInactiveTintColor: "gray", headerShown: false}}>
    
    <Tabs.Screen name="Home" options={{title: "Home", tabBarIcon: ({ color }) => (
      <AntDesign name="home" size={24} color={ color } />
    )}}/>

    <Tabs.Screen 
      name="WoodyChat" 
      options={{
        title: "Woody", 
        tabBarIcon: ({ color, focused }) =>
          focused ? (
            <AntDesign name="aliwangwang" size={24} color={ color } />
          ) : (
            <AntDesign name="aliwangwang-o1" size={24} color={ color } />
          )
      }}
    />

    <Tabs.Screen 
      name="Rounds" 
      options={{
        title: "Rounds",
        tabBarIcon: ({ color, focused }) => (
          focused ? (
            <Ionicons name="golf" size={24} color={ color } />
          ) : (
            <Ionicons name="golf-outline" size={24} color={ color } />
          )
        )
      }}
    />

    <Tabs.Screen 
      name="Settings" 
      options={{
        title: "Settings",
        tabBarIcon: ({ color, focused }) => (
          focused ? (
            <Ionicons name="settings" size={24} color={ color } />
          ) : (
            <Ionicons name="settings-outline" size={24} color={ color } />
          )
        )
      }}
    />

  </Tabs>
  )
}
