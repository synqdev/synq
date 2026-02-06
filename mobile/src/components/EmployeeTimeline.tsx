import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';

export type TimelineSlot = {
  startTime: string;
  duration: number;
  type: 'available' | 'booked' | 'blocked';
  data?: {
    endTime?: string;
    resourceIds?: string[];
  };
};

export type TimelineWorker = {
  id: string;
  name: string;
  nameEn?: string | null;
  slots: TimelineSlot[];
};

type Props = {
  workers: TimelineWorker[];
  selectedSlot?: TimelineSlot | null;
  selectedWorkerId?: string | null;
  onSlotClick?: (slot: TimelineSlot, workerId: string) => void;
  timeRange?: { start: string; end: string };
  locale: 'ja' | 'en';
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

const getSlotColor = (type: TimelineSlot['type'], isSelected: boolean) => {
  if (isSelected) return theme.colors.primary[500];
  if (type === 'available') return '#d1fae5';
  if (type === 'booked') return '#e5e7eb';
  if (type === 'blocked') return '#666666';
  return '#e5e7eb';
};

export function EmployeeTimeline({
  workers,
  selectedSlot,
  selectedWorkerId,
  onSlotClick,
  timeRange = { start: '10:00', end: '19:00' },
  locale,
}: Props) {
  const startMinutes = useMemo(
    () => timeToMinutes(timeRange.start),
    [timeRange.start]
  );
  const endMinutes = useMemo(
    () => timeToMinutes(timeRange.end),
    [timeRange.end]
  );
  const totalDuration = endMinutes - startMinutes;

  const timeLabels = useMemo(() => {
    const labels: string[] = [];
    const [startHour] = timeRange.start.split(':').map(Number);
    const [endHour] = timeRange.end.split(':').map(Number);
    for (let hour = startHour; hour <= endHour; hour += 1) {
      labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return labels;
  }, [timeRange.end, timeRange.start]);

  const displayWorkers = useMemo(() => {
    return workers.map((worker) => {
      const splitSlots: TimelineSlot[] = [];
      worker.slots.forEach((slot) => {
        if (slot.type === 'available' && slot.duration > 60) {
          const chunks = Math.floor(slot.duration / 60);
          const startMin = timeToMinutes(slot.startTime);
          for (let i = 0; i < chunks; i += 1) {
            const chunkStart = startMin + i * 60;
            const hours = Math.floor(chunkStart / 60);
            const mins = chunkStart % 60;
            const startTime = `${hours.toString().padStart(2, '0')}:${mins
              .toString()
              .padStart(2, '0')}`;
            splitSlots.push({ ...slot, startTime, duration: 60 });
          }
          const remainder = slot.duration % 60;
          if (remainder > 0) {
            const chunkStart = startMin + chunks * 60;
            const hours = Math.floor(chunkStart / 60);
            const mins = chunkStart % 60;
            const startTime = `${hours.toString().padStart(2, '0')}:${mins
              .toString()
              .padStart(2, '0')}`;
            splitSlots.push({ ...slot, startTime, duration: remainder });
          }
        } else {
          splitSlots.push(slot);
        }
      });

      return { ...worker, slots: splitSlots };
    });
  }, [workers]);

  const timelineWidth = 680;

  return (
    <View style={styles.wrapper}>
      {displayWorkers.map((worker) => (
        <View key={worker.id} style={styles.workerBlock}>
          <Text style={styles.workerName}>
            {locale === 'ja' ? worker.name : worker.nameEn || worker.name}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.timeline, { width: timelineWidth }]}>
              <View style={styles.timelineBackground} />
              <View style={styles.slotsLayer}>
                {worker.slots.map((slot, index) => {
                  const slotStart = timeToMinutes(slot.startTime);
                  const offset = slotStart - startMinutes;
                  const left = (offset / totalDuration) * 100;
                  const width = (slot.duration / totalDuration) * 100;

                  const isSelected =
                    selectedSlot &&
                    selectedWorkerId === worker.id &&
                    selectedSlot.startTime === slot.startTime &&
                    selectedSlot.type === slot.type;

                  const bgColor = getSlotColor(slot.type, Boolean(isSelected));
                  const isClickable = slot.type === 'available';

                  return (
                    <Pressable
                      key={`${slot.startTime}-${index}`}
                      onPress={() => {
                        if (isClickable && onSlotClick) {
                          onSlotClick(slot, worker.id);
                        }
                      }}
                      style={[
                        styles.slot,
                        {
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: bgColor,
                        },
                      ]}
                    >
                      {slot.type === 'available' && (
                        <Text
                          style={[
                            styles.slotLabel,
                            isSelected ? styles.slotLabelSelected : null,
                          ]}
                          numberOfLines={1}
                        >
                          {isSelected
                            ? locale === 'ja'
                              ? '選択済み'
                              : 'Selected'
                            : locale === 'ja'
                              ? '空き'
                              : 'Available'}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.gridOverlay}>
                {timeLabels.slice(0, -1).map((time) => (
                  <View key={time} style={styles.gridCell} />
                ))}
              </View>
              <View style={styles.labelsRow}>
                {timeLabels.map((time) => (
                  <Text key={time} style={styles.labelText}>
                    {time}
                  </Text>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.lg,
  },
  workerBlock: {
    gap: 8,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary[900],
  },
  timeline: {
    height: 70,
    position: 'relative',
  },
  timelineBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  slotsLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
  },
  slot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  slotLabelSelected: {
    color: theme.colors.white,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.secondary[200],
  },
  gridCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: theme.colors.secondary[200],
  },
  labelsRow: {
    position: 'absolute',
    top: '100%',
    left: 0,
    flexDirection: 'row',
    marginTop: 6,
    width: '100%',
  },
  labelText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.secondary[900],
    marginLeft: -6,
  },
});
