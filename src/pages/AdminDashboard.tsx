import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Shield,
  BarChart3,
  Clock,
  FileText
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Doctor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_approved: boolean | null;
  created_at: string;
  specialization: { name: string } | null;
}

interface User {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalAppointments: number;
  pendingDoctors: number;
  appointmentsThisMonth: number;
  reportsAnalyzed: number;
}

interface AppointmentByDay {
  date: string;
  count: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    pendingDoctors: 0,
    appointmentsThisMonth: 0,
    reportsAnalyzed: 0,
  });
  const [pendingDoctors, setPendingDoctors] = useState<Doctor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appointmentsByDay, setAppointmentsByDay] = useState<AppointmentByDay[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    try {
      // Fetch stats
      const [
        { count: totalUsers },
        { count: totalDoctors },
        { count: totalAppointments },
        { count: pendingDoctorsCount },
        { count: appointmentsThisMonth },
        { count: reportsAnalyzed },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', format(startOfMonth(new Date()), 'yyyy-MM-dd'))
          .lte('appointment_date', format(endOfMonth(new Date()), 'yyyy-MM-dd')),
        supabase.from('health_reports').select('*', { count: 'exact', head: true }).not('analysis', 'is', null),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalDoctors: totalDoctors || 0,
        totalAppointments: totalAppointments || 0,
        pendingDoctors: pendingDoctorsCount || 0,
        appointmentsThisMonth: appointmentsThisMonth || 0,
        reportsAnalyzed: reportsAnalyzed || 0,
      });

      // Fetch pending doctors
      const { data: pendingData } = await supabase
        .from('doctors')
        .select('*, specialization:specializations(name)')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });
      setPendingDoctors((pendingData as unknown as Doctor[]) || []);

      // Fetch users with roles
      const { data: usersData } = await supabase
        .from('user_roles')
        .select('*')
        .limit(50);

      if (usersData) {
        const usersWithProfiles = await Promise.all(
          usersData.map(async (userRole) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', userRole.user_id)
              .maybeSingle();
            return { ...userRole, profile };
          })
        );
        setUsers(usersWithProfiles);
      }

      // Fetch appointments by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
      const appointmentCounts = await Promise.all(
        last7Days.map(async (date) => {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', date);
          return { date: format(new Date(date), 'EEE'), count: count || 0 };
        })
      );
      setAppointmentsByDay(appointmentCounts);

      // Fetch appointments by status
      const statusCounts = await Promise.all(
        ['scheduled', 'completed', 'cancelled'].map(async (status) => {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('status', status);
          return { name: status.charAt(0).toUpperCase() + status.slice(1), value: count || 0 };
        })
      );
      setAppointmentsByStatus(statusCounts);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function approveDoctor(doctorId: string) {
    const { error } = await supabase
      .from('doctors')
      .update({ is_approved: true })
      .eq('id', doctorId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to approve doctor', variant: 'destructive' });
    } else {
      toast({ title: 'Doctor approved successfully' });
      fetchDashboardData();
    }
  }

  async function rejectDoctor(doctorId: string) {
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', doctorId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to reject doctor', variant: 'destructive' });
    } else {
      toast({ title: 'Doctor application rejected' });
      fetchDashboardData();
    }
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users, doctors, and monitor platform analytics</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Total Doctors', value: stats.totalDoctors, icon: Stethoscope, color: 'text-success' },
            { label: 'Pending Approvals', value: stats.pendingDoctors, icon: Clock, color: 'text-warning' },
            { label: 'Appointments This Month', value: stats.appointmentsThisMonth, icon: Calendar, color: 'text-accent' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
            >
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

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Doctors ({stats.pendingDoctors})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Doctor Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDoctors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Applied On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDoctors.map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={doctor.avatar_url || ''} />
                                <AvatarFallback>{doctor.full_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{doctor.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{doctor.specialization?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(doctor.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" onClick={() => approveDoctor(doctor.id)}>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectDoctor(doctor.id)}>
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No pending doctor approvals</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={userRole.profile?.avatar_url || ''} />
                              <AvatarFallback>{userRole.profile?.full_name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{userRole.profile?.full_name || 'Unknown User'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={userRole.role === 'admin' ? 'default' : userRole.role === 'doctor' ? 'secondary' : 'outline'}>
                            {userRole.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Appointments by Day */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Appointments (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={appointmentsByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Appointments by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Appointments by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={appointmentsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {appointmentsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4">
                    {appointmentsByStatus.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        <span className="text-sm">{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Platform Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-3xl font-bold text-primary">{stats.totalAppointments}</p>
                      <p className="text-sm text-muted-foreground">Total Appointments</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-3xl font-bold text-success">{stats.reportsAnalyzed}</p>
                      <p className="text-sm text-muted-foreground">Reports Analyzed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-3xl font-bold text-warning">{stats.totalDoctors}</p>
                      <p className="text-sm text-muted-foreground">Active Doctors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
