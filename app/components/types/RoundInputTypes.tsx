interface UserDetailSettings {
  bio: string, 
  current_handicap: number | null,
  email: string,
  first_name: string,
  last_name: string,
  pfp: string,
  username: string
}

interface HoleDetail {
  id: number;
  hole_number: number;
  par: number;
  yardage: number;
  handicap: number;
  latitude?: number;
  longitude?: number;
}

type Gender = "M" | "F"; 
interface Hole {
  id: number;
  hole_number: number;
  par: number;
  yardage: number;
  handicap: number;
  latitude: number | null; 
  longitude: number | null; 
  tee: number;
}

interface Tee {
  id: number;
  tee_name: string;
  gender: Gender;
  course_rating: number;
  slope_rating: number;
  bogey_rating: number;
  total_yards: number;
  total_meters: number;
  number_of_holes: number;
  par_total: number;
  front_course_rating: number;
  front_slope_rating: number;
  front_bogey_rating: number;
  back_course_rating: number;
  back_slope_rating: number;
  back_bogey_rating: number;
  holes: Hole[]; 
}

interface Course {
  id: number;
  club_name: string;
  course_name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  tees: Tee[]; // Confirmed: This is an array of Tee objects
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

interface WeatherData {
  temperature: number;
  condition: string;
  wind_speed: number;
  humidity: number;
  pressure: number;
  visibility: number;
}

interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
    heading?: number;
    pitch?: number;
}

interface MarkerPoint {
    latitude: number;
    longitude: number;
    title: string;
    description: string;
    type?: 'user' | 'pin' | 'default';
}

type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
    heading?: number;
}


export type { Draft, HoleDetail, LocalHoleScore, MapRegion, MarkerPoint, WeatherData, Region, UserDetailSettings, Hole, Tee, Course, Gender };
