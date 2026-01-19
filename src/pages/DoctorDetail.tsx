import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Clock, Calendar, ArrowLeft, CheckCircle } from 'lucide-react';
import { format, addDays, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
  id: string;
  full_name: string;
  bio: string;
  experience_years: number;
  qualification: string;
  consultation_fee: number;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  available_days: string[] | null;
  available_from: string | null;
  available_to: string | null;
  specialization: { name: string } | null;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Generate next 7 days for date selection
  const availableDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1));

  useEffect(() => {
    async function fetchDoctor() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('doctors')
        .select('*, specialization:specializations(name)')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        toast({ title: 'Error', description: 'Doctor not found', variant: 'destructive' });
        navigate('/doctors');
        return;
      }

      setDoctor(data as Doctor);
      setLoading(false);
    }

    fetchDoctor();
  }, [id, navigate, toast]);

  useEffect(() => {
    async function fetchBookedSlots() {
      if (!id || !selectedDate) return;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', id)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      setBookedSlots(data?.map(a => a.appointment_time) || []);
    }

    fetchBookedSlots();
  }, [id, selectedDate]);

  const handleBookAppointment = async () => {
    if (!user || !doctor || !selectedDate || !selectedTime) return;

    setBooking(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: doctor.id,
        appointment_date: dateStr,
        appointment_time: selectedTime,
        status: 'scheduled',
      });

      if (error) throw error;

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'appointment_confirmation',
            to: user.email,
            patientName: user.user_metadata?.full_name || 'Patient',
            doctorName: doctor.full_name,
            date: format(selectedDate, 'dd-MM-yyyy'),
            time: selectedTime,
          }
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      toast({ 
        title: 'Appointment Booked!', 
        description: `Your appointment with ${doctor.full_name} is confirmed for ${format(selectedDate, 'dd-MM-yyyy')} at ${selectedTime}` 
      });
      
      navigate('/appointments');
    } catch (error) {
      console.error('Booking error:', error);
      toast({ title: 'Error', description: 'Failed to book appointment', variant: 'destructive' });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!doctor) return null;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/doctors')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Doctors
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={doctor.avatar_url} />
                  <AvatarFallback className="text-2xl">{doctor.full_name[0]}</AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mb-1">{doctor.full_name}</h1>
                <Badge variant="secondary" className="mb-3">{doctor.specialization?.name}</Badge>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span>{doctor.rating} ({doctor.total_reviews} reviews)</span>
                </div>

                <div className="space-y-2 text-sm text-left">
                  <p><strong>Qualification:</strong> {doctor.qualification}</p>
                  <p><strong>Experience:</strong> {doctor.experience_years} years</p>
                  <p><strong>Consultation Fee:</strong> <span className="text-primary font-semibold">${doctor.consultation_fee}</span></p>
                </div>

                <p className="mt-4 text-sm text-muted-foreground text-left">{doctor.bio}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Booking Section */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Book Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <h3 className="font-medium mb-3">Select Date</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {availableDates.map((date) => (
                      <button
                        key={date.toISOString()}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all ${
                          selectedDate?.toDateString() === date.toDateString()
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="text-xs text-muted-foreground">{format(date, 'EEE')}</p>
                        <p className="text-lg font-bold">{format(date, 'd')}</p>
                        <p className="text-xs text-muted-foreground">{format(date, 'MMM')}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <h3 className="font-medium mb-3">Select Time</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {TIME_SLOTS.map((time) => {
                        const isBooked = bookedSlots.includes(time);
                        return (
                          <button
                            key={time}
                            disabled={isBooked}
                            onClick={() => setSelectedTime(time)}
                            className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              isBooked
                                ? 'border-muted bg-muted text-muted-foreground cursor-not-allowed'
                                : selectedTime === time
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Confirmation */}
                {selectedDate && selectedTime && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/5 rounded-xl p-4 border border-primary/20"
                  >
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Appointment Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Doctor:</strong> {doctor.full_name}<br />
                      <strong>Date:</strong> {format(selectedDate, 'dd-MM-yyyy')}<br />
                      <strong>Time:</strong> {selectedTime}<br />
                      <strong>Fee:</strong> ${doctor.consultation_fee}
                    </p>
                  </motion.div>
                )}

                <Button 
                  size="lg" 
                  className="w-full"
                  disabled={!selectedDate || !selectedTime || booking}
                  onClick={handleBookAppointment}
                >
                  {booking ? 'Booking...' : 'Confirm Appointment'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}