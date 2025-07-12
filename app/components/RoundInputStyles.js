import { StyleSheet } from "react-native";


const styles = StyleSheet.create({
  // Setup Screen Styles
  setupContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  setupContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 80,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },
  setupCard: {
    backgroundColor: 'rgba(0,0,38,0.95)',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  setupCardContent: {
    padding: 20,
  },
  selectionSection: {
    marginBottom: 20,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  draftsButton: {
    marginRight: -8,
  },
  selectionCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 60,
  },
  selectionCardSelected: {
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderColor: 'rgba(0,191,255,0.4)',
  },
  selectedCourseContent: {
    flex: 1,
  },
  selectedCourseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectedCourseSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 8,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  weatherCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 80,
  },
  weatherLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  weatherLoadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
    fontSize: 14,
  },
  weatherError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  weatherErrorText: {
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 8,
    fontSize: 14,
  },
  weatherContent: {
    flex: 1,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherTemp: {
    marginLeft: 12,
    flex: 1,
  },
  weatherTempValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  weatherCondition: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherDetailText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Playing Screen Styles
  playingContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  playingContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  runningStatsHeader: {
    width: '100%',
    backgroundColor: 'rgba(0,0,38,0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  runningStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  statPillValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  statPillLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  holeCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,38,0.95)',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  holeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  exitButton: {
    padding: 4,
  },
  holeInfo: {
    alignItems: 'center',
    flex: 1,
   },
  holeNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  holeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 16,
  },
  holeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  holeDetailText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  progressIndicator: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  progressBarContainer: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00BFFF',
    borderRadius: 2,
  },
  holeContent: {
    padding: 20,
  },
  currentScoreSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreDisplay: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    minWidth: 120,
  },
  scoreDisplayNeutral: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scoreDisplayEagle: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderColor: 'rgba(255,215,0,0.4)',
  },
  scoreDisplayBirdie: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderColor: 'rgba(76,175,80,0.4)',
  },
  scoreDisplayPar: {
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderColor: 'rgba(0,191,255,0.4)',
  },
  scoreDisplayBogey: {
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderColor: 'rgba(255,152,0,0.4)',
  },
  scoreDisplayDouble: {
    backgroundColor: 'rgba(244,67,54,0.15)',
    borderColor: 'rgba(244,67,54,0.4)',
  },
  scoreDisplayNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreDisplayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    letterSpacing: 1,
  },
  girIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  girIndicatorActive: {
    backgroundColor: 'rgba(76,175,80,0.2)',
  },
  girText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 6,
    fontWeight: '500',
  },
  girTextActive: {
    color: '#4CAF50',
  },
  gpsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,191,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  gpsText: {
    fontSize: 14,
    color: '#00BFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginVertical: 8,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: 'transparent',
    width: '100%',
    height: 40,
  },
  penaltyField: {
    backgroundColor: 'rgba(244,67,54,0.1)',
  },
  performanceSection: {
    marginBottom: 24,
  },
  toggleContainer: {
    gap: 12,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 12,
  },
  toggleSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 8,
  },
  autoIndicator: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  autoIndicatorActive: {
    backgroundColor: 'rgba(76,175,80,0.2)',
  },
  autoText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  navigationSection: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  navButtonContent: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    borderColor: 'rgba(0,191,255,0.5)',
  },
  nextButton: {
    backgroundColor: '#00BFFF',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
  },

  // Summary Screen Styles
  summaryContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  summaryScrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  summaryCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(0,0,38,0.95)',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  summarySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  summaryDivider: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
  },
  summaryContent: {
    padding: 24,
  },
  summaryGrid: {
    marginBottom: 20,
  },
  summaryMainStats: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreBadge: {
    backgroundColor: 'rgba(0,191,255,0.2)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,191,255,0.4)',
  },
  scoreBadgeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scoreBadgeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00BFFF',
    marginVertical: 4,
  },
  scoreBadgeSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statBox: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  courseInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  courseInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  courseInfoDetails: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  summaryActions: {
    padding: 24,
    paddingTop: 0,
    flexDirection: 'column',
    gap: 12,
  },
  summaryButton: {
    borderRadius: 12,
    height: 48,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },

  // Common Styles
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  
  // Dialog and other shared styles
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
    fontWeight: '500',
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
  draftCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genderCardSelected: {
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderColor: 'rgba(0,191,255,0.4)',
  },
  genderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  holeCountContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  holeCountCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  holeCountCardSelected: {
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderColor: 'rgba(0,191,255,0.4)',
  },
  holeCountNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
  },
  holeCountNumberSelected: {
    color: '#00BFFF',
  },
  holeCountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
  holeCountLabelSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  setupActions: {
    padding: 20,
    paddingTop: 0,
    flexDirection: 'column',
    gap: 12,
  },
  startButton: {
    backgroundColor: '#00BFFF',
    borderRadius: 12,
    height: 48,
  },
  startButtonContent: {
    height: 48,
  },
  viewRoundsButton: {
    borderColor: 'rgba(0,191,255,0.5)',
    borderRadius: 12,
    height: 48,
  },

  // Weather Impact Styles
  weatherImpactCard: {
    backgroundColor: 'rgba(0,0,38,0.9)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  weatherImpactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  weatherImpactHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherImpactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  weatherImpactBadge: {
    backgroundColor: '#00BFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  weatherImpactBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  weatherImpactContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  weatherImpactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00BFFF',
  },
  weatherImpactItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  weatherImpactItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  weatherImpactItemEffect: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },

  // Compass Instruction Styles
  compassInstructionCard: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
    overflow: 'hidden',
  },
  compassInstructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 165, 0, 0.2)',
  },
  compassInstructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA726',
    marginLeft: 8,
  },
  compassInstructionContent: {
    padding: 16,
  },
  compassInstructionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 16,
  },
  compassInstructionSteps: {
    gap: 8,
  },
  compassInstructionStep: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },

  // Compass Widget Styles
  compassCard: {
    backgroundColor: 'rgba(0,0,38,0.9)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  compassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  compassHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compassTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  compassBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compassBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  compassContent: {
    padding: 16,
    alignItems: 'center',
  },
  compassCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  compassDirection: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  compassNorth: {
    top: 8,
  },
  compassEast: {
    right: 8,
  },
  compassSouth: {
    bottom: 8,
  },
  compassWest: {
    left: 8,
  },
  compassPhoneIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassPhoneArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00BFFF',
    marginTop: -50,
  },
  compassWindIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassWindArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF6B6B',
    marginTop: -50,
  },
  compassCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    position: 'absolute',
  },
  windEffectContainer: {
    width: '100%',
    alignItems: 'center',
  },
  windEffectDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  windEffectText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  compassReadings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  compassReading: {
    alignItems: 'center',
    flex: 1,
  },
  compassReadingLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  compassReadingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  debugButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  debugPanel: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    maxHeight: 200,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,107,0.2)',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  debugScroll: {
    flex: 1,
    padding: 12,
  },
  debugText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'monospace',
    lineHeight: 14,
  },

  // Map placeholder styles
  mapPlaceholder: {
    backgroundColor: 'rgba(0,0,38,0.9)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 150,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 12,
  },
  mapPlaceholderSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  // Map Widget Styles
  mapCard: {
    backgroundColor: 'rgba(0,0,38,0.9)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  mapHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  mapBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  mapBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  mapContent: {
    padding: 0, // No padding for the map itself
  },
  mapContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  mapInstructions: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 152, 0, 0.2)',
  },
  mapInstructionsText: {
    fontSize: 12,
    color: '#FFA726',
    textAlign: 'center',
    lineHeight: 16,
  },

});

export default styles;