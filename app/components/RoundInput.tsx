import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from 'expo-location';
import { useRouter } from "expo-router";
import { Magnetometer } from 'expo-sensors';
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useState } from "react";
import { Keyboard, ScrollView, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { Button, Card, Dialog, Portal, Switch, Text, TextInput } from "react-native-paper";
import GreenInputMap from './GreenInputMap';
import GreenLocationInputMap from './GreenLcationInputMap';
import RoundInputShowSummary from './RoundInputShowSummary';
import styles from "./RoundInputStyles.js";
import { Course, Draft, HoleDetail, LocalHoleScore, MarkerPoint, Region, TeeInfo } from "./types/RoundInputTypes";


const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;


// Constants for GPS-enabled courses
const SUPPORTED_COURSES_WITH_GPS = ["Benkelman Country Club"];

const BENKELMAN_HOLE_COORDINATES = [
  { lat: 40.07626, lon: -101.49051 }, // Hole 1
  { lat: 40.07444, lon: -101.49333 }, // Hole 2
  { lat: 40.07288, lon: -101.49344 }, // Hole 3
  { lat: 40.07582, lon: -101.49008 }, // Hole 4
  { lat: 40.07297, lon: -101.49244 }, // Hole 5
  { lat: 40.07571, lon: -101.48802 }, // Hole 6
  { lat: 40.07738, lon: -101.48543 }, // Hole 7
  { lat: 40.07544, lon: -101.48954 }, // Hole 8
  { lat: 40.07799, lon: -101.48626 }, // Hole 9
];

// For holes 10-18, we'll use the same coordinates as 1-9
const ALL_HOLE_COORDINATES = [
  ...BENKELMAN_HOLE_COORDINATES,
  ...BENKELMAN_HOLE_COORDINATES
];

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // Convert degrees to radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in meters

  return d;
};

// Auto-calculate Green in Regulation
const calculateGIR = (strokes: number, par: number, putts: number): boolean => {
  if (!strokes || !par || putts === null || putts === undefined) return false;
  
  // GIR means reaching the green in regulation strokes
  // Par 3: GIR if on green in 1 stroke (total strokes - putts = 1)
  // Par 4: GIR if on green in 2 strokes (total strokes - putts = 2)  
  // Par 5: GIR if on green in 3 strokes (total strokes - putts = 3)
  const strokesBeforePutting = strokes - putts;
  const regulationStrokes = par - 2; // Par 3 = 1, Par 4 = 2, Par 5 = 3
  
  return strokesBeforePutting <= regulationStrokes;
};

export default function RoundInput() {
  const [token, setToken] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

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

  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [distanceToHole, setDistanceToHole] = useState<number | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  const [runningStats, setRunningStats] = useState({
    totalScore: 0,
    totalPutts: 0,
    totalPenalties: 0,
    fairwaysHit: 0,
    girs: 0,
    holesCompleted: 0,
    strokesGained: 0
  });

  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [showWeatherImpact, setShowWeatherImpact] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherDebugInfo, setWeatherDebugInfo] = useState<string | null>(null);
  const [showWeatherDebug, setShowWeatherDebug] = useState(false);

  const [phoneHeading, setPhoneHeading] = useState<number | null>(null);
  const [magnetometerSubscription, setMagnetometerSubscription] = useState<any>(null);

  // Map modal state
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedHole, setSelectedHole] = useState<HoleDetail | null>(null);
  const [tempMarkerCoordinate, setTempMarkerCoordinate] = useState<{latitude: number, longitude: number} | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [holeDetail, setHoleDetail] = useState<HoleDetail | null>(null);

  const [showCompass, setShowCompass] = useState(false);

  useEffect(() => {
    fetchTokenAndSetUserID();
    if (token && userID) {
      fetchUserProfilePicture();
    }
  }, []);

  // Add location permission request and tracking
  // Function to start location tracking
  const startLocationTracking = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert("Location permission not granted. Distance tracking disabled.", "info");
        return null;
      }
      
      setIsLocationEnabled(true);
      
      // Start watching the user's position with more frequent updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // Update more frequently (every 2 seconds)
          distanceInterval: 3, // Update with smaller movements (every 3 meters)
        },
        (location) => {
          setCurrentLocation(location);
          updateDistanceToCurrentHole(location.coords);
        }
      );
      
      return subscription;
    } catch (error) {
      console.error("Error starting location tracking:", error);
      showAlert("Error starting location tracking", "error");
      return null;
    }
  };

  // Function to update distance to current hole
  const updateDistanceToCurrentHole = (coords: {latitude: number; longitude: number}) => {
    if (!selectedCourse) {
      setDistanceToHole(null);
      return;
    }

    // Get the current hole data
    const currentHoleData = scores[currentHole];
    if (!currentHoleData) {
      setDistanceToHole(null);
      return;
    }

    // Check if hole has custom coordinates (user-set location)
    if (currentHoleData.hole_id && selectedGender) {
      const selectedTeeObj = selectedCourse?.tees?.[selectedGender as "male" | "female"]?.find(
        (t: TeeInfo) => t.tee_name === selectedTee
      );
      const holeDetail = selectedTeeObj?.holes?.find((h: HoleDetail) => h.id === currentHoleData.hole_id);
      setHoleDetail(holeDetail || null);
      
      if (holeDetail && holeDetail.latitude && holeDetail.longitude) {
        // Use database coordinates
        const distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          holeDetail.latitude,
          holeDetail.longitude
        );
        const distanceYards = Math.round(distance * 1.09361);
        setDistanceToHole(distanceYards);
        return;
      }
    }

    // Fallback to legacy GPS coordinates for supported courses
    if (SUPPORTED_COURSES_WITH_GPS.includes(selectedCourse.course_name)) {
      const holeCoords = ALL_HOLE_COORDINATES[currentHole];
      if (holeCoords) {
        const distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          holeCoords.lat,
          holeCoords.lon
        );
        const distanceYards = Math.round(distance * 1.09361);
        setDistanceToHole(distanceYards);
        return;
      }
    }

    setDistanceToHole(null);
  };

  // useEffect for managing location tracking
  useEffect(() => {
    // Check if we should start tracking
    const shouldTrackLocation = 
      started && 
      selectedCourse;
    
    const setupLocationTracking = async () => {
      if (shouldTrackLocation && !locationSubscription) {
        // Start tracking
        const subscription = await startLocationTracking();
        if (subscription) {
          setLocationSubscription(subscription);
        }
      } else if (!shouldTrackLocation && locationSubscription) {
        // Stop tracking
        locationSubscription.remove();
        setLocationSubscription(null);
        setDistanceToHole(null);
        setIsLocationEnabled(false);
      }
    };
    
    setupLocationTracking();
    
    // Cleanup on component unmount or when tracking should stop
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
    };
  }, [started, selectedCourse]);

  // Update distance when hole changes
  useEffect(() => {
    if (currentLocation && currentLocation.coords) {
      updateDistanceToCurrentHole(currentLocation.coords);
    }
  }, [currentHole, currentLocation]);

  // Clean up location subscription when component unmounts
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Compass/Magnetometer functions
  const startCompassTracking = async () => {
    try {
      // Check if magnetometer is available
      const isAvailable = await Magnetometer.isAvailableAsync();
      if (!isAvailable) {
        return null;
      }

      // Set update interval (100ms for smooth real-time updates)
      Magnetometer.setUpdateInterval(100);
      
      // Start magnetometer subscription
      const subscription = Magnetometer.addListener((magnetometerData) => {
        const { x, y } = magnetometerData;
        
        // Calculate heading in degrees (0-360)
        let heading = Math.atan2(y, x) * (180 / Math.PI);
        
        // Normalize to 0-360 degrees
        if (heading < 0) {
          heading += 360;
        }
        
        // Adjust for phone orientation (portrait mode - top of phone as reference)
        // Subtract 90 degrees so the top of the phone points in the direction
        heading = (heading - 90 + 360) % 360;
        
        setPhoneHeading(heading);
      });

      return subscription;
    } catch (error) {
      console.error("Error starting compass tracking:", error);
      return null;
    }
  };

  const stopCompassTracking = () => {
    if (magnetometerSubscription) {
      magnetometerSubscription.remove();
      setMagnetometerSubscription(null);
      setPhoneHeading(null);
    }
  };

  // useEffect for managing compass tracking
  useEffect(() => {
    // Start compass tracking when weather data is available and we have wind info
    const shouldTrackCompass = 
      weatherData && 
      weatherData.current && 
      weatherData.current.wind_mph > 0;
    
    const setupCompassTracking = async () => {
      if (shouldTrackCompass && !magnetometerSubscription) {
        // Start compass tracking
        const subscription = await startCompassTracking();
        if (subscription) {
          setMagnetometerSubscription(subscription);
        }
      } else if (!shouldTrackCompass && magnetometerSubscription) {
        // Stop compass tracking
        stopCompassTracking();
      }
    };
    
    setupCompassTracking();
    
    // Cleanup on component unmount
    return () => {
      stopCompassTracking();
    };
  }, [weatherData]);

  // Clean up compass subscription when component unmounts
  useEffect(() => {
    return () => {
      stopCompassTracking();
    };
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

  const fetchCourseWeather = async (lat: number, lon: number) => {
    const WEATHER_API_KEY = Constants.expoConfig?.extra?.WEATHER_API_KEY;
    const WEATHER_URL = Constants.expoConfig?.extra?.WEATHER_URL;

    // Clear previous errors
    setWeatherError(null);
    setWeatherDebugInfo(null);

    // Debug info for UI
    const debugInfo: any = {
      hasApiKey: !!WEATHER_API_KEY,
      hasUrl: !!WEATHER_URL,
      coordinates: { lat, lon },
      timestamp: new Date().toISOString(),
      buildType: __DEV__ ? 'Development' : 'Production',
      platform: 'iOS',
    };

    if (!WEATHER_API_KEY || !WEATHER_URL) {
      const errorMsg = `Weather API not configured: ${!WEATHER_API_KEY ? 'No API Key' : ''} ${!WEATHER_URL ? 'No URL' : ''}`;
      setWeatherError(errorMsg);
      setWeatherDebugInfo(JSON.stringify(debugInfo, null, 2));
      return;
    }

    setLoadingWeather(true);
    try {
      // Ensure HTTPS for iOS production builds
      const baseUrl = WEATHER_URL.startsWith('https://') ? WEATHER_URL : WEATHER_URL.replace('http://', 'https://');
      const weatherApiUrl = `${baseUrl}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`;
      
      debugInfo.requestUrl = weatherApiUrl.replace(WEATHER_API_KEY, 'API_KEY_HIDDEN');
      debugInfo.isHttps = baseUrl.startsWith('https://');

      const response = await fetch(weatherApiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SwingSync/1.0.2 (iOS)",
          "Accept": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      debugInfo.responseStatus = response.status;
      debugInfo.responseOk = response.ok;
      debugInfo.responseHeaders = Object.fromEntries(response.headers.entries());

      if (!response.ok) {
        const errorText = await response.text();
        debugInfo.errorResponse = errorText;
        setWeatherError(`Weather API HTTP ${response.status}: ${errorText}`);
        setWeatherDebugInfo(JSON.stringify(debugInfo, null, 2));
        return;
      }

      const data = await response.json();
      debugInfo.success = true;
      debugInfo.weatherData = {
        location: data.location?.name,
        temperature: data.current?.temp_f,
        condition: data.current?.condition?.text,
        windSpeed: data.current?.wind_mph
      };
      
      setWeatherData(data);
      setWeatherDebugInfo(JSON.stringify(debugInfo, null, 2));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      debugInfo.fetchError = errorMsg;
      debugInfo.errorStack = error instanceof Error ? error.stack : undefined;
      
      // More specific error detection for iOS
      if (errorMsg.includes('Network request failed')) {
        debugInfo.errorType = 'iOS Network Security - Possible ATS blocking HTTP requests';
        debugInfo.solution = 'Check app.json for NSAppTransportSecurity configuration';
      } else if (errorMsg.includes('timeout')) {
        debugInfo.errorType = 'Request timeout';
      } else if (errorMsg.includes('SSL') || errorMsg.includes('TLS')) {
        debugInfo.errorType = 'SSL/TLS certificate issue';
      } else if (errorMsg.includes('CORS')) {
        debugInfo.errorType = 'CORS policy blocking request';
      } else {
        debugInfo.errorType = 'Unknown network error';
      }
      
      setWeatherError(`Network Error: ${errorMsg}`);
      setWeatherDebugInfo(JSON.stringify(debugInfo, null, 2));
      setWeatherData(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Fetch weather when course is selected
  useEffect(() => {
    if (selectedCourse && selectedCourse.location && typeof selectedCourse.location === 'object') {
      const { latitude, longitude } = selectedCourse.location;
      if (latitude && longitude) {
        fetchCourseWeather(latitude, longitude);
      }
    } else {
      setWeatherData(null);
    }
  }, [selectedCourse]);

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
        
        // Auto-calculate GIR
        if (totalStrokes > 0 && putts > 0) {
          updated[currentHole].gir = calculateGIR(totalStrokes, hole.par, putts);
        }
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

  const handleEditRound = () => {
    setShowSummary(false);
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
      
      
      const roundEndpoint = `${BACKEND_URL}/api/rounds/`;
      const res = await fetch(roundEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      
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

  // Update running stats whenever scores change
  useEffect(() => {
    const stats = scores.reduce((acc, s, index) => {
      if (index > currentHole) return acc; // Only count completed holes
      
      const strokes = s.strokes ? parseInt(s.strokes) : 0;
      const putts = s.putts ? parseInt(s.putts) : 0;
      const penalties = s.penalties ? parseInt(s.penalties) : 0;
      
      if (strokes > 0) {
        acc.totalScore += strokes;
        acc.totalPutts += putts;
        acc.totalPenalties += penalties;
        acc.fairwaysHit += s.fairway ? 1 : 0;
        acc.girs += s.gir ? 1 : 0;
        acc.holesCompleted += 1;
        acc.strokesGained += (s.par - strokes); // Positive = under par
      }
      
      return acc;
    }, {
      totalScore: 0,
      totalPutts: 0,
      totalPenalties: 0,
      fairwaysHit: 0,
      girs: 0,
      holesCompleted: 0,
      strokesGained: 0
    });
    
    setRunningStats(stats);
  }, [scores, currentHole]);

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


  const fetchUserProfilePicture = useCallback(async () => {
    if (userID === null) {
      return;
    }
    const token = await AsyncStorage.getItem("authToken");
    try {
      const cacheBust = Date.now();
      const response = await fetch(`${BACKEND_URL}/api/user/${userID}/profile_picture/?cache=${cacheBust}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.profile_picture) {
        const imageUri = data.profile_picture.includes('?') 
          ? `${data.profile_picture}&_cache=${cacheBust}` 
          : `${data.profile_picture}?_cache=${cacheBust}`;
        
        setProfilePicture(imageUri);
      }
    } catch (err) {
      console.error("Error fetching user profile picture:", err);
    }
  }, [userID]);



  if (showSummary) {
    return (
      <RoundInputShowSummary
        scores={scores}
        totalScore={totalScore}
        currentHole={currentHole}
        selectedCourse={selectedCourse}
        selectedTee={selectedTee}
        selectedGender={selectedGender}
        notes={notes}
        runningStats={runningStats}
        weatherData={weatherData}
        currentLocation={currentLocation}
        distanceToHole={distanceToHole}
        phoneHeading={phoneHeading}
        isLocationEnabled={isLocationEnabled}
        handleNext={handleNext}
        handlePrev={handlePrev}
        handleScoreChange={handleScoreChange}
        handleSave={handleSave}
        handleSummaryFinish={handleSummaryFinish}
        saveDraft={saveDraft}
        isSaving={isSaving}
        holeCountSelection={holeCountSelection}
        setMapModalVisible={setMapModalVisible}
        setSelectedHole={setSelectedHole}
        setShowWeatherImpact={setShowWeatherImpact}
        showWeatherImpact={showWeatherImpact}
        setNotes={setNotes}
        onEditRound={handleEditRound}
      />
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
    const weatherImpacts = getWeatherImpact(weatherData);
    
    // Get hole coordinates - try multiple sources
    let holeLat = null;
    let holeLon = null;
    
    // First try: hole detail from database
    if (holeDetail?.latitude && holeDetail?.longitude) {
      holeLat = holeDetail.latitude;
      holeLon = holeDetail.longitude;
    }
    // Second try: legacy GPS coordinates for supported courses
    else if (selectedCourse && SUPPORTED_COURSES_WITH_GPS.includes(selectedCourse.course_name)) {
      const holeCoords = ALL_HOLE_COORDINATES[currentHole];
      if (holeCoords) {
        holeLat = holeCoords.lat;
        holeLon = holeCoords.lon;
      }
    }
    
    // Determine what to show on map
    const userLat = currentLocation?.coords?.latitude;
    const userLon = currentLocation?.coords?.longitude;

    const greenMarkerRegion: Region = {
      latitude: userLat || 0,
      longitude: userLon || 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }

    // Create markers array - only include markers with valid coordinates
    const markers: MarkerPoint[] = [];
    
    // Add user location marker if available
    if (userLat && userLon) {
      markers.push({
        latitude: userLat,
        longitude: userLon,
        title: "Your Location",
        description: "Current GPS location",
        type: 'user',
      });
    }
    
    const handleGreenLocationSelected = async (coordinate: {latitude: number, longitude: number}) => {
      if (coordinate && coordinate.latitude && coordinate.longitude) {
        try {
          const currentHoleScore = scores[currentHole];
          if (!currentHoleScore?.hole_id) {
            showAlert("Cannot update location: hole ID not found", "error");
            return;
          }
          console.log("Updating green location for hole:", currentHoleScore.hole_id, coordinate);
          const response = await fetch(`${BACKEND_URL}/api/holes/${currentHoleScore.hole_id}/location/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to update green location:", errorText);
            showAlert("Failed to update green location", "error");
            return;
          }

        
        } catch (error) {
          console.error("Error handling green location selection:", error);
        }
      }      
    };

    // Add hole marker if coordinates are available
    if (holeLat && holeLon) {
      markers.push({
        latitude: holeLat,
        longitude: holeLon,
        title: `Hole ${s.hole_number || currentHole + 1} Pin`,
        description: `Par ${s.par} - ${s.yardage} yards`,
        type: 'pin',
      });
    }



    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView 
          style={styles.playingContainer}
          contentContainerStyle={styles.playingContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Running Stats Header */}
          <View style={styles.runningStatsHeader}>
            <View style={styles.runningStatsContainer}>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{runningStats.totalScore}</Text>
                <Text style={styles.statPillLabel}>Score</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{runningStats.strokesGained >= 0 ? `+${runningStats.strokesGained}` : runningStats.strokesGained}</Text>
                <Text style={styles.statPillLabel}>To Par</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{runningStats.girs}</Text>
                <Text style={styles.statPillLabel}>GIRs</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{runningStats.totalPutts}</Text>
                <Text style={styles.statPillLabel}>Putts</Text>
              </View>
            </View>
          </View>

          {/* Map Section - Only show if we have coordinates */}
          {markers.length > 0 && (
            <GreenInputMap
              markers={markers}
              userPFP={profilePicture ?? undefined}
            />
          )}

          {/* Weather Impact Section - Now always shows when started for testing */}
          <View style={styles.weatherImpactCard}>
            <TouchableOpacity 
              style={styles.weatherImpactHeader}
              onPress={() => setShowWeatherImpact(!showWeatherImpact)}
            >
              <View style={styles.weatherImpactHeaderContent}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={20} color="#00BFFF" />
                <Text style={styles.weatherImpactTitle}>Weather Impact</Text>
                <View style={styles.weatherImpactBadge}>
                  <Text style={styles.weatherImpactBadgeText}>{weatherImpacts?.length || 0}</Text>
                </View>
              </View>
              <MaterialCommunityIcons 
                name={showWeatherImpact ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#00BFFF" 
              />
            </TouchableOpacity>
            
            {showWeatherImpact && (
              <View style={styles.weatherImpactContent}>
                {weatherData ? (
                  weatherImpacts && weatherImpacts.length > 0 ? (
                    weatherImpacts.map((impact, index) => (
                      <View key={index} style={styles.weatherImpactItem}>
                        <MaterialCommunityIcons name={impact.icon as any} size={18} color={impact.color} />
                        <View style={styles.weatherImpactItemContent}>
                          <Text style={styles.weatherImpactItemTitle}>{impact.title}</Text>
                          <Text style={styles.weatherImpactItemEffect}>{impact.effect}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.weatherImpactItem}>
                      <MaterialCommunityIcons name="weather-sunny" size={18} color="#4CAF50" />
                      <View style={styles.weatherImpactItemContent}>
                        <Text style={styles.weatherImpactItemTitle}>Perfect Conditions</Text>
                        <Text style={styles.weatherImpactItemEffect}>Weather conditions are ideal for golf. No adjustments needed.</Text>
                      </View>
                    </View>
                  )
                ) : (
                  <View style={styles.weatherImpactItem}>
                    <MaterialCommunityIcons name="cloud-alert" size={18} color="#FF6B6B" />
                    <View style={styles.weatherImpactItemContent}>
                      <Text style={styles.weatherImpactItemTitle}>No Weather Data</Text>
                      <Text style={styles.weatherImpactItemEffect}>Weather information is not available for this course.</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Compass Instruction - Shows when wind data is available but compass is not active */}
          {weatherData && weatherData.current && weatherData.current.wind_mph > 0 && phoneHeading === null && (
            <View style={styles.compassInstructionCard}>
              <View style={styles.compassInstructionHeader}>
                <MaterialCommunityIcons name="compass-outline" size={20} color="#FFA726" />
                <Text style={styles.compassInstructionTitle}>Live Wind Analysis Available</Text>
              </View>
              <View style={styles.compassInstructionContent}>
                <Text style={styles.compassInstructionText}>
                  Point your phone in the direction you want to hit the ball to see real-time wind effects on your shot distance.
                </Text>
                <View style={styles.compassInstructionSteps}>
                  <Text style={styles.compassInstructionStep}>📱 Hold phone upright</Text>
                  <Text style={styles.compassInstructionStep}>🎯 Point toward your target</Text>
                  <Text style={styles.compassInstructionStep}>📊 See live wind impact</Text>
                </View>
              </View>
            </View>
          )}

          {/* Live Compass Widget - Shows when wind data and phone heading are available */}
          {weatherData && weatherData.current && weatherData.current.wind_mph > 0 && phoneHeading !== null && (
            <View style={styles.compassCard}>
              <TouchableOpacity 
                style={styles.compassHeader}
                onPress={() => setShowCompass(!showCompass)}
              >
                <View style={styles.compassHeaderContent}>
                  <MaterialCommunityIcons name="compass-outline" size={20} color="#00BFFF" />
                  <Text style={styles.compassTitle}>Live Wind Direction</Text>
                  <View style={styles.compassBadge}>
                    <Text style={styles.compassBadgeText}>LIVE</Text>
                  </View>
                </View>
                <MaterialCommunityIcons 
                  name={showCompass ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#00BFFF" 
                />
              </TouchableOpacity>
              
              {showCompass && (
                <View style={styles.compassContent}>
                  {/* Compass Circle */}
                  <View style={styles.compassCircle}>
                    {/* Cardinal directions */}
                    <Text style={[styles.compassDirection, styles.compassNorth]}>N</Text>
                    <Text style={[styles.compassDirection, styles.compassEast]}>E</Text>
                    <Text style={[styles.compassDirection, styles.compassSouth]}>S</Text>
                    <Text style={[styles.compassDirection, styles.compassWest]}>W</Text>
                    
                    {/* Phone direction indicator */}
                    <View 
                      style={[
                        styles.compassPhoneIndicator, 
                        { transform: [{ rotate: `${phoneHeading}deg` }] }
                      ]}
                    >
                      <View style={styles.compassPhoneArrow} />
                    </View>
                    
                    {/* Wind direction indicator */}
                    <View 
                      style={[
                        styles.compassWindIndicator, 
                        { transform: [{ rotate: `${windDirectionToDegrees(weatherData.current.wind_dir)}deg` }] }
                      ]}
                    >
                      <View style={styles.compassWindArrow} />
                    </View>
                    
                    {/* Center dot */}
                    <View style={styles.compassCenter} />
                  </View>
                  
                  {/* Wind effect display */}
                  <View style={styles.windEffectContainer}>
                    {(() => {
                      const windDegrees = windDirectionToDegrees(weatherData.current.wind_dir);
                      const relative = getWindRelativeDirection(phoneHeading, windDegrees);
                      const windSpeed = weatherData.current.wind_mph;
                      
                      const headwindYards = Math.round(windSpeed * 2);
                      const tailwindYards = Math.round(windSpeed * 1.5);
                      const crosswindYards = Math.round(windSpeed * 0.8);
                      
                      let effectText = "";
                      let effectColor = "#00BFFF";
                      let effectIcon = "weather-windy";
                      
                      if (relative.type === 'headwind') {
                        effectText = `${headwindYards} yards AGAINST you`;
                        effectColor = "#FF6B6B";
                        effectIcon = "arrow-down-thick";
                      } else if (relative.type === 'tailwind') {
                        effectText = `+${tailwindYards} yards WITH you`;
                        effectColor = "#4CAF50";
                        effectIcon = "arrow-up-thick";
                      } else {
                        effectText = `±${crosswindYards} yards crosswind`;
                        effectColor = "#FFA726";
                        effectIcon = "arrow-left-right";
                      }
                      
                      return (
                        <View style={styles.windEffectDisplay}>
                          <MaterialCommunityIcons name={effectIcon as any} size={24} color={effectColor} />
                          <Text style={[styles.windEffectText, { color: effectColor }]}>{effectText}</Text>
                        </View>
                      );
                    })()}
                    
                    {/* Current readings */}
                    <View style={styles.compassReadings}>
                      <View style={styles.compassReading}>
                        <Text style={styles.compassReadingLabel}>Phone</Text>
                        <Text style={styles.compassReadingValue}>{Math.round(phoneHeading)}°</Text>
                      </View>
                      <View style={styles.compassReading}>
                        <Text style={styles.compassReadingLabel}>Wind</Text>
                        <Text style={styles.compassReadingValue}>{weatherData.current.wind_dir}</Text>
                      </View>
                      <View style={styles.compassReading}>
                        <Text style={styles.compassReadingLabel}>Speed</Text>
                        <Text style={styles.compassReadingValue}>{weatherData.current.wind_mph} mph</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          <Card style={styles.holeCard}>
            <View style={styles.holeHeader}>
              <TouchableOpacity
                onPress={() => {
                  setSkipLoadMostRecent(true);
                  clearDraftState();
                  showAlert("Round ended", "info");
                }}
                style={styles.exitButton}
              >
                <MaterialCommunityIcons name="close-circle" size={24} color="#ff6b6b" />
              </TouchableOpacity>
              
              <View style={styles.holeInfo}>
                <Text style={styles.holeNumber}>HOLE {s.hole_number || currentHole + 1}</Text>
                <View style={styles.holeDetails}>
                  <View style={styles.holeDetailItem}>
                    <MaterialCommunityIcons name="flag" size={16} color="#00BFFF" />
                    <Text style={styles.holeDetailText}>Par {s.par}</Text>
                  </View>
                  <View style={styles.holeDetailItem}>
                    <MaterialCommunityIcons name="map-marker-distance" size={16} color="#00BFFF" />
                    <Text style={styles.holeDetailText}>{s.yardage} yds</Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressIndicator}>
                <Text style={styles.progressText}>{currentHole + 1}/{scores.length}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${((currentHole + 1) / scores.length) * 100}%` }]} />
                </View>
              </View>
            </View>

            <Card.Content style={styles.holeContent}>
              {/* Current Score Display */}
              <View style={styles.currentScoreSection}>
                <View style={[styles.scoreDisplay, getScoreDisplayStyle(currentStrokes, s.par)]}>
                  <Text style={styles.scoreDisplayNumber}>{currentStrokes || 0}</Text>
                  <Text style={styles.scoreDisplayLabel}>
                    {currentStrokes === 0 ? 'STROKES' : 
                     scoreToPar === 0 ? 'PAR' :
                     scoreToPar < 0 ? (scoreToPar === -1 ? 'BIRDIE' : scoreToPar === -2 ? 'EAGLE' : 'AMAZING!') :
                     scoreToPar === 1 ? 'BOGEY' : 'DOUBLE+'}
                  </Text>
                </View>
                
                {/* GIR Auto-Indicator */}
                {currentStrokes > 0 && s.putts && parseInt(s.putts) > 0 && (
                  <View style={[styles.girIndicator, s.gir && styles.girIndicatorActive]}>
                    <MaterialCommunityIcons 
                      name={s.gir ? "target" : "target-account"} 
                      size={16} 
                      color={s.gir ? "#4CAF50" : "rgba(255,255,255,0.5)"} 
                    />
                    <Text style={[styles.girText, s.gir && styles.girTextActive]}>
                      {s.gir ? "Green in Regulation!" : "Missed GIR"}
                    </Text>
                  </View>
                )}
              </View>

              {/* GPS Distance */}
              {selectedCourse && SUPPORTED_COURSES_WITH_GPS.includes(selectedCourse.course_name) && (
                <View style={styles.gpsSection}>
                  <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#00BFFF" />
                  <Text style={styles.gpsText}>
                    {distanceToHole !== null ? `${distanceToHole} yards to pin` : "Getting GPS..."}
                  </Text>
                </View>
              )}
              
              {/* Green Location Input - Only show for courses without GPS support */}
              {selectedCourse && !SUPPORTED_COURSES_WITH_GPS.includes(selectedCourse.course_name) && userLat && userLon && (
                <GreenLocationInputMap
                  region={greenMarkerRegion}
                  markers={markers}
                  holeDetail={holeDetail}
                  onGreenLocationSelected={handleGreenLocationSelected}
                />
              )}

              {/* Shot Input Grid */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>Shot Breakdown</Text>
                <View style={styles.inputGrid}>
                  <View style={styles.inputCard}>
                    <MaterialCommunityIcons name="golf-tee" size={20} color="#4CAF50" />
                    <Text style={styles.inputLabel}>Putts</Text>
                    <TextInput
                      mode="outlined"
                      value={s.putts?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("putts", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={styles.inputField}
                      outlineColor="rgba(255,255,255,0.2)"
                      activeOutlineColor="#4CAF50"
                      textColor="#FFFFFF"
                      placeholder="0"
                      dense
                    />
                  </View>

                  <View style={styles.inputCard}>
                    <MaterialCommunityIcons name="golf" size={20} color="#FF9800" />
                    <Text style={styles.inputLabel}>Approach</Text>
                    <TextInput
                      mode="outlined"
                      value={s.approach?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("approach", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={styles.inputField}
                      outlineColor="rgba(255,255,255,0.2)"
                      activeOutlineColor="#FF9800"
                      textColor="#FFFFFF"
                      placeholder="0"
                      dense
                    />
                  </View>

                  <View style={styles.inputCard}>
                    <MaterialCommunityIcons name="golf-cart" size={20} color="#9C27B0" />
                    <Text style={styles.inputLabel}>Chips</Text>
                    <TextInput
                      mode="outlined"
                      value={s.chips?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("chips", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={styles.inputField}
                      outlineColor="rgba(255,255,255,0.2)"
                      activeOutlineColor="#9C27B0"
                      textColor="#FFFFFF"
                      placeholder="0"
                      dense
                    />
                  </View>

                  <View style={styles.inputCard}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#F44336" />
                    <Text style={styles.inputLabel}>Penalties</Text>
                    <TextInput
                      mode="outlined"
                      value={s.penalties?.toString() ?? ""}
                      onChangeText={v => handleScoreChange("penalties", v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      style={[styles.inputField, styles.penaltyField]}
                      outlineColor="rgba(244,67,54,0.3)"
                      activeOutlineColor="#F44336"
                      textColor="#FFFFFF"
                      placeholder="0"
                      dense
                    />
                  </View>
                </View>
              </View>

              {/* Performance Toggles */}
              <View style={styles.performanceSection}>
                <Text style={styles.sectionTitle}>Performance</Text>
                <View style={styles.toggleContainer}>
                  {s.par > 3 && (
                    <View style={styles.toggleCard}>
                      <View style={styles.toggleInfo}>
                        <MaterialCommunityIcons name="flag-checkered" size={20} color="#4CAF50" />
                        <Text style={styles.toggleLabel}>Fairway Hit</Text>
                      </View>
                      <Switch 
                        value={!!s.fairway} 
                        onValueChange={v => handleScoreChange("fairway", v)} 
                        thumbColor={s.fairway ? "#4CAF50" : "#666"}
                        trackColor={{false: "rgba(255,255,255,0.2)", true: "rgba(76,175,80,0.3)"}}
                      />
                    </View>
                  )}
                  
                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <MaterialCommunityIcons name="target" size={20} color="#00BFFF" />
                      <Text style={styles.toggleLabel}>Green in Regulation</Text>
                      <Text style={styles.toggleSubtext}>Auto-calculated</Text>
                    </View>
                    <View style={[styles.autoIndicator, s.gir && styles.autoIndicatorActive]}>
                      <Text style={styles.autoText}>{s.gir ? "YES" : "NO"}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Navigation */}
              <View style={styles.navigationSection}>
                <Button 
                  mode="outlined" 
                  style={[styles.navButton, styles.prevButton]} 
                  onPress={handlePrev} 
                  disabled={currentHole === 0}
                  icon="chevron-left"
                  textColor={currentHole === 0 ? "#666" : "#00BFFF"}
                  contentStyle={styles.navButtonContent}
                >
                  Previous
                </Button>
                
                {currentHole < scores.length - 1 ? (
                  <Button 
                    mode="contained" 
                    style={[styles.navButton, styles.nextButton]} 
                    onPress={handleNext}
                    icon="chevron-right"
                    contentStyle={[styles.navButtonContent, { flexDirection: 'row-reverse' }]}
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
                    icon="flag-checkered"
                    contentStyle={styles.navButtonContent}
                  >
                    Finish Round
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
        </ScrollView>
      </TouchableWithoutFeedback>
    );
  }

  // Course Selection Screen - Completely Redesigned
  return (
    <ScrollView
      style={styles.setupContainer}
      contentContainerStyle={styles.setupContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.welcomeSection}>
        <MaterialCommunityIcons name="golf" size={48} color="#00BFFF" />
        <Text style={styles.welcomeTitle}>Start Your Round</Text>
        <Text style={styles.welcomeSubtitle}>Track every shot, improve your game</Text>
      </View>

      <Card style={styles.setupCard}>
        <Card.Content style={styles.setupCardContent}>
          {/* Course Selection */}
          <View style={styles.selectionSection}>
            <View style={styles.selectionHeader}>
              <MaterialCommunityIcons name="golf-tee" size={24} color="#00BFFF" />
              <Text style={styles.selectionTitle}>Course</Text>
              <Button 
                mode="text" 
                onPress={() => setDraftsDialogVisible(true)}
                icon="file-document-outline"
                textColor="#00BFFF"
                style={styles.draftsButton}
              >
                Drafts
              </Button>
            </View>
            
            <TouchableOpacity 
              style={[styles.selectionCard, selectedCourse && styles.selectionCardSelected]}
              onPress={() => setCourseDialogVisible(true)}
            >
              {selectedCourse ? (
                <View style={styles.selectedCourseContent}>
                  <Text style={styles.selectedCourseTitle}>{selectedCourse.course_name}</Text>
                  <Text style={styles.selectedCourseSubtitle}>
                    {typeof selectedCourse.location === 'string' 
                      ? selectedCourse.location 
                      : [selectedCourse.location?.city, selectedCourse.location?.state].filter(Boolean).join(', ')}
                  </Text>
                </View>
              ) : (
                <View style={styles.placeholderContent}>
                  <MaterialCommunityIcons name="map-search" size={24} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.placeholderText}>Select a course</Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-right" size={24} color="#00BFFF" />
            </TouchableOpacity>
          </View>

          {/* Weather Information */}
          {selectedCourse && (
            <View style={styles.selectionSection}>
              <View style={styles.selectionHeader}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={24} color="#00BFFF" />
                <Text style={styles.selectionTitle}>Current Weather</Text>
                {weatherError && (
                  <TouchableOpacity
                    onPress={() => setShowWeatherDebug(!showWeatherDebug)}
                    style={styles.debugButton}
                  >
                    <MaterialCommunityIcons name="bug" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.weatherCard}>
                {loadingWeather ? (
                  <View style={styles.weatherLoading}>
                    <MaterialCommunityIcons name="loading" size={20} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.weatherLoadingText}>Loading weather...</Text>
                  </View>
                ) : weatherData ? (
                  <View style={styles.weatherContent}>
                    <View style={styles.weatherMain}>
                      <MaterialCommunityIcons 
                        name={getWeatherIcon(weatherData.current.condition.text)} 
                        size={32} 
                        color="#00BFFF" 
                      />
                      <View style={styles.weatherTemp}>
                        <Text style={styles.weatherTempValue}>{Math.round(weatherData.current.temp_f)}°F</Text>
                        <Text style={styles.weatherCondition}>{weatherData.current.condition.text}</Text>
                      </View>
                    </View>
                    <View style={styles.weatherDetails}>
                      <View style={styles.weatherDetailItem}>
                        <MaterialCommunityIcons name="weather-windy" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.weatherDetailText}>{weatherData.current.wind_mph} mph</Text>
                      </View>
                      <View style={styles.weatherDetailItem}>
                        <MaterialCommunityIcons name="water-percent" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.weatherDetailText}>{weatherData.current.humidity}%</Text>
                      </View>
                      <View style={styles.weatherDetailItem}>
                        <MaterialCommunityIcons name="eye" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.weatherDetailText}>{weatherData.current.vis_miles} mi</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.weatherError}>
                    <MaterialCommunityIcons name="weather-cloudy-alert" size={20} color="#FF6B6B" />
                    <Text style={styles.weatherErrorText}>
                      {weatherError || "Weather unavailable"}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Debug Information Panel */}
              {weatherError && showWeatherDebug && (
                <View style={styles.debugPanel}>
                  <View style={styles.debugHeader}>
                    <MaterialCommunityIcons name="bug" size={16} color="#FF6B6B" />
                    <Text style={styles.debugTitle}>Debug Info (TestFlight)</Text>
                  </View>
                  <ScrollView style={styles.debugScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.debugText}>{weatherDebugInfo}</Text>
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Gender Selection */}
          <View style={styles.selectionSection}>
            <View style={styles.selectionHeader}>
              <MaterialCommunityIcons name="account" size={24} color="#00BFFF" />
              <Text style={styles.selectionTitle}>Gender</Text>
            </View>
            
            <View style={styles.genderContainer}>
              <TouchableOpacity 
                style={[styles.genderCard, selectedGender === "male" && styles.genderCardSelected]}
                onPress={() => setSelectedGender("male")}
              >
                <MaterialCommunityIcons 
                  name="account" 
                  size={32} 
                  color={selectedGender === "male" ? "#00BFFF" : "rgba(255,255,255,0.5)"} 
                />
                <Text style={[styles.genderText, selectedGender === "male" && styles.genderTextSelected]}>
                  Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.genderCard, selectedGender === "female" && styles.genderCardSelected]}
                onPress={() => setSelectedGender("female")}
              >
                <MaterialCommunityIcons 
                  name="account" 
                  size={32} 
                  color={selectedGender === "female" ? "#FF69B4" : "rgba(255,255,255,0.5)"} 
                />
                <Text style={[styles.genderText, selectedGender === "female" && styles.genderTextSelected]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tee Selection */}
          <View style={styles.selectionSection}>
            <View style={styles.selectionHeader}>
              <MaterialCommunityIcons name="flag" size={24} color="#00BFFF" />
              <Text style={styles.selectionTitle}>Tee</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.selectionCard, selectedTee && styles.selectionCardSelected]}
              onPress={() => setTeeDialogVisible(true)}
              disabled={!selectedCourse || !selectedGender}
            >
              {selectedTee ? (
                <Text style={styles.selectedText}>{selectedTee}</Text>
              ) : (
                <Text style={styles.placeholderText}>
                  {!selectedCourse || !selectedGender ? "Select course & gender first" : "Choose tee"}
                </Text>
              )}
              <MaterialCommunityIcons name="chevron-right" size={24} color="#00BFFF" />
            </TouchableOpacity>
          </View>

          {/* Hole Count Selection */}
          <View style={styles.selectionSection}>
            <View style={styles.selectionHeader}>
              <MaterialCommunityIcons name="numeric" size={24} color="#00BFFF" />
              <Text style={styles.selectionTitle}>Holes</Text>
            </View>
            
            <View style={styles.holeCountContainer}>
              <TouchableOpacity
                style={[styles.holeCountCard, holeCountSelection === 9 && styles.holeCountCardSelected]}
                onPress={() => setHoleCountSelection(9)}
              >
                <Text style={[styles.holeCountNumber, holeCountSelection === 9 && styles.holeCountNumberSelected]}>9</Text>
                <Text style={[styles.holeCountLabel, holeCountSelection === 9 && styles.holeCountLabelSelected]}>Holes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.holeCountCard, holeCountSelection === 18 && styles.holeCountCardSelected]}
                onPress={() => setHoleCountSelection(18)}
              >
                <Text style={[styles.holeCountNumber, holeCountSelection === 18 && styles.holeCountNumberSelected]}>18</Text>
                <Text style={[styles.holeCountLabel, holeCountSelection === 18 && styles.holeCountLabelSelected]}>Holes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>

        <Card.Actions style={styles.setupActions}>
          <Button
            mode="contained"
            style={styles.startButton}
            onPress={handleStart}
            disabled={!selectedCourse || !selectedGender || !selectedTee || loading}
            icon="play-circle"
            contentStyle={styles.startButtonContent}
          >
            Start Round
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={() => router.push('/ViewRounds')}
            style={styles.viewRoundsButton}
            textColor="#00BFFF"
            icon="history"
          >
            View Past Rounds
          </Button>
        </Card.Actions>
      </Card>

      <Portal>
        <Dialog visible={courseDialogVisible} onDismiss={() => setCourseDialogVisible(false)} style={styles.teeDialog}>
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
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
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
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
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

      <Portal>
        <Dialog visible={draftsDialogVisible} onDismiss={() => setDraftsDialogVisible(false)} style={styles.teeDialog}>
          <Dialog.Title style={styles.teeDialogTitle}>Saved Drafts</Dialog.Title>
          <Dialog.Content style={styles.teeDialogContent}>
            {drafts.length === 0 ? (
              <Text style={styles.noTeesText}>No saved drafts found.</Text>
            ) : (
              <ScrollView 
                style={{maxHeight: 350}}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.teeScrollContent}
              >
                {drafts.map((draft) => (
                  <Card key={draft.draft_id} style={styles.draftCard}>
                    <Card.Title 
                      title={draft.selected_course?.course_name || draft.selected_course?.club_name || "Unknown Course"} 
                      subtitle={`Last saved: ${formatDate(draft.timestamp)}`}
                      titleStyle={{color: '#fff', fontSize: 14}}
                      subtitleStyle={{color: '#ccc', fontSize: 12}}
                    />
                    <Card.Actions style={{justifyContent: 'flex-end', paddingTop: 0}}>
                      <Button onPress={() => deleteDraft(draft.draft_id)} textColor="#f44">Delete</Button>
                      <Button onPress={() => loadDraft(draft)}>Load</Button>
                    </Card.Actions>
                  </Card>
                ))}
              </ScrollView>
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

  // Helper function for weather icons
  function getWeatherIcon(condition: string) {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
      return 'weather-sunny' as const;
    } else if (conditionLower.includes('partly cloudy') || conditionLower.includes('partly')) {
      return 'weather-partly-cloudy' as const;
    } else if (conditionLower.includes('cloudy') || conditionLower.includes('overcast')) {
      return 'weather-cloudy' as const;
    } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return 'weather-rainy' as const;
    } else if (conditionLower.includes('snow')) {
      return 'weather-snowy' as const;
    } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return 'weather-lightning' as const;
    } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
      return 'weather-fog' as const;
    } else if (conditionLower.includes('wind')) {
      return 'weather-windy' as const;
    } else {
      return 'weather-partly-cloudy' as const;
    }
  }

  // Helper function for score display styling
  function getScoreDisplayStyle(strokes: number, par: number) {
    const diff = strokes - par;
    
    if (strokes === 0) {
      return styles.scoreDisplayNeutral;
    } else if (diff <= -2) {
      return styles.scoreDisplayEagle;
    } else if (diff === -1) {
      return styles.scoreDisplayBirdie;
    } else if (diff === 0) {
      return styles.scoreDisplayPar;
    } else if (diff === 1) {
      return styles.scoreDisplayBogey;
    } else {
      return styles.scoreDisplayDouble;
    }
  }


  // Helper function to get weather impact advice
  function getWeatherImpact(weather: any) {
    if (!weather) return null;

    const temp = weather.current.temp_f;
    const windSpeed = weather.current.wind_mph;
    const humidity = weather.current.humidity;
    const condition = weather.current.condition.text.toLowerCase();
    const windDir = weather.current.wind_dir;



    let impacts = [];

    // Temperature impacts
    if (temp < 45) {
      const distanceLoss = Math.round(temp < 32 ? 8 : 5); // More loss in freezing temps
      impacts.push({
        type: "temperature",
        icon: "thermometer-minus",
        color: "#87CEEB",
        title: "Cold Weather",
        effect: `Ball travels ${distanceLoss}-${distanceLoss + 3} yards less. Air is denser. Consider using one more club.`
      });
    } else if (temp > 85) {
      const distanceGain = Math.round(temp > 95 ? 8 : 5); // More gain in extreme heat
      impacts.push({
        type: "temperature",
        icon: "thermometer-plus",
        color: "#FF6B6B",
        title: "Hot Weather",
        effect: `Ball travels ${distanceGain}-${distanceGain + 3} yards farther. Thinner air. Consider using one less club.`
      });
    }

    // Enhanced wind impacts with real-time phone direction
    if (windSpeed > 5) {
      const calculateWindEffect = (windMph: number) => {
        const headwindYards = Math.round(windMph * 2);
        const tailwindYards = Math.round(windMph * 1.5);
        const crosswindYards = Math.round(windMph * 0.8);
        
        return { headwindYards, tailwindYards, crosswindYards };
      };

      const { headwindYards, tailwindYards, crosswindYards } = calculateWindEffect(windSpeed);
      
      // Real-time wind analysis if phone heading is available
      let liveWindAnalysis = "";
      if (phoneHeading !== null) {
        const windDegrees = windDirectionToDegrees(windDir);
        const relative = getWindRelativeDirection(phoneHeading, windDegrees);
        
        const phoneDirection = Math.round(phoneHeading);
        
        if (relative.type === 'headwind') {
          liveWindAnalysis = `\n📱 CURRENT: ${headwindYards} yards AGAINST you (${phoneDirection}°)`;
        } else if (relative.type === 'tailwind') {
          liveWindAnalysis = `\n📱 CURRENT: +${tailwindYards} yards WITH you (${phoneDirection}°)`;
        } else {
          liveWindAnalysis = `\n📱 CURRENT: ±${crosswindYards} yards crosswind (${phoneDirection}°)`;
        }
      }

      if (windSpeed > 15) {
        impacts.push({
          type: "wind",
          icon: "weather-windy",
          color: "#4ECDC4",
          title: `Strong Wind (${windSpeed} mph ${windDir})`,
          effect: `⬇️ Into wind: -${headwindYards} yards\n⬆️ With wind: +${tailwindYards} yards\n↔️ Crosswind: ±${crosswindYards} yards lateral${liveWindAnalysis}\n\nAdjust club selection and aim significantly for wind direction.`
        });
      } else if (windSpeed > 8) {
        impacts.push({
          type: "wind",
          icon: "weather-windy",
          color: "#45B7D1",
          title: `Moderate Wind (${windSpeed} mph ${windDir})`,
          effect: `⬇️ Into wind: -${headwindYards} yards\n⬆️ With wind: +${tailwindYards} yards\n↔️ Crosswind: ±${crosswindYards} yards lateral${liveWindAnalysis}\n\nAccount for wind direction on approach shots.`
        });
      } else {
        impacts.push({
          type: "wind",
          icon: "weather-windy",
          color: "#87CEEB",
          title: `Light Wind (${windSpeed} mph ${windDir})`,
          effect: `⬇️ Into wind: -${headwindYards} yards\n⬆️ With wind: +${tailwindYards} yards\n↔️ Crosswind: ±${crosswindYards} yards lateral${liveWindAnalysis}\n\nMinor adjustments needed for longer shots.`
        });
      }
    }

    // Humidity impacts with distance effects
    if (humidity > 80) {
      const humidityEffect = humidity > 90 ? 3 : 2;
      impacts.push({
        type: "humidity",
        icon: "water-percent",
        color: "#96CEB4",
        title: "High Humidity",
        effect: `Ball may travel ${humidityEffect}-${humidityEffect + 2} yards less due to dense air. Grip may become slippery - use towel frequently.`
      });
    }

    // Precipitation impacts
    if (condition.includes('rain') || condition.includes('drizzle')) {
      impacts.push({
        type: "precipitation",
        icon: "weather-rainy",
        color: "#74B9FF",
        title: "Wet Conditions",
        effect: "Reduced ball roll: -10-15 yards total distance. Softer landing on greens. Course plays 1-2 clubs longer. Keep grips dry."
      });
    }

    // Enhanced course condition based on weather
    if (condition.includes('sunny') && temp > 75 && humidity < 60) {
      impacts.push({
        type: "course",
        icon: "weather-sunny",
        color: "#FDCB6E",
        title: "Dry Conditions",
        effect: "Firm fairways: +10-20 yards roll. Hard greens: ball may bounce and roll more. Course plays shorter than yardage."
      });
    }

    // For testing - add a sample impact if no real impacts are found
    if (impacts.length === 0) {
      impacts.push({
        type: "test",
        icon: "information",
        color: "#00BFFF",
        title: "Ideal Conditions",
        effect: `${temp}°F, ${windSpeed}mph wind from ${windDir}, ${humidity}% humidity. ${condition}. Play normal yardages.`
      });
    }

    return impacts;
  }

}

function getWindRelativeDirection(phoneHeading: number, windDegrees: number) {
  // Normalize angles to 0-360 range
  const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
  
  const normalizedPhone = normalizeAngle(phoneHeading);
  const normalizedWind = normalizeAngle(windDegrees);
  
  // Calculate the relative angle between phone direction and wind direction
  let relativeDiff = normalizedWind - normalizedPhone;
  
  // Normalize to -180 to 180 range for easier classification
  if (relativeDiff > 180) relativeDiff -= 360;
  if (relativeDiff < -180) relativeDiff += 360;
  
  // Classify wind direction relative to phone heading
  const absRelative = Math.abs(relativeDiff);
  
  if (absRelative <= 45) {
    // Wind is coming from the same direction as phone is pointing (headwind)
    return { type: 'headwind', angle: relativeDiff };
  } else if (absRelative >= 135) {
    // Wind is coming from behind the phone direction (tailwind)
    return { type: 'tailwind', angle: relativeDiff };
  } else {
    // Wind is coming from the side (crosswind)
    return { type: 'crosswind', angle: relativeDiff };
  }
}

function windDirectionToDegrees(windDir: string): number {
  const directions: { [key: string]: number } = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
  };
  
  return directions[windDir.toUpperCase()] || 0;
}

