import { View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useState, useEffect } from 'react';
import styles from './RoundInputStyles'
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { Course, Tee, UserDetailSettings } from './types/RoundInputTypes'
import {Picker} from '@react-native-picker/picker';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function RoundInput() {
  // State for search and API data
  const [courseSearch, setCourseSearch] = useState<string | null>(null);
  const [apiReturnedCourses, setApiReturnedCourses] = useState<Course[]>([]);
  
  // State for user selections
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedTeeId, setSelectedTeeId] = useState<string | null>(null);

  // State for dependent data
  const [availableTees, setAvailableTees] = useState<Tee[]>([]);
  const [holeIds, setHoleIds] = useState<number[] | null>(null);

  // User and session state
  const [logedInUserID, setLogedInUserID] = useState<number | null>(null);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserDetailSettings | null>(null);
  
  // UI State
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isOtherTeam, setIsOtherTeam] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Picker options
  const [selectedRoundFormat, setSelectedRoundFormat] = useState<'scramble' | "best-ball" | 'alternate-shot' | 'solo' | null>(null);
  const [strokeMatchplay, setstrokeMatchplay] = useState<'stroke-play' | 'match-play' | null>(null);
  const [isDetailedRound, setIsDetailedRound] = useState<boolean>(false);

  // Initial data fetch for user
  useEffect(() => {
    fetchAndSetUserID();
  }, [])

  // Fetch user data when user ID is available
  useEffect(() => {
    if (logedInUserID && savedToken) {
      fetchUserData();
    } else {
      setError("No User Id or Token")
    }
  }, [logedInUserID, savedToken])

  // Debounce the course search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (courseSearch) {
        searchCourse(courseSearch);
      }
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [courseSearch])

  // Update available tees when the selected course changes
  useEffect(() => {
    if (selectedCourseId && apiReturnedCourses.length > 0) {
      const course = apiReturnedCourses.find(c => c.id.toString() === selectedCourseId);
      if (course) {
        setAvailableTees(course.tees);
        // Reset selected tee when course changes
        setSelectedTeeId(null); 
      }
    } else {
      setAvailableTees([]);
    }
  }, [selectedCourseId, apiReturnedCourses]);

  // Update hole IDs when a tee is selected
  useEffect(() => {
    if(selectedTeeId) {
        getSelectedCourseHoleIDs();
    }
  }, [selectedTeeId]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/${logedInUserID}/settings/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        }
      })
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error: any) {
      setError(error.toString())
    }
  }

  const fetchAndSetUserID = async () => {
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      const decodedToken: any = jwtDecode(token);
      setSavedToken(token);
      setLogedInUserID(decodedToken.user_id);
    } else {
      setLogedInUserID(null);
    }
  }

  const searchCourse = async (query: string) => {
    if (!query) {
      setApiReturnedCourses([]);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/course/search/?search=${query}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${savedToken}`,
          "Content-Type": "application/json"
        },
      })

      if (response.ok) {
        const data: Course[] = await response.json();
        setApiReturnedCourses(data);
        if (data.length > 0) {
            setSelectedCourseId(data[0].id.toString()); 
        } else {
            setSelectedCourseId(null);
        }
      } else {
        setError(`Failed to fetch courses: ${response.status}`);
        setApiReturnedCourses([]);
      }
    } catch (error: any) {
      setError(error.toString());
      console.error("Error in searchCourse:", error);
      setApiReturnedCourses([]);
    }
  }

  const getSelectedCourseHoleIDs = () => {
    if (!selectedCourseId || !selectedTeeId || !availableTees) {
      setHoleIds(null);
      return;
    }

    const currentTee = availableTees.find((tee: Tee) => tee.id.toString() === selectedTeeId);

    if (currentTee && currentTee.holes) {
      const ids = currentTee.holes.map((hole: any) => hole.id);
      setHoleIds(ids);
    } else {
      setHoleIds(null);
    }
  }

  return (
    <>
      {!isStarted && (
        <View style={styles.setupContainer}>
          <View style={styles.setupContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Course Selection</Text>
              <Text style={styles.welcomeSubtitle}>{userData?.username || 'User'}</Text>
            </View>
            <View style={styles.setupCard}>
              <View style={styles.setupCardContent}>
                <TextInput
                  label="Course Search"
                  mode="outlined"
                  onChangeText={setCourseSearch}
                  style={styles.inputField}
                />

                <Picker
                  selectedValue={selectedCourseId}
                  onValueChange={(itemValue) => {
                    setSelectedCourseId(itemValue);
                  }}
                  style={{ backgroundColor: 'white', marginTop: 10 }} 
                >
                  <Picker.Item label="Select a course..." value={null} />
                  {apiReturnedCourses.map((course) => (
                    <Picker.Item key={course.id} label={`${course.club_name} - ${course.course_name}`} value={course.id.toString()} />
                  ))}
                </Picker>
                
                <Picker
                  selectedValue={selectedTeeId}
                  onValueChange={(itemValue, itemIndex) => {
                    setSelectedTeeId(itemValue)
                  }}
                  enabled={availableTees.length > 0}
                  style={{ backgroundColor: 'white', marginTop: 10 }} 
                >
                  <Picker.Item label="Select a tee..." value={null} />
                  {availableTees.map((tee) => (
                    <Picker.Item key={tee.id} label={`${tee.tee_name} - ${tee.total_yards} yds`} value={tee.id.toString()} />
                  ))}
                </Picker>

              </View>
            </View>
          </View>
        </View>
      )}
      
      {/* --- Other UI sections (isStarted, isFinished) --- */}
{isStarted && (
       <View style={styles.playingContainer}>

          <View style={styles.playingContent}>

            {isDetailedRound && (

              <View style={styles.holeCard}>

                <View style={styles.holeContent}>

                  <Text style={styles.sectionTitle}>Detailed Round Input</Text>

                  {/* Here we can add more detailed inputs for the round */}

                </View>

              </View>

            )}

            {!isDetailedRound && (

              <View style={styles.holeCard}>

                <View style={styles.holeContent}>

                  <Text style={styles.sectionTitle}>Basic Round Input</Text>

                </View>

              </View>

            )}

          </View>

        </View>

      )}
      {isFinished && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryScrollContent}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Basic Always on Round Summary</Text>
                {/* Here we will display the basic round summary */}
                {selectedRoundFormat === 'solo' && (
                  <View style={styles.statBox}>
                    {isOtherTeam && (
                      <View>
                        {strokeMatchplay === 'match-play' && (
                          <Text style={styles.statValue}>How you did against your opponent in match-play</Text>
                        )}
                        {strokeMatchplay === 'stroke-play' && (
                          <Text style={styles.statValue}>How you did against your opponent in stroke-play</Text>
                        )}
                      </View>
                    )}
                    {isDetailedRound && (
                      <View>
                        {/* Here we will display the detailed round summary */}
                        <Text style={styles.statValue}>Detailed Round Summary</Text>
                      </View>
                    )}
                  </View>
                )}
                {selectedRoundFormat === 'scramble' && (
                  <View style={styles.statBox}>
                    {isOtherTeam && (  
                      <View>
                        {strokeMatchplay === 'match-play' && (
                          <Text style={styles.statValue}>Detailed Match-Play Scramble</Text>
                        )}
                        {strokeMatchplay === 'stroke-play' && (
                          <Text style={styles.statValue}>Detailed Stroke-Play Scramble</Text>
                        )}
                      </View>
                    )}
                    {!isOtherTeam && (
                      <Text style={styles.statValue}>You and your buddy on Scramble</Text>
                    )}
                  </View>
                )}
                {selectedRoundFormat === 'alternate-shot' && (
                  <View style={styles.statBox}>
                    {isOtherTeam && (  
                      <View>
                        {strokeMatchplay === 'match-play' && (
                          <Text style={styles.statValue}>Detailed Match-Play Alternate Shot</Text>
                        )}
                        {strokeMatchplay === 'stroke-play' && (
                          <Text style={styles.statValue}>Detailed Stroke-Play Alternate Shot</Text>
                        )}
                      </View>
                    )}
                    {!isOtherTeam && (
                      <Text style={styles.statValue}>You and your buddy on Alternate Shot</Text>
                    )}
                  </View>
                )}
                {selectedRoundFormat === 'best-ball' && (
                  <View style={styles.statBox}>
                    {isOtherTeam && (  
                      <View>
                        {strokeMatchplay === 'match-play' && (
                          <Text style={styles.statValue}>Detailed Match-Play Best Ball</Text>
                        )}
                        {strokeMatchplay === 'stroke-play' && (
                          <Text style={styles.statValue}>Detailed Stroke-Play Best Ball</Text>
                        )}
                      </View>
                    )}
                    {!isOtherTeam && (
                      <Text style={styles.statValue}>You and your buddy on Best Ball</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  )
}