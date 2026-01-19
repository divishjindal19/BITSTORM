import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    
    // Get current time in HH:MM format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`Checking reminders at ${todayDate} ${currentHour}:${currentMinute}`);

    // Get all scheduled appointments for today with doctor info
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        appointment_date,
        appointment_time,
        doctor_id
      `)
      .eq('appointment_date', todayDate)
      .eq('status', 'scheduled');

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${appointments?.length || 0} scheduled appointments for today`);

    const reminderMinutes = [60, 30, 10];
    const sentReminders: string[] = [];

    for (const appointment of appointments || []) {
      const [aptHour, aptMinute] = appointment.appointment_time.split(':').map(Number);
      const appointmentTimeInMinutes = aptHour * 60 + aptMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const minutesUntilAppointment = appointmentTimeInMinutes - currentTimeInMinutes;

      for (const reminderTime of reminderMinutes) {
        // Check if we should send this reminder (within a 2-minute window)
        if (minutesUntilAppointment >= reminderTime - 1 && minutesUntilAppointment <= reminderTime + 1) {
          console.log(`Sending ${reminderTime}-min reminder for appointment ${appointment.id}`);
          
          // Get patient profile for email and name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', appointment.patient_id)
            .single();

          // Get doctor name
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('full_name')
            .eq('id', appointment.doctor_id)
            .single();
          const doctorName = doctorData?.full_name || "Doctor";

          // Get patient auth email
          const { data: authUser } = await supabase.auth.admin.getUserById(appointment.patient_id);
          const patientEmail = authUser?.user?.email;

          if (patientEmail) {
            // Send email reminder
            try {
              const emailPayload = {
                type: "appointment_reminder",
                to: patientEmail,
                patientName: profile?.full_name || "Patient",
                doctorName: doctorName,
                date: appointment.appointment_date,
                time: appointment.appointment_time,
                reminderMinutes: reminderTime,
              };

              const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify(emailPayload),
              });

              if (!emailRes.ok) {
                const errorText = await emailRes.text();
                console.error(`Email reminder failed (${emailRes.status}) for ${patientEmail}:`, errorText);
              } else {
                console.log(`Email reminder sent to ${patientEmail}`);
              }
            } catch (emailError) {
              console.error("Error sending email reminder:", emailError);
            }
          }

          // Create in-app notification
          await supabase.from('notifications').insert({
            user_id: appointment.patient_id,
            title: `Appointment in ${reminderTime} minutes`,
            message: `Your appointment with Dr. ${doctorName} starts in ${reminderTime} minutes.`,
            type: 'appointment_reminder',
            related_id: appointment.id,
            action_url: '/appointments',
          });

          sentReminders.push(`${appointment.id}_${reminderTime}min`);
        }
      }
    }

    console.log(`Sent ${sentReminders.length} reminders`);

    return new Response(
      JSON.stringify({ success: true, remindersSent: sentReminders.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-appointment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
