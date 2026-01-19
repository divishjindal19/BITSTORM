import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Star, Clock, MapPin, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

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
  specialization: { name: string } | null;
}

interface Specialization {
  id: string;
  name: string;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpec, setSelectedSpec] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [{ data: docsData }, { data: specsData }] = await Promise.all([
        supabase.from('doctors').select('*, specialization:specializations(name)').order('rating', { ascending: false }),
        supabase.from('specializations').select('*').order('name')
      ]);
      setDoctors(docsData as Doctor[] || []);
      setSpecializations(specsData || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpec = selectedSpec === 'all' || doc.specialization?.name === selectedSpec;
    return matchesSearch && matchesSpec;
  });

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find a Doctor</h1>
          <p className="text-muted-foreground">Book appointments with our expert healthcare professionals</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search doctors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={selectedSpec} onValueChange={setSelectedSpec}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Specializations</SelectItem>
              {specializations.map(spec => (
                <SelectItem key={spec.id} value={spec.name}>{spec.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Doctors Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor, index) => (
            <motion.div key={doctor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Link to={`/doctors/${doctor.id}`}>
                <Card className="card-hover h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={doctor.avatar_url} />
                        <AvatarFallback>{doctor.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{doctor.full_name}</h3>
                        <Badge variant="secondary" className="mt-1">{doctor.specialization?.name}</Badge>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span>{doctor.rating} ({doctor.total_reviews} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{doctor.bio}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {doctor.experience_years} years
                      </div>
                      <span className="font-semibold text-primary">${doctor.consultation_fee}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
