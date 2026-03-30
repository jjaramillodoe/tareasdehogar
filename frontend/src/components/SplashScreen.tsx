import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import FlagStripe from './FlagStripe';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Finish splash after 2.5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Gradient Background Circles */}
      <View style={styles.backgroundCircles}>
        <View style={[styles.circle, styles.circleBlue]} />
        <View style={[styles.circle, styles.circleYellow]} />
        <View style={[styles.circle, styles.circleRed]} />
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        {/* Logo Container */}
        <FlagStripe height={6} style={styles.flagStripe} />

        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="people" size={58} color={Colors.white} />
          </View>
          <View style={styles.coinBadge}>
            <Ionicons name="wallet" size={22} color={Colors.onSecondary} />
          </View>
        </View>

        {/* App Name */}
        <Text style={styles.title}>HabitApp</Text>
        <Text style={styles.subtitle}>Recompensa el esfuerzo de tus hijos</Text>

        {/* Tricolor dots */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: Colors.flagYellow }]} />
          <View style={[styles.dot, { backgroundColor: Colors.flagBlue }]} />
          <View style={[styles.dot, { backgroundColor: Colors.flagRed }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundCircles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  circleBlue: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: Colors.flagBlue,
    top: -width * 0.2,
    left: -width * 0.2,
  },
  circleYellow: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: Colors.flagYellow,
    bottom: height * 0.1,
    right: -width * 0.2,
  },
  circleRed: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: Colors.flagRed,
    bottom: -width * 0.1,
    left: -width * 0.1,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  flagStripe: {
    width: 160,
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  coinBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.flagYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
