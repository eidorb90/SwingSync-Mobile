import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { Button, Card, Dialog, Divider, Portal, RadioButton, Switch, Text, TextInput } from "react-native-paper";



// Define the type for tee info to include an index signature
interface TeeInfoData {
  par: number[];
  yardage: number[];
}

// Create a type-safe lookup object
const TEES_INFO: Record<string, TeeInfoData> = {
  Blue: { par: [4,4,3,5,4,4,3,5,4], yardage: [400,410,180,520,390,430,160,530,410] },
  White: { par: [4,4,3,5,4,4,3,5,4], yardage: [380,390,160,500,370,410,140,510,390] },
  Red: { par: [4,4,3,5,4,4,3,5,4], yardage: [350,360,140,470,340,380,120,480,360] },
  Black: { par: [4,5,3,4,4,5,3,4,4], yardage: [420,530,200,410,400,540,180,420,400] },
  Masters: { par: [4,5,3,4,4,5,3,4,4], yardage: [445,575,240,350,495,180,450,570,460] },
  Member: { par: [4,4,3,5,4,4,3,5,4], yardage: [370,390,150,480,360,400,130,500,370] },
};

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

// Define proper types for course data
interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface TeeInfo {
  tee_name: string;
  course_rating?: number;
  slope_rating?: number;
  bogey_rating?: number;
  total_yards?: number;
  par_total?: number;
  holes?: any[];
  // ... other properties
}

interface Course {
  id: number;
  name: string;
  location: string | Location;
  tees: {
    male: Array<string | TeeInfo>;
    female: Array<string | TeeInfo>;
  }
}

// Update mock courses to match expected structure
const MOCK_COURSES: Course[] = [
  { 
    id: 1, 
    name: "Pebble Beach", 
    location: "California, USA", 
    tees: { male: ["Blue", "White"], female: ["Red"] } 
  },
  { 
    id: 2, 
    name: "St Andrews", 
    location: "Scotland, UK", 
    tees: { male: ["Black", "White"], female: ["Red"] } 
  },
  { 
    id: 3, 
    name: "Augusta National", 
    location: "Georgia, USA", 
    tees: { male: ["Masters", "Member"], female: ["Member"] } 
  },
];

// Define draft interface
interface Draft {
  draft_id: string;
  timestamp: string;
  selected_course: any;
  selected_gender: string;
  selected_tee: string;
  holes: any[];
  scores: any[];
  notes: string;
  current_hole_index: number;
}

export default function RoundInput() {
  const [token, setToken] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Course/tee selection
  const [courseQuery, setCourseQuery] = useState("");
  const [filteredCourses, setFilteredCourses] = useState(MOCK_COURSES);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | "">("");
  const [selectedTee, setSelectedTee] = useState<string>("");

  // Round state
  const [started, setStarted] = useState(false);
  const [currentHole, setCurrentHole] = useState(0);
  const [scores, setScores] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({ open: false, message: "", severity: "info" });

  // Drafts state
  const [holeCountSelection, setHoleCountSelection] = useState<9|18>(18);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsDialogVisible, setDraftsDialogVisible] = useState(false);
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

  // Filter courses as user types
  useEffect(() => {
    if (!courseQuery) setFilteredCourses(MOCK_COURSES);
    else setFilteredCourses(MOCK_COURSES.filter(c => c.name.toLowerCase().includes(courseQuery.toLowerCase())));
  }, [courseQuery]);

  // Backend-powered course search
  const [isSearching, setIsSearching] = useState(false);

  // Fetch courses from backend as user types
  useEffect(() => {
    let active = true;
    if (!courseQuery || courseQuery.length < 3) {
      setFilteredCourses([]);
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
        if (active) setFilteredCourses([]);
      } finally {
        if (active) setIsSearching(false);
      }
    };
    fetchCourses();
    return () => {
      active = false;
    };
  }, [courseQuery, token]);

  // Load drafts on component mount
  useEffect(() => {
    if (userID) {
      loadDrafts();
    }
  }, [userID]);

  // Load most recent draft if available
  useEffect(() => {
    if (drafts.length > 0 && !currentDraftId) {
      const mostRecent = drafts.reduce((a, b) => 
        new Date(a.timestamp) > new Date(b.timestamp) ? a : b
      );
      loadDraft(mostRecent);
    }
  }, [drafts]);
  
  // Start round: initialize scores array  
  const handleStart = () => {
    if (!selectedCourse || !selectedGender || !selectedTee) return;
    
    // Try to find the tee object from the course data
    const tees = selectedCourse?.tees?.[selectedGender] || [];
    const teeObj = tees.find((t: any) => 
      typeof t === 'string' ? t === selectedTee : t.tee_name === selectedTee
    );
    
    // Check if we have the tee in our mock data
    const mockTeeData = TEES_INFO[selectedTee];
    
    // Use teeObj's holes if available, otherwise fallback to mock data if we have it
    let holeData: any[] = [];
    
    if (typeof teeObj !== 'string' && teeObj?.holes) {
      // Use tee data from API, but limit to selected hole count
      holeData = teeObj.holes.slice(0, holeCountSelection);
    } else if (mockTeeData) {
      // Use mock data, but limit to selected hole count
      holeData = mockTeeData.par.slice(0, holeCountSelection).map((par, i) => ({
        par, 
        yardage: mockTeeData.yardage[i]
      }));
    } else {
      // Fallback, using the selected hole count
      holeData = Array(holeCountSelection).fill(0).map(() => ({
        par: 4,
        yardage: 400
      }));
    }
    
    // Initialize scores based on actual hole data with "0" for numeric fields
    setScores(holeData.map((hole: any) => ({
      strokes: "0",
      putts: "0",
      penalties: "0",
      fairway: false,
      gir: false,
      par: hole.par,
      yardage: hole.yardage,
    })));
    
    setCurrentHole(0);
    setStarted(true);
    setShowSummary(false);
  };

  // Auto-saves the current round progress as a draft
  const autoSaveDraft = async () => {
    if (!selectedCourse) return;

    // Create draft object using fields matching backend model
    const draftData = {
      draft_id: currentDraftId || `draft-${Date.now()}`,
      timestamp: new Date().toISOString(),
      selected_course: selectedCourse,
      selected_gender: selectedGender,
      selected_tee: selectedTee,
      holes: scores.map((s, i) => ({
        ...s,
        hole_id: i + 1,
      })),
      scores: scores,
      notes: notes,
      current_hole_index: currentHole,
      user: userID, // Add the user ID field as required by backend
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
      
      if (!response.ok) {
        console.error(`Auto-save failed with status: ${response.status}`);
        
        try {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          const errorData = errorText ? JSON.parse(errorText) : {};
          console.error("Error details:", errorData);
        } catch (e) {
          console.error("Could not parse error response");
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

  // Handle navigation with auto-save
  const handleNext = async () => {
    if (currentHole < scores.length - 1) {
      await autoSaveDraft();
      
      const current = scores[currentHole];
      console.log(`Score: ${current.strokes }, putts: ${current.putts}, penalties: ${current.penalties} for hole ${currentHole + 1}`);
      
      setCurrentHole(h => Math.min(h + 1, scores.length - 1));
    }
  };

  // Added proper handlePrev function
  const handlePrev = async () => {
    if (currentHole > 0) {
      await autoSaveDraft();
      setCurrentHole(h => Math.max(h - 1, 0));
    }
  };

  // Score input with auto-save - use 0 for empty values
  const handleScoreChange = (field: string, value: string | boolean) => {
    // For string fields (numeric inputs), convert empty string to "0"
    if (typeof value === 'string' && value === '' && 
        (field === 'strokes' || field === 'putts' || field === 'penalties')) {
      value = "0";
    }
    
    setScores(prev => {
      const updated = [...prev];
      updated[currentHole] = { ...updated[currentHole], [field]: value };
      return updated;
    });
    
    // Auto-save after a brief delay when user changes data
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      autoSaveDraft();
    }, 1500);
    setAutoSaveTimeout(timeout);
  };

  // Fix draft save to show success alert
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
    
    // Match field names with the backend model
    const draftData = {
      draft_id: currentDraftId || `draft-${Date.now()}`,
      timestamp: new Date().toISOString(),
      selected_course: selectedCourse,
      selected_gender: selectedGender,
      selected_tee: selectedTee,
      holes: scores.map((s, i) => ({
        ...s,
        hole_id: i + 1,
      })),
      scores,
      notes,
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
        console.error("Failed to parse response:", e);
        responseData = {};
      }
      
      if (!response.ok) {
        console.error("Draft save failed:", response.status, responseData);
        throw new Error(responseData.error || responseData.detail || "Failed to save draft");
      }
      
      // Add success alert
      setAlert({
        open: true,
        message: "Draft saved successfully!",
        severity: "success"
      });
      
      if (!currentDraftId && responseData.draft_id) {
        setCurrentDraftId(responseData.draft_id);
      }
      
      await loadDrafts(); // Reload drafts list
      
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

  // Add this function to clear alerts after a delay
  const showAlert = (message: string, severity: "success" | "error" | "info") => {
    setAlert({
      open: true,
      message,
      severity
    });
    
    // Auto-hide alert after 3 seconds
    setTimeout(() => {
      setAlert(prev => ({ ...prev, open: false }));
    }, 3000);
  };

  // Fix delete draft to handle async deletion properly
  const deleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/drafts/${draftId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to delete draft");
      
      showAlert("Draft deleted successfully!", "success");
      
      // This needs to be a separate action, not within the success callback
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
      
      // Load drafts after deletion is done
      await loadDrafts();
    } catch (error) {
      showAlert("Failed to delete draft", "error");
    }
  };

  // Define the loadDrafts function
  const loadDrafts = async () => {
    if (!token || !userID) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/drafts/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch drafts");
      
      const data = await response.json();
      setDrafts(data);
    } catch (error) {
      showAlert("No drafts found", "info");
    }
  };

  // Define the formatDate function
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Define handleSave function
  const handleSave = async () => {
    try {
      // Check if scores have been entered before proceeding
      const hasScores = scores.some(s => s.strokes && parseInt(s.strokes) > 0);
      if (!hasScores) {
        showAlert("Please enter scores for at least one hole.", "error");
        return;
      }
      
      await autoSaveDraft(); // Save one last time
      const success = await handleBackendSave(); // Actual backend save
      if (success) {
        setShowSummary(true);
      }
    } catch (error) {
      console.error("Failed to save round:", error);
      showAlert("Failed to save round. Please try again.", "error");
    }
    handleFinish();
  };

  // Backend save logic with proper error handling
  const handleBackendSave = async () => {
    if (!selectedCourse || !selectedTee || !scores.length) {
      showAlert("Please complete all fields.", "error");
      return false;
    }
    
    // Check if scores have been entered
    const hasScores = scores.some(s => s.strokes && parseInt(s.strokes) > 0);
    if (!hasScores) {
      showAlert("Please enter scores for at least one hole.", "error");
      return false;
    }
    
    setIsSaving(true);
    console.log("Starting save of round to backend...");
    
    try {
      // Prepare payload with empty values defaulting to 0
      const payload = {
        course_id: selectedCourse.id,
        tee_name: selectedTee,
        gender: selectedGender,
        notes,
        hole_scores: scores.map((s, i) => ({
          hole_id: i + 1,
          strokes: s.strokes ? parseInt(s.strokes) : 0, 
          putts: s.putts ? parseInt(s.putts) : 0,
          penalties: s.penalties ? parseInt(s.penalties) : 0,
          fairway_hit: !!s.fairway,
          green_in_regulation: !!s.gir,
        })),
      };
      
      console.log("Saving round with payload:", JSON.stringify(payload).substring(0, 100) + "...");
      
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
      
      // If we successfully saved, clean up draft
      if (currentDraftId) {
        try {
          await deleteDraft(currentDraftId);
          console.log("Draft deleted after successful round save");
        } catch (e) {
          console.error("Failed to delete draft after saving round:", e);
        }
      }
      
      showAlert("Round saved successfully!", "success");
      return true;
    } catch (error: any) {
      console.error("Error saving round:", error);
      showAlert(error.message || "Error saving round", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle finishing a round (reset state)
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
    
    // If successfully saved, navigate to the home screen or show confirmation
    showAlert("Round completed!", "success");
  };

  // Load a draft function (if it's also missing)
  const loadDraft = (draft: Draft) => {
    if (!draft) return;
    
    // Process the draft scores to ensure all numeric fields have string values
    const processedScores = draft.scores?.map(score => ({
      ...score,
      strokes: score.strokes?.toString() || "0",
      putts: score.putts?.toString() || "0",
      penalties: score.penalties?.toString() || "0"
    })) || [];
    
    setSelectedCourse(draft.selected_course);
    setCourseQuery(draft.selected_course?.name || "");
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

  // Fix the summary screen to calculate totals correctly
  const totalScore = scores.reduce((sum, s) => {
    const strokes = s.strokes && s.strokes !== "" ? parseInt(s.strokes) : 0;
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
  
  const fairwaysHit = scores.filter(s => s.fairway).length;
  const girs = scores.filter(s => s.gir).length;

  // Update the summary screen to include a save button if needed
  if (showSummary && started) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.outerContainer}>
          <Card style={styles.card}>
            <Card.Title title="Round Summary" titleStyle={styles.cardTitle} />
            <Card.Content>
              <Text style={styles.summaryText}>Course: <Text style={{fontWeight: "bold"}}>{selectedCourse?.name}</Text></Text>
              <Text style={styles.summaryText}>Tee: <Text style={{fontWeight: "bold"}}>{selectedTee}</Text></Text>
              <Text style={styles.summaryText}>Gender: <Text style={{fontWeight: "bold"}}>{selectedGender}</Text></Text>
              <Text style={styles.summaryText}>Total Score: <Text style={{fontWeight: "bold"}}>{totalScore}</Text></Text>
              <Text style={styles.summaryText}>Putts: <Text style={{fontWeight: "bold"}}>{totalPutts}</Text></Text>
              <Text style={styles.summaryText}>Penalties: <Text style={{fontWeight: "bold"}}>{totalPenalties}</Text></Text>
              <Text style={styles.summaryText}>Fairways Hit: <Text style={{fontWeight: "bold"}}>{fairwaysHit}</Text></Text>
              <Text style={styles.summaryText}>GIRs: <Text style={{fontWeight: "bold"}}>{girs}</Text></Text>
              <Divider style={{marginVertical: 10, backgroundColor: "#fff"}} />
              
              {/* Notes field for the entire round */}
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
            <Card.Actions style={{justifyContent: "center", flexDirection: 'column', gap: 10}}>
              <Button 
                mode="contained" 
                style={styles.button}
                onPress={handleBackendSave}
                loading={isSaving}
                disabled={isSaving}
              >
                Finish Round
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
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.outerContainer}>
          <Card style={styles.card}>
            <Card.Title 
              title={`Hole ${currentHole + 1} / ${scores.length}`} 
              titleStyle={styles.cardTitle}
            />
            <Card.Content>
              <Text style={styles.summaryText}>Par: {s.par} | Yards: {s.yardage}</Text>
              <TextInput
                label="Strokes"
                mode="outlined"
                value={s.strokes?.toString() ?? ""}
                onChangeText={v => handleScoreChange("strokes", v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                style={styles.input}
                outlineColor="rgba(255,255,255,0.3)"
                activeOutlineColor="#00BFFF"
                textColor="#FFFFFF"
                placeholderTextColor="rgba(255,255,255,0.5)"
                theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
                placeholder="0"
              />
              <TextInput
                label="Putts"
                mode="outlined"
                value={s.putts?.toString() ?? ""}
                onChangeText={v => handleScoreChange("putts", v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                style={styles.input}
                outlineColor="rgba(255,255,255,0.3)"
                activeOutlineColor="#00BFFF"
                textColor="#FFFFFF"
                placeholderTextColor="rgba(255,255,255,0.5)"
                theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
                placeholder="0"
              />
              <TextInput
                label="Penalties"
                mode="outlined"
                value={s.penalties?.toString() ?? ""}
                onChangeText={v => handleScoreChange("penalties", v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                style={styles.input}
                outlineColor="rgba(255,255,255,0.3)"
                activeOutlineColor="#00BFFF"
                textColor="#FFFFFF"
                placeholderTextColor="rgba(255,255,255,0.5)"
                theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
                placeholder="0"
              />
              <View style={styles.switchRow}>
                {s.par > 3 && (
                    <>
                    <Text style={styles.switchLabel}>Fairway Hit</Text>
                    <Switch value={!!s.fairway} onValueChange={v => handleScoreChange("fairway", v)} color="#00BFFF" />
                    </>
                )}
                <Text style={styles.switchLabel}>GIR</Text>
                <Switch value={!!s.gir} onValueChange={v => handleScoreChange("gir", v)} color="#00BFFF" />
                
              </View>
                            
            </Card.Content>
            <Card.Actions style={{justifyContent: "space-between"}}>
              <Button mode="outlined" style={styles.buttonNav} onPress={handlePrev} disabled={currentHole === 0}>Prev</Button>
              {currentHole < scores.length - 1 ? (
                <Button mode="contained" style={styles.buttonNav} onPress={handleNext}>Next</Button>
              ) : (
                <Button
                  mode="contained" 
                  style={styles.buttonNav}
                  onPress={handleSave}
                  loading={isSaving}
                  disabled={isSaving}
                >
                  Save
                </Button>
              )}
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

  // Initial form with 9/18 hole selection
  return (
    <ScrollView 
      contentContainerStyle={styles.outerContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineSmall" style={styles.title}>Record a New Round</Text>
      
      {/* Header with drafts button */}
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
          <TextInput
            label="Search Course"
            mode="outlined"
            value={courseQuery}
            onChangeText={setCourseQuery}
            style={styles.input}
            outlineColor="rgba(255,255,255,0.3)"
            activeOutlineColor="#00BFFF"
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255,255,255,0.5)"
            theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
            placeholder="Type at least 3 characters"
            right={isSearching ? <TextInput.Icon icon="magnify" color="#00BFFF" /> : undefined}
          />
          
          {filteredCourses.length > 0 ? (
            filteredCourses.map((c: any) => (
              <Button
                key={c.id}
                mode={selectedCourse?.id === c.id ? "contained" : "outlined"}
                style={styles.courseButton}
                onPress={() => setSelectedCourse(c)}
              >
                {/* Handle location object or string appropriately */}
                {c.name} <Text style={{color: "#aaa"}}>
                  {typeof c.location === 'string' 
                    ? `(${c.location})` 
                    : `(${[c.location?.city, c.location?.state, c.location?.country].filter(Boolean).join(', ')})`}
                </Text>
              </Button>
            ))
          ) : (
            courseQuery.length >= 3 && !isSearching && (
              <Text style={{ color: "#fff", opacity: 0.7, marginVertical: 8 }}>No courses found.</Text>
            )
          )}
          
          <View style={{marginVertical: 10}} />
          
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
                  uncheckedColor='#000'
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
          <View style={styles.teeRow}>
            {(selectedCourse?.tees?.[selectedGender] || []).map((tee: string | TeeInfo, index: any) => {
              // Extract tee name and handle both string and object formats
              const teeName = typeof tee === 'string' ? tee : tee.tee_name;
              
              return (
                <Button
                  key={index}
                  mode={selectedTee === teeName ? "contained" : "outlined"}
                  style={styles.teeButton}
                  onPress={() => setSelectedTee(teeName)}
                >
                  {teeName}
                  {typeof tee !== 'string' && tee.course_rating && (
                    <Text style={{fontSize: 12, color: "#aaa"}}> (CR: {tee.course_rating})</Text>
                  )}
                </Button>
              );
            })}
          </View>
          
          {/* 9/18 hole selection */}
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
            disabled={!selectedCourse || !selectedGender || !selectedTee}
          >
            Start Round
          </Button>
        </Card.Actions>
      </Card>
      
      {/* Drafts Dialog */}
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
                    title={draft.selected_course?.name || "Unknown Course"} 
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  card: {
    width: '100%',  // Changed from fixed 360px to responsive 100%
    maxWidth: 400,  // Added max-width for larger screens
    backgroundColor: 'rgba(0,0,38,0.95)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginTop: 10,
    marginBottom: 30,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 22,
    textAlign: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    width: '100%',
  },
  label: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 16,
    textAlign: 'left',
    marginTop: 8,
  },
  courseButton: {
    marginVertical: 2,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'flex-start',
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  radioLabel: {
    color: "#fff",
    fontSize: 16,
    marginRight: 16,
  },
  teeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  teeButton: {
    marginHorizontal: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 6,
    width: '100%',
  },
  buttonNav: {
    minWidth: 100,
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 8,
  },
  summaryText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 4,
    flexShrink: 1,  // Added to ensure text can shrink if needed
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',  // Added to ensure content wraps if needed
  },
  switchLabel: {
    color: "#fff",
    fontSize: 15,
    marginHorizontal: 8,
    opacity: 0.8,
  },
  snackbar: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    zIndex: 100,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  },
  holeSelectButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  draftCard: {
    marginVertical: 8,
    backgroundColor: 'rgba(30,30,60,0.85)',
  },
});