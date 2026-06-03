import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  try {
     if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    }

    const { email, origin } = await req.json()
    // Dynamic redirect URL based on environment (local or production)
    const siteUrl = origin || 'https://o-sekha.vercel.app';
    const redirectUrl = `${siteUrl}/reset-password`;

    // 1. Search for user by email across all pages (handles listUsers pagination)
    let user = null;
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      });
      
      if (listError) throw listError;
      
      const users = listData?.users || [];
      if (users.length === 0) break;
      
      const found = users.find(u => u.email === email);
      if (found) {
        user = found;
        break;
      }
      
      if (users.length < perPage) break;
      page++;
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'EMAIL_NOT_FOUND', message: 'ইমেইল পাওয়া যায়নি' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 2. Generate reset link
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
         redirectTo: redirectUrl
      }
    })

    if (linkError) throw linkError

    const resetLink = data.properties.action_link

    // 3. Send Email via Resend
    const { error: resendError } = await resend.emails.send({
      from: 'BeeLesson <team@beelesson.com>',
      to: [email],
      subject: 'পাসওয়ার্ড রিসেট করার অনুরোধ - BeeLesson 🐝',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
          <div style="background-color: #FFB800; padding: 30px; text-align: center;">
            <h2 style="margin: 0; color: #111827;">পাসওয়ার্ড রিসেট করুন</h2>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; margin-bottom: 24px;">আপনি আপনার <strong>BeeLesson</strong> অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য অনুরোধ করেছেন।</p>
            <p style="font-size: 16px; margin-bottom: 30px;">নীচের বাটনে ক্লিক করে আপনি আপনার নতুন পাসওয়ার্ড সেট করতে পারবেন। এই লিঙ্কটি কিছু সময়ের জন্য কার্যকর থাকবে।</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background-color: #111827; color: #FFB800; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                 পাসওয়ার্ড রিসেট করুন →
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
              আপনি যদি এই অনুরোধ না করে থাকেন, তবে নির্দ্বিধায় এই ইমেইলটি ইগনোর করতে পারেন। আপনার অ্যাকাউন্ট নিরাপদ আছে।
            </p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} BeeLesson. All rights reserved.
          </div>
        </div>
      `,
    })

    if (resendError) throw resendError

    return new Response(JSON.stringify({ message: 'Reset email sent' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('Reset error:', err.message)
    return new Response(JSON.stringify({ error: 'SERVER_ERROR', message: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
