import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Calendar, 
  MessageCircle, 
  FileText, 
  Shield, 
  Clock,
  Star,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

const features = [
  {
    icon: Calendar,
    title: 'Easy Appointments',
    description: 'Book appointments with top doctors in just a few clicks',
  },
  {
    icon: MessageCircle,
    title: 'AI Health Assistant',
    description: 'Get instant health insights from our intelligent CURAX AI',
  },
  {
    icon: FileText,
    title: 'Health Reports',
    description: 'Upload and analyze your health reports with AI-powered insights',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your health data is encrypted and completely secure',
  },
];

const stats = [
  { value: '50K+', label: 'Happy Patients' },
  { value: '200+', label: 'Expert Doctors' },
  { value: '99%', label: 'Satisfaction Rate' },
  { value: '24/7', label: 'AI Support' },
];

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Login Failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          // Fetch user role and redirect accordingly
          const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
          if (user) {
            const { data: roleData } = await (await import('@/integrations/supabase/client')).supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .single();
            
            if (roleData?.role === 'doctor') {
              navigate('/doctor-dashboard');
            } else if (roleData?.role === 'admin') {
              navigate('/home');
            } else {
              navigate('/patient-dashboard');
            }
          } else {
            navigate('/home');
          }
        }
      } else {
        if (!fullName.trim()) {
          toast({
            title: 'Name Required',
            description: 'Please enter your full name',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: 'Signup Failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Account Created!',
            description: 'You can now sign in to your account.',
          });
          setIsLogin(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 hero-gradient opacity-10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 py-12 lg:py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Heart className="w-4 h-4" />
                AI-Powered Healthcare
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Your Health,{' '}
                <span className="gradient-text">Reimagined</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg">
                Experience the future of healthcare with CURAX. Book appointments, 
                chat with our AI assistant, and manage your health records—all in one place.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Content - Auth Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:pl-12"
            >
              <div className="bg-card rounded-2xl shadow-float p-8 max-w-md mx-auto">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl hero-gradient mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">C</span>
                  </div>
                  <h2 className="text-2xl font-bold">Welcome to CURAX</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {isLogin ? 'Sign in to continue' : 'Create your account'}
                  </p>
                </div>

                <Tabs value={isLogin ? 'login' : 'signup'} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login" onClick={() => setIsLogin(true)}>
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" onClick={() => setIsLogin(false)}>
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <TabsContent value="signup" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required={!isLogin}
                        />
                      </div>
                    </TabsContent>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 animate-spin" />
                          Please wait...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {isLogin ? 'Sign In' : 'Create Account'}
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </form>
                </Tabs>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Why Choose CURAX?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We combine cutting-edge AI technology with compassionate healthcare 
              to provide you with the best medical experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-soft card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="hero-gradient rounded-3xl p-12 text-center text-white"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Transform Your Healthcare?
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Join thousands of patients who trust CURAX for their health needs. 
              Sign up today and experience healthcare like never before.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5" />
                <span>Free to get started</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5" />
                <span>24/7 AI support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} CURAX Healthcare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
