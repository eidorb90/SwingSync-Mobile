import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  LineChart
} from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface GolfScoreChartProps {
  userData: {
    avg_penalities_per_round: number;
    avg_putts_per_round: number;
    avg_score_per_round: number;
    fairway_hit_percentage: number;
    gir_percentage: number;
    handicap: null | number;
    is_tournament_user: boolean;
    scores_list: Array<{
      course: string;
      date: string;
      note: string;
      round_id: number;
      scores: number[] | any[]; 
    }>;
    username: string;
  };
}


const calculateTotalScore = (scores: any[]): number => {
  if (!scores || !Array.isArray(scores)) return 0;
  
  return scores.reduce((sum, score) => {
    if (typeof score === 'object' && score !== null && 'strokes' in score) {
      const strokes = Number(score.strokes);
      return sum + (isNaN(strokes) ? 0 : strokes);
    } else if (typeof score === 'number' && !isNaN(score)) {
      return sum + score;
    } else if (typeof score === 'string') {
      const parsed = parseFloat(score);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }
    return sum; 
  }, 0);
};

const GolfScoreChart: React.FC<GolfScoreChartProps> = ({ userData }) => {
  if (!userData?.scores_list?.length) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Golf Performance</Text>
        <Text style={styles.noDataText}>No round data available to display chart.</Text>
      </ScrollView>
    );
  }
  
  const validScores = userData.scores_list.filter(round => 
    round.scores && Array.isArray(round.scores)
  );
  
  if (validScores.length === 0) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Golf Performance for {userData.username}</Text>
        <Text style={styles.noDataText}>No valid round scores available to display chart.</Text>

      </ScrollView>
    );
  }
  
  const sortedScores = [...validScores].sort(
    (a, b) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (e) {
        return 0; 
      }
    }
  );

  const chartLabels = sortedScores.map(round => {
    try {
      const date = new Date(round.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch (e) {
      return "N/A";
    }
  });
  
  const totalScores = sortedScores.map(round => {
    const total = calculateTotalScore(round.scores);
    return total;
  });

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: totalScores.length ? totalScores : [0],
        color: (opacity = 1) => `rgba(0, 191, 255, ${opacity})`, 
        strokeWidth: 2
      }
    ]
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'rgba(0, 0, 38, 0.8)',
    backgroundGradientTo: 'rgba(0, 0, 128, 0.8)',
    decimalPlaces: 0,
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
      <Text style={styles.chartTitle}>Total Score Per Round</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 40} 
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chartStyle}
        formatYLabel={(value) => `${value}`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 5,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
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
    fontSize: 14,
    color: '#fff',
    marginTop: 10,
    marginBottom: 10,
  }
});

export default GolfScoreChart;