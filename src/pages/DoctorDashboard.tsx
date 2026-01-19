import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, FileText, Clock, Plus, ChevronRight, Star } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  notes: string | null;
  reason: string | null;
  patient_id: string;
  patient?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Doctor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  specialization: { name: string } | null;
}

interface Blog {
  id: string;
  title: string;
  created_at: string;
  is_published: boolean | null;
  likes_count: number | null;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [stats, setStats] = useState({ today: 0, total: 0, patients: 0 });
  const [loading, setLoading] = useState(true);

  // Blog form state
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (user) fetchDoctorData();
  }, [user]);

  async function fetchDoctorData() {
    if (!user) return;

    // Get doctor profile
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('*, specialization:specializations(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (doctorError || !doctorData) {
      console.error('Doctor not found:', doctorError);
      setLoading(false);
      return;
    }

    setDoctor(doctorData as Doctor);

    // Get today's appointments with patient profiles
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: todayData } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorData.id)
      .eq('appointment_date', today)
      .neq('status', 'cancelled')
      .order('appointment_time', { ascending: true });

    // Fetch patient profiles for today's appointments
    if (todayData) {
      const appointmentsWithPatients = await Promise.all(
        todayData.map(async (apt) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', apt.patient_id)
            .maybeSingle();
          return { ...apt, patient: profile };
        })
      );
      setTodayAppointments(appointmentsWithPatients);
    }

    // Get upcoming appointments
    const { data: upcomingData } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorData.id)
      .eq('status', 'scheduled')
      .gt('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .limit(5);

    if (upcomingData) {
      const upcomingWithPatients = await Promise.all(
        upcomingData.map(async (apt) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', apt.patient_id)
            .maybeSingle();
          return { ...apt, patient: profile };
        })
      );
      setUpcomingAppointments(upcomingWithPatients);
    }

    // Get doctor's blogs
    const { data: blogsData } = await supabase
      .from('blogs')
      .select('id, title, created_at, is_published, likes_count')
      .eq('author_id', doctorData.id)
      .order('created_at', { ascending: false })
      .limit(3);
    setBlogs(blogsData || []);

    // Calculate stats
    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', doctorData.id);

    setStats({
      today: todayData?.length || 0,
      total: totalAppointments || 0,
      patients: new Set(todayData?.map(a => a.patient_id) || []).size,
    });

    setLoading(false);
  }

  async function updateAppointmentNotes(appointmentId: string, notes: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ notes })
      .eq('id', appointmentId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save notes', variant: 'destructive' });
    } else {
      toast({ title: 'Notes saved' });
    }
  }

  async function markAppointmentComplete(appointmentId: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } else {
      toast({ title: 'Appointment marked as complete' });
      fetchDoctorData();
    }
  }

  async function publishBlog() {
    if (!doctor || !blogTitle.trim() || !blogContent.trim()) return;

    setPublishing(true);
    try {
      const { error } = await supabase.from('blogs').insert({
        author_id: doctor.id,
        title: blogTitle,
        content: blogContent,
        excerpt: blogContent.substring(0, 150) + '...',
        is_published: true,
      });

      if (error) throw error;

      toast({ title: 'Blog published!' });
      setBlogTitle('');
      setBlogContent('');
      setBlogDialogOpen(false);
      fetchDoctorData();
    } catch (error) {
      console.error('Publish error:', error);
      toast({ title: 'Error', description: 'Failed to publish blog', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!doctor) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Doctor Profile Not Found</h1>
          <p className="text-muted-foreground mb-4">You need to be registered as a doctor to access this dashboard.</p>
          <Button asChild>
            <Link to="/home">Go to Home</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={doctor.avatar_url || ''} />
                <AvatarFallback className="text-xl">{doctor.full_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{doctor.full_name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary">{doctor.specialization?.name}</Badge>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    {doctor.rating} ({doctor.total_reviews} reviews)
                  </span>
                </div>
              </div>
            </div>
            <Dialog open={blogDialogOpen} onOpenChange={setBlogDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Write Blog
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Write a New Blog Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={blogTitle} 
                      onChange={(e) => setBlogTitle(e.target.value)}
                      placeholder="Enter blog title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea 
                      id="content" 
                      value={blogContent} 
                      onChange={(e) => setBlogContent(e.target.value)}
                      placeholder="Write your blog content..."
                      className="min-h-[200px]"
                    />
                  </div>
                  <Button 
                    onClick={publishBlog} 
                    disabled={publishing || !blogTitle.trim() || !blogContent.trim()}
                    className="w-full"
                  >
                    {publishing ? 'Publishing...' : 'Publish Blog'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Today's Appointments", value: stats.today, icon: Clock, color: 'text-primary' },
            { label: 'Total Appointments', value: stats.total, icon: Calendar, color: 'text-success' },
            { label: 'Unique Patients Today', value: stats.patients, icon: Users, color: 'text-warning' },
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
          {/* Today's Appointments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Today's Appointments ({format(new Date(), 'dd MMM yyyy')})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointments.map((apt) => (
                    <div key={apt.id} className="p-4 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-4 mb-3">
                        <Avatar>
                          <AvatarImage src={apt.patient?.avatar_url || ''} />
                          <AvatarFallback>{apt.patient?.full_name?.[0] || 'P'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{apt.patient?.full_name || 'Patient'}</p>
                          <p className="text-sm text-muted-foreground">{apt.appointment_time}</p>
                        </div>
                        <Badge className={apt.status === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}>
                          {apt.status || 'Scheduled'}
                        </Badge>
                      </div>
                      {apt.reason && (
                        <p className="text-sm text-muted-foreground mb-3">Reason: {apt.reason}</p>
                      )}
                      <div className="flex gap-2">
                        <Textarea 
                          placeholder="Add notes for this patient..."
                          defaultValue={apt.notes || ''}
                          className="flex-1 text-sm"
                          onBlur={(e) => updateAppointmentNotes(apt.id, e.target.value)}
                        />
                        {apt.status !== 'completed' && (
                          <Button size="sm" onClick={() => markAppointmentComplete(apt.id)}>
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No appointments scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{apt.patient?.full_name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{apt.patient?.full_name || 'Patient'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(apt.appointment_date), 'dd MMM')} at {apt.appointment_time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No upcoming appointments</p>
              )}
            </CardContent>
          </Card>

          {/* My Blogs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                My Blogs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blogs.length > 0 ? (
                <div className="space-y-3">
                  {blogs.map((blog) => (
                    <div key={blog.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{blog.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(blog.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <Badge variant={blog.is_published ? 'default' : 'secondary'}>
                        {blog.is_published ? `${blog.likes_count || 0} likes` : 'Draft'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>No blogs yet</p>
                  <Button size="sm" className="mt-2" onClick={() => setBlogDialogOpen(true)}>
                    Write your first blog
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}