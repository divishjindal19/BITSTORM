import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, FileText, User, X, Loader2 } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  reason: string | null;
  notes: string | null;
  doctor: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    specialization: { name: string } | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

export default function Appointments() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  async function fetchAppointments() {
    if (!user) return;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(id, full_name, avatar_url, specialization:specializations(name))
      `)
      .eq('patient_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (!error && data) {
      setAppointments(data as unknown as Appointment[]);
    }
    setLoading(false);
  }

  async function cancelAppointment(id: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to cancel appointment', variant: 'destructive' });
      return;
    }

    toast({ title: 'Appointment cancelled' });
    fetchAppointments();
  }

  const upcomingAppointments = appointments.filter(a => 
    a.status === 'scheduled' && !isPast(parseISO(`${a.appointment_date}T${a.appointment_time}`))
  );
  
  const pastAppointments = appointments.filter(a => 
    a.status !== 'scheduled' || isPast(parseISO(`${a.appointment_date}T${a.appointment_time}`))
  );

  const scheduledCount = upcomingAppointments.length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Appointments</h1>
          <p className="text-muted-foreground">Manage your upcoming and past appointments</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((apt) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={apt.doctor.avatar_url || ''} />
                          <AvatarFallback>{apt.doctor.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{apt.doctor.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {apt.doctor.specialization?.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="flex items-center gap-1 text-primary">
                              <Calendar className="w-3 h-3" />
                              {format(parseISO(apt.appointment_date), 'dd-MM-yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {apt.appointment_time}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[apt.status || 'scheduled']}>
                            {apt.status || 'Scheduled'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelAppointment(apt.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming appointments</p>
                    <Button className="mt-4" asChild>
                      <Link to="/doctors">Book an Appointment</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    Past Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pastAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={apt.doctor.avatar_url || ''} />
                          <AvatarFallback>{apt.doctor.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{apt.doctor.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(apt.appointment_date), 'dd-MM-yyyy')} at {apt.appointment_time}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[apt.status || 'completed']}>
                          {apt.status || 'Completed'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scheduledCount}</p>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <User className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Need a Doctor?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Browse our list of expert healthcare professionals and book an appointment today.
                </p>
                <Button asChild className="w-full">
                  <Link to="/doctors">Find a Doctor</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}