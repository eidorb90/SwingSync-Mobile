import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { Button, Card, Dialog, Divider, Portal, RadioButton, Switch, Text, TextInput } from "react-native-paper";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

interface HoleDetail {
  id: number;
  hole_number: number;
  par: number;
  yardage: number;
  handicap: number;
}

interface TeeInfo {
  id: number;
  tee_name: string;
  course_rating?: number;
  slope_rating?: number;
  bogey_rating?: number;
  total_yards?: number;
  par_total?: number;
  holes: HoleDetail[];
}

interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface Course {
  id: number;
  club_name: string;
  course_name: string;
  location: string | Location;
  tees: {
    male: TeeInfo[];
    female: TeeInfo[];
  }
}

interface LocalHoleScore {
  hole_id: number;
  hole_number: number;
  par: number;
  yardage: number;
  strokes: string | null;
  putts: string | null;
  penalties: string | null;
  chips: string | null;
  approach: string | null;
  tee: string | null;
  fairway: boolean;
  gir: boolean;
}

interface Draft {
  draft_id: string;
  timestamp: string;
  selected_course: Course;
  selected_gender: string;
  selected_tee: string;
  scores: LocalHoleScore[];
  notes: string;
  current_hole_index: number;
  user: string;
}

export default function RoundInput() {
  const [token, setToken] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [courseQuery, setCourseQuery] = useState("");
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | "">("");
  const [selectedTee, setSelectedTee] = useState<string>("");

  const [started, setStarted] = useState(false);
  const [currentHole, setCurrentHole] = useState(0);
  const [scores, setScores] = useState<LocalHoleScore[]>([]);
  const [notes, setNotes] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({ open: false, message: "", severity: "info" });

  const [holeCountSelection, setHoleCountSelection] = useState<9|18>(18);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsDialogVisible, setDraftsDialogVisible] = useState(false);
  const [teeDialogVisible, setTeeDialogVisible] = useState(false);
  const [courseDialogVisible, setCourseDialogVisible] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string|null>(null);

  const [autoSaveTimeout, setAutoSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchTokenAndSetUserID();
  }, []);

  const fetchTokenAndSetUserID = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("authToken");
      if (storedToken) {
        setToken(storedToken);
        const decoded: any = jwtDecode(storedToken);
        setUserID(decoded.user_id);
        setUsername(decoded.username || "User");
      } else {
        router.replace("/auth");
      }
    } catch (e) {
      console.error("Failed to fetch token:", e);
      router.replace("/auth");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!courseQuery || courseQuery.length < 3) {
      setFilteredCourses([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const fetchCourses = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/course/search/?search=${encodeURIComponent(courseQuery)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data = await res.json();
        if (active) setFilteredCourses(data.courses || []);
      } catch (e) {
        console.error("Error fetching courses:", e);
        if (active) setFilteredCourses([]);
      } finally {
        if (active) setIsSearching(false);
      }
    };
    const handler = setTimeout(() => {
      fetchCourses();
    }, 300);
    
    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [courseQuery, token]);

  useEffect(() => {
    if (userID) {
      loadDrafts();
    }
  }, [userID]);

  const [skipLoadMostRecent, setSkipLoadMostRecent] = useState(false);

  useEffect(() => {
    if (skipLoadMostRecent) return;
    if (drafts.length > 0 && !currentDraftId && !started) {
      const mostRecent = drafts.reduce((a, b) =>
        new Date(a.timestamp) > new Date(b.timestamp) ? a : b
      );
      loadDraft(mostRecent);
    }
  }, [drafts, currentDraftId, started, skipLoadMostRecent]);

  const handleStart = () => {
    if (!selectedCourse || !selectedGender || !selectedTee) {
      showAlert("Please select course, gender, and tee.", "error");
      return;
    }
    
    const selectedTeeObj = selectedCourse?.tees?.[selectedGender]?.find(
      (t: TeeInfo) => t.tee_name === selectedTee
    );
    
    if (!selectedTeeObj || !selectedTeeObj.holes || selectedTeeObj.holes.length === 0) {
      showAlert("Selected tee has no hole data. Please choose another tee or course.", "error");
      return;
    }
    
    const holeDataForRound = selectedTeeObj.holes
      .sort((a, b) => a.hole_number - b.hole_number) 
      .slice(0, holeCountSelection);
    
    if (holeDataForRound.length === 0) {
      showAlert("No hole data available for the selected tee and hole count.", "error");
      return;
    }
    
    setScores(holeDataForRound.map((hole: HoleDetail) => ({
      hole_id: hole.id,
      hole_number: hole.hole_number,
      par: hole.par,
      yardage: hole.yardage,
      strokes: null,
      putts: null,
      penalties: null,
      chips: null,
      approach: null,
      tee: null,
      fairway: false,
      gir: false,
    })));
    
    setCurrentHole(0);
    setStarted(true);
    setShowSummary(false);
    showAlert("Round started!", "success");
  };

  const autoSaveDraft = async () => {
    if (!selectedCourse) return;

    const draftData = {
      draft_id: currentDraftId || `draft-${Date.now()}`,
      timestamp: new Date().toISOString(),
      selected_course: selectedCourse,
      selected_gender: selectedGender,
      selected_tee: selectedTee,
      scores: scores, 
      notes: notes,
      current_hole_index: currentHole,
      user: userID, 
    };
    try {
      let url = `${BACKEND_URL}/api/drafts/`;
      let method = "POST";

      if (currentDraftId) {
          url = `${BACKEND_URL}/api/drafts/${currentDraftId}/`;
          method = "PUT";
      }
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draftData),
      });
      
      if (!response.ok) {
        console.error(`Auto-save failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.error("Error details:", errorData);
        } catch (e) {
          console.error("Could not parse error response for auto-save");
        }
      } else {
        const data = await response.json();
        if (!currentDraftId) {
          setCurrentDraftId(data.draft_id);
          console.log("Draft saved with ID:", data.draft_id);
        }
      }
    } catch (error) {
      console.error("Auto-save draft failed:", error);
    }
  };

  const handleNext = async () => {
    if (currentHole < scores.length - 1) {
      await autoSaveDraft();
      setCurrentHole(h => Math.min(h + 1, scores.length - 1));
    }
  };

  const handlePrev = async () => {
    if (currentHole > 0) {
      await autoSaveDraft();
      setCurrentHole(h => Math.max(h - 1, 0));
    }
  };

  const handleScoreChange = (field: keyof LocalHoleScore, value: string | boolean) => {
    setScores(prev => {
      const updated = [...prev];
      updated[currentHole] = { ...updated[currentHole], [field]: value };
      
      if (field !== 'strokes') {
        const hole = updated[currentHole];
        const putts = hole.putts && hole.putts !== "" ? parseInt(hole.putts) : 0;
        const penalties = hole.penalties && hole.penalties !== "" ? parseInt(hole.penalties) : 0;
        const chips = hole.chips && hole.chips !== "" ? parseInt(hole.chips) : 0;
        const approach = hole.approach && hole.approach !== "" ? parseInt(hole.approach) : 0;
        const teeShots = 1; 
        
        const totalStrokes = teeShots + putts + penalties + chips + approach;
        updated[currentHole].strokes = totalStrokes > 0 ? totalStrokes.toString() : null;
      }
      
      return updated;
    });
    
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      autoSaveDraft();
    }, 1500);
    setAutoSaveTimeout(timeout);
  };

  const saveDraft = async () => {
    if (!selectedCourse) {
      setAlert({
        open: true,
        message: "Please select a course first",
        severity: "error" 
      });
      return;
    }
    
    setIsSaving(true);
    
    const draftData = {
      draft_id: currentDraftId || `draft-${Date.now()}`,
      timestamp: new Date().toISOString(),
      selected_course: selectedCourse,
      selected_gender: selectedGender,
      selected_tee: selectedTee,
      holes: scores.map(s => ({ ...s })),
      scores: scores,
      notes: notes,
      current_hole_index: currentHole,
      user: userID,
    };

    try {
      let url = `${BACKEND_URL}/api/drafts/`;
      let method = currentDraftId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draftData),
      });

      let responseData;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error("Failed to parse response for saveDraft:", e);
        responseData = {};
      }
      
      if (!response.ok) {
        console.error("Draft save failed:", response.status, responseData);
        throw new Error(responseData.error || responseData.detail || "Failed to save draft");
      }
      
      showAlert("Draft saved successfully!", "success");
      
      if (!currentDraftId && responseData.draft_id) {
        setCurrentDraftId(responseData.draft_id);
      }
      
      await loadDrafts();
      
    } catch (error: any) {
      setAlert({
        open: true,
        message: `Failed to save draft: ${error.message}`,
        severity: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const showAlert = (message: string, severity: "success" | "error" | "info") => {
    setAlert({
      open: true,
      message,
      severity
    });
    
    setTimeout(() => {
      setAlert(prev => ({ ...prev, open: false }));
    }, 3000);
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/drafts/${draftId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to delete draft:", response.status, errorText);
        throw new Error("Failed to delete draft");
      }
      
      showAlert("Draft deleted successfully!", "success");
      
      if (currentDraftId === draftId) {
        clearDraftState();     
      }
      await loadDrafts();
    } catch (error: any) {
      showAlert(`Failed to delete draft: ${error.message || error}`, "error");
    }
  };

  const clearDraftState = () => {
    setCurrentDraftId(null);
    setStarted(false);
    setCurrentHole(0);
    setScores([]);
    setSelectedCourse(null);
    setCourseQuery("");
    setSelectedGender("");
    setSelectedTee("");
    setNotes("");
    setShowSummary(false);
    setFilteredCourses([]);   
  };

  const loadDrafts = async () => {
    if (!token || !userID) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/drafts/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch drafts:", response.status, errorText);
        throw new Error("Failed to fetch drafts");
      }
      
      const data = await response.json();
      setDrafts(data);
    } catch (error: any) {
      if (error.message && error.message.includes("Failed to fetch drafts")) {
        showAlert("Failed to load drafts. Please try again.", "error");
      } else {
        showAlert("No drafts found", "info");
      }
      setDrafts([]);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleSave = () => {
    setShowSummary(true);
  };

  const handleSummaryFinish = async () => {
    setIsSaving(true);
    const success = await handleBackendSave();
    setIsSaving(false);
    if (success) {
      router.push('/ViewRounds');
    }
  };

  const handleBackendSave = async () => {
    if (!selectedCourse || !selectedTee || !scores.length) {
      showAlert("Please complete all fields.", "error");
      return false;
    }
    
    const hasScores = scores.some(s => s.strokes && parseInt(s.strokes) > 0);
    if (!hasScores) {
      showAlert("Please enter scores for at least one hole.", "error");
      return false;
    }
    
    setIsSaving(true);
    console.log("Starting save of round to backend...");
    
    try {
      const payload = {
        course_id: selectedCourse.id,
        tee_name: selectedTee,
        gender: selectedGender,
        notes,
        hole_scores: scores.map((s, i) => {
          const putts     = s.putts     ? parseInt(s.putts)     : 0;
          const penalties = s.penalties ? parseInt(s.penalties) : 0;
          const chips     = s.chips     ? parseInt(s.chips)     : 0;
          const approach  = s.approach  ? parseInt(s.approach)  : 0;
          const strokes   = s.strokes 
            ? parseInt(s.strokes) 
            : 1 + putts + penalties + chips + approach;
          return {
            hole_id:            i + 1,     
            par:                s.par,        
            yardage:            s.yardage,    
            strokes,
            putts,
            penalties,
            chip_shots:         chips,
            approach_shots:     approach,
            tee_shot:           1,
            fairway_hit:        !!s.fairway,
            green_in_regulation: !!s.gir,
          };
        }),
      };
      
      console.log("Saving round with payload:", JSON.stringify(payload, null, 2));
      
      const roundEndpoint = `${BACKEND_URL}/api/rounds/`;
      const res = await fetch(roundEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      console.log("Round save response status:", res.status);
      
      let responseData;
      try {
        const responseText = await res.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error("Failed to parse response:", e);
        responseData = {};
      }
      
      if (!res.ok) {
        throw new Error(responseData.detail || responseData.message || `Server returned ${res.status}`);
      }
      
      if (currentDraftId) {
        try {
          const deleteRes = await fetch(`${BACKEND_URL}/api/drafts/${currentDraftId}/`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (deleteRes.ok) {
            console.log("Draft deleted after successful round save");
            setCurrentDraftId(null);
            setDrafts((prev: Draft[]) => prev.filter((d: Draft) => d.draft_id !== currentDraftId));
          } else {
            console.error("Failed to delete draft after saving round:", deleteRes.status);
          }
        } catch (e) {
          console.error("Failed to delete draft after saving round:", e);
        }
      }
      
      showAlert("Round saved successfully!", "success");
      handleFinish();
      return true;
    } catch (error: any) {
      console.error("Error saving round:", error);
      showAlert(error.message || "Error saving round", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFinish = () => {
    setStarted(false);
    setShowSummary(false);
    setSelectedCourse(null);
    setSelectedGender("");
    setSelectedTee("");
    setScores([]);
    setNotes("");
    setCourseQuery("");
    setCurrentDraftId(null);
    setFilteredCourses([]);
    showAlert("Round completed!", "success");
  };

  const loadDraft = (draft: Draft) => {
    if (!draft) return;
    
    const processedScores = draft.scores?.map(score => ({
      ...score,
      strokes: score.strokes !== null && score.strokes !== undefined ? String(score.strokes) : null,
      putts: score.putts !== null && score.putts !== undefined ? String(score.putts) : null,
      penalties: score.penalties !== null && score.penalties !== undefined ? String(score.penalties) : null,
      chips: score.chips !== null && score.chips !== undefined ? String(score.chips) : null,
      approach: score.approach !== null && score.approach !== undefined ? String(score.approach) : null,
      tee: score.tee !== null && score.tee !== undefined ? String(score.tee) : null
    })) || [];
    
    setSelectedCourse(draft.selected_course);
    setCourseQuery(draft.selected_course?.course_name || "");
    setSelectedGender(draft.selected_gender as "" | "male" | "female");
    setSelectedTee(draft.selected_tee);
    setScores(processedScores);
    setNotes(draft.notes || "");
    setCurrentHole(draft.current_hole_index || 0);
    setCurrentDraftId(draft.draft_id);
    
    setDraftsDialogVisible(false);
    setStarted(true);
    
    showAlert("Draft loaded successfully!", "success");
  };

  const totalScore = scores.reduce((sum, s) => {
    const putts    = s.putts    && s.putts    !== "" ? parseInt(s.putts)    : 0;
    const penalties= s.penalties&& s.penalties!== "" ? parseInt(s.penalties): 0;
    const chips    = s.chips    && s.chips    !== "" ? parseInt(s.chips)    : 0;
    const approach = s.approach && s.approach !== "" ? parseInt(s.approach) : 0;
    const strokes  = s.strokes && s.strokes !== "" 
      ? parseInt(s.strokes) 
      : 1 + putts + penalties + chips + approach;
    return sum + strokes;
  }, 0);
  
  const totalPutts = scores.reduce((sum, s) => {
    const putts = s.putts && s.putts !== "" ? parseInt(s.putts) : 0;
    return sum + putts;
  }, 0);
  
  const totalPenalties = scores.reduce((sum, s) => {
    const penalties = s.penalties && s.penalties !== "" ? parseInt(s.penalties) : 0;
    return sum + penalties;
  }, 0);

  const totalChips = scores.reduce((sum, s) => {
    const chips = s.chips && s.chips !== "" ? parseInt(s.chips) : 0;
    return sum + chips;
  }, 0);


  const totalApproach = scores.reduce((sum, s) => {
    const approach = s.approach && s.approach !== "" ? parseInt(s.approach) : 0;
    return sum + approach;
  }, 0);

  const totalTee = scores.length; 
  
  const fairwaysHit = scores.filter(s => s.fairway).length;
  const girs = scores.filter(s => s.gir).length;

  if (showSummary) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.outerContainer}>
          <Card style={styles.card}>
            <Card.Title
              title="Round Summary"
              titleStyle={styles.summaryTitle}
              subtitle={new Date().toLocaleDateString()}
              subtitleStyle={styles.summarySubtitle}
            />
            <Divider style={styles.summaryDivider} />
            <Card.Content style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Course</Text>
                <Text style={styles.summaryValue}>{selectedCourse?.course_name || "Unknown"}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tee</Text>
                <Text style={styles.summaryValue}>{selectedTee}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gender</Text>
                <Text style={styles.summaryValue}>{selectedGender}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Score</Text>
                <Text style={styles.summaryValue}>{totalScore}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Putts</Text>
                <Text style={styles.summaryValue}>{totalPutts}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Penalties</Text>
                <Text style={styles.summaryValue}>{totalPenalties}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Chip Shots</Text>
                <Text style={styles.summaryValue}>{totalChips}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Approach Shots</Text>
                <Text style={styles.summaryValue}>{totalApproach}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tee Shots</Text>
                <Text style={styles.summaryValue}>{totalTee}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fairways Hit</Text>
                <Text style={styles.summaryValue}>{fairwaysHit}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GIRs</Text>
                <Text style={styles.summaryValue}>{girs}</Text>
              </View>

              <TextInput
                label="Round Notes"
                mode="outlined"
                value={notes}
                onChangeText={setNotes}
                style={styles.input}
                outlineColor="rgba(255,255,255,0.3)"
                activeOutlineColor="#00BFFF"
                textColor="#FFFFFF"
                placeholderTextColor="rgba(255,255,255,0.5)"
                theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
                multiline
                blurOnSubmit={true}
                placeholder="Weather, course conditions, memorable shots..."
              />
            </Card.Content>
            <Card.Actions style={{ justifyContent: "center", flexDirection: 'column', gap: 10 }}>
              <Button
                mode="outlined"
                style={styles.button}
                onPress={() => setShowSummary(false)}     
                textColor="#00BFFF"
              >
                Back to Edit
              </Button>
              <Button 
                mode="contained" 
                style={styles.button}
                onPress={handleSummaryFinish}
                loading={isSaving}
                disabled={isSaving}
              >
                Save & Finish Round
              </Button>
              <Button 
                mode="outlined" 
                style={styles.button}
                onPress={() => router.push('/ViewRounds')}
                textColor="#00BFFF"
              >
                View My Rounds
              </Button>
            </Card.Actions>
          </Card>
          {alert.open && (
            <View style={styles.snackbar}>
              <Text style={{ color: alert.severity === "error" ? "#ff6b6b" : "#51cf66" }}>{alert.message}</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  if (started) {
    const s = scores[currentHole] || {};
    const currentStrokes = (() => {
      const tee_shots = 1
      const putts = s.putts && s.putts !== "" ? parseInt(s.putts) : 0;
      const penalties = s.penalties && s.penalties !== "" ? parseInt(s.penalties) : 0;
      const chips = s.chips && s.chips !== "" ? parseInt(s.chips) : 0;
      const approach = s.approach && s.approach !== "" ? parseInt(s.approach) : 0;
      return tee_shots + putts + penalties + chips + approach;
    })();
    
    const scoreToPar = currentStrokes - (s.par || 0);
    const getScoreColors = () => {
      if (currentStrokes === 0) {
        return {
          backgroundColor: 'rgba(0, 191, 255, 0.12)',
          borderColor: 'rgba(0, 191, 255, 0.2)',
          textColor: '#fff',
          textShadow: 'rgba(0, 191, 255, 0.5)'
        };
      }
      
      if (scoreToPar < 0) {
        return {
          backgroundColor: 'rgba(76, 175, 80, 0.15)',
          borderColor: 'rgba(76, 175, 80, 0.3)',
          textColor: '#4CAF50',
          textShadow: 'rgba(76, 175, 80, 0.6)'
        };
      } else if (scoreToPar === 0) {
        return {
          backgroundColor: 'rgba(0, 191, 255, 0.12)',
          borderColor: 'rgba(0, 191, 255, 0.2)',
          textColor: '#00BFFF',
          textShadow: 'rgba(0, 191, 255, 0.5)'
        };
      } else if (scoreToPar === 1) {
        return {
          backgroundColor: 'rgba(255, 193, 7, 0.12)',
          borderColor: 'rgba(255, 193, 7, 0.25)',
          textColor: '#FFC107',
          textShadow: 'rgba(255, 193, 7, 0.5)'
        };
      } else {
        return {
          backgroundColor: 'rgba(244, 67, 54, 0.12)',
          borderColor: 'rgba(244, 67, 54, 0.25)',
          textColor: '#F44336',
          textShadow: 'rgba(244, 67, 54, 0.5)'
        };
      }
    };
    
    const scoreColors = getScoreColors();
    
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.outerContainer}>
          <Card style={styles.compactCard}>
            <View style={styles.compactHeader}>
              <TouchableOpacity
                onPress={() => {
                  setSkipLoadMostRecent(true);
                  clearDraftState();
                  showAlert("Round unloaded", "info");
                }}
                style={styles.exitButtonAbsolute}
              >
                <MaterialCommunityIcons name="close" size={20} color="#ff6b6b" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.cardTitle}>Hole {s.hole_number || currentHole + 1}</Text>
                <Text style={styles.cardSubtitle}>Par {s.par} • {s.yardage} yards</Text>
              </View>
            </View>
            
            <Card.Content style={styles.compactContent}>
              <View style={styles.scoreHeader}>
                <View style={[
                  styles.scoreDisplayCard,
                  {
                    backgroundColor: scoreColors.backgroundColor,
                    borderColor: scoreColors.borderColor,
                  }
                ]}>
                  <Text style={styles.scoreDisplayLabel}>Total Strokes</Text>
                  <Text style={[
                    styles.scoreDisplayValue,
                    {
                      color: scoreColors.textColor,
                      textShadowColor: scoreColors.textShadow,
                    }
                  ]}>
                    {currentStrokes}
                  </Text>
                  {currentStrokes > 0 && (
                    <Text style={[
                      styles.scoreToPar,
                      { color: scoreColors.textColor }
                    ]}>
                      {scoreToPar === 0 ? 'Even' : scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`}
                    </Text>
                  )}
                </View>
                <View style={styles.progressSection}>
                  <Text style={styles.progressText}>Hole {currentHole + 1} of {scores.length}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((currentHole + 1) / scores.length) * 100}%` }]} />
                  </View>
                </View>
              </View>

              <View style={styles.primaryStatsSection}>
                <Text style={styles.sectionTitle}>Shot Details</Text>
                <View style={styles.primaryStatsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Putts</Text>
                    <TextInput
                      mode="outlined"
                      value={s.putts?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("putts", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={styles.statInput}
                      outlineColor="rgba(255,255,255,0.2)"
                      activeOutlineColor="#00BFFF"
                      textColor="#FFFFFF"
                      placeholder="0"
                      contentStyle={styles.inputContent}
                      dense
                    />
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Approach</Text>
                    <TextInput
                      mode="outlined"
                      value={s.approach?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("approach", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={styles.statInput}
                      outlineColor="rgba(255,255,255,0.2)"
                      activeOutlineColor="#00BFFF"
                      textColor="#FFFFFF"
                      placeholder="0"
                      contentStyle={styles.inputContent}
                      dense
                    />
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Chips</Text>
                    <TextInput
                      mode="outlined"
                      value={s.chips?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("chips", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={styles.statInput}
                      outlineColor="rgba(255,255,255,0.2)"
                      activeOutlineColor="#00BFFF"
                      textColor="#FFFFFF"
                      placeholder="0"
                      contentStyle={styles.inputContent}
                      dense
                    />
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Penalties</Text>
                    <TextInput
                      mode="outlined"
                      value={s.penalties?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("penalties", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={[styles.statInput, styles.penaltyInput]}
                      outlineColor="rgba(255,107,107,0.3)"
                      activeOutlineColor="#FF6B6B"
                      textColor="#FFFFFF"
                      placeholder="0"
                      contentStyle={styles.inputContent}
                      dense
                    />
                  </View>
                </View>
              </View>

              <View style={styles.performanceSection}>
                <Text style={styles.sectionTitle}>Performance</Text>
                <View style={styles.switchContainer}>
                  {s.par > 3 && (
                    <View style={styles.switchItem}>
                      <Text style={styles.performanceLabel}>Fairway Hit</Text>
                      <Switch 
                        value={!!s.fairway} 
                        onValueChange={v => handleScoreChange("fairway", v)} 
                        color="#4CAF50"
                      />
                    </View>
                  )}
                  <View style={styles.switchItem}>
                    <Text style={styles.performanceLabel}>Green in Regulation                </Text>
                    <Switch 
                      value={!!s.gir} 
                      onValueChange={v => handleScoreChange("gir", v)} 
                      color="#4CAF50"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.navigationSection}>
                <Button 
                  mode="outlined" 
                  style={[styles.navButton, styles.prevButton]} 
                  onPress={handlePrev} 
                  disabled={currentHole === 0}
                  icon="chevron-left"
                  textColor={currentHole === 0 ? "#666" : "#00BFFF"}
                >
                  Back
                </Button>
                
                {currentHole < scores.length - 1 ? (
                  <Button 
                    mode="contained" 
                    style={[styles.navButton, styles.nextButton]} 
                    onPress={handleNext}
                    icon="chevron-right"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                  >
                    Next Hole
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    style={[styles.navButton, styles.finishButton]}
                    onPress={handleSave} 
                    loading={isSaving}
                    disabled={isSaving}
                    icon="check"
                  >
                    Finish
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
          
          {alert.open && (
            <View style={styles.snackbar}>
              <Text style={{ color: alert.severity === "error" ? "#ff6b6b" : "#51cf66" }}>
                {alert.message}
              </Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <ScrollView
      horizontal={false}
      showsHorizontalScrollIndicator={false}
      bounces={false}
      alwaysBounceHorizontal={false}
      style={{ flex: 1 }}
      contentContainerStyle={[styles.outerContainer, { flexGrow: 1, justifyContent: 'flex-start', paddingTop: 60 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineSmall" style={styles.title}>Record a New Round</Text>
      
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Course Details</Text>
        <Button 
          mode="outlined" 
          onPress={() => setDraftsDialogVisible(true)}
          icon={({color}) => <MaterialCommunityIcons name="file-document-outline" size={18} color={color} />}
        >
          Drafts
        </Button>
      </View>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.label}>Course</Text>
          <TouchableOpacity 
            style={styles.customPicker}
            onPress={() => setCourseDialogVisible(true)}
          >
            <Text style={[
              styles.customPickerText, 
              !selectedCourse && { color: 'rgba(255,255,255,0.5)' }
            ]}>
              {selectedCourse?.course_name || "Select a course..."}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#fff" />
          </TouchableOpacity>
          
          <Portal>
            <Dialog 
              visible={courseDialogVisible} 
              onDismiss={() => setCourseDialogVisible(false)}
              style={styles.teeDialog}
            >
              <Dialog.Title style={styles.teeDialogTitle}>Select Course</Dialog.Title>
              <Dialog.Content style={styles.teeDialogContent}>
                <TextInput
                  label="Search Course"
                  mode="outlined"
                  value={courseQuery}
                  onChangeText={setCourseQuery}
                  style={styles.dialogInput}
                  outlineColor="rgba(255,255,255,0.3)"
                  activeOutlineColor="#00BFFF"
                  textColor="#FFFFFF"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
                  placeholder="Search By Club Name"
                  right={isSearching ? <TextInput.Icon icon="magnify" color="#00BFFF" /> : undefined}
                />
                
                <ScrollView 
                  style={[
                    styles.courseScroll,
                    filteredCourses.length > 0 && {
                      maxHeight: Math.min(
                        350,
                        Math.max(
                          80,
                          filteredCourses.length * 58
                        )
                      )
                    }
                  ]}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.teeScrollContent}
                >
                  {filteredCourses.length > 0 ? (
                    filteredCourses.map((c: Course) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.courseOption,
                          selectedCourse?.id === c.id && styles.courseOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedCourse(c);
                          setCourseDialogVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.courseOptionText,
                          selectedCourse?.id === c.id && styles.courseOptionTextSelected
                        ]}>
                          {c.course_name}
                        </Text>
                        <Text style={styles.courseLocationText}>
                          {typeof c.location === 'string' 
                            ? c.location 
                            : [c.location?.city, c.location?.state, c.location?.country].filter(Boolean).join(', ')}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    courseQuery.length >= 3 && !isSearching && (
                      <Text style={styles.noCoursesText}>No courses found.</Text>
                    )
                  )}
                </ScrollView>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setCourseDialogVisible(false)}>Cancel</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
          
          <Text style={styles.label}>Gender</Text>
          <RadioButton.Group onValueChange={v => setSelectedGender(v as any)} value={selectedGender}>
            <View style={styles.radioRow}>
              <TouchableOpacity 
                style={{flexDirection: 'row', alignItems: 'center'}} 
                onPress={() => setSelectedGender("male")}
              >
                <RadioButton
                  value="male"
                  color="#00BFFF"
                  uncheckedColor="#fff"
                  status={selectedGender === "male" ? "checked" : "unchecked"}
                />
                <Text style={[
                  styles.radioLabel,
                  { fontWeight: selectedGender === "male" ? "bold" : "normal", color: selectedGender === "male" ? "#00BFFF" : "#fff" }
                ]}>
                  Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{flexDirection: 'row', alignItems: 'center'}} 
                onPress={() => setSelectedGender("female")}
              >
                <RadioButton
                  value="female"
                  color="#FF69B4"
                  uncheckedColor='#fff'
                  status={selectedGender === "female" ? "checked" : "unchecked"}
                />
                <Text style={[
                  styles.radioLabel,
                  { fontWeight: selectedGender === "female" ? "bold" : "normal", color: selectedGender === "female" ? "#FF69B4" : "#fff" }
                ]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </RadioButton.Group>
          
          <Text style={styles.label}>Tee</Text>
          <View style={{ width: '100%', marginBottom: 12 }}>
            <TouchableOpacity 
              style={styles.customPicker}
              onPress={() => setTeeDialogVisible(true)}
            >
              <Text style={[
                styles.customPickerText, 
                !selectedTee && { color: 'rgba(255,255,255,0.5)' }
              ]}>
                {selectedTee || "Select a tee..."}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>
            
            <Portal>
              <Dialog 
                visible={teeDialogVisible} 
                onDismiss={() => setTeeDialogVisible(false)}
                style={styles.teeDialog}
              >
                <Dialog.Title style={styles.teeDialogTitle}>Select Tee</Dialog.Title>
                <Dialog.Content style={styles.teeDialogContent}>
                  {((selectedGender === "male" || selectedGender === "female") && 
                    selectedCourse?.tees?.[selectedGender]) ? (
                    <ScrollView 
                      style={[
                        styles.teeScroll,
                        {
                          maxHeight: Math.min(
                            350,  
                            Math.max(
                              80,
                              
                              selectedCourse.tees[selectedGender].length * 58 
                            )
                          )
                        }
                      ]}
                      showsVerticalScrollIndicator={true}
                      contentContainerStyle={styles.teeScrollContent}
                    >
                      {selectedCourse.tees[selectedGender].map((tee: TeeInfo) => (
                        <TouchableOpacity
                          key={tee.id}
                          style={[
                            styles.teeOption,
                            selectedTee === tee.tee_name && styles.teeOptionSelected
                          ]}
                          onPress={() => {
                            setSelectedTee(tee.tee_name);
                            setTeeDialogVisible(false);
                          }}
                        >
                          <Text style={[
                            styles.teeOptionText,
                            selectedTee === tee.tee_name && styles.teeOptionTextSelected
                          ]}>
                            {tee.tee_name}
                            {tee.course_rating ? ` (CR ${tee.course_rating})` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noTeesText}>
                      {!selectedGender 
                        ? "Please select a gender first" 
                        : !selectedCourse 
                          ? "Please select a course first" 
                          : "No tees available for this selection"}
                    </Text>
                  )}
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setTeeDialogVisible(false)}>Cancel</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          </View>
          
          <Text style={styles.label}>Number of Holes</Text>
          <View style={styles.holeSelectRow}>
            <Button
              mode={holeCountSelection === 9 ? "contained" : "outlined"}
              onPress={() => setHoleCountSelection(9)}
              style={styles.holeSelectButton}
            >
              9 Holes
            </Button>
            <Button
              mode={holeCountSelection === 18 ? "contained" : "outlined"}
              onPress={() => setHoleCountSelection(18)}
              style={styles.holeSelectButton}
            >
              18 Holes
            </Button>
          </View>
          
        </Card.Content>
        <Card.Actions style={{justifyContent: "center", gap: 8}}>
          {started && (
            <Button
              mode="outlined"
              style={[styles.button, {flex: 1}]}
              onPress={saveDraft}
              loading={isSaving}
              icon={({color}) => <MaterialCommunityIcons name="content-save-outline" size={18} color={color} />}
            >
              Save Draft
            </Button>
          )}
          
          <Button
            mode="contained"
            style={[styles.button, {flex: 2, backgroundColor: "#0000FF"}]}
            onPress={handleStart}
            disabled={!selectedCourse || !selectedGender || !selectedTee || loading}
          >
            Start Round
          </Button>
        </Card.Actions>
        <Card.Actions style={{justifyContent: "center", marginTop: 0}}>
          <Button 
            mode="outlined" 
            onPress={() => {router.push('/ViewRounds')}}
            style={[styles.button, { borderColor: "#00BFFF" }]}
            textColor="#00BFFF"
            icon={({color}) => <MaterialCommunityIcons name="view-list" size={18} color={color} />}
          >
            View Rounds
          </Button>
        </Card.Actions>
      </Card>
      
      <Portal>
        <Dialog visible={draftsDialogVisible} onDismiss={() => setDraftsDialogVisible(false)} style={{backgroundColor: 'rgba(0,0,38,0.95)'}}>
          <Dialog.Title style={{color: '#fff'}}>Saved Drafts</Dialog.Title>
          <Dialog.Content>
            {drafts.length === 0 ? (
              <Text style={{color: '#fff', opacity: 0.7}}>No saved drafts found.</Text>
            ) : (
              drafts.map((draft) => (
                <Card key={draft.draft_id} style={styles.draftCard}>
                  <Card.Title 
                    title={draft.selected_course?.course_name || draft.selected_course?.club_name || "Unknown Course"} 
                    subtitle={`Last saved: ${formatDate(draft.timestamp)}`}
                    titleStyle={{color: '#fff'}}
                    subtitleStyle={{color: '#ccc'}}
                  />
                  <Card.Actions style={{justifyContent: 'flex-end'}}>
                    <Button onPress={() => deleteDraft(draft.draft_id)} textColor="#f44">Delete</Button>
                    <Button onPress={() => loadDraft(draft)}>Load</Button>
                  </Card.Actions>
                </Card>
              ))
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDraftsDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {alert.open && (
        <View style={styles.snackbar}>
          <Text style={{ color: alert.severity === "error" ? "#ff6b6b" : "#51cf66" }}>{alert.message}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  card: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: 'rgba(0,0,38,0.95)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
  cardSubtitle: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  compactCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(0,0,38,0.96)',
    borderRadius: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  compactContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scoreHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  scoreDisplayCard: {
    backgroundColor: 'rgba(0, 191, 255, 0.12)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 255, 0.2)',
    minWidth: 120,
  },
  scoreDisplayLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scoreDisplayValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 191, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scoreToPar: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  progressSection: {
    alignItems: 'center',
    width: '100%',
  },
  progressText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00BFFF',
    borderRadius: 2,
  },
  primaryStatsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  primaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    marginBottom: 6,
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    width: '100%',
    height: 36,
  },
  penaltyInput: {
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  inputContent: {
    paddingHorizontal: 6,
  },
  performanceSection: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  switchContainer: {
    gap: 8,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  performanceLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "500",
  },
  navigationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  navButton: {
    flex: 1,
    borderRadius: 8,
    minHeight: 36,         
    justifyContent: 'center',
    alignItems: 'center',   
  },
  prevButton: {
    borderColor: 'rgba(0, 191, 255, 0.5)',
  },
  nextButton: {
    backgroundColor: '#00BFFF',
  },
  finishButton: {
    backgroundColor: "#4CAF50",
  },
  exitButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    width: '100%',
  },
  label: {
    color: "#fff",
    marginBottom: 6,
    fontSize: 14,
    textAlign: 'left',
    marginTop: 8,
    fontWeight: '500',
  },
  courseButton: {
    marginVertical: 3,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'flex-start',
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 16,
  },
  radioLabel: {
    color: "#fff",
    fontSize: 14,
    marginRight: 16,
    fontWeight: '500',
  },
  teeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  teeButton: {
    marginHorizontal: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 6,
    width: '100%',
  },
  summaryText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 6,
    flexShrink: 1,
    lineHeight: 20,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  holeSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 8,
    gap: 8,
  },
  holeSelectButton: {
    flex: 1,
    borderRadius: 8,
  },
  draftCard: {
    marginVertical: 6,
    backgroundColor: 'rgba(30,30,60,0.85)',
    borderRadius: 10,
  },
  snackbar: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 8,
  },
  exitButtonAbsolute: {
    position: 'absolute',
    left: 8,
    top: 4,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  summarySubtitle: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  summaryDivider: {
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  summaryContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  picker: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    height: 56,
    marginBottom: 12,
    paddingHorizontal: 12,
    color: '#fff',
    justifyContent: 'center',
  },
  customPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    height: 56,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  customPickerText: {
    color: '#fff',
    fontSize: 16,
  },
  teeDialog: {
    backgroundColor: 'rgba(0,0,38,0.95)',
    borderRadius: 12,
    maxWidth: 340,
    width: '90%',
    alignSelf: 'center',
  },
  teeDialogTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  teeDialogContent: {
    paddingVertical: 8,
  },
  teeScroll: {
    // Height will be set dynamically in the component
  },
  teeScrollContent: {
    paddingVertical: 4,
  },
  teeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  teeOptionSelected: {
    backgroundColor: 'rgba(0,191,255,0.2)',
    borderColor: 'rgba(0,191,255,0.4)',
  },
  teeOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  teeOptionTextSelected: {
    color: '#00BFFF',
    fontWeight: 'bold',
  },
  noTeesText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    padding: 16,
  },
  courseScroll: {
    marginTop: 12,
  },
  courseOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  courseOptionSelected: {
    backgroundColor: 'rgba(0,191,255,0.2)',
    borderColor: 'rgba(0,191,255,0.4)',
  },
  courseOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  courseOptionTextSelected: {
    color: '#00BFFF',
    fontWeight: 'bold',
  },
  courseLocationText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  noCoursesText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    padding: 16,
  },
  dialogInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
});