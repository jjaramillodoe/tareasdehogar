import { StyleSheet } from 'react-native';
import { Colors } from './colors';

/** Shared typography for legal / info screens */
export const legalStyles = StyleSheet.create({
  h2: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  p: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  disclaimer: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 24,
    lineHeight: 20,
  },
});
