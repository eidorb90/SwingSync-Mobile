interface HoleDetail {
  id: number;
  hole_number: number;
  par: number;
  yardage: number;
  handicap: number;
  latitude?: number;
  longitude?: number;
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


export type { Course, Draft, HoleDetail, LocalHoleScore, Location, MapRegion, MarkerPoint, TeeInfo, WeatherData, Region };
