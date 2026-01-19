import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, MessageCircle, Clock, User, TrendingUp, Bell, ChevronRight } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  doctor: {
    full_name: string;
    avatar_url: string | null;
    specialization: { name: string } | null;
  };
}

interface HealthReport {
  id: string;
  file_name: string;
  uploaded_at: string;
  analysis: string | null;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentReports, setRecentReports] = useState<HealthReport[]>([]);
  const [stats, setStats] = useState({ appointments: 0, reports: 0, completed: 0 });

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    if (!user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(profileData);

    // Fetch upcoming appointments
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select(`
        id, appointment_date, appointment_time, status,
        doctor:doctors(full_name, avatar_url, specialization:specializations(name))
      `)
      .eq('patient_id', user.id)
      .eq('status', 'scheduled')
      .order('appointment_date', { ascending: true })
      .limit(3);
    
    setUpcomingAppointments((appointmentsData as unknown as Appointment[]) || []);

    // Fetch recent reports
    const { data: reportsData } = await supabase
      .from('health_reports')
      .select('id, file_name, uploaded_at, analysis')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(3);
    setRecentReports(reportsData || []);

    // Calculate stats
    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user.id);

    const { count: completedAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user.id)
      .eq('status', 'completed');

    const { count: totalReports } = await supabase
      .from('health_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setStats({
      appointments: totalAppointments || 0,
      reports: totalReports || 0,
      completed: completedAppointments || 0,
    });
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-xl">{profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground">{greeting()},</p>
              <h1 className="text-2xl font-bold">{profile?.full_name || 'Patient'}</h1>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Appointments', value: stats.appointments, icon: Calendar, color: 'text-primary' },
            { label: 'Completed Visits', value: stats.completed, icon: TrendingUp, color: 'text-success' },
            { label: 'Health Reports', value: stats.reports, icon: FileText, color: 'text-warning' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Appointments
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/appointments">View All <ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <Avatar>
                        <AvatarImage src={apt.doctor.avatar_url || ''} />
                        <AvatarFallback>{apt.doctor.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{apt.doctor.full_name}</p>
                        <p className="text-sm text-muted-foreground">{apt.doctor.specialization?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(parseISO(apt.appointment_date), 'dd MMM')}</p>
                        <p className="text-sm text-muted-foreground">{apt.appointment_time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No upcoming appointments</p>
                  <Button className="mt-4" size="sm" asChild>
                    <Link to="/doctors">Book Now</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Recent Health Reports
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reports">View All <ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentReports.length > 0 ? (
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div key={report.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{report.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(report.uploaded_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <Badge variant={report.analysis ? 'default' : 'secondary'}>
                        {report.analysis ? 'Analyzed' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No reports uploaded</p>
                  <Button className="mt-4" size="sm" asChild>
                    <Link to="/reports">Upload Report</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  { label: 'Find Doctor', icon: User, href: '/doctors', color: 'from-primary to-primary/80' },
                  { label: 'My Appointments', icon: Calendar, href: '/appointments', color: 'from-success to-success/80' },
                  { label: 'Upload Report', icon: FileText, href: '/reports', color: 'from-warning to-warning/80' },
                  { label: 'Chat with CURAX', icon: MessageCircle, href: '/curax', color: 'from-accent to-accent/80' },
                ].map((action) => (
                  <Link key={action.label} to={action.href}>
                    <Card className="card-hover h-full">
                      <CardContent className="p-6 text-center">
                        <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="font-medium">{action.label}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}