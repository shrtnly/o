import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  try {
    const { record } = await req.json()
    const email = record.email
    const fullName = record.raw_user_meta_data?.full_name || 'Friend'

    const { data, error } = await resend.emails.send({
      from: 'BeeLesson <team@beelesson.com>', // Replace with your verified domain
      to: [email],
      subject: 'স্বাগতম BeeLesson-এ! আপনার শেখার যাত্রা শুরু হোক আজই 🐝',
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header Banner -->
          <div style="background-color: #FFB800; padding: 40px 20px; text-align: center;">
            <div style="background: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                🐝
            </div>
            <h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
              অভিনন্দন, ${fullName}! 🎉
            </h1>
          </div>

          <!-- Content Body -->
          <div style="padding: 40px 30px; line-height: 1.8;">
            <p style="font-size: 18px; color: #374151; margin-bottom: 24px;">
              <strong>BeeLesson</strong> পরিবারে আপনাকে উষ্ণ স্বাগতম! আমরা অত্যন্ত আনন্দিত যে আপনি আপনার শেখার নতুন যাত্রায় আমাদের সঙ্গী হিসেবে বেছে নিয়েছেন।
            </p>
            
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 30px;">
              আপনার অ্যাকাউন্টটি এখন শতভাগ প্রস্তুত এবং কার্যকর। এর জন্য কোনো অতিরিক্ত ভেরিফিকেশনের প্রয়োজন নেই। আপনি এখনই নিচে দেয়া লিঙ্কে ক্লিক করে আপনার ড্যাশবোর্ডে প্রবেশ করতে পারেন এবং আপনার পছন্দের কোর্সগুলো এক্সপ্লোর করা শুরু করতে পারেন।
            </p>

            <!-- Action Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://o-sekha.vercel.app/login" 
                 style="display: inline-block; background-color: #111827; color: #FFB800; padding: 18px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); transition: all 0.2s;">
                 শেখা শুরু করুন →
              </a>
            </div>

            <div style="background-color: #fffbeb; border-left: 4px solid #FFB800; padding: 15px 20px; border-radius: 4px; margin-top: 30px;">
              <p style="font-size: 14px; color: #92400e; margin: 0;">
                <strong>সহজ টিপস:</strong> আপনি আপনার প্রোফাইল থেকে গোল সেট করতে পারেন যাতে আপনার শেখার গতি আরও বৃদ্ধি পায়।
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #f3f4f6;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">আপনার যদি কোনো প্রশ্ন থাকে তবে সরাসরি এই ইমেইলে রিপ্লাই করতে পারেন।</p>
            <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0;">আপনার উজ্জ্বল ভবিষ্যতের কামনায়,<br>BeeLesson টিম</p>
            
            <div style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
              © ${new Date().getFullYear()} BeeLesson. All rights reserved.
            </div>
          </div>
        </div>
      `,
    })

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 400 })
    }

    return new Response(JSON.stringify({ message: 'Email sent', data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
