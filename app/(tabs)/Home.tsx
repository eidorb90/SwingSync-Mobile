import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";

export default function HomeScreen() {
    return (
        <View style={ styles.container }>
          <Text style={styles.title} variant="headlineMedium">
            Welome Back `Username` `Avatar`
          </Text>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center',
     alignItems: 'center'
  }, 
  title: {
      textAlign: "center",
      marginBottom: 24,
  },
})