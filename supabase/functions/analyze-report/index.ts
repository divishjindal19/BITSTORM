import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();
    console.log("Analyzing report:", reportId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the report details
    const { data: report, error: reportError } = await supabase
      .from("health_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      console.error("Report not found:", reportError);
      throw new Error("Report not found");
    }

    console.log("Found report:", report.file_name);

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("health-reports")
      .download(report.file_path);

    if (fileError) {
      console.error("Error downloading file:", fileError);
      throw new Error("Could not download file");
    }

    // Convert file to text for analysis (simplified - in production you'd use OCR for images/PDFs)
    let extractedText = "";
    if (report.file_type === "text/csv") {
      extractedText = await fileData.text();
    } else if (report.file_type?.startsWith("image/")) {
      extractedText = `[Image file: ${report.file_name}] - Please describe any visible health metrics, test results, or medical information.`;
    } else {
      extractedText = `[Document: ${report.file_name}] - Health report uploaded for analysis.`;
    }

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are CURAX, an AI health analysis assistant. Analyze health reports and provide:
1. **Summary**: Brief overview of the report findings
2. **Key Metrics**: Important health indicators found
3. **Dietary Suggestions**: Personalized nutrition recommendations based on the data
4. **Health Risks**: Any potential health concerns to monitor
5. **Recommendations**: Actionable steps for improvement

Be helpful, accurate, and always recommend consulting healthcare professionals for medical decisions.
Format your response in clear sections with markdown.`,
          },
          {
            role: "user",
            content: `Analyze this health report:\n\nFile: ${report.file_name}\nType: ${report.file_type}\n\nContent/Context:\n${extractedText}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI response error:", aiResponse.status);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Unable to analyze report.";

    console.log("Analysis complete, saving to database...");

    // Update the report with analysis
    const { error: updateError } = await supabase
      .from("health_reports")
      .update({ 
        analysis,
        extracted_text: extractedText.substring(0, 5000) // Limit stored text
      })
      .eq("id", reportId);

    if (updateError) {
      console.error("Error updating report:", updateError);
      throw updateError;
    }

    console.log("Analysis saved successfully");

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze report error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});