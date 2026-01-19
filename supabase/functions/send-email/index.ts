import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "appointment_confirmation" | "appointment_reminder";
  to: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  reminderMinutes?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { type, to, patientName, doctorName, date, time, reminderMinutes }: EmailRequest = await req.json();
    console.log(`Sending ${type} email to ${to}`);

    let subject: string;
    let html: string;

    if (type === "appointment_confirmation") {
      subject = "Appointment Confirmed - CURAX Healthcare";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .appointment-card { background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #14b8a6; }
            .detail { display: flex; margin: 10px 0; }
            .label { color: #666; width: 100px; }
            .value { color: #333; font-weight: 600; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CURAX Healthcare</h1>
              <p>Appointment Confirmed</p>
            </div>
            <div class="content">
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Your appointment has been successfully scheduled!</p>
              
              <div class="appointment-card">
                <div class="detail"><span class="label">Doctor:</span><span class="value">${doctorName}</span></div>
                <div class="detail"><span class="label">Date:</span><span class="value">${date}</span></div>
                <div class="detail"><span class="label">Time:</span><span class="value">${time}</span></div>
              </div>
              
              <p>Please arrive 10 minutes before your scheduled time.</p>
              <p>If you need to reschedule, please do so at least 24 hours in advance.</p>
              
              <p>Best regards,<br><strong>The CURAX Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message from CURAX Healthcare System</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `Appointment Reminder (${reminderMinutes} min) - CURAX Healthcare`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .reminder-card { background: #fffbeb; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .detail { display: flex; margin: 10px 0; }
            .label { color: #666; width: 100px; }
            .value { color: #333; font-weight: 600; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Reminder</h1>
              <p>Your appointment is in ${reminderMinutes} minutes!</p>
            </div>
            <div class="content">
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>This is a friendly reminder about your upcoming appointment.</p>
              
              <div class="reminder-card">
                <div class="detail"><span class="label">Doctor:</span><span class="value">${doctorName}</span></div>
                <div class="detail"><span class="label">Date:</span><span class="value">${date}</span></div>
                <div class="detail"><span class="label">Time:</span><span class="value">${time}</span></div>
              </div>
              
              <p>Please make sure you're ready for your appointment!</p>
              
              <p>Best regards,<br><strong>The CURAX Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message from CURAX Healthcare System</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CURAX Healthcare <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);

      // Return the upstream status code (e.g. 403 in Resend testing mode)
      // so callers can handle it gracefully without turning it into a runtime 500.
      return new Response(
        JSON.stringify({ success: false, status: response.status, error: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await response.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});