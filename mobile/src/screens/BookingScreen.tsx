import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { useI18n } from '../i18n';
import { fetchServices, fetchAvailability } from '../api/client';
import type {
    Service,
    AvailabilityResponse,
    AvailabilityWorker,
    AvailabilitySlot
} from '../api/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>; // Will update types later

// Component for Service Card
const ServiceCard = ({
    service,
    isSelected,
    onPress,
    locale
}: {
    service: Service;
    isSelected: boolean;
    onPress: () => void;
    locale: string;
}) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [
            styles.serviceCard,
            isSelected && styles.serviceCardSelected,
            pressed && !isSelected && { opacity: 0.7 },
        ]}
    >
        <View style={{ flex: 1 }}>
            <Text style={[styles.serviceTitle, isSelected && styles.textWhite]}>
                {locale === 'ja' ? service.name : service.nameEn || service.name}
            </Text>
            <Text style={[styles.serviceMeta, isSelected && styles.textGray300]}>
                {service.duration} {locale === 'ja' ? '分' : 'min'}
            </Text>
        </View>
        <Text style={[styles.servicePrice, isSelected && styles.textWhite]}>
            ¥{service.price.toLocaleString()}
        </Text>
    </Pressable>
);

// Component for Time Slot
const TimeSlotItem = ({
    time,
    status,
    isSelected,
    onPress
}: {
    time: string;
    status: 'available' | 'booked';
    isSelected: boolean;
    onPress: () => void;
}) => (
    <Pressable
        onPress={onPress}
        disabled={status !== 'available'}
        style={({ pressed }) => [
            styles.timeSlot,
            status === 'booked' && styles.timeSlotBooked,
            isSelected && styles.timeSlotSelected,
            pressed && status === 'available' && { opacity: 0.8 }
        ]}
    >
        <Text style={[
            styles.timeText,
            status === 'booked' && styles.timeTextBooked,
            isSelected && styles.textWhite
        ]}>
            {time}
        </Text>
    </Pressable>
);


export function BookingScreen({ navigation }: Props) {
    const { t, locale } = useI18n();
    const [loadingServices, setLoadingServices] = useState(true);
    const [services, setServices] = useState<Service[]>([]);

    // Selection State
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [date, setDate] = useState(new Date());

    // Availability State
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<{
        worker: AvailabilityWorker;
        slot: AvailabilitySlot;
        time: string;
    } | null>(null);

    // Load Services on Mount
    useEffect(() => {
        let mounted = true;
        fetchServices()
            .then((data) => {
                if (mounted) setServices(data);
            })
            .catch((error) => Alert.alert(t('error'), error.message))
            .finally(() => setLoadingServices(false));
        return () => { mounted = false; };
    }, [t]);

    // Load Availability when Service or Date changes
    useEffect(() => {
        if (!selectedService) {
            setAvailability(null);
            return;
        }

        const dateStr = date.toISOString().split('T')[0];
        setLoadingAvailability(true);
        setSelectedSlot(null); // Reset slot selection

        let mounted = true;
        fetchAvailability(selectedService.id, dateStr)
            .then((data) => {
                if (mounted) setAvailability(data);
            })
            .catch((error) => console.log('Availability fetch error (expected if empty):', error))
            .finally(() => {
                if (mounted) setLoadingAvailability(false)
            });

        return () => { mounted = false; };
    }, [selectedService, date]);


    // Flatten slots for horizontal scroll
    const availableSlotsFlat = useMemo(() => {
        if (!availability) return [];

        // Simple strategy: Collect all unique start times across all workers
        // In a real app you might want to group by time or show workers. 
        // For "slick" simple view, let's just show available times.
        // If multiple workers are available at 10:00, picking 10:00 just picks the first one?
        // Let's create a list of { time, worker, slot }

        const slots: { time: string; worker: AvailabilityWorker; slot: AvailabilitySlot }[] = [];
        const seenTimes = new Set<string>();

        availability.workers.forEach(worker => {
            worker.slots.forEach(slot => {
                if (!seenTimes.has(slot.startTime)) {
                    seenTimes.add(slot.startTime);
                    slots.push({ time: slot.startTime, worker, slot });
                }
            });
        });

        return slots.sort((a, b) => a.time.localeCompare(b.time));
    }, [availability]);


    const handleNext = () => {
        if (selectedService && selectedSlot) {
            const dateStr = date.toISOString().split('T')[0];
            navigation.navigate('Preview', {
                service: selectedService,
                date: dateStr,
                worker: selectedSlot.worker,
                slot: selectedSlot.slot
            });
        }
    };

    return (
        <Screen>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <Text style={styles.title}>{t('bookingTitle') || 'Book Appointment'}</Text>

                {/* 1. Service Selection */}
                <Text style={styles.sectionTitle}>{t('serviceTitle')}</Text>
                {loadingServices ? (
                    <ActivityIndicator color={theme.colors.primary[500]} />
                ) : (
                    <View style={styles.serviceList}>
                        {services.map(service => (
                            <ServiceCard
                                key={service.id}
                                service={service}
                                isSelected={selectedService?.id === service.id}
                                onPress={() => setSelectedService(service)}
                                locale={locale}
                            />
                        ))}
                    </View>
                )}

                {/* 2. Date Selection (Visible only if service selected) */}
                {selectedService && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('dateTitle')}</Text>
                        <View style={styles.datePickerContainer}>
                            {Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="inline"
                                    onChange={(_, selected) => selected && setDate(selected)}
                                    minimumDate={new Date()}
                                    themeVariant="light"
                                />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Text style={{ fontSize: 18 }}>{date.toISOString().split('T')[0]}</Text>
                                    <Button
                                        label="Change"
                                        variant="outline"
                                        onPress={() => {/* Android Picker Logic - Simplified for now */ }}
                                        style={{ height: 40, paddingVertical: 0 }}
                                    />
                                    {/* Note: Android handling omitted for brevity, focusing on iOS 'slick' flow first */}
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* 3. Time Selection (Visible if Service & Date) */}
                {selectedService && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('timeTitle') || 'Select Time'}</Text>

                        {loadingAvailability ? (
                            <ActivityIndicator color={theme.colors.primary[500]} style={{ marginTop: 20 }} />
                        ) : availableSlotsFlat.length === 0 ? (
                            <Text style={styles.emptyText}>{t('noAvailability')}</Text>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroll}>
                                {availableSlotsFlat.map((item) => (
                                    <TimeSlotItem
                                        key={item.time}
                                        time={item.time}
                                        status="available"
                                        isSelected={selectedSlot?.time === item.time}
                                        onPress={() => setSelectedSlot(item)}
                                    />
                                ))}
                            </ScrollView>
                        )}
                    </View>
                )}

                {/* Spacer for bottom button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky Bottom Action */}
            <View style={styles.footer}>
                <Button
                    label={t('next')}
                    variant="iso"
                    disabled={!selectedService || !selectedSlot}
                    onPress={handleNext}
                />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 20,
    },
    title: {
        ...theme.text.h1,
        marginBottom: 20,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.secondary[900],
        marginBottom: 12,
    },
    // Service Card Components
    serviceList: {
        gap: 12,
    },
    serviceCard: {
        backgroundColor: theme.colors.white,
        borderWidth: 2,
        borderColor: theme.colors.secondary[900], // Black border
        borderRadius: theme.radius.lg, // rounded-xl
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 72, // Matching web style? Or at least sufficiently tall. 72px per user request on web.
    },
    serviceCardSelected: {
        backgroundColor: theme.colors.secondary[900], // Black bg
    },
    serviceTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.secondary[900],
    },
    serviceMeta: {
        fontSize: 14,
        color: theme.colors.secondary[600],
        marginTop: 4,
    },
    servicePrice: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: theme.colors.secondary[900],
    },
    textWhite: {
        color: theme.colors.white,
    },
    textGray300: {
        color: '#d1d5db',
    },

    // Date Picker
    datePickerContainer: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.lg,
        borderWidth: 2,
        // Let's keep it clean
        borderColor: theme.colors.secondary[900],
        overflow: 'hidden',
        padding: 10,
    },

    // Time Slots
    timeScroll: {
        gap: 10,
        paddingRight: 20,
    },
    timeSlot: {
        width: 80,
        height: 57, // Match button height
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: theme.colors.secondary[300],
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.white,
    },
    timeSlotSelected: {
        backgroundColor: theme.colors.secondary[900],
        borderColor: theme.colors.secondary[900],
    },
    timeSlotBooked: {
        borderColor: theme.colors.secondary[100],
        backgroundColor: theme.colors.secondary[50],
    },
    timeText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.secondary[900],
    },
    timeTextBooked: {
        color: theme.colors.secondary[300],
    },
    emptyText: {
        ...theme.text.body,
        color: theme.colors.secondary[500],
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderTopWidth: 1,
        borderTopColor: theme.colors.secondary[100],
    },
});
