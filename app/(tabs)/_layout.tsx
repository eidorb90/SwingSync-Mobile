import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: "blue", 
        tabBarInactiveTintColor: "gray", 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0)', // semi-transparent for glassy look
          position: 'absolute',
          elevation: 0,
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <BlurView tint="light" intensity={5} style={{ flex: 1 }} />
        ),
      }}
    >
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
      name="Community" 
      options={{
        title: "Community",
        tabBarIcon: ({ color, focused }) => (
          focused ? (
            <Ionicons name="people" size={24} color={ color } />
          ) : (
            <Ionicons name="people-outline" size={24} color={ color } />
          )
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
      name="Training" 
      options={{
        title: "Training",
        tabBarIcon: ({ color, focused }) => (
          focused ? (
            <MaterialCommunityIcons name="run-fast" size={24} color={color} />
          ) : (
            <MaterialCommunityIcons name="run" size={24} color={color} />
          )
        )
      }}
    />

    <Tabs.Screen 
      name="Profile" 
      options={{
        title: "Profile",
        tabBarIcon: ({ color, focused }) => (
          focused ? (
            <Ionicons name="person" size={24} color={ color } />
          ) : (
            <Ionicons name="person-outline" size={24} color={ color } />
          )
        )
      }}
    />

  </Tabs>
  )
}
