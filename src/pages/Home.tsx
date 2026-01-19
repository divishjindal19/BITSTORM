import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Megaphone, 
  Heart, 
  MessageSquare, 
  Share2, 
  Star,
  ArrowRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

interface Doctor {
  id: string;
  full_name: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  specialization: { name: string } | null;
}

// Sample blog data (would come from database in production)
const sampleBlogs = [
  {
    id: '1',
    title: '10 Tips for a Healthy Heart',
    excerpt: 'Discover simple lifestyle changes that can significantly improve your cardiovascular health.',
    cover_image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=600',
    author: { full_name: 'Dr. Sarah Chen', avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400' },
    likes_count: 124,
    comments_count: 23,
    tags: ['Heart Health', 'Wellness'],
  },
  {
    id: '2',
    title: 'Understanding Sleep and Mental Health',
    excerpt: 'Learn how quality sleep affects your mental wellbeing and tips to improve your sleep hygiene.',
    cover_image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600',
    author: { full_name: 'Dr. David Kim', avatar_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400' },
    likes_count: 89,
    comments_count: 15,
    tags: ['Mental Health', 'Sleep'],
  },
  {
    id: '3',
    title: 'Nutrition Myths Debunked',
    excerpt: 'We separate fact from fiction when it comes to common nutrition advice.',
    cover_image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600',
    author: { full_name: 'Dr. Lisa Park', avatar_url: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400' },
    likes_count: 156,
    comments_count: 42,
    tags: ['Nutrition', 'Diet'],
  },
];

const healthTips = [
  { icon: '💧', tip: 'Drink at least 8 glasses of water daily' },
  { icon: '🚶', tip: 'Take a 30-minute walk every day' },
  { icon: '🥗', tip: 'Include vegetables in every meal' },
  { icon: '😴', tip: 'Get 7-8 hours of quality sleep' },
];

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [topDoctors, setTopDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch announcements
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(3);

        // Fetch top rated doctors
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, full_name, avatar_url, rating, total_reviews, specialization:specializations(name)')
          .eq('is_featured', true)
          .order('rating', { ascending: false })
          .limit(4);

        setAnnouncements(announcementsData || []);
        setTopDoctors(doctorsData as Doctor[] || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Welcome to CURAX Community</h1>
          <p className="text-muted-foreground">
            Stay updated with the latest health news, doctor blogs, and wellness tips.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Announcements */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Clinic Announcements</h2>
              </div>
              <div className="space-y-4">
                {announcements.map((announcement, index) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            announcement.priority === 'high' ? 'bg-accent' : 'bg-primary'
                          }`} />
                          <div>
                            <h3 className="font-semibold">{announcement.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {announcement.content}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Doctor Blogs */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Health Articles</h2>
                </div>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {sampleBlogs.map((blog, index) => (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden card-hover h-full">
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={blog.cover_image}
                          alt={blog.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {blog.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="font-semibold line-clamp-2">{blog.title}</h3>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {blog.excerpt}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={blog.author.avatar_url} />
                              <AvatarFallback>{blog.author.full_name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {blog.author.full_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                              <Heart className="w-4 h-4" />
                              {blog.likes_count}
                            </button>
                            <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                              <MessageSquare className="w-4 h-4" />
                              {blog.comments_count}
                            </button>
                            <button className="hover:text-primary transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Health Tips */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Daily Health Tips</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {healthTips.map((tip, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                  >
                    <span className="text-xl">{tip.icon}</span>
                    <span className="text-sm">{tip.tip}</span>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Top Rated Doctors */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-warning" />
                    <h3 className="font-semibold">Top Doctors</h3>
                  </div>
                  <Link to="/doctors">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {topDoctors.map((doctor, index) => (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={`/doctors/${doctor.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={doctor.avatar_url} />
                        <AvatarFallback>{doctor.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doctor.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {doctor.specialization?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-warning fill-warning" />
                        <span className="text-sm font-medium">{doctor.rating}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
