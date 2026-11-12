import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Bell,
  ShieldAlert,
} from 'lucide-react-native';
import { colors } from '../theme/colors';

export interface AppNotification {
  id: string;
  type?: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationBannerProps {
  notification: AppNotification | null;
  onDismiss: () => void;
}

export function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (notification) {
      // Vibrate briefly on mobile device for tactile feedback
      try {
        Vibration.vibrate(Platform.OS === 'android' ? 60 : [0, 50]);
      } catch {
        // ignore
      }

      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        dismiss();
      }, notification.duration || 3500);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [notification]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle2 size={18} color="#059669" />;
      case 'warning':
      case 'alert':
        return <ShieldAlert size={18} color="#dc2626" />;
      case 'info':
      default:
        return <Bell size={18} color={colors.primary} />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return '#a7f3d0';
      case 'warning':
      case 'alert':
        return '#fecaca';
      default:
        return '#c7d2fe';
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return '#ecfdf5';
      case 'warning':
      case 'alert':
        return '#fef2f2';
      default:
        return '#f5f3ff';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10),
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bubble,
          {
            backgroundColor: getBgColor(),
            borderColor: getBorderColor(),
          },
        ]}
        onPress={dismiss}
        activeOpacity={0.9}
      >
        <View style={styles.iconWrapper}>{getIcon()}</View>
        <View style={styles.textWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          {Boolean(notification.message) && (
            <Text style={styles.message} numberOfLines={2}>
              {notification.message}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={14} color="#64748b" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    gap: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 4,
  },
});

