import React from 'react';
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";


const screenWidth = Dimensions.get("window").width;

export default function HandicapChart() {
    const sampleHandicapData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May"],
        datasets: [{
            data: [15.2, 14.8, 13.9, 12.5, 11.8],
            color: (opacity = 1) => `rgba(0, 191, 255, ${opacity})`, 
            strokeWidth: 2
        }]
    }

    const chartConfig = {
        backgroundColor: 'transparent',
        backgroundGradientFrom: 'rgba(0, 0, 38, 0.8)',
        backgroundGradientTo: 'rgba(0, 0, 128, 0.8)',
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, 
        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        style: {
            borderRadius: 8
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#00BFFF' 
        }
    };

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Handicap Index Progress</Text>
            <LineChart
                data={sampleHandicapData}
                width={screenWidth - 40} 
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chartStyle}
                formatYLabel={(value) => `${parseFloat(value).toFixed(1)}`}
            />
        </View>
    )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 5,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#fff', 
  },
  chartContainer: {
    marginVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 38, 0.5)', 
    alignItems: 'center',
    padding: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
    marginBottom: 5,
  },
  chartStyle: {
    marginVertical: 2,
    borderRadius: 8,
  },
  infoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.12)', 
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff', 
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#fff',
    marginTop: 20,
    marginBottom: 20,
  }
});
