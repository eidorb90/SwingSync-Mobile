import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Dispatch, SetStateAction, useState } from 'react';
import { Keyboard, ScrollView, TouchableWithoutFeedback, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import styles from './RoundInputStyles.js';
import { HoleDetail, LocalHoleScore } from "./types/RoundInputTypes";


type RoundInputShowSummaryProps = {
    scores: any[];
    totalScore: number;
    currentHole: number;
    selectedCourse: any;
    selectedTee: string;
    selectedGender: string;
    notes: string;
    runningStats: any;
    weatherData: any;
    currentLocation: Location.LocationObject | null;
    distanceToHole: number | null;
    phoneHeading: number | null;
    isLocationEnabled: boolean;
    handleNext: () => void;
    handlePrev: () => void;
    handleScoreChange: (field: keyof LocalHoleScore, value: string | boolean) => any;
    handleSave: () => void;
    handleSummaryFinish: () => void;
    saveDraft: () => void;
    isSaving: boolean;
    holeCountSelection: number;
    setMapModalVisible: Dispatch<SetStateAction<boolean>>;
    setSelectedHole: Dispatch<SetStateAction<HoleDetail | null>>;
    setShowWeatherImpact: Dispatch<SetStateAction<boolean>>;
    showWeatherImpact: boolean;
    setNotes: (notes: string) => void;
    onEditRound: () => void;

}
export default function RoundInputShowSummary(props: RoundInputShowSummaryProps) {
    const { scores, selectedCourse, selectedTee, selectedGender, notes, setNotes, handleSave, handleSummaryFinish, isSaving, onEditRound } = props;
    
    // Calculate totals with proper type handling
    const totalScore = scores.reduce((sum, s) => {
        const putts = s.putts && s.putts !== "" ? parseInt(s.putts) : 0;
        const penalties = s.penalties && s.penalties !== "" ? parseInt(s.penalties) : 0;
        const chips = s.chips && s.chips !== "" ? parseInt(s.chips) : 0;
        const approach = s.approach && s.approach !== "" ? parseInt(s.approach) : 0;
        const strokes = s.strokes && s.strokes !== "" 
            ? parseInt(s.strokes) 
            : 1 + putts + penalties + chips + approach;
        return sum + strokes;
    }, 0);
    
    const totalPutts = scores.reduce((sum, s) => {
        const putts = s.putts && s.putts !== "" ? parseInt(s.putts) : 0;
        return sum + putts;
    }, 0);
    
    const fairwaysHit = scores.filter(s => s.fairway).length;
    const girs = scores.filter(s => s.gir).length;
    const totalPenalties = scores.reduce((sum, s) => {
        const penalties = s.penalties && s.penalties !== "" ? parseInt(s.penalties) : 0;
        return sum + penalties;
    }, 0);
    

    const [showSummary, setShowSummary] = useState(true);
    const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.summaryContainer}
          contentContainerStyle={styles.summaryScrollContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons name="golf" size={32} color="#00BFFF" />
              <Text style={styles.summaryTitle}>Round Complete!</Text>
              <Text style={styles.summarySubtitle}>{new Date().toLocaleDateString()}</Text>
            </View>
            
            <Divider style={styles.summaryDivider} />
            
            <Card.Content style={styles.summaryContent}>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryMainStats}>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeLabel}>Final Score</Text>
                    <Text style={styles.scoreBadgeValue}>{totalScore}</Text>
                    <Text style={styles.scoreBadgeSubtext}>
                      {totalScore - scores.reduce((sum, s) => sum + s.par, 0) === 0 ? 'Even Par' :
                       totalScore - scores.reduce((sum, s) => sum + s.par, 0) > 0 ? 
                       `+${totalScore - scores.reduce((sum, s) => sum + s.par, 0)}` :
                       `${totalScore - scores.reduce((sum, s) => sum + s.par, 0)}`}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryStatsGrid}>
                  <View style={styles.statBox}>
                    <MaterialCommunityIcons name="golf-tee" size={20} color="#4CAF50" />
                    <Text style={styles.statValue}>{totalPutts}</Text>
                    <Text style={styles.statLabel}>Putts</Text>
                  </View>
                  
                  <View style={styles.statBox}>
                    <MaterialCommunityIcons name="flag" size={20} color="#FF9800" />
                    <Text style={styles.statValue}>{fairwaysHit}</Text>
                    <Text style={styles.statLabel}>Fairways</Text>
                  </View>
                  
                  <View style={styles.statBox}>
                    <MaterialCommunityIcons name="target" size={20} color="#00BFFF" />
                    <Text style={styles.statValue}>{girs}</Text>
                    <Text style={styles.statLabel}>GIRs</Text>
                  </View>
                  
                  <View style={styles.statBox}>
                    <MaterialCommunityIcons name="alert" size={20} color="#F44336" />
                    <Text style={styles.statValue}>{totalPenalties}</Text>
                    <Text style={styles.statLabel}>Penalties</Text>
                  </View>
                </View>
              </View>

              <View style={styles.courseInfoCard}>
                <Text style={styles.courseInfoTitle}>{selectedCourse?.course_name}</Text>
                <Text style={styles.courseInfoDetails}>{selectedTee} Tees • {selectedGender}</Text>
              </View>

              <TextInput
                label="Round Notes"
                mode="outlined"
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
                outlineColor="rgba(255,255,255,0.3)"
                activeOutlineColor="#00BFFF"
                textColor="#FFFFFF"
                placeholderTextColor="rgba(255,255,255,0.5)"
                theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
                multiline
                numberOfLines={3}
                placeholder="Weather, course conditions, memorable shots..."
              />
            </Card.Content>
            
            <Card.Actions>
              <Button
                mode="outlined"
                style={styles.summaryButton}
                onPress={onEditRound}     
                textColor="#00BFFF"
                icon="pencil"
              >
                Edit Round
              </Button>
              <Button 
                mode="contained" 
                style={[styles.summaryButton, styles.saveButton]}
                onPress={handleSummaryFinish}
                loading={isSaving}
                disabled={isSaving}
                icon="check-circle"
              >
                Save Round
              </Button>
            </Card.Actions>
          </Card>
          
          {alert.open && (
            <View style={styles.snackbar}>
              <Text style={{ color: alert.severity === "error" ? "#ff6b6b" : "#51cf66" }}>{alert.message}</Text>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

    )
}
     
