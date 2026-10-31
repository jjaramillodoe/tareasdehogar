import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { shadow } from '../utils/shadow';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bandY = useRef(new Animated.Value(-24)).current;
  const markScale = useRef(new Animated.Value(0.72)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bandY, {
          toValue: 0,
          duration: 480,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(markScale, {
          toValue: 1,
          friction: 5,
          tension: 58,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(contentY, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(cardsY, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Concept B blue band — matches parent screens */}
      <Animated.View
        style={[
          styles.headerBand,
          {
            paddingTop: Math.max(insets.top, 12) + 18,
            transform: [{ translateY: bandY }],
          },
        ]}
      >
        <Text style={styles.bandEyebrow}>HabitApp</Text>
        <Text style={styles.bandTitle}>Juntos</Text>
        <Text style={styles.bandSubtitle}>Cultivamos buenos hábitos</Text>
        <View style={styles.flagRow}>
          <View style={[styles.flagBand, styles.flagYellow]} />
          <View style={[styles.flagBand, styles.flagBlue]} />
          <View style={[styles.flagBand, styles.flagRed]} />
        </View>
      </Animated.View>

      <View style={styles.body}>
        <Animated.View style={[styles.markWrap, { transform: [{ scale: markScale }] }]}>
          <View style={styles.markCard}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.markImage}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        <Animated.View
          style={{
            alignItems: 'center',
            opacity: contentOpacity,
            transform: [{ translateY: contentY }],
          }}
        >
          <Text style={styles.title}>HabitApp</Text>
          <Text style={styles.subtitle}>Recompensa el esfuerzo de tus hijos</Text>
        </Animated.View>

        {/* Mini journey cards — yellow / coral / blue */}
        <Animated.View
          style={[
            styles.journeyRow,
            {
              opacity: cardsOpacity,
              transform: [{ translateY: cardsY }],
            },
          ]}
        >
          <View style={[styles.miniCard, styles.miniYellow]}>
            <Ionicons name="sunny" size={18} color={Colors.onSecondary} />
            <Text style={styles.miniLabelOnYellow}>Hoy</Text>
          </View>
          <View style={[styles.miniCard, styles.miniCoral]}>
            <Ionicons name="rocket" size={18} color={Colors.white} />
            <Text style={styles.miniLabelOnColor}>Acción</Text>
          </View>
          <View style={[styles.miniCard, styles.miniBlue]}>
            <Ionicons name="people" size={18} color={Colors.white} />
            <Text style={styles.miniLabelOnColor}>Familia</Text>
          </View>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) + 10 }]}>
        <View style={styles.pill}>
          <Ionicons name="wallet" size={15} color={Colors.secondaryInk} />
          <Text style={styles.pillText}>Tareas que suman a tu saldo</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBand: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 0,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 8, blur: 16, opacity: 0.28, elevation: 10 }),
  },
  bandEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  bandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
  },
  bandSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  flagRow: {
    flexDirection: 'row',
    height: 5,
    marginHorizontal: -24,
    width,
  },
  flagBand: {
    height: '100%',
  },
  flagYellow: {
    flex: 2,
    backgroundColor: Colors.flagYellow,
  },
  flagBlue: {
    flex: 1,
    backgroundColor: Colors.flagBlue,
  },
  flagRed: {
    flex: 1,
    backgroundColor: Colors.flagRed,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -8,
  },
  markWrap: {
    marginBottom: 22,
  },
  markCard: {
    width: 108,
    height: 108,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.secondary,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 10, blur: 20, opacity: 0.32, elevation: 12 }),
  },
  markImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  journeyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    width: '100%',
    maxWidth: 340,
  },
  miniCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    ...shadow({ color: Colors.black, offsetX: 0, offsetY: 4, blur: 10, opacity: 0.1, elevation: 4 }),
  },
  miniYellow: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  miniCoral: {
    backgroundColor: Colors.accent,
  },
  miniBlue: {
    backgroundColor: Colors.primary,
  },
  miniLabelOnYellow: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onSecondary,
  },
  miniLabelOnColor: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    ...shadow({ color: Colors.secondary, offsetX: 0, offsetY: 4, blur: 10, opacity: 0.3, elevation: 4 }),
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryInk,
  },
});
