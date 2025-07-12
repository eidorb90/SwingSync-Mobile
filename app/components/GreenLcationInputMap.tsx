import { useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Card, Text } from 'react-native-paper';
import { HoleDetail, MarkerPoint, Region } from './types/RoundInputTypes';






interface GreenLocationInputMapProps {
    region: Region;
    markers?: MarkerPoint[];
    holeDetail?: HoleDetail | null;
    onGreenLocationSelected?: (location: { latitude: number; longitude: number }) => void;
}

export default function GreenLocationInputMap(props: GreenLocationInputMapProps) {

    const { region, markers, holeDetail, onGreenLocationSelected } = props;
    const [selectedLocation, setSelectedLocation] = useState<MarkerPoint | null>(null);
    const [greenLocation, setGreenLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    const handleMapPress = (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        const location = { latitude, longitude };
        setGreenLocation(location);
        onGreenLocationSelected?.(location);
    };

    return (
        <View>
            <Text>Green Location Input Map</Text>
            <Card>
                <Card.Content>
                    <Text>Hole {holeDetail?.hole_number}</Text>
                    {greenLocation ? (
                        <>
                            <Text>Green Location Placed</Text>
                            <Text>Coordinates: {greenLocation.latitude.toFixed(6)}, {greenLocation.longitude.toFixed(6)}</Text>
                        </>
                    ) : (
                        <Text>Tap on the map to place green location</Text>
                    )}
                    {selectedLocation && (
                        <>
                            <Text>Selected Marker: {selectedLocation.title}</Text>
                            <Text>Marker Coordinates: {selectedLocation.latitude}, {selectedLocation.longitude}</Text>
                        </>
                    )}
                </Card.Content>
            </Card>
            <MapView
                region={region}
                style={{ height: 300, width: '100%' }}
                onPress={handleMapPress}
            >
                {markers?.map((marker, index) => (
                    <Marker
                        key={index}
                        coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                        title={marker.title}
                        description={marker.description}
                        onPress={() => setSelectedLocation(marker)}
                    />
                ))}
                {greenLocation && (
                    <Marker
                        coordinate={greenLocation}
                        title="Green Location"
                        description="Tap to adjust"
                        pinColor="green"
                    />
                )}
            </MapView>
        </View>
    );
}
