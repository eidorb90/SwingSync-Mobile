import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';


const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

interface HoleStat {
    hole: number;
    par: number;
    strokes: number;
    fairway_hit: boolean;
    green_in_regulation: boolean;
    putts: number;
    penalties: number;
    handicap: number;
    yardage: number;
    tee_shot: number;
    approach_shots?: number;
    chip_shots?: number;
}

interface Round {
    id: number;
    course: string;
    date_played: string;
    tee: string;
    total_score: number;
    hole_stats: HoleStat[];
    notes?: string;
}

export default function ViewRounds() {
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [userID, setUserID] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [expandedHole, setExpandedHole] = useState<number|null>(null);
    const [expandedRound, setExpandedRound] = useState<number | null>(null);

    useEffect(() => {
        fetchTokenAndSetUserID()
    }, [])

    const fetchTokenAndSetUserID = async () => {
        try {
            const storedToken = await AsyncStorage.getItem("authToken");
            if (storedToken) {
                setToken(storedToken);
                const decoded: any = jwtDecode(storedToken);
                setUserID(decoded.user_id);
                await fetchRounds(storedToken);
            } else {
                router.replace("/auth");
            }
        } catch (e) {
            console.error("Failed to fetch token:", e);
            router.replace("/auth");
        }
    };

    const fetchRounds = async (authToken: string = token || '') => {
        if (!authToken) return;
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/rounds/`, { 
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': "application/json",
                }
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            console.log("Fetched rounds data:", data.rounds); 
            
            if (data.rounds && data.rounds.length > 0) {
                console.log("Received rounds with hole stats (first round):", data.rounds[0].hole_stats?.map((h: any) => ({ hole: h.hole, par: h.par, strokes: h.strokes })));
            }
            
            setRounds(data.rounds || []); 

        } catch (error) {
            console.error("Error fetching rounds:", error);
            setError("Failed to fetch rounds");
        } finally {
            setLoading(false);
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const toggleRoundExpansion = (roundId: number) => {
        setExpandedRound(expandedRound === roundId ? null : roundId);
    };

    const toggleHoleExpansion = (hole: number) => {
      setExpandedHole(prev => prev === hole ? null : hole);
    };

    const getScoreStyle = (strokes: number, par: number) => {
        const diff = strokes - par;
        
        if (diff <= -2) {
            // Eagle or better - circle
            return [styles.scoreCircle, styles.eagle];
        } else if (diff === -1) {
            // Birdie -x circle
            return [styles.scoreCircle, styles.birdie];
        } else if (diff === 0) {
            // Par - no decoration
            return [styles.scoreNormal];
        } else if (diff === 1) {
            // Bogey - square
            return [styles.scoreSquare, styles.bogey];
        } else {
            // Double bogey or worse - double square
            return [styles.scoreDoubleSquare, styles.doubleBogey];
        }
    };

    const deleteRound = async (roundId: number) => {
        try {
           
            const response = await fetch(`${BACKEND_URL}/api/rounds/${roundId}/`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': "application/json",
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setRounds(rounds.filter(round => round.id !== roundId));
            
            if (expandedRound === roundId) {
                setExpandedRound(null);
            }

        } catch (error) {
            console.error("Error deleting round:", error);
            setError("Failed to delete round");
        }
    };

    const confirmDeleteRound = (roundId: number, courseName: string) => {
        Alert.alert(
            "Delete Round",
            `Are you sure you want to delete your round at ${courseName}? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteRound(roundId)
                }
            ]
        );
    };

    const renderRoundSummary = (round: Round) => {
      return (
        <Card key={round.id} style={styles.card}>
          <TouchableOpacity 
            onPress={() => toggleRoundExpansion(round.id)}
            style={styles.roundButton}
            activeOpacity={0.7}
          >
            <View style={styles.roundSummary}>
              <View style={styles.roundHeader}>
                <View style={styles.roundTitleContainer}>
                  <Text style={styles.courseTitle}>{round.course}</Text>
                  <Text style={styles.roundInfo}>
                    {formatDate(round.date_played)} • {round.tee} Tees
                  </Text>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>Score: {round.total_score}</Text>
                  </View>
                </View>
                <IconButton
                  icon="delete"
                  iconColor="#F44336"
                  size={20}
                  onPress={() => confirmDeleteRound(round.id, round.course)}
                  style={styles.deleteButton}
                />
              </View>
              {round.notes && round.notes.trim().length > 0 && (
                <>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <View style={styles.notesCard}>
                    <Text style={styles.notesText}>{round.notes}</Text>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
          
          {expandedRound === round.id && (
            <Card.Content style={styles.expandedContent}>
              {round.hole_stats && round.hole_stats.length > 0 ? (
                <View style={styles.scorecardGrid}>
                  <View style={styles.headerRow}>
                    <Text style={styles.headerCell}>Hole</Text>
                    <Text style={styles.headerCell}>Par</Text>
                    <Text style={styles.headerCell}>Score</Text>
                    <Text style={styles.headerCell}>+/-</Text>
                  </View>
                  {round.hole_stats.map(holeStat => (
                    <View key={holeStat.hole}>
                      <TouchableOpacity 
                        onPress={() => toggleHoleExpansion(holeStat.hole)} 
                        style={[
                          styles.dataRow,
                          expandedHole === holeStat.hole && styles.activeDataRow
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dataCell}>{holeStat.hole}</Text>
                        <Text style={styles.dataCell}>{holeStat.par}</Text>
                        <View style={[styles.dataCell, styles.scoreContainer]}>
                          <View style={getScoreStyle(holeStat.strokes, holeStat.par)}>
                            <Text style={styles.scoreText}>{holeStat.strokes}</Text>
                          </View>
                        </View>
                        <Text style={[
                          styles.dataCell,
                          holeStat.strokes < holeStat.par ? styles.underPar :
                          holeStat.strokes > holeStat.par ? styles.overPar : styles.par
                        ]}>
                          {holeStat.strokes === holeStat.par ? 'E' :
                           holeStat.strokes < holeStat.par ? `-${holeStat.par - holeStat.strokes}` :
                           `+${holeStat.strokes - holeStat.par}`}
                        </Text>
                      </TouchableOpacity>
                      {expandedHole === holeStat.hole && (
                        <View style={styles.detailContainer}>
                          <View style={styles.statGrid}>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Yards</Text>
                              <Text style={styles.statValue}>{holeStat.yardage}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Putts</Text>
                              <Text style={styles.statValue}>{holeStat.putts}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Penalties</Text>
                              <Text style={styles.statValue}>{holeStat.penalties}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Chips</Text>
                              <Text style={styles.statValue}>{holeStat.chip_shots ?? 0}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Approach</Text>
                              <Text style={styles.statValue}>{holeStat.approach_shots ?? 0}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Tee</Text>
                              <Text style={styles.statValue}>{holeStat.tee_shot ?? 1}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <View style={styles.performanceIndicator}>
                                <Text style={styles.statLabel}>FW Hit</Text>
                                <Text style={[
                                  styles.statValue, 
                                  holeStat.fairway_hit ? styles.statSuccess : styles.statFail
                                ]}>
                                  {holeStat.fairway_hit ? '✓' : '✗'}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.statItem}>
                              <View style={styles.performanceIndicator}>
                                <Text style={styles.statLabel}>GIR</Text>
                                <Text style={[
                                  styles.statValue, 
                                  holeStat.green_in_regulation ? styles.statSuccess : styles.statFail
                                ]}>
                                  {holeStat.green_in_regulation ? '✓' : '✗'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No hole data available</Text>
              )}
            </Card.Content>
          )}
        </Card>
      );
    }

    if (loading) {
        return (
            <>
                <StatusBar style="light" backgroundColor="#000026" />
                <Stack.Screen 
                    options={{
                        title: "My Rounds",
                        headerStyle: {
                            backgroundColor: '#000080',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                        headerBackTitle: 'Round Input',
                    }}
                />
                <View style={{flex: 1, backgroundColor: '#000026'}}>
                    <LinearGradient 
                        style={{flex: 1, width: '100%', height: '100%'}} 
                        colors={['#000026', "#000080", '#000026']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.container}>
                            <Text style={styles.text}>Loading rounds...</Text>
                        </View>
                    </LinearGradient>
                </View>
            </>
        );
    }

    return (
        <>
            <StatusBar style="light" backgroundColor="#000026" />
            <Stack.Screen 
                options={{
                    title: "My Rounds",
                    headerStyle: {
                        backgroundColor: '#000080',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerBackTitle: 'Round Input',
                }}
            />
            <View style={{flex: 1, backgroundColor: '#000026'}}>
                <LinearGradient 
                    style={{flex: 1, width: '100%', height: '100%'}} 
                    colors={['#000026', "#000080", '#000026']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }}
                >
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {error ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : rounds.length > 0 ? (
                            rounds.map(renderRoundSummary)
                        ) : (
                            <View style={styles.emptyStateContainer}>
                                <Text style={styles.emptyStateText}>No rounds found</Text>
                                <Text style={styles.emptyStateSubtext}>
                                    Play a round and check back to see your scores!
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </LinearGradient>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        marginBottom: 24,
        backgroundColor: 'rgba(0, 0, 60, 0.85)',
        borderRadius: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    roundButton: {
        padding: 0,
        borderRadius: 16,
        overflow: 'hidden',
    },
    roundSummary: {
        padding: 18,
        backgroundColor: 'rgba(0, 0, 80, 0.25)',
    },
    roundHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    roundTitleContainer: {
        flex: 1,
        marginRight: 8,
    },
    courseTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00BFFF',
        marginBottom: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    roundInfo: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    deleteButton: {
        margin: 0,
        backgroundColor: 'rgba(244, 67, 54, 0.12)',
        borderRadius: 8,
    },
    expandedContent: {
        backgroundColor: 'rgba(0, 0, 70, 0.7)',
        paddingTop: 12,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    scorecardGrid: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 40, 0.7)',
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 150, 0.6)',
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    dataRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 2,
    },
    activeDataRow: {
        backgroundColor: 'rgba(0, 191, 255, 0.15)',
    },
    headerCell: {
        flex: 1,
        padding: 14,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dataCell: {
        flex: 1,
        padding: 14,
        fontSize: 16,
        textAlign: 'center',
        color: '#fff',
    },
    scoreContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    scoreCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    scoreSquare: {
        width: 36,
        height: 36,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    scoreDoubleSquare: {
        width: 36,
        height: 36,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 5,
    },
    scoreNormal: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eagle: {
        borderColor: '#00BFFF',
    },
    birdie: {
        borderColor: '#4CAF50',
    },
    bogey: {
        borderColor: '#FF9800',
    },
    doubleBogey: {
        borderColor: '#F44336',
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    underPar: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    overPar: {
        color: '#F44336',
        fontWeight: 'bold',
    },
    par: {
        color: '#fff',
        fontWeight: 'bold',
    },
    errorText: {
        color: '#F44336',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 20,
        backgroundColor: 'rgba(244, 67, 54, 0.15)',
        padding: 16,
        borderRadius: 8,
        marginHorizontal: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.3)',
    },
    noDataText: {
        textAlign: 'center',
        lineHeight: 24,
        color: 'rgba(255, 255, 255, 0.7)',
        fontStyle: 'italic',
        padding: 20,
        fontSize: 16,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        marginVertical: 64,
        backgroundColor: 'rgba(0, 0, 60, 0.4)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    emptyStateText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    emptyStateSubtext: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 24,
    },
    detailContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: 'rgba(0,0,70,0.7)',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItem: {
        width: '48%',
        marginBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 8,
        padding: 10,
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        marginBottom: 6,
        fontWeight: '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    statSuccess: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    statFail: {
        color: '#F44336',
        fontWeight: 'bold',
    },
    notesLabel: {
        color: '#fff',
        fontWeight: 'bold',
        marginTop: 12,
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    notesCard: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#00BFFF',
    },
    notesText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        lineHeight: 22,
    },
    scoreBadge: {
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
        marginTop: 4,
    },
    scoreBadgeText: {
        color: '#00BFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    performanceIndicator: {
        flexDirection: 'column',
        alignItems: 'center',
    },
});