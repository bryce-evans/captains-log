import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';
import { useStore } from '../store';

export function SchemaSelector() {
  const [open, setOpen] = useState(false);
  const schemas = useStore((s) => s.schemas);
  const activeSchema = useStore((s) => s.activeSchema);
  const setActiveSchema = useStore((s) => s.setActiveSchema);

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.label}>
        Active Schema
      </Text>
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Button mode="outlined" onPress={() => setOpen(true)} icon="chevron-down" contentStyle={styles.btnContent}>
            {activeSchema.emoji} {activeSchema.name}
          </Button>
        }
      >
        {schemas.map((s) => (
          <Menu.Item
            key={s.id}
            title={`${s.emoji} ${s.name}`}
            onPress={() => {
              setActiveSchema(s);
              setOpen(false);
            }}
            leadingIcon={activeSchema.id === s.id ? 'check' : undefined}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { marginBottom: 4, color: '#666' },
  btnContent: { flexDirection: 'row-reverse' },
});
