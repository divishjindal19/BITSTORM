import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Brain, Trash2, Loader2, File, Image, FileSpreadsheet, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface HealthReport {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  uploaded_at: string;
  analysis: string | null;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  'application/pdf': FileText,
  'image/jpeg': Image,
  'image/png': Image,
  'image/webp': Image,
  'text/csv': FileSpreadsheet,
  'application/vnd.ms-excel': FileSpreadsheet,
};

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [user]);

  async function fetchReports() {
    if (!user) return;

    const { data, error } = await supabase
      .from('health_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
    setLoading(false);
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/csv'];
        if (!allowedTypes.includes(file.type)) {
          toast({ 
            title: 'Invalid file type', 
            description: `${file.name} is not supported. Use PDF, CSV, or images.`,
            variant: 'destructive' 
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({ 
            title: 'File too large', 
            description: `${file.name} exceeds 10MB limit.`,
            variant: 'destructive' 
          });
          continue;
        }

        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('health-reports')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
          continue;
        }

        const { error: dbError } = await supabase.from('health_reports').insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
        });

        if (dbError) {
          console.error('DB error:', dbError);
          toast({ title: 'Error saving record', description: dbError.message, variant: 'destructive' });
          continue;
        }

        toast({ title: 'Upload successful', description: `${file.name} uploaded successfully` });
      }

      fetchReports();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function analyzeReport(report: HealthReport) {
    setAnalyzingId(report.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-report', {
        body: { reportId: report.id }
      });

      if (error) throw error;

      toast({ title: 'Analysis complete!', description: 'Your health report has been analyzed.' });
      fetchReports();
      setExpandedId(report.id);
    } catch (error) {
      console.error('Analysis error:', error);
      toast({ title: 'Analysis failed', description: 'Could not analyze the report. Please try again.', variant: 'destructive' });
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDelete(report: HealthReport) {
    if (!user) return;

    try {
      await supabase.storage.from('health-reports').remove([report.file_path]);
      await supabase.from('health_reports').delete().eq('id', report.id);

      setReports(prev => prev.filter(r => r.id !== report.id));
      toast({ title: 'Report deleted' });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const FileIcon = (type: string | null) => {
    const Icon = (type && FILE_ICONS[type]) || File;
    return <Icon className="w-8 h-8 text-primary" />;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Health Reports</h1>
          <p className="text-muted-foreground">Upload and analyze your health reports with AI</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                My Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                {uploading ? (
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                ) : (
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                )}
                <h3 className="font-semibold mb-2">
                  {uploading ? 'Uploading...' : 'Upload Health Reports'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop PDF, CSV, or images here, or click to browse
                </p>
              </div>

              {/* Reports List */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : reports.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {reports.map((report) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-muted/50 border border-border overflow-hidden"
                    >
                      <div className="flex items-center gap-4 p-4">
                        {FileIcon(report.file_type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{report.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Uploaded {format(new Date(report.uploaded_at), 'dd-MM-yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.analysis ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                            >
                              View Analysis
                              {expandedId === report.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => analyzeReport(report)}
                              disabled={analyzingId === report.id}
                            >
                              {analyzingId === report.id ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                              ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> Analyze</>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(report)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Analysis Expansion */}
                      <AnimatePresence>
                        {expandedId === report.id && report.analysis && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border"
                          >
                            <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5">
                              <div className="flex items-center gap-2 mb-3 text-primary">
                                <Brain className="w-5 h-5" />
                                <span className="font-semibold">AI Health Analysis</span>
                              </div>
                              <div className="prose prose-sm max-w-none text-foreground">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {report.analysis}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No reports uploaded yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 h-fit">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">AI Health Insights</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your reports and click "Analyze" to get AI-powered health insights.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">✓ Summary of key findings</li>
                <li className="flex items-center gap-2">✓ Dietary suggestions</li>
                <li className="flex items-center gap-2">✓ Health risk detection</li>
                <li className="flex items-center gap-2">✓ Actionable recommendations</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}