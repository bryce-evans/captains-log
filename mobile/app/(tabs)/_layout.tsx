import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { Colors, Fonts } from '../../theme';

function RecordTabButton(props: any) {
  const focused = props.accessibilityState?.selected;
  return (
    <Pressable
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      style={styles.recordOuter}
    >
      <View style={[styles.recordCircle, focused && styles.recordCircleFocused]}>
        <MaterialCommunityIcons name="fish" size={26} color={focused ? Colors.white : Colors.textMuted} />
      </View>
      <Text style={[styles.recordLabel, focused && styles.recordLabelFocused]}>
        Record
      </Text>
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        headerStyle: { backgroundColor: Colors.primaryDark },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontFamily: 'Galley', fontSize: 20 },
      }}
    >
      <Tabs.Screen
        name="albums"
        options={{
          title: 'Albums',
          tabBarLabel: 'Albums',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarButton: (props) => <RecordTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarLabel: 'Ask',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.paperDark,
    height: 64,
    overflow: 'visible',
  },

  recordOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    marginTop: -22,
  },
  recordCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.paperDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 4,
  },
  recordCircleFocused: {
    backgroundColor: Colors.primary,
    shadowOpacity: 0.28,
  },
  recordLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.textMuted,
  },
  recordLabelFocused: {
    color: Colors.primary,
  },
});
