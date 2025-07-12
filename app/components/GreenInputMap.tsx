import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import styles from './RoundInputStyles.js';
import { MarkerPoint } from './types/RoundInputTypes';

interface GreenInputMapProps {
    markers?: MarkerPoint[];
    userPFP?: string;
}

export default function GreenInputMap(props: GreenInputMapProps) {
    const { markers, userPFP } = props;
    
    // State for draggable measurement point
    const [measurementPoint, setMeasurementPoint] = useState<{latitude: number, longitude: number} | null>(null);
    // State for collapsible widget
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Calculate distance between two points in yards
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in meters

        return Math.round(d * 1.09361); // Convert to yards
    };

    // Calculate bearing from user to hole (for map orientation)
    const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        let bearing = Math.atan2(y, x) * (180 / Math.PI);
        
        // Normalize to 0-360 degrees
        bearing = (bearing + 360) % 360;
        
        return bearing;
    };

    // Find user and pin markers
    const userMarker = markers?.find(m => m.type === 'user');
    const pinMarker = markers?.find(m => m.type === 'pin');
    
    // Initialize measurement point at midpoint between markers when both exist
    const initializeMeasurementPoint = () => {
        if (userMarker && pinMarker && !measurementPoint) {
            setMeasurementPoint({
                latitude: (userMarker.latitude + pinMarker.latitude) / 2,
                longitude: (userMarker.longitude + pinMarker.longitude) / 2,
            });
        }
    };
    
    // Call initialization
    if (userMarker && pinMarker && !measurementPoint) {
        initializeMeasurementPoint();
    }
    
    // Calculate distances from measurement point to markers
    let distanceToUser = null;
    let distanceToPin = null;
    let lineToUser: { latitude: number; longitude: number }[] = [];
    let lineToPin: { latitude: number; longitude: number }[] = [];
    let userLineMidpoint = null;
    let pinLineMidpoint = null;
    
    if (measurementPoint) {
        if (userMarker) {
            distanceToUser = calculateDistance(
                measurementPoint.latitude,
                measurementPoint.longitude,
                userMarker.latitude,
                userMarker.longitude
            );
            lineToUser = [
                { latitude: measurementPoint.latitude, longitude: measurementPoint.longitude },
                { latitude: userMarker.latitude, longitude: userMarker.longitude }
            ];
            // Calculate midpoint of line to user
            userLineMidpoint = {
                latitude: (measurementPoint.latitude + userMarker.latitude) / 2,
                longitude: (measurementPoint.longitude + userMarker.longitude) / 2,
            };
        }
        
        if (pinMarker) {
            distanceToPin = calculateDistance(
                measurementPoint.latitude,
                measurementPoint.longitude,
                pinMarker.latitude,
                pinMarker.longitude
            );
            lineToPin = [
                { latitude: measurementPoint.latitude, longitude: measurementPoint.longitude },
                { latitude: pinMarker.latitude, longitude: pinMarker.longitude }
            ];
            // Calculate midpoint of line to pin
            pinLineMidpoint = {
                latitude: (measurementPoint.latitude + pinMarker.latitude) / 2,
                longitude: (measurementPoint.longitude + pinMarker.longitude) / 2,
            };
        }
    }
    
    // Calculate region with automatic orientation
    const region = (() => {
        if (userMarker && pinMarker) {
            // Calculate the distance between markers to determine appropriate zoom
            const latDiff = Math.abs(pinMarker.latitude - userMarker.latitude);
            const lonDiff = Math.abs(pinMarker.longitude - userMarker.longitude);
            
            // Add padding (50% more than the actual distance for better view)
            const latPadding = Math.max(latDiff * 0.5, 0.002); // Minimum padding
            const lonPadding = Math.max(lonDiff * 0.5, 0.002);
            
            // Calculate bearing from user to pin
            const bearing = calculateBearing(
                userMarker.latitude,
                userMarker.longitude,
                pinMarker.latitude,
                pinMarker.longitude
            );
            
            // Calculate center point slightly shifted toward user (so user appears in bottom portion)
            const userWeight = 0.6; // 60% weight to user position
            const pinWeight = 0.4;  // 40% weight to pin position
            const centerLat = (userMarker.latitude * userWeight) + (pinMarker.latitude * pinWeight);
            const centerLon = (userMarker.longitude * userWeight) + (pinMarker.longitude * pinWeight);
            
            return {
                latitude: centerLat,
                longitude: centerLon,
                latitudeDelta: latDiff + (latPadding * 2),
                longitudeDelta: lonDiff + (lonPadding * 2),
                // This heading will rotate the map so the hole appears "up" from the user
                heading: bearing,
                pitch: 0, // Keep map flat for better readability
            };
        } else if (userMarker) {
            return {
                latitude: userMarker.latitude,
                longitude: userMarker.longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
                heading: 0,
                pitch: 0,
            };
        } else if (pinMarker) {
            return {
                latitude: pinMarker.latitude,
                longitude: pinMarker.longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
                heading: 0,
                pitch: 0,
            };
        } else {
            return {
                latitude: 0,
                longitude: 0,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
                heading: 0,
                pitch: 0,
            };
        }
    })();

    const renderCustomMarker = (marker: MarkerPoint, index: number) => {
        if (marker.type === 'pin') {
            // Custom flag marker for pin/hole location
            return (
                <Marker
                    key={`${marker.type}-${index}`}
                    coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                    title={marker.title}
                    description={marker.description}
                >
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        backgroundColor: 'rgba(76, 175, 80, 0.9)',
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 5,
                    }}>
                        <MaterialCommunityIcons 
                            name="flag" 
                            size={18} 
                            color="#FFFFFF" 
                        />
                    </View>
                </Marker>
            );
        } else if (marker.type === 'user') {
            // User location marker - use profile picture if available, otherwise blue marker
            if (userPFP) {
                return (
                    <Marker
                        key={`${marker.type}-${index}`}
                        coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                        title={marker.title}
                        description={marker.description}
                    >
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            borderWidth: 3,
                            borderColor: '#00BFFF',
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 5,
                        }}>
                            <img 
                                src={userPFP} 
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                                alt="Profile"
                            />
                        </View>
                    </Marker>
                );
            } else {
                return (
                    <Marker
                        key={`${marker.type}-${index}`}
                        coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                        title={marker.title}
                        description={marker.description}
                    >
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            backgroundColor: '#00BFFF',
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 5,
                        }}>
                            <MaterialCommunityIcons 
                                name="account" 
                                size={18} 
                                color="#FFFFFF" 
                            />
                        </View>
                    </Marker>
                );
            }
        }
        
        // Fallback for any other marker types
        return (
            <Marker
                key={`default-${index}`}
                coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                title={marker.title}
                description={marker.description}
                pinColor="#FF0000"
            />
        );
    };
    
    return (
        <View style={styles.mapCard}>
            <TouchableOpacity 
                style={styles.mapHeader}
                onPress={() => setIsCollapsed(!isCollapsed)}
            >
                <View style={styles.mapHeaderContent}>
                    <MaterialCommunityIcons name="map-marker-distance" size={20} color="#4CAF50" />
                    <Text style={styles.mapTitle}>Course View</Text>
                    {measurementPoint && !isCollapsed && (
                        <View style={styles.mapBadge}>
                            <Text style={styles.mapBadgeText}>MEASURE</Text>
                        </View>
                    )}
                </View>
                <MaterialCommunityIcons 
                    name={isCollapsed ? "chevron-down" : "chevron-up"} 
                    size={20} 
                    color="#4CAF50" 
                />
            </TouchableOpacity>
            
            {!isCollapsed && (
                <View style={styles.mapContent}>
                    <View style={styles.mapContainer}>
                        <MapView
                            region={region}
                            style={{ width: '100%', height: '100%' }}
                            showsUserLocation={false}
                            mapType="satellite"
                            showsCompass={true}
                            showsScale={true}
                            rotateEnabled={true}
                            pitchEnabled={true}
                            // These props help with the automatic orientation
                            showsMyLocationButton={false}
                            toolbarEnabled={false}
                        >
                            {/* Render markers */}
                            {markers && markers.map((marker, index) => renderCustomMarker(marker, index))}
                            
                            {/* Draw lines from measurement point to markers */}
                            {lineToUser.length === 2 && (
                                <Polyline
                                    coordinates={lineToUser}
                                    strokeColor="#00BFFF"
                                    strokeWidth={2}
                                />
                            )}
                            
                            {lineToPin.length === 2 && (
                                <Polyline
                                    coordinates={lineToPin}
                                    strokeColor="#4CAF50"
                                    strokeWidth={2}
                                />
                            )}
                            
                            {/* Draggable measurement point */}
                            {measurementPoint && (
                                <Marker
                                    coordinate={measurementPoint}
                                    draggable={true}
                                    onDragEnd={(e) => {
                                        setMeasurementPoint(e.nativeEvent.coordinate);
                                    }}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                >
                                    <View style={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 40,
                                        height: 40,
                                        backgroundColor: 'rgba(21, 0, 177, 0.9)',
                                        borderRadius: 20,
                                        borderWidth: 3,
                                        borderColor: '#FFFFFF',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 3 },
                                        shadowOpacity: 0.4,
                                        shadowRadius: 6,
                                        elevation: 8,
                                    }}>
                                        <MaterialCommunityIcons 
                                            name="crosshairs" 
                                            size={20} 
                                            color="#FFFFFF" 
                                        />
                                    </View>
                                </Marker>
                            )}
                            
                            {/* Distance labels at midpoint of lines */}
                            {userLineMidpoint && distanceToUser && (
                                <Marker
                                    coordinate={userLineMidpoint}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                >
                                    <View style={{
                                        backgroundColor: 'rgba(0, 191, 255, 0.9)',
                                        borderRadius: 8,
                                        paddingHorizontal: 6,
                                        paddingVertical: 3,
                                        borderWidth: 1,
                                        borderColor: '#FFFFFF',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 5,
                                    }}>
                                        <Text style={{
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                        }}>
                                            {distanceToUser}y
                                        </Text>
                                    </View>
                                </Marker>
                            )}
                            
                            {pinLineMidpoint && distanceToPin && (
                                <Marker
                                    coordinate={pinLineMidpoint}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                >
                                    <View style={{
                                        backgroundColor: 'rgba(76, 175, 80, 0.9)',
                                        borderRadius: 8,
                                        paddingHorizontal: 6,
                                        paddingVertical: 3,
                                        borderWidth: 1,
                                        borderColor: '#FFFFFF',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 5,
                                    }}>
                                        <Text style={{
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                        }}>
                                            {distanceToPin}y
                                        </Text>
                                    </View>
                                </Marker>
                            )}
                        </MapView>
                    </View>
                    
                    {/* Instructions footer */}
                    <View style={styles.mapInstructions}>
                        <Text style={styles.mapInstructionsText}>
                            🎯 Tap & drag the Blue crosshair to measure distances to course features
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}